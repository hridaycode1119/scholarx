import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DATA_PROVIDER } from '../../../core/api/api-provider.token';
import { BroadcastService } from '../../../core/services/broadcast.service';
import { MentorClass, Assessment, EnrollmentRequest } from '../../../core/models';

export interface ClassProgressSummary {
  id: string;
  name: string;
  subjectCode: string;
  joinCode: string;
  semester: number;
  department: string;
  enrolledCount: number;
  averageScore: number;
  gradeBadge: string;
  gradeBadgeColor: string;
  progressPercent: number;
  completedVivas: number;
  totalVivas: number;
  passRate: number;
  statusLabel: string;
  statusColor: string;
  distribution: { aPlus: number; a: number; b: number; remedial: number };
}

@Component({
  selector: 'app-mentor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mentor-dashboard.html',
  styleUrl: './mentor-dashboard.scss'
})
export class MentorDashboardComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);
  readonly broadcastService = inject(BroadcastService);

  readonly mentorName = signal<string>('Prof. Aris Thorne');
  readonly facultyId = signal<string>('SX-M401');
  readonly department = signal<string>('Dept: Computer Science & AI');
  readonly attendanceRate = signal<number>(94.2);

  readonly classes = signal<MentorClass[]>([]);
  readonly assessments = signal<Assessment[]>([]);
  readonly pendingRequests = signal<EnrollmentRequest[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Search/filter query for classes
  readonly classFilterQuery = signal<string>('');

  // Computed Class Performance & Progress List for all generated classrooms
  readonly classSummaries = computed<ClassProgressSummary[]>(() => {
    const clsList = this.classes();
    return clsList.map((cls, idx) => {
      let avg = 78.4;
      let progress = 75;
      let pass = 91.5;
      let comp = 3;
      let tot = 4;
      let dist = { aPlus: 32, a: 48, b: 15, remedial: 5 };

      if (cls.subjectCode?.includes('302') || cls.id === 'cls-302') {
        avg = 82.6;
        progress = 85;
        pass = 94.2;
        comp = 4;
        tot = 4;
        dist = { aPlus: 42, a: 44, b: 10, remedial: 4 };
      } else if (cls.subjectCode?.includes('501') || cls.id === 'cls-501') {
        avg = 86.1;
        progress = 60;
        pass = 96.0;
        comp = 2;
        tot = 3;
        dist = { aPlus: 55, a: 35, b: 8, remedial: 2 };
      } else if (idx > 2) {
        // Dynamic newly generated classes
        avg = Number((76.5 + (idx % 3) * 3.2).toFixed(1));
        progress = Math.min(100, 50 + (idx % 4) * 10);
        pass = Number((88.0 + (idx % 3) * 2.5).toFixed(1));
        comp = 1;
        tot = 2;
        dist = { aPlus: 28, a: 50, b: 18, remedial: 4 };
      }

      let gradeBadge = 'B+';
      let gradeBadgeColor = 'text-amber-800 bg-amber-50 border-amber-200';
      let statusLabel = 'On Track';
      let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';

      if (avg >= 85) {
        gradeBadge = 'A+';
        gradeBadgeColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
        statusLabel = 'High Distinction';
        statusColor = 'text-emerald-800 bg-emerald-100 border-emerald-300';
      } else if (avg >= 80) {
        gradeBadge = 'A';
        gradeBadgeColor = 'text-[#0B4A39] bg-[#E6F4F0] border-[#A7F3D0]';
        statusLabel = 'Exceeding Benchmark';
        statusColor = 'text-[#0B4A39] bg-[#E6F4F0] border-[#0B4A39]/20';
      } else if (avg < 70) {
        gradeBadge = 'C';
        gradeBadgeColor = 'text-rose-800 bg-rose-50 border-rose-200';
        statusLabel = 'Needs Attention';
        statusColor = 'text-rose-800 bg-rose-100 border-rose-300';
      }

      return {
        id: cls.id,
        name: cls.name,
        subjectCode: cls.subjectCode,
        joinCode: cls.joinCode || 'CLASS-' + cls.id.slice(-4).toUpperCase(),
        semester: cls.semester || 7,
        department: cls.department || 'Computer Science',
        enrolledCount: cls.enrolledCount || 35,
        averageScore: avg,
        gradeBadge,
        gradeBadgeColor,
        progressPercent: progress,
        completedVivas: comp,
        totalVivas: tot,
        passRate: pass,
        statusLabel,
        statusColor,
        distribution: dist
      };
    });
  });

  // Filtered classes by query
  readonly filteredClassSummaries = computed(() => {
    const query = this.classFilterQuery().trim().toLowerCase();
    const list = this.classSummaries();
    if (!query) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.subjectCode.toLowerCase().includes(query) ||
      c.joinCode.toLowerCase().includes(query) ||
      c.department.toLowerCase().includes(query)
    );
  });

  // Institutional Aggregate Cohort Metrics
  readonly cohortOverallAverage = computed(() => {
    const list = this.classSummaries();
    if (!list.length) return 0;
    const sum = list.reduce((acc, c) => acc + c.averageScore, 0);
    return Number((sum / list.length).toFixed(1));
  });

  readonly cohortTotalEnrolled = computed(() => {
    return this.classSummaries().reduce((acc, c) => acc + c.enrolledCount, 0);
  });

  readonly cohortAvgProgress = computed(() => {
    const list = this.classSummaries();
    if (!list.length) return 0;
    const sum = list.reduce((acc, c) => acc + c.progressPercent, 0);
    return Math.round(sum / list.length);
  });

  readonly topPerformingClass = computed(() => {
    const list = this.classSummaries();
    if (!list.length) return null;
    return [...list].sort((a, b) => b.averageScore - a.averageScore)[0];
  });

  // Student chat & candidate queue mock
  readonly contacts = signal([
    { name: 'Dr. Aisha Khan', role: 'Faculty AI', status: 'Online', online: true },
    { name: 'Rahul Sharma', role: 'Student (CS401)', status: 'Online', online: true },
    { name: 'Prof. Li Wei', role: 'Faculty Networks', status: 'Active', online: false },
    { name: 'Ananya Sen', role: 'Student (CS401)', status: 'Online', online: true },
    { name: 'TA Group', role: 'Course Assistants', status: 'New msg', online: true }
  ]);

  readonly upcomingTasks = signal([
    { title: 'Oral VIVA Session — Batch A', deadline: '2:00 PM Tomorrow', type: 'VIVA' },
    { title: 'Review CO Attainment Gap for CO4', deadline: 'Oct 14, 2026', type: 'CO' },
    { title: 'Publish Midterm Questions Set', deadline: 'Oct 18, 2026', type: 'TEST' }
  ]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.provider.getMentorClasses().subscribe({
      next: (cls) => {
        this.classes.set(cls);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.provider.getAssessments().subscribe({
      next: (asms) => this.assessments.set(asms)
    });

    this.provider.getEnrollmentRequests().subscribe({
      next: (reqs) => this.pendingRequests.set(reqs)
    });
  }

  updateClassFilter(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.classFilterQuery.set(val);
  }
}
