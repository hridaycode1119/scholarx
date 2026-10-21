import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, filter } from 'rxjs';
import { BroadcastService } from './core/services/broadcast.service';
import { StudentService } from './core/services/student.service';
import { AuthService } from './core/services/auth.service';
import { DATA_PROVIDER } from './core/api/api-provider.token';
import { BroadcastItem, MentorNotification } from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly provider = inject(DATA_PROVIDER);
  readonly broadcastService = inject(BroadcastService);
  readonly studentService = inject(StudentService);
  readonly authService = inject(AuthService);

  title = 'ScholarX — Enterprise Academic Portal';
  mentorName = 'Prof. Aris Thorne';

  readonly mentorNotifications = signal<MentorNotification[]>([]);
  readonly unreadMentorNotifCount = computed(() => this.mentorNotifications().filter(n => !n.read).length);
  readonly isSidebarCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(collapsed => !collapsed);
  }

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map((e: any) => e.urlAfterRedirects || e.url)
    ),
    { initialValue: this.router.url }
  );

  readonly isPublicPage = computed(() => {
    const url = this.currentUrl() || '';
    return url === '' || url === '/' || url.startsWith('/home') || url.startsWith('/login') || url.startsWith('/register');
  });

  readonly isAuthPage = computed(() => {
    const url = this.currentUrl() || '';
    return url.startsWith('/login') || url.startsWith('/register');
  });

  readonly currentPageTitle = computed(() => {
    const url = this.currentUrl() || '';
    if (url.includes('/student/dashboard')) return 'Student Overview';
    if (url.includes('/student/viva')) return 'Live Viva Co-Pilot';
    if (url.includes('/student/simulator')) return 'Viva Simulator';
    if (url.includes('/student/classes')) return 'Classrooms';
    if (url.includes('/student/practice')) return 'Practice & Quizzes';
    if (url.includes('/student/profile')) return 'Student Profile';
    if (url.includes('/student/support')) return 'Help & Support';
    if (url.includes('/student/settings')) return 'Settings';

    if (url.includes('/admin/dashboard')) return 'Administration Overview';
    if (url.includes('/admin/workload')) return 'Faculty Workload';
    if (url.includes('/admin/exam-scheduler')) return 'Exam Scheduler';
    if (url.includes('/admin/permissions')) return 'Security & RBAC';
    if (url.includes('/admin/institutions')) return 'Campuses & Institutions';
    if (url.includes('/admin/broadcasting')) return 'Broadcasting & Ads';
    if (url.includes('/admin/ai-engine')) return 'AI Engine Control';
    if (url.includes('/admin/user-directory')) return 'User Directory';
    if (url.includes('/admin/settings')) return 'System Settings';

    if (url.includes('/mentor/dashboard')) return 'Faculty Deck';
    if (url.includes('/mentor/classes')) return 'Classrooms & Batches';
    if (url.includes('/mentor/assessments/generate')) return 'AI Assessment Generator';
    if (url.includes('/mentor/assessments')) return 'Assessments Hub';
    if (url.includes('/mentor/proctoring')) return 'Live Proctoring Console';
    if (url.includes('/mentor/reports')) return 'Reports Hub';

    return 'Portal';
  });


  ngOnInit(): void {
    this.loadMentorNotifications();
    this.initRealTimeChannel();
  }

  private initRealTimeChannel(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      const channel = new BroadcastChannel('viva_enrollment_channel');
      channel.onmessage = (event) => {
        const data = event.data;
        if (data && (data.type === 'STUDENT_JOIN_REQUEST' || data.type === 'ENROLLMENT_APPROVED')) {
          this.loadMentorNotifications();
        }
      };
    } catch (e) {}
  }

  loadMentorNotifications(): void {
    this.provider.getNotifications().subscribe({
      next: (notifs) => this.mentorNotifications.set(notifs)
    });
  }

  markMentorNotifRead(id: string): void {
    this.provider.markNotificationAsRead(id).subscribe({
      next: () => {
        this.mentorNotifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
      }
    });
  }

  markAllMentorNotifsRead(): void {
    this.provider.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.mentorNotifications.update(list => list.map(n => ({ ...n, read: true })));
      }
    });
  }

  get isStudentMode(): boolean {
    const active = this.currentUrl() || '';
    if (active && active !== '/') {
      return active.startsWith('/student');
    }
    if (typeof window !== 'undefined' && window.location.pathname) {
      return window.location.pathname.startsWith('/student');
    }
    return false;
  }

  get isAdminMode(): boolean {
    const active = this.currentUrl() || '';
    if (active && active !== '/') {
      return active.startsWith('/admin');
    }
    if (typeof window !== 'undefined' && window.location.pathname) {
      return window.location.pathname.startsWith('/admin');
    }
    return false;
  }

  get isMentorDashboard(): boolean {
    const active = this.currentUrl() || '';
    if (active && active !== '/') {
      return active === '/mentor/dashboard' || active === '/';
    }
    if (typeof window !== 'undefined' && window.location.pathname) {
      return window.location.pathname === '/mentor/dashboard' || window.location.pathname === '/';
    }
    return false;
  }

  logout(): void {
    this.authService.logout();
  }

  get currentUserName(): string {
    if (this.isStudentMode) {
      return this.studentService.profile().fullName || 'Sahil Kumar';
    }
    return this.authService.currentUser()?.name || this.mentorName;
  }

  get currentUserEmail(): string {
    if (this.isStudentMode) {
      return this.studentService.profile().email || 'sahil.k@apex.edu';
    }
    return this.authService.currentUser()?.email || 'aris.t@apex.edu';
  }


  // Student/Mentor Notification Flyout State
  readonly showNotificationFlyout = signal<boolean>(false);

  // Global Quick Join Class Modal
  readonly showGlobalJoinModal = signal<boolean>(false);
  readonly globalJoinInput = signal<string>('');
  readonly globalJoinToast = signal<string | null>(null);

  toggleNotificationFlyout(): void {
    this.showNotificationFlyout.update(v => !v);
    if (this.showNotificationFlyout() && !this.isStudentMode) {
      this.loadMentorNotifications();
    }
  }

  openGlobalJoinModal(): void {
    this.globalJoinInput.set('');
    this.showGlobalJoinModal.set(true);
  }

  toggleTheme(): void {
    const current = this.studentService.themePreference();
    const next = current === 'light' ? 'dark' : 'light';
    this.studentService.setTheme(next);
  }

  closeGlobalJoinModal(): void {
    this.showGlobalJoinModal.set(false);
  }

  submitGlobalJoin(): void {
    const code = this.globalJoinInput().trim();
    if (!code) return;

    const res = this.studentService.submitJoinCode(code);
    this.showGlobalJoinModal.set(false);
    this.globalJoinToast.set(res.message);
    setTimeout(() => this.globalJoinToast.set(null), 5000);

    if (this.isStudentMode) {
      this.router.navigate(['/student/classes']);
    }
  }

  // Student Registration Form State
  registrationForm = {
    studentName: 'Rahul Sharma',
    studentEmail: 'rahul.s@apex.edu',
    rollNumber: '20230121',
    collegeName: 'Apex Institute of Technology',
    department: 'Computer Science & Engineering',
    yearSemester: 'Year 3 / Sem 6',
    phone: '+91 98765 43210',
    statementOrRemarks: 'Project proposal on distributed consensus algorithm visualization for educational classrooms.'
  };

  readonly registrationSuccessToast = signal<string | null>(null);

  submitRegistration(ad: BroadcastItem): void {
    if (!this.registrationForm.studentName.trim() || !this.registrationForm.studentEmail.trim()) return;

    this.broadcastService.submitStudentRegistration({
      adId: ad.id,
      adTitle: ad.title,
      studentName: this.registrationForm.studentName,
      studentEmail: this.registrationForm.studentEmail,
      rollNumber: this.registrationForm.rollNumber,
      collegeName: this.registrationForm.collegeName,
      department: this.registrationForm.department,
      yearSemester: this.registrationForm.yearSemester,
      phone: this.registrationForm.phone,
      statementOrRemarks: this.registrationForm.statementOrRemarks,
      mentorId: ad.assignedMentorId || 'SX-M401',
      mentorName: ad.assignedMentorName || 'Prof. Aris Thorne'
    });

    this.broadcastService.closeAdRegistration();
    this.broadcastService.dismissPopupAd();

    const mentor = ad.assignedMentorName || 'Prof. Aris Thorne';
    const mentorId = ad.assignedMentorId || 'SX-M401';
    const college = ad.sponsorCollege || 'Apex Institute of Technology';

    this.registrationSuccessToast.set(
      `✅ Registration Submitted! Your student data has been routed directly to ${mentor} (${mentorId}) at ${college}.`
    );
    setTimeout(() => this.registrationSuccessToast.set(null), 6000);
  }
}

