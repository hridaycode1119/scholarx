import { Injectable, signal, computed } from '@angular/core';
import { StudentFeedbackItem } from '../models';

const STORAGE_KEY = 'scholarx_admin_feedbacks_v2';

@Injectable({
  providedIn: 'root'
})
export class SupportFeedbackService {
  private channel: BroadcastChannel | null = null;

  private readonly initialMockFeedbacks: StudentFeedbackItem[] = [
    {
      id: 'fb-001',
      ticketId: 'TKT-9041',
      studentId: '2023308724',
      studentName: 'Sahil Kumar',
      studentRoll: '2023308724',
      email: 'sahil.k@apex.edu',
      college: 'Apex Institute of Technology',
      department: 'Computer Science & Engineering',
      category: 'TECHNICAL_ISSUE',
      subject: 'Microphone decibel sensitivity during CS401 viva test',
      message: 'When answering question 3 in CS401 viva, the audio wave dropped briefly before stabilizing. Would love an option to select specific input device.',
      priority: 'MEDIUM',
      rating: 4,
      status: 'RESOLVED',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      resolvedAt: new Date(Date.now() - 86400000).toISOString(),
      adminReply: 'Hardware audio selection module has been updated in Student Settings > Peripherals.'
    },
    {
      id: 'fb-002',
      ticketId: 'TKT-9082',
      studentId: '2023308819',
      studentName: 'Ananya Sharma',
      studentRoll: '2023308819',
      email: 'ananya.s@apex.edu',
      college: 'Apex Institute of Technology',
      department: 'Computer Science & Engineering',
      category: 'PROCTORING_ISSUE',
      subject: 'Proctor tab switch warning triggered by external OS notification',
      message: 'An OS calendar popup triggered a minor blur warning strike in my practice session. Can notifications be temporarily supressed in exam fullscreen?',
      priority: 'HIGH',
      rating: 5,
      status: 'IN_REVIEW',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      adminReply: 'Reviewing proctor strike window tolerance with academic security council.'
    },
    {
      id: 'fb-003',
      ticketId: 'TKT-9120',
      studentId: '2023308942',
      studentName: 'Rohan Verma',
      studentRoll: '2023308942',
      email: 'rohan.v@horizon.edu',
      college: 'Horizon Institute of Technology',
      department: 'Information Science',
      category: 'FEATURE_REQUEST',
      subject: 'Request for PYQ solution download in PDF format',
      message: 'The AI solution generator for university PYQs is fantastic! Could we please have a one-click PDF export to study offline for finals?',
      priority: 'LOW',
      rating: 5,
      status: 'NEW',
      createdAt: new Date(Date.now() - 1800000).toISOString()
    }
  ];

  readonly feedbacks = signal<StudentFeedbackItem[]>(this.loadFeedbacks());

  readonly newCount = computed(() => this.feedbacks().filter(f => f.status === 'NEW').length);
  readonly inReviewCount = computed(() => this.feedbacks().filter(f => f.status === 'IN_REVIEW').length);
  readonly resolvedCount = computed(() => this.feedbacks().filter(f => f.status === 'RESOLVED').length);
  readonly urgentCount = computed(() => this.feedbacks().filter(f => f.priority === 'URGENT' && f.status !== 'RESOLVED').length);

  constructor() {
    this.setupBroadcastSync();
  }

  private loadFeedbacks(): StudentFeedbackItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored feedbacks:', e);
    }
    this.saveToStorage(this.initialMockFeedbacks);
    return this.initialMockFeedbacks;
  }

  private saveToStorage(items: StudentFeedbackItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to write feedbacks to storage:', e);
    }
  }

  private setupBroadcastSync(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('scholarx_feedback_channel');
        this.channel.onmessage = (event) => {
          if (event.data?.type === 'FEEDBACKS_UPDATED') {
            const fresh = this.loadFeedbacks();
            this.feedbacks.set(fresh);
          }
        };
      } catch (e) {
        // Channel unavailable, rely on signals
      }
    }
  }

  private notifySync(): void {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'FEEDBACKS_UPDATED', timestamp: Date.now() });
      } catch (e) {
        // broadcast fallback
      }
    }
  }

  submitFeedback(item: Omit<StudentFeedbackItem, 'id' | 'ticketId' | 'status' | 'createdAt'>): StudentFeedbackItem {
    const randomTicket = 'TKT-' + Math.floor(1000 + Math.random() * 9000);
    const newFeedback: StudentFeedbackItem = {
      ...item,
      id: 'fb-' + Date.now(),
      ticketId: randomTicket,
      status: 'NEW',
      createdAt: new Date().toISOString()
    };

    const updated = [newFeedback, ...this.feedbacks()];
    this.feedbacks.set(updated);
    this.saveToStorage(updated);
    this.notifySync();

    return newFeedback;
  }

  resolveFeedback(id: string, adminReply?: string): void {
    const updated = this.feedbacks().map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: 'RESOLVED' as const,
          resolvedAt: new Date().toISOString(),
          adminReply: adminReply || item.adminReply || 'Resolved by Campus Administration.'
        };
      }
      return item;
    });

    this.feedbacks.set(updated);
    this.saveToStorage(updated);
    this.notifySync();
  }

  updateStatus(id: string, status: 'NEW' | 'IN_REVIEW' | 'RESOLVED', adminReply?: string): void {
    const updated = this.feedbacks().map(item => {
      if (item.id === id) {
        return {
          ...item,
          status,
          resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : item.resolvedAt,
          adminReply: adminReply !== undefined ? adminReply : item.adminReply
        };
      }
      return item;
    });

    this.feedbacks.set(updated);
    this.saveToStorage(updated);
    this.notifySync();
  }

  deleteFeedback(id: string): void {
    const updated = this.feedbacks().filter(item => item.id !== id);
    this.feedbacks.set(updated);
    this.saveToStorage(updated);
    this.notifySync();
  }

  getStudentFeedbacks(studentId: string): StudentFeedbackItem[] {
    return this.feedbacks().filter(f => f.studentId === studentId);
  }
}
