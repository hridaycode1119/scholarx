import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ExamSchedulerService } from '../../../core/services/exam-scheduler.service';
import {
  ExamScheduleSlot,
  ExamRoomAllocation,
  HallTicketData,
  ExamType,
  ExamMode
} from '../../../core/models';

@Component({
  selector: 'app-admin-exam-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-exam-scheduler.html',
  styleUrls: ['./admin-exam-scheduler.scss']
})
export class AdminExamSchedulerComponent implements OnInit {
  readonly schedulerService = inject(ExamSchedulerService);
  private readonly route = inject(ActivatedRoute);
  protected readonly Math = Math;

  // UI State Signals
  readonly showCreateModal = signal<boolean>(false);
  readonly successToast = signal<string | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'].toUpperCase();
        if (tab === 'ROOMS' || tab === 'HALL_TICKETS' || tab === 'TIMETABLE') {
          this.schedulerService.activeTab.set(tab as any);
        }
      }
      if (params['college']) {
        this.schedulerService.selectedCollegeId.set(params['college']);
      }
      if (params['resolve'] === 'true') {
        this.schedulerService.autoResolveAllConflicts();
      }
      if (params['modal'] === 'ticket') {
        const tickets = this.schedulerService.hallTickets();
        if (tickets.length > 0) {
          this.schedulerService.openHallTicketModal(tickets[0]);
        }
      }
    });
  }

  // New Exam Form State
  newExamForm = {
    examTitle: '',
    courseCode: '',
    courseName: '',
    collegeId: 'inst-01',
    department: 'Computer Science & AI',
    examType: 'AI_PROCTORED_THEORY' as ExamType,
    mode: 'PHYSICAL_HALL' as ExamMode,
    date: '2026-09-15',
    startTime: '10:00',
    endTime: '12:30',
    durationMinutes: 150,
    assignedMentorId: 'fac-102',
    assignedMentorName: 'Prof. Elena Rostova',
    roomId: 'room-apex-aud-1',
    roomName: 'Grand Vivekananda Auditorium',
    roomType: 'PHYSICAL_HALL' as const,
    totalEnrolled: 65,
    roomCapacity: 120,
    hasAiProctoringRig: true,
    academicTerm: 'Autumn 2026'
  };

  // Departments list for filtering
  readonly departments = [
    'ALL',
    'Computer Science & AI',
    'Information Technology',
    'Electronics & Communication'
  ];

  // College Selection
  selectCollege(collegeId: string) {
    this.schedulerService.selectedCollegeId.set(collegeId);
  }

  // Tab Selection
  selectTab(tab: 'TIMETABLE' | 'ROOMS' | 'HALL_TICKETS') {
    this.schedulerService.activeTab.set(tab);
  }

  // Date Selection
  selectDate(date: string) {
    this.schedulerService.selectedDate.set(date);
  }

  // Mode Selection
  selectMode(mode: string) {
    this.schedulerService.selectedMode.set(mode);
  }

  // Exam Type Selection
  selectExamType(type: string) {
    this.schedulerService.selectedExamType.set(type);
  }

  // 1-Click AI Auto Resolve
  triggerAutoResolve() {
    const res = this.schedulerService.autoResolveAllConflicts();
    this.showToast(res.summary);
  }

  // Bulk Ticket Generation
  generateTickets(slotId: string, event: Event) {
    event.stopPropagation();
    const count = this.schedulerService.generateBatchTicketsForSlot(slotId);
    this.showToast(`Successfully issued ${count} new student hall passes & cryptographic QR keys for slot #${slotId}!`);
  }

  // Open Hall Ticket Modal
  openTicketModal(ticket: HallTicketData) {
    this.schedulerService.openHallTicketModal(ticket);
  }

  closeTicketModal() {
    this.schedulerService.closeHallTicketModal();
  }

  // Create Exam Session
  submitCreateExam() {
    const selectedCollege = this.schedulerService.registeredColleges().find(c => c.id === this.newExamForm.collegeId);
    const badge = selectedCollege ? selectedCollege.badge : 'Campus';
    const collegeName = selectedCollege ? selectedCollege.name : 'University Campus';

    const selectedRoom = this.schedulerService.rooms().find(r => r.roomId === this.newExamForm.roomId);
    const roomName = selectedRoom ? selectedRoom.roomName : this.newExamForm.roomName;
    const roomCapacity = selectedRoom ? selectedRoom.seatingCapacity : 60;

    this.schedulerService.addExamSlot({
      examTitle: this.newExamForm.examTitle,
      courseCode: this.newExamForm.courseCode,
      courseName: this.newExamForm.courseName,
      collegeId: this.newExamForm.collegeId,
      collegeName,
      campusBadge: badge,
      department: this.newExamForm.department,
      examType: this.newExamForm.examType,
      mode: this.newExamForm.mode,
      date: this.newExamForm.date,
      startTime: this.newExamForm.startTime,
      endTime: this.newExamForm.endTime,
      durationMinutes: this.newExamForm.durationMinutes,
      assignedMentorId: this.newExamForm.assignedMentorId,
      assignedMentorName: this.newExamForm.assignedMentorName,
      roomId: this.newExamForm.roomId,
      roomName,
      roomType: this.newExamForm.roomType,
      totalEnrolled: this.newExamForm.totalEnrolled,
      roomCapacity,
      hasAiProctoringRig: this.newExamForm.hasAiProctoringRig,
      academicTerm: this.newExamForm.academicTerm
    });

    this.showCreateModal.set(false);
    this.showToast(`Exam session "${this.newExamForm.examTitle}" scheduled successfully!`);

    // Reset form
    this.newExamForm.examTitle = '';
    this.newExamForm.courseCode = '';
    this.newExamForm.courseName = '';
  }

  // Print Action
  printHallTicket() {
    window.print();
  }

  private showToast(msg: string) {
    this.successToast.set(msg);
    setTimeout(() => {
      this.successToast.set(null);
    }, 4500);
  }
}
