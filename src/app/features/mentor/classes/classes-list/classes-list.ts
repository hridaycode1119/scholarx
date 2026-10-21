import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { MentorClass, CreateClassDto } from '../../../../core/models';

@Component({
  selector: 'app-classes-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './classes-list.html',
  styleUrl: './classes-list.scss'
})
export class ClassesListComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);

  readonly classes = signal<MentorClass[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly showCreateModal = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly copiedCodeId = signal<string | null>(null);
  readonly copiedLinkId = signal<string | null>(null);
  readonly searchQuery = signal<string>('');
  readonly classCreatedSuccess = signal<MentorClass | null>(null);
  readonly liveJoinToast = signal<string | null>(null);

  readonly totalPendingCount = computed(() => 
    this.classes().reduce((sum, c) => sum + (c.pendingRequestsCount || 0), 0)
  );

  private enrollmentChannel: BroadcastChannel | null = null;

  // Form State
  newClass: CreateClassDto = {
    name: '',
    subject: '',
    subjectCode: '',
    department: 'Computer Science',
    semester: 5,
    academicYear: '2026-2027',
    description: ''
  };

  ngOnInit(): void {
    this.loadClasses();
    this.initEnrollmentListener();
  }

  private initEnrollmentListener(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this.enrollmentChannel = new BroadcastChannel('viva_enrollment_channel');
      this.enrollmentChannel.onmessage = (event) => {
        const data = event.data;
        if (data && data.type === 'STUDENT_JOIN_REQUEST') {
          this.loadClasses();
          this.liveJoinToast.set(`🔔 Student ${data.studentName} (${data.studentId}) requested to join ${data.className || 'a class'}!`);
          setTimeout(() => this.liveJoinToast.set(null), 6000);
        }
      };
    } catch (e) {}
  }

  loadClasses(): void {
    this.isLoading.set(true);
    this.provider.getMentorClasses().subscribe({
      next: (data) => {
        this.classes.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getJoinLink(classItem: MentorClass): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
    return `${origin}/student/classes?joinCode=${classItem.joinCode}`;
  }

  copyJoinLink(classItem: MentorClass): void {
    const link = this.getJoinLink(classItem);
    navigator.clipboard.writeText(link);
    this.copiedLinkId.set(classItem.id);
    setTimeout(() => this.copiedLinkId.set(null), 2500);
  }

  copyJoinCode(classItem: MentorClass): void {
    navigator.clipboard.writeText(classItem.joinCode);
    this.copiedCodeId.set(classItem.id);
    setTimeout(() => this.copiedCodeId.set(null), 2500);
  }

  openCreateModal(): void {
    this.newClass = {
      name: '',
      subject: '',
      subjectCode: '',
      department: 'Computer Science',
      semester: 5,
      academicYear: '2026-2027',
      description: ''
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateClass(): void {
    if (!this.newClass.name || !this.newClass.subjectCode) return;

    this.isSubmitting.set(true);
    this.provider.createClass(this.newClass).subscribe({
      next: (created) => {
        this.classes.update(prev => [created, ...prev]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.classCreatedSuccess.set(created);
        setTimeout(() => this.classCreatedSuccess.set(null), 10000);
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  get filteredClasses(): MentorClass[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.classes();
    return this.classes().filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.subjectCode.toLowerCase().includes(q) ||
      c.joinCode.toLowerCase().includes(q)
    );
  }
}
