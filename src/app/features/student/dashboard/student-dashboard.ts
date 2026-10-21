import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { BroadcastService } from '../../../core/services/broadcast.service';
import { StudentAssignedTest, StudentJoinedClass, BroadcastItem, AdRegistrationRecord } from '../../../core/models';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.scss'
})
export class StudentDashboardComponent {
  readonly studentService = inject(StudentService);
  readonly broadcastService = inject(BroadcastService);

  readonly profile = this.studentService.profile;
  readonly joinedClasses = this.studentService.joinedClasses;
  readonly assignedTests = this.studentService.assignedTests;

  // Student-visible campaigns and hackathon broadcasts
  readonly availableCampaigns = computed(() => {
    return this.broadcastService.broadcastItems().filter(
      ad => ad.active && (ad.targetAudience === 'STUDENTS_ONLY' || ad.targetAudience === 'ALL')
    );
  });

  // Registrations submitted by this student
  readonly myCampaignRegistrations = computed(() => {
    const studentEmail = (this.profile().email || '').toLowerCase();
    const studentId = this.profile().studentId;
    return this.broadcastService.registrations().filter(r => 
      (r.studentEmail && r.studentEmail.toLowerCase() === studentEmail) || 
      (r.rollNumber && r.rollNumber === studentId)
    );
  });

  isRegistered(adId: string): boolean {
    return this.myCampaignRegistrations().some(r => r.adId === adId);
  }

  getRegistration(adId: string): AdRegistrationRecord | undefined {
    return this.myCampaignRegistrations().find(r => r.adId === adId);
  }

  openRegister(ad: BroadcastItem): void {
    this.broadcastService.openAdRegistration(ad);
  }

  openDetails(ad: BroadcastItem): void {
    this.broadcastService.openAdDetails(ad);
  }

  // Active exam in progress flag for banner
  readonly hasActiveExam = signal<boolean>(true);
  readonly activeExamTitle = signal<string>('Midterm Spoken Oral VIVA: Raft Consensus & CAP Theorem');
  readonly activeExamTimeRemaining = signal<string>('47 min');

  readonly upcomingEvents = signal<{ title: string; imageUrl: string; dateMonth: string; dateDay: string; category: string; timeAndVenue: string }[]>([
    {
      title: 'AI & ML Workshop 2026',
      imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600',
      dateMonth: 'OCT',
      dateDay: '15',
      category: 'WORKSHOP',
      timeAndVenue: '10:00 AM • Main Auditorium'
    },
    {
      title: 'Inter-College Hackathon',
      imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600',
      dateMonth: 'OCT',
      dateDay: '22',
      category: 'HACKATHON',
      timeAndVenue: '9:00 AM • CS Block Lab 3'
    }
  ]);

  // Suspension / Notice banner state
  readonly suspendedClass = computed(() => {
    return this.joinedClasses().find(c => c.status === 'SUSPENDED' || c.status === 'TERMINATED');
  });

  // Weakest CO for Diagnostic Recommendation
  readonly weakestCO = signal({
    code: 'CO2',
    name: 'Hardware Timers, Interrupt Machine Cycles & Serial UART',
    subject: 'CSE-354 (Advanced Embedded Systems)',
    scorePercent: 54.2,
    failureDiagnosis: 'Candidate displayed 38% hesitation during machine cycle calculations and timer auto-reload mode transitions.',
    remedialAction: '15-Minute Interactive Diagnostic Oral Drill on Timer Mode 2 Reload Arithmetic.'
  });

  // Quick stat cards
  readonly readinessOffset = computed(() => {
    // Circumference = 2 * PI * 45 = 282.74
    const radius = 45;
    const circ = 2 * Math.PI * radius;
    const percent = this.profile().overallReadinessIndex;
    return circ - (percent / 100) * circ;
  });

  dismissActiveBanner(): void {
    this.hasActiveExam.set(false);
  }
}
