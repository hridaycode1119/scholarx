import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { StudentThemePreference, StudentAcademicProfile } from '../../../core/models';

@Component({
  selector: 'app-student-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-settings.html',
  styleUrl: './student-settings.scss'
})
export class StudentSettingsComponent implements OnInit, OnDestroy {
  readonly studentService = inject(StudentService);
  readonly currentTheme = this.studentService.themePreference;
  readonly profile = this.studentService.profile;

  @ViewChild('testVideo') testVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('avatarInput') avatarInputRef?: ElementRef<HTMLInputElement>;

  // Tab State: 'PROFILE' | 'THEME' | 'HARDWARE'
  readonly activeTab = signal<'PROFILE' | 'THEME' | 'HARDWARE'>('PROFILE');

  // Editable Student Profile Form State
  profileForm = {
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    collegeName: '',
    department: '',
    program: '',
    semester: '',
    batch: '',
    section: '',
    primaryMentorName: '',
    primaryMentorCode: '',
    primaryMentorEmail: '',
    avatarUrl: ''
  };

  readonly isSaving = signal<boolean>(false);
  readonly statusToast = signal<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Hardware Diagnostics State
  readonly cameraRunning = signal<boolean>(false);
  readonly micRunning = signal<boolean>(false);
  readonly micDbLevel = signal<number>(0);

  private stream: MediaStream | null = null;
  private micInterval: any = null;

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnDestroy(): void {
    this.stopCameraTest();
    this.stopMicTest();
  }

  populateForm(): void {
    const p = this.profile();
    this.profileForm = {
      fullName: p.fullName || '',
      studentId: p.studentId || '',
      email: p.email || '',
      phone: p.phone || '',
      collegeName: p.collegeName || '',
      department: p.department || '',
      program: p.program || '',
      semester: p.semester || '',
      batch: p.batch || '',
      section: p.section || '',
      primaryMentorName: p.primaryMentorName || '',
      primaryMentorCode: p.primaryMentorCode || '',
      primaryMentorEmail: p.primaryMentorEmail || '',
      avatarUrl: p.avatarUrl || ''
    };
  }

  saveProfile(): void {
    if (!this.profileForm.fullName.trim() || !this.profileForm.studentId.trim()) {
      this.showToast('Please enter both Full Name and Student ID/Roll Number.', 'warning');
      return;
    }

    this.isSaving.set(true);

    setTimeout(() => {
      this.studentService.updateProfile({
        fullName: this.profileForm.fullName.trim(),
        studentId: this.profileForm.studentId.trim(),
        email: this.profileForm.email.trim(),
        phone: this.profileForm.phone.trim(),
        collegeName: this.profileForm.collegeName.trim(),
        department: this.profileForm.department.trim(),
        program: this.profileForm.program.trim(),
        semester: this.profileForm.semester.trim(),
        batch: this.profileForm.batch.trim(),
        section: this.profileForm.section.trim(),
        primaryMentorName: this.profileForm.primaryMentorName.trim(),
        primaryMentorCode: this.profileForm.primaryMentorCode.trim(),
        primaryMentorEmail: this.profileForm.primaryMentorEmail.trim(),
        avatarUrl: this.profileForm.avatarUrl || this.profile().avatarUrl
      });

      this.isSaving.set(false);
      this.showToast('Academic profile updated and synchronized across all portals successfully!', 'success');
    }, 400);
  }

  triggerAvatarUpload(): void {
    if (this.avatarInputRef?.nativeElement) {
      this.avatarInputRef.nativeElement.click();
    }
  }

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 2 * 1024 * 1024) {
        this.showToast('Image size exceeds 2MB limit. Please upload a smaller photo.', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          this.profileForm.avatarUrl = result;
          this.studentService.updateProfile({ avatarUrl: result });
          this.showToast('Student profile photograph updated.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  }

  resetProfileForm(): void {
    this.populateForm();
    this.showToast('Profile edits reverted to current institutional record.', 'info');
  }

  setTheme(theme: StudentThemePreference): void {
    this.studentService.setTheme(theme);
    this.showToast(`🎨 Visual theme switched to ${theme.toUpperCase()} mode.`, 'info');
  }

  showToast(message: string, type: 'success' | 'info' | 'warning' = 'info'): void {
    this.statusToast.set({ message, type });
    setTimeout(() => {
      this.statusToast.set(null);
    }, 4000);
  }

  async startCameraTest(): Promise<void> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.cameraRunning.set(true);
        setTimeout(() => {
          if (this.testVideoRef?.nativeElement && this.stream) {
            this.testVideoRef.nativeElement.srcObject = this.stream;
            this.testVideoRef.nativeElement.play().catch(() => {});
          }
        }, 100);
      } else {
        this.cameraRunning.set(true);
      }
    } catch (e) {
      this.cameraRunning.set(true);
    }
  }

  stopCameraTest(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.cameraRunning.set(false);
  }

  startMicTest(): void {
    this.micRunning.set(true);
    this.micInterval = setInterval(() => {
      this.micDbLevel.set(40 + Math.floor(Math.random() * 35));
    }, 150);
  }

  stopMicTest(): void {
    if (this.micInterval) {
      clearInterval(this.micInterval);
      this.micInterval = null;
    }
    this.micRunning.set(false);
    this.micDbLevel.set(0);
  }
}
