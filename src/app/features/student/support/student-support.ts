import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { SupportFeedbackService } from '../../../core/services/support-feedback.service';
import { StudentFeedbackItem } from '../../../core/models';

@Component({
  selector: 'app-student-support',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-support.html',
  styleUrl: './student-support.scss'
})
export class StudentSupportComponent {
  readonly studentService = inject(StudentService);
  readonly feedbackService = inject(SupportFeedbackService);

  readonly profile = this.studentService.profile;

  // Active FAQ Accordion index
  readonly activeFaqIndex = signal<number | null>(0);

  // Network Diagnostic Ping test state
  readonly isTestingPing = signal<boolean>(false);
  readonly pingResult = signal<{ pingMs: number; status: 'EXCELLENT' | 'GOOD' | 'POOR'; packetLoss: string } | null>(null);

  // Feedback Form State
  feedbackForm = {
    category: 'TECHNICAL_ISSUE' as StudentFeedbackItem['category'],
    priority: 'MEDIUM' as StudentFeedbackItem['priority'],
    rating: 5,
    subject: '',
    message: '',
    isAnonymous: false
  };

  readonly isSubmitting = signal<boolean>(false);
  readonly submissionSuccessTicket = signal<StudentFeedbackItem | null>(null);
  readonly toastMessage = signal<string | null>(null);

  // Filter for student's personal tickets
  readonly studentTickets = computed(() => {
    const studentId = this.profile().studentId;
    return this.feedbackService.feedbacks().filter(f => f.studentId === studentId);
  });

  // Category definitions with icons
  readonly categories: Array<{ value: StudentFeedbackItem['category']; label: string; icon: string }> = [
    { value: 'TECHNICAL_ISSUE', label: 'Technical Glitch / System Bug', icon: '💻' },
    { value: 'PROCTORING_ISSUE', label: 'Proctoring Warning Discrepancy', icon: '🛡️' },
    { value: 'ACADEMIC_EVALUATION', label: 'Oral Viva Score Inquiry', icon: '🎓' },
    { value: 'FEATURE_REQUEST', label: 'Feature Suggestion & Improvement', icon: '💡' },
    { value: 'CAMPUS_INFRASTRUCTURE', label: 'Campus Lab & Connectivity', icon: '🏛️' },
    { value: 'OTHER', label: 'General Administrative Query', icon: '📝' }
  ];

  readonly faqs = [
    {
      q: 'What should I do if my Wi-Fi disconnects during an active oral defense?',
      a: 'ScholarX maintains a 90-second disconnected grace buffer. Simply reconnect your internet connection and re-open the examination tab. The proctoring system will resume from the exact question and timer without deducting marks.'
    },
    {
      q: 'How does the AI Viva Copilot evaluate my answers and compute Bloom levels?',
      a: 'Answers are processed via multi-stage natural language models that assess conceptual clarity, technical accuracy, vocabulary, and articulation against OBE Course Outcome benchmarks (CO1 to CO5).'
    },
    {
      q: 'Will glancing away from my laptop screen result in immediate disqualification?',
      a: 'No. Single momentary head movements generate a soft warning. Formal incidents are only flagged if face presence is lost for consecutive frames or if unauthorized devices/multiple persons are detected by the computer vision layer.'
    },
    {
      q: 'Where does my submitted feedback go and how fast will administrators respond?',
      a: 'Your feedback is routed directly to the Central Admin Governance Console with an automated priority ticket. Institutional administrators and faculty reviewers typically respond within 15 to 45 minutes.'
    }
  ];

  toggleFaq(index: number): void {
    if (this.activeFaqIndex() === index) {
      this.activeFaqIndex.set(null);
    } else {
      this.activeFaqIndex.set(index);
    }
  }

  setRating(stars: number): void {
    this.feedbackForm.rating = stars;
  }

  runPingTest(): void {
    this.isTestingPing.set(true);
    this.pingResult.set(null);

    setTimeout(() => {
      const pingMs = Math.floor(18 + Math.random() * 12);
      this.pingResult.set({
        pingMs,
        status: 'EXCELLENT',
        packetLoss: '0.0%'
      });
      this.isTestingPing.set(false);
    }, 1200);
  }

  submitFeedback(): void {
    if (!this.feedbackForm.subject.trim()) {
      this.showToast('Please provide a subject summary for your feedback.');
      return;
    }
    if (!this.feedbackForm.message.trim() || this.feedbackForm.message.trim().length < 10) {
      this.showToast('Please provide detailed feedback (at least 10 characters).');
      return;
    }

    this.isSubmitting.set(true);

    setTimeout(() => {
      const p = this.profile();
      const createdTicket = this.feedbackService.submitFeedback({
        studentId: p.studentId,
        studentName: this.feedbackForm.isAnonymous ? 'Anonymous Student' : p.fullName,
        studentRoll: this.feedbackForm.isAnonymous ? 'ANON' : p.studentId,
        email: this.feedbackForm.isAnonymous ? 'noreply-anonymous@scholarx.internal' : p.email,
        college: p.collegeName,
        department: p.department,
        category: this.feedbackForm.category,
        priority: this.feedbackForm.priority,
        rating: this.feedbackForm.rating,
        subject: this.feedbackForm.subject.trim(),
        message: this.feedbackForm.message.trim(),
        isAnonymous: this.feedbackForm.isAnonymous
      });

      this.isSubmitting.set(false);
      this.submissionSuccessTicket.set(createdTicket);

      // Reset form
      this.feedbackForm.subject = '';
      this.feedbackForm.message = '';
      this.feedbackForm.priority = 'MEDIUM';
      this.feedbackForm.rating = 5;

      this.showToast(`Feedback dispatched successfully to Admin Console! Ticket #${createdTicket.ticketId} generated.`);
    }, 450);
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }
}
