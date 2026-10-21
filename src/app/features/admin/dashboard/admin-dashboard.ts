import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DATA_PROVIDER } from '../../../core/api/api-provider.token';
import { Institution, StudentFeedbackItem } from '../../../core/models';
import { SupportFeedbackService } from '../../../core/services/support-feedback.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);
  readonly feedbackService = inject(SupportFeedbackService);

  readonly kpis = signal<{ totalStudents: number; totalFaculty: number; activeInstitutions: number; activeVivas: number }>({
    totalStudents: 1420,
    totalFaculty: 84,
    activeInstitutions: 4,
    activeVivas: 18
  });

  readonly institutions = signal<Institution[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Student Feedback & Support Tickets Management
  readonly feedbackFilter = signal<'ALL' | 'NEW' | 'URGENT' | 'RESOLVED'>('ALL');
  readonly selectedTicketForReply = signal<StudentFeedbackItem | null>(null);
  readonly replyMessageInput = signal<string>('');
  readonly feedbackActionToast = signal<string | null>(null);

  readonly filteredFeedbacks = computed(() => {
    const list = this.feedbackService.feedbacks();
    const filter = this.feedbackFilter();
    if (filter === 'NEW') return list.filter(f => f.status === 'NEW');
    if (filter === 'URGENT') return list.filter(f => f.priority === 'URGENT');
    if (filter === 'RESOLVED') return list.filter(f => f.status === 'RESOLVED');
    return list;
  });

  readonly recentAuditLogs = [
    { id: '1', time: '15:30', text: 'Admin Sarah completed onboarding for "Metro Polytechnic Campus"', actor: 'Sarah Jenkins', role: 'SYSTEM_ADMIN' },
    { id: '2', time: '14:15', text: 'Faculty Prof. Aris Thorne published oral assessment "CS401 Midterm VIVA"', actor: 'Prof. Aris Thorne', role: 'FACULTY' },
    { id: '3', time: '11:00', text: 'Security automated task: Deactivated 2 inactive faculty accounts', actor: 'Automated Security', role: 'SYSTEM_ADMIN' },
    { id: '4', time: '09:45', text: 'Institution Horizon Engineering updated NBA Accreditation matrix', actor: 'Elena Rostova', role: 'INSTITUTION_ADMIN' }
  ];

  readonly systemAlerts = [
    { id: 'alt-1', type: 'INFO', text: 'Scheduled automated database snapshot at 02:00 UTC.', time: 'Today' },
    { id: 'alt-2', type: 'WARN', text: 'Higher latency detected on video stream relay Node-3 (Central EU).', time: '15m ago' }
  ];

  ngOnInit(): void {
    this.provider.getAdminKpis().subscribe({
      next: (data) => this.kpis.set(data)
    });

    this.provider.getInstitutions().subscribe({
      next: (insts) => {
        this.institutions.set(insts);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openReplyModal(ticket: StudentFeedbackItem): void {
    this.selectedTicketForReply.set(ticket);
    this.replyMessageInput.set(ticket.adminReply || '');
  }

  closeReplyModal(): void {
    this.selectedTicketForReply.set(null);
    this.replyMessageInput.set('');
  }

  submitAdminReply(): void {
    const ticket = this.selectedTicketForReply();
    if (!ticket) return;

    const reply = this.replyMessageInput().trim() || 'Reviewed and addressed by Institutional Admin.';
    this.feedbackService.resolveFeedback(ticket.id, reply);
    this.closeReplyModal();

    this.showToast(`✅ Ticket #${ticket.ticketId} marked as RESOLVED and response dispatched to student.`);
  }

  quickResolve(ticket: StudentFeedbackItem): void {
    this.feedbackService.resolveFeedback(ticket.id, 'Issue resolved by administration.');
    this.showToast(`✅ Ticket #${ticket.ticketId} marked as RESOLVED.`);
  }

  markInReview(ticket: StudentFeedbackItem): void {
    this.feedbackService.updateStatus(ticket.id, 'IN_REVIEW');
    this.showToast(`ℹ️ Ticket #${ticket.ticketId} moved to IN_REVIEW.`);
  }

  deleteTicket(ticket: StudentFeedbackItem): void {
    this.feedbackService.deleteFeedback(ticket.id);
    this.showToast(`🗑️ Ticket #${ticket.ticketId} archived.`);
  }

  private showToast(msg: string): void {
    this.feedbackActionToast.set(msg);
    setTimeout(() => this.feedbackActionToast.set(null), 4000);
  }
}
