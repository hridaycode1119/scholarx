import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole, StudentRegistrationData, MentorRegistrationData } from '../../../core/models/auth.model';

export type AuthMode = 'SIGN_IN' | 'SIGN_UP';
export type RegistrationRole = 'STUDENT' | 'MENTOR' | 'INSTITUTION';

export interface InstitutionInquiryData {
  institutionName: string;
  accreditationFocus: string;
  contactPerson: string;
  designation: string;
  officialEmail: string;
  phone: string;
  studentCount: string;
  notes: string;
}

export interface CelebrationInfo {
  title: string;
  subtitle: string;
  roleLabel: string;
  badgeText: string;
  icon: string;
  notificationMessage?: string;
  redirectUrl?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Auth Mode: SIGN_IN vs SIGN_UP (Toggleable on same page)
  readonly authMode = signal<AuthMode>('SIGN_IN');

  // Selected Roles for Sign In and Sign Up
  readonly selectedLoginRole = signal<UserRole>('STUDENT');
  readonly selectedRegisterRole = signal<RegistrationRole>('STUDENT');

  // General States
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  readonly rememberMe = signal<boolean>(false);
  readonly showForgotPasswordModal = signal<boolean>(false);
  readonly forgotEmail = signal<string>('');
  readonly forgotSent = signal<boolean>(false);
  readonly returnUrl = signal<string | null>(null);

  // Sign In Credentials
  readonly loginId = signal<string>('student@apex.edu');
  readonly password = signal<string>('student123');

  // Greeting info for login success
  readonly greetingName = signal<string>('');
  readonly isLoginSuccessful = signal<boolean>(false);

  // Celebration state for registration success
  readonly celebration = signal<CelebrationInfo | null>(null);

  // Student Form Model
  studentForm: StudentRegistrationData = {
    fullName: '',
    email: '',
    rollNumber: '',
    collegeName: 'Apex Institute of Technology',
    degreeProgram: 'B.Tech Computer Science & AI',
    department: 'Computer Science & Engineering',
    yearSemester: 'Year 3 / Sem 6',
    password: '',
    confirmPassword: ''
  };

  // Mentor Form Model
  mentorForm: MentorRegistrationData = {
    academicTitle: 'Prof.',
    fullName: '',
    email: '',
    facultyId: '',
    collegeName: 'Apex Institute of Technology',
    department: 'Computer Science & AI',
    designation: 'Senior Professor & Viva Mentor',
    teachingSpecialization: 'Distributed Systems, Microcontrollers, Operating Systems',
    isVivaExaminerAuthorized: true,
    password: '',
    confirmPassword: ''
  };

  // Institution Inquiry Model
  institutionForm: InstitutionInquiryData = {
    institutionName: '',
    accreditationFocus: 'NBA Tier-I & NAAC A++',
    contactPerson: '',
    designation: 'Dean of Academic Affairs',
    officialEmail: '',
    phone: '',
    studentCount: '5,000 - 15,000 Students',
    notes: ''
  };

  ngOnInit(): void {
    // Detect if user loaded via /register or has mode=signup
    if (this.router.url.includes('/register')) {
      this.authMode.set('SIGN_UP');
    }

    this.route.queryParams.subscribe(params => {
      if (params['mode']) {
        const m = params['mode'].toUpperCase();
        if (m === 'SIGNUP' || m === 'REGISTER' || m === 'SIGN_UP') {
          this.authMode.set('SIGN_UP');
        } else if (m === 'SIGNIN' || m === 'LOGIN' || m === 'SIGN_IN') {
          this.authMode.set('SIGN_IN');
        }
      }

      if (params['role']) {
        const r = params['role'].toUpperCase();
        if (r === 'STUDENT' || r === 'MENTOR' || r === 'ADMIN' || r === 'INSTITUTION') {
          if (this.authMode() === 'SIGN_IN') {
            const role = (r === 'INSTITUTION' ? 'ADMIN' : r) as UserRole;
            this.selectLoginRole(role);
          } else {
            const regRole = (r === 'ADMIN' ? 'INSTITUTION' : r) as RegistrationRole;
            this.selectRegisterRole(regRole);
          }
        }
      }

      if (params['returnUrl']) {
        this.returnUrl.set(params['returnUrl']);
      }
    });
  }

