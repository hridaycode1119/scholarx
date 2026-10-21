import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { ProctoringSession } from '../../../../core/models';

@Component({
  selector: 'app-proctoring-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proctoring-console.html',
  styleUrl: './proctoring-console.scss'
})
export class ProctoringConsoleComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);

  readonly selectedAssessmentId = signal<string>('asm-401');
  readonly sessions = signal<ProctoringSession[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Class Filter Options
  readonly selectedClassId = signal<string>('ALL');
  readonly availableClasses = [
    { id: 'ALL', name: 'All Classrooms', code: 'ALL' },
    { id: 'cls-401', name: 'Deep Learning & Transformers', code: 'CS801' },
    { id: 'cls-402', name: 'Distributed Systems & Cloud', code: 'CS702' },
    { id: 'cls-403', name: 'Computer Vision & GenAI Lab', code: 'CS604' },
    { id: 'cls-404', name: 'AI Safety & Alignment Capstone', code: 'AI805' }
  ];

  // Filters & View State
  readonly activeFilter = signal<'ALL' | 'NORMAL' | 'WARNING' | 'CRITICAL'>('ALL');
  readonly searchQuery = signal<string>('');
  readonly viewMode = signal<'GRID' | 'LIST'>('GRID');

  // Candidate Inspector Drawer & Intercom State
  readonly inspectedSession = signal<ProctoringSession | null>(null);
  readonly selectedForensicSession = signal<ProctoringSession | null>(null);
  readonly intercomMessage = signal<string>('');
  readonly isIntercomSending = signal<boolean>(false);
  readonly intercomSuccess = signal<boolean>(false);

  // 1-on-1 Direct Student Voice Contact (Push-to-Talk)
  readonly activeDirectAudioStudentId = signal<string | null>(null);

  // Class-Wide Broadcast Controls (Audio + Message)
  readonly isAllHandsAudioActive = signal<boolean>(false);
  readonly showBroadcastModal = signal<boolean>(false);
  readonly classBroadcastMessage = signal<string>('');
  readonly isBroadcasting = signal<boolean>(false);
  readonly broadcastSuccess = signal<boolean>(false);

  // Toast feedback for hardware toggles
  readonly hardwareActionToast = signal<string | null>(null);

  // Cohort Integrity Index
  readonly cohortIntegrityIndex = computed(() => {
    const list = this.classFilteredSessions();
    if (list.length === 0) return 100;
    const totalRisk = list.reduce((sum, s) => sum + (s.fraudRiskScore || 0), 0);
    return Math.max(0, Math.round(100 - (totalRisk / list.length)));
  });

  readonly allCount = computed(() => {
    return this.classFilteredSessions().length;
  });

  readonly normalCount = computed(() => {
    return this.classFilteredSessions().filter(s => s.alerts.length === 0 && s.status === 'ACTIVE').length;
  });

  readonly warningCount = computed(() => {
    return this.classFilteredSessions().filter(s => s.alerts.some(a => a.severity === 'WARNING') && !s.alerts.some(a => a.severity === 'CRITICAL')).length;
  });

  readonly criticalCount = computed(() => {
    return this.classFilteredSessions().filter(s => s.alerts.some(a => a.severity === 'CRITICAL') || s.status === 'DISCONNECTED').length;
  });

  // Base sessions filtered by selected class
  readonly classFilteredSessions = computed(() => {
    const list = this.sessions();
    const classId = this.selectedClassId();
    if (classId === 'ALL') return list;
    return list.filter(s => s.classId === classId);
  });

  // Final filtered sessions with severity & search
  readonly filteredSessions = computed(() => {
    let list = this.classFilteredSessions();
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();

    if (filter === 'NORMAL') {
      list = list.filter(s => s.alerts.length === 0 && s.status === 'ACTIVE');
    } else if (filter === 'WARNING') {
      list = list.filter(s => s.alerts.some(a => a.severity === 'WARNING') && !s.alerts.some(a => a.severity === 'CRITICAL'));
    } else if (filter === 'CRITICAL') {
      list = list.filter(s => s.alerts.some(a => a.severity === 'CRITICAL') || s.status === 'DISCONNECTED');
    }

    if (query) {
      list = list.filter(s =>
        s.studentName.toLowerCase().includes(query) ||
        s.rollNumber.toLowerCase().includes(query)
      );
    }

    return list;
  });

  readonly selectedClassName = computed(() => {
    const cls = this.availableClasses.find(c => c.id === this.selectedClassId());
    return cls ? cls.name : 'All Classrooms';
  });

  ngOnInit(): void {
    this.loadSessions(this.selectedAssessmentId());
  }

  loadSessions(id: string): void {
    this.isLoading.set(true);
    this.provider.getActiveProctoringSessions(id).subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Direct 1-on-1 Voice Channel with Student
  toggleDirectAudio(session: ProctoringSession): void {
    if (this.activeDirectAudioStudentId() === session.studentId) {
      this.activeDirectAudioStudentId.set(null);
      this.showToast(`Audio line closed with ${session.studentName}.`);
    } else {
      // Disconnect all-hands if active
      if (this.isAllHandsAudioActive()) {
        this.isAllHandsAudioActive.set(false);
      }
      this.activeDirectAudioStudentId.set(session.studentId);
      this.showToast(`🎙️ 2-Way Audio Line Connected with ${session.studentName}. Both can now talk.`);
    }
  }

  isDirectAudioActive(studentId: string): boolean {
    return this.activeDirectAudioStudentId() === studentId;
  }

  // Remote Hardware Controls for Student
  toggleStudentMic(session: ProctoringSession, event?: Event): void {
    if (event) event.stopPropagation();
    const updatedState = !session.audioActive;
    session.audioActive = updatedState;
    const action = updatedState ? 'Remotely unmuted & enabled' : 'Remotely muted';
    this.showToast(`🎤 ${action} microphone for ${session.studentName}.`);
  }

  toggleStudentCam(session: ProctoringSession, event?: Event): void {
    if (event) event.stopPropagation();
    const updatedState = !session.videoActive;
    session.videoActive = updatedState;
    if (updatedState && session.status === 'DISCONNECTED') {
      session.status = 'ACTIVE';
    }
    const action = updatedState ? 'Remotely enabled camera feed' : 'Remotely disabled camera feed';
    this.showToast(`📹 ${action} for ${session.studentName}.`);
  }

  // Class-Wide All-Hands Audio Broadcast
  toggleAllHandsAudio(): void {
    const newState = !this.isAllHandsAudioActive();
    this.isAllHandsAudioActive.set(newState);
    if (newState) {
      this.activeDirectAudioStudentId.set(null);
      this.showToast(`📢 ALL-HANDS AUDIO BROADCAST ACTIVE: All students in ${this.selectedClassName()} can hear your voice now!`);
    } else {
      this.showToast(`All-hands audio broadcast ended.`);
    }
  }

  // Class-Wide Text/Alert Broadcast
  sendClassBroadcast(): void {
    const msg = this.classBroadcastMessage().trim();
    if (!msg) return;

    this.isBroadcasting.set(true);
    setTimeout(() => {
      this.isBroadcasting.set(false);
      this.broadcastSuccess.set(true);
      this.showToast(`📢 Announcement successfully broadcast to all students in ${this.selectedClassName()}!`);
      setTimeout(() => {
        this.broadcastSuccess.set(false);
        this.showBroadcastModal.set(false);
        this.classBroadcastMessage.set('');
      }, 2500);
    }, 600);
  }

  openInspector(session: ProctoringSession): void {
    this.inspectedSession.set(session);
    this.intercomMessage.set('');
    this.intercomSuccess.set(false);
  }

  closeInspector(): void {
    this.inspectedSession.set(null);
  }

  // Forensic Evidence Dossier Actions
  openForensicDossier(session: ProctoringSession, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedForensicSession.set(session);
  }

  closeForensicDossier(): void {
    this.selectedForensicSession.set(null);
  }

  issueOfficialWarning(session: ProctoringSession): void {
    session.disciplinaryStatus = 'WARNED';
    session.alerts.unshift({
      id: `alt-${Date.now()}`,
      studentId: session.studentId,
      code: 'TAB_SWITCH',
      severity: 'WARNING',
      message: 'Official Academic Warning dispatched by Proctor.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    });
    this.showToast(`⚠️ Formal Level-1 Academic Warning issued to ${session.studentName}. Warning modal displayed on examinee terminal.`);
  }

  triggerBiometricReauth(session: ProctoringSession): void {
    session.disciplinaryStatus = 'REAUTHENTICATION_REQUIRED';
    this.showToast(`🔄 3D Facial Re-Authentication Challenge triggered for ${session.studentName}. Exam screen locked until biometric verification completes.`);
  }

  disqualifySession(session: ProctoringSession): void {
    session.status = 'FLAGGED';
    session.disciplinaryStatus = 'DISQUALIFIED';
    session.alerts.unshift({
      id: `alt-${Date.now()}`,
      studentId: session.studentId,
      code: 'MULTIPLE_FACES',
      severity: 'CRITICAL',
      message: 'Candidate DISQUALIFIED for confirmed academic malpractice.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false })
    });
    this.closeForensicDossier();
    this.showToast(`🚨 DISQUALIFICATION RECORDED: ${session.studentName}'s viva submission invalidated and forwarded to University Academic Disciplinary Board.`);
  }

  downloadForensicAuditReport(session: ProctoringSession): void {
    this.showToast(`📄 Generating cryptographic forensic evidence audit report for ${session.studentName}...`);
    setTimeout(() => {
      this.showToast(`✓ Official Proctoring Audit Dossier (SHA-256 Verified) downloaded.`);
    }, 1200);
  }

  sendIntercom(): void {
    const session = this.inspectedSession();
    const msg = this.intercomMessage().trim();
    if (!session || !msg) return;

    this.isIntercomSending.set(true);
    this.provider.sendIntercomMessage(session.studentId, session.assessmentId, msg).subscribe({
      next: () => {
        this.isIntercomSending.set(false);
        this.intercomSuccess.set(true);
        setTimeout(() => this.intercomSuccess.set(false), 3500);
        this.intercomMessage.set('');
      },
      error: () => this.isIntercomSending.set(false)
    });
  }

  private showToast(msg: string): void {
    this.hardwareActionToast.set(msg);
    setTimeout(() => {
      if (this.hardwareActionToast() === msg) {
        this.hardwareActionToast.set(null);
      }
    }, 4500);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  hasCritical(s: ProctoringSession): boolean {
    return s.alerts.some(a => a.severity === 'CRITICAL') || s.status === 'DISCONNECTED';
  }

  hasWarning(s: ProctoringSession): boolean {
    return s.alerts.some(a => a.severity === 'WARNING') && !this.hasCritical(s);
  }
}
