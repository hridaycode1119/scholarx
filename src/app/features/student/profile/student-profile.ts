import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-profile.html',
  styleUrl: './student-profile.scss'
})
export class StudentProfileComponent {
  readonly studentService = inject(StudentService);
  readonly profile = this.studentService.profile;
  readonly themePreference = this.studentService.themePreference;

  @ViewChild('avatarInput') avatarInputRef?: ElementRef<HTMLInputElement>;

  // Editable form state
  formData = {
    fullName: this.profile().fullName,
    email: this.profile().email,
    phone: this.profile().phone,
    collegeName: this.profile().collegeName,
    department: this.profile().department,
    program: this.profile().program,
    semester: this.profile().semester,
    batch: this.profile().batch,
    section: this.profile().section || 'B.Tech CSE-6A',
    primaryMentorName: this.profile().primaryMentorName,
    primaryMentorCode: this.profile().primaryMentorCode,
    primaryMentorEmail: this.profile().primaryMentorEmail
  };

  readonly isSaving = signal<boolean>(false);
  readonly saveToastMessage = signal<string | null>(null);

  saveProfile(): void {
    this.isSaving.set(true);

    setTimeout(() => {
      this.studentService.profile.update(p => ({
        ...p,
        fullName: this.formData.fullName,
        email: this.formData.email,
        phone: this.formData.phone,
        collegeName: this.formData.collegeName,
        department: this.formData.department,
        program: this.formData.program,
        semester: this.formData.semester,
        batch: this.formData.batch,
        section: this.formData.section,
        primaryMentorName: this.formData.primaryMentorName,
        primaryMentorCode: this.formData.primaryMentorCode,
        primaryMentorEmail: this.formData.primaryMentorEmail
      }));

      this.isSaving.set(false);
      this.saveToastMessage.set('Academic credentials and mentor binding saved to registrar record.');
      setTimeout(() => this.saveToastMessage.set(null), 4000);
    }, 350);
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
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          this.studentService.profile.update(p => ({ ...p, avatarUrl: result }));
          this.saveToastMessage.set('Official student photo updated.');
          setTimeout(() => this.saveToastMessage.set(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  }
}