  // Same-Page Switcher between Sign In and Sign Up
  setAuthMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.celebration.set(null);

    // Update browser URL smoothly without refreshing page
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', mode === 'SIGN_IN' ? '/login' : '/register');
    }
  }

  toggleAuthMode(): void {
    this.setAuthMode(this.authMode() === 'SIGN_IN' ? 'SIGN_UP' : 'SIGN_IN');
  }

  // --- Role selection ---
  selectLoginRole(role: UserRole): void {
    this.selectedLoginRole.set(role);
    this.errorMessage.set(null);

    if (role === 'STUDENT') {
      this.loginId.set('student@apex.edu');
      this.password.set('student123');
    } else if (role === 'MENTOR') {
      this.loginId.set('mentor@apex.edu');
      this.password.set('mentor123');
    } else if (role === 'ADMIN') {
      this.loginId.set('admin@scholarx.org');
      this.password.set('AdminMaster#2026');
    }
  }

  selectRegisterRole(role: RegistrationRole): void {
    this.selectedRegisterRole.set(role);
    this.errorMessage.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  openForgotPassword(): void {
    this.forgotEmail.set(this.loginId());
    this.forgotSent.set(false);
    this.showForgotPasswordModal.set(true);
  }

  closeForgotPassword(): void {
    this.showForgotPasswordModal.set(false);
  }

  submitForgotPassword(): void {
    if (!this.forgotEmail().trim()) return;
    this.forgotSent.set(true);
    setTimeout(() => {
      this.showForgotPasswordModal.set(false);
      this.forgotSent.set(false);
    }, 2200);
  }

  // Quick fill sample credentials
  quickFill(role: UserRole): void {
    this.selectLoginRole(role);
  }

  // --- Sign In Action ---
  async onSubmitLogin(): Promise<void> {
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      const res = await this.authService.login({
        loginId: this.loginId(),
        password: this.password(),
        role: this.selectedLoginRole()
      });

      this.isSubmitting.set(false);

      if (res.success && res.user) {
        this.greetingName.set(res.user.name || 'Scholar');
        this.isLoginSuccessful.set(true);

        const dest = this.returnUrl() || res.redirectUrl || (this.selectedLoginRole() === 'MENTOR' ? '/mentor/dashboard' : this.selectedLoginRole() === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard');

        setTimeout(() => {
          this.router.navigateByUrl(dest);
        }, 1200);
      } else {
        this.errorMessage.set(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (e: any) {
      this.isSubmitting.set(false);
      this.errorMessage.set(e.message || 'Authentication error.');
    }
  }

  // Google Login demo
  async loginWithGoogle(): Promise<void> {
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      // Authenticate with sample student credentials for Google demo
      const res = await this.authService.login({
        loginId: 'student@apex.edu',
        password: 'student123',
        role: 'STUDENT'
      });

      this.isSubmitting.set(false);

      if (res.success && res.user) {
        this.greetingName.set(res.user.name || 'Google Scholar');
        this.isLoginSuccessful.set(true);
        setTimeout(() => {
          this.router.navigateByUrl('/student/dashboard');
        }, 1200);
      }
    } catch {
      this.isSubmitting.set(false);
      this.errorMessage.set('Google sign in demo encountered an issue.');
    }
  }

  // Quick fill demo registration data
  quickFillStudentRegister(): void {
    const rnd = Math.floor(1000 + Math.random() * 9000);
    this.studentForm = {
      fullName: 'Aarav Sharma',
      email: `aarav.${rnd}@apex.edu`,
      rollNumber: `CS26B${rnd}`,
      collegeName: 'Apex Institute of Technology',
      degreeProgram: 'B.Tech Computer Science & AI',
      department: 'Computer Science & Engineering',
      yearSemester: 'Year 3 / Sem 6',
      password: 'password123',
      confirmPassword: 'password123'
    };
    this.errorMessage.set(null);
  }

  quickFillMentorRegister(): void {
    const rnd = Math.floor(100 + Math.random() * 900);
    this.mentorForm = {
      academicTitle: 'Dr.',
      fullName: 'Prof. Rajesh Kulkarni',
      email: `rajesh.kulkarni${rnd}@apex.edu`,
      facultyId: `FAC-CSE-${rnd}`,
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Science & Engineering',
      designation: 'Associate Professor & Viva Head',
      teachingSpecialization: 'Distributed Systems & Operating Systems',
      isVivaExaminerAuthorized: true,
      password: 'password123',
      confirmPassword: 'password123'
    };
    this.errorMessage.set(null);
  }

  async onSubmitStudentRegister(): Promise<void> {
    this.errorMessage.set(null);

    if (!this.studentForm.confirmPassword) {
      this.studentForm.confirmPassword = this.studentForm.password;
    }

    if (!this.studentForm.fullName.trim() || !this.studentForm.email.trim() || !this.studentForm.password) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.studentForm.password !== this.studentForm.confirmPassword) {
      this.errorMessage.set('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (this.studentForm.password.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters long.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const res = await this.authService.registerStudent(this.studentForm);
      this.isSubmitting.set(false);

      if (res.success) {
        this.celebration.set({
          title: `Welcome to ScholarX, ${this.studentForm.fullName}! 🎉`,
          subtitle: 'Your student account has been created. Your academic Viva Studio and PYQ repository are now ready.',
          roleLabel: 'Student Profile Activated',
          badgeText: 'Registration Complete',
          icon: 'school',
          redirectUrl: '/student/dashboard'
        });

        setTimeout(() => {
          this.router.navigateByUrl('/student/dashboard');
        }, 1800);
      } else {
        this.errorMessage.set(res.error || 'Registration failed. Please check your data.');
      }
    } catch (e: any) {
      this.isSubmitting.set(false);
      this.errorMessage.set(e.message || 'An error occurred during registration.');
    }
  }

  async onSubmitMentorRegister(): Promise<void> {
    this.errorMessage.set(null);

    if (!this.mentorForm.confirmPassword) {
      this.mentorForm.confirmPassword = this.mentorForm.password;
    }

    if (!this.mentorForm.fullName.trim() || !this.mentorForm.email.trim() || !this.mentorForm.password) {
      this.errorMessage.set('Please fill out all required faculty fields.');
      return;
    }

    if (this.mentorForm.password !== this.mentorForm.confirmPassword) {
      this.errorMessage.set('Passwords do not match. Please verify your password entry.');
      return;
    }

    if (this.mentorForm.password.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters long.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const res = await this.authService.registerMentor(this.mentorForm);
      this.isSubmitting.set(false);

      if (res.success) {
        this.celebration.set({
          title: `Welcome, ${this.mentorForm.academicTitle} ${this.mentorForm.fullName}! 🎓`,
          subtitle: 'Your faculty profile has been created with oral examination copilot privileges.',
          roleLabel: 'Faculty & Viva Mentor',
          badgeText: 'Faculty Account Activated',
          icon: 'co_present',
          notificationMessage: 'Your account will be ready, and will send the notification.',
          redirectUrl: '/mentor/dashboard'
        });

        setTimeout(() => {
          this.router.navigateByUrl('/mentor/dashboard');
        }, 2200);
      } else {
        this.errorMessage.set(res.error || 'Faculty registration failed. Please check inputs.');
      }
    } catch (e: any) {
      this.isSubmitting.set(false);
      this.errorMessage.set(e.message || 'An error occurred during faculty registration.');
    }
  }

  onSubmitInstitutionInquiry(): void {
    if (!this.institutionForm.institutionName.trim() || !this.institutionForm.officialEmail.trim()) {
      this.errorMessage.set('Please provide the institution name and official email.');
      return;
    }

    this.isSubmitting.set(true);

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.celebration.set({
        title: 'Institutional Partnership Request Received 🏛️',
        subtitle: `Thank you for connecting ${this.institutionForm.institutionName} with ScholarX.`,
        roleLabel: 'Institutional Partner Inquiry',
        badgeText: 'Request Received',
        icon: 'admin_panel_settings',
        notificationMessage: 'Our institutional onboarding team will review your campus framework and contact your academic administration within 24 hours.',
        redirectUrl: '/'
      });
    }, 800);
  }
}
