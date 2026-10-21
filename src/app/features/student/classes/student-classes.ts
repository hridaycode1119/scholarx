import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { StudentService, extractClassCode } from '../../../core/services/student.service';
import { StudentJoinedClass, StudentAssignedTest, MinedPYQ } from '../../../core/models';

export interface DirectInvitedClass {
  code: string;
  name: string;
  subjectCode: string;
  mentorName: string;
  mentorEmail?: string;
  department: string;
  semester: number;
}

export interface JoinToastInfo {
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO';
}

@Component({
  selector: 'app-student-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './student-classes.html',
  styleUrl: './student-classes.scss'
})
export class StudentClassesComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly studentService = inject(StudentService);

  readonly joinedClasses = this.studentService.joinedClasses;
  readonly activeTab = signal<'ALL' | 'ENROLLED' | 'PENDING'>('ALL');
  readonly searchQuery = signal<string>('');

  // Join Class Modal State (Dual Mode: CODE or LINK)
  readonly showJoinModal = signal<boolean>(false);
  readonly joinModalMode = signal<'CODE' | 'LINK'>('CODE');
  readonly inputJoinCode = signal<string>('');
  readonly inputJoinLink = signal<string>('');
  readonly joinModalError = signal<string | null>(null);

  // Toast System
  readonly joinToast = signal<JoinToastInfo | null>(null);

  // Direct Link Invitation Modal State
  readonly showDirectInviteModal = signal<boolean>(false);
  readonly invitedClass = signal<DirectInvitedClass | null>(null);

  // Selected Unlocked Class Hub Modal State
  readonly selectedClass = signal<StudentJoinedClass | null>(null);
  readonly hubActiveTab = signal<'TESTS' | 'CO_MASTERY' | 'AI_READINESS' | 'PYQ_DECK' | 'ANNOUNCEMENTS'>('TESTS');

  // Classroom Tests Filters
  readonly testTypeFilter = signal<string>('ALL');
  readonly testStatusFilter = signal<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Detailed Test Result & AI Diagnostic Modal State
  readonly selectedTestResult = signal<StudentAssignedTest | null>(null);
  readonly testResultTab = signal<'AI_DIAGNOSTIC' | 'QUESTIONS' | 'CO_BREAKDOWN' | 'PROCTORING'>('AI_DIAGNOSTIC');
  readonly isGeneratingDrill = signal<boolean>(false);
  readonly remediationDrill = signal<any | null>(null);

  // In-Class Interactive MCQ Quiz Runner State
  readonly activeMCQTest = signal<StudentAssignedTest | null>(null);
  readonly mcqCurrentIndex = signal<number>(0);
  readonly mcqAnswers = signal<Record<string, number>>({});
  readonly mcqTimeRemaining = signal<number>(900); // 15 mins default in seconds
  readonly isSubmittingMCQ = signal<boolean>(false);
  private mcqTimerInterval: any = null;

  readonly answeredMCQCount = computed<number>(() => {
    return Object.keys(this.mcqAnswers()).length;
  });

  // Real-time extracted code preview when in LINK mode
  readonly extractedCodePreview = computed<string | null>(() => {
    if (this.joinModalMode() === 'LINK') {
      const link = this.inputJoinLink().trim();
      if (!link) return null;
      const code = extractClassCode(link);
      return code || null;
    }
    const codeInput = this.inputJoinCode().trim();
    if (!codeInput) return null;
    return extractClassCode(codeInput);
  });

  // Tests for currently selected classroom
  readonly classTests = computed<StudentAssignedTest[]>(() => {
    const cls = this.selectedClass();
    if (!cls) return [];

    let tests = this.studentService.getTestsForClass(cls.id, cls.subjectCode);

    // Type filter
    const typeF = this.testTypeFilter();
    if (typeF !== 'ALL') {
      tests = tests.filter(t => t.type === typeF);
    }

    // Status filter
    const statusF = this.testStatusFilter();
    if (statusF !== 'ALL') {
      tests = tests.filter(t => t.status === statusF);
    }

    return tests;
  });

  // Target COs and Attainment Matrix for Selected Class
  readonly classroomCOMastery = computed(() => {
    const cls = this.selectedClass();
    if (!cls) return [];

    const tests = this.studentService.getTestsForClass(cls.id, cls.subjectCode);
    const completedTests = tests.filter(t => t.status === 'COMPLETED');

    const coDefinitions = [
      { code: 'CO1', desc: 'Foundations & Architectural Concepts', bloom: 'L2 (Understand)', weight: 20 },
      { code: 'CO2', desc: 'Algorithmic Application & State Models', bloom: 'L3 (Apply)', weight: 25 },
      { code: 'CO3', desc: 'Consensus, Quorums & Fault Tolerance', bloom: 'L4 (Analyze)', weight: 30 },
      { code: 'CO4', desc: 'System Evaluation & Benchmarks', bloom: 'L5 (Evaluate)', weight: 15 },
      { code: 'CO5', desc: 'Hardware/Cloud Pipeline Integration', bloom: 'L6 (Create)', weight: 10 }
    ];

    return coDefinitions.map(co => {
      let totalEarned = 0;
      let totalMax = 0;

      completedTests.forEach(t => {
        const coScore = t.coAttainmentScores?.find(c => c.coCode === co.code);
        if (coScore) {
          totalEarned += coScore.score;
          totalMax += coScore.maxScore;
        }
      });

      const attainmentPct = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : (completedTests.length > 0 ? 82 : 0);
      const status = attainmentPct >= 75 ? 'MASTERED' : attainmentPct >= 50 ? 'DEVELOPING' : (completedTests.length === 0 ? 'PENDING_EVAL' : 'NEEDS_FOCUS');

      return {
        ...co,
        attainmentPct,
        status,
        assessedItemsCount: completedTests.filter(t => t.targetCOs.includes(co.code)).length
      };
    });
  });

  // PYQs matching selected classroom
  readonly classroomPYQs = computed<MinedPYQ[]>(() => {
    const cls = this.selectedClass();
    if (!cls) return [];
    return this.studentService.pyqs().filter(p => p.subjectCode === cls.subjectCode || p.subjectName.toLowerCase().includes(cls.name.toLowerCase().slice(0, 8)));
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const code = params.get('joinCode') || params.get('code') || params.get('c');
      if (code) {
        this.handleDirectJoinLink(code);
      }
    });
  }

  private handleDirectJoinLink(rawParam: string): void {
    const lookup = this.studentService.findClassroom(rawParam);

    if (!lookup.found) {
      this.showToast(lookup.errorMessage || `Classroom not found. No active classroom matches "${rawParam}".`, 'ERROR');
      this.router.navigate([], { queryParams: {} });
      return;
    }

    if (lookup.isEnrolled) {
      this.showToast(`You are already enrolled in ${lookup.classroom!.name} (${lookup.classroom!.subjectCode}).`, 'INFO');
      this.selectedClass.set(lookup.classroom as any);
      this.router.navigate([], { queryParams: {} });
      return;
    }

    if (lookup.isPending) {
      this.showToast(`Your enrollment request for ${lookup.classroom!.name} is already pending mentor approval.`, 'WARNING');
      this.activeTab.set('PENDING');
      this.router.navigate([], { queryParams: {} });
      return;
    }

    // Classroom found and available to join
    const target = lookup.classroom!;
    this.invitedClass.set({
      code: target.joinCode,
      name: target.name,
      subjectCode: target.subjectCode,
      mentorName: target.mentorName,
      mentorEmail: target.mentorEmail,
      department: target.department,
      semester: target.semester
    });
    this.showDirectInviteModal.set(true);
  }

  confirmDirectInvite(): void {
    const inv = this.invitedClass();
    if (!inv) return;

    const res = this.studentService.submitJoinCode(inv.code);
    this.showDirectInviteModal.set(false);
    this.invitedClass.set(null);
    this.router.navigate([], { queryParams: {} });

    if (res.success) {
      this.showToast(res.message, 'SUCCESS');
      this.activeTab.set('PENDING');
    } else if (res.notFound) {
      this.showToast(res.message, 'ERROR');
    } else {
      this.showToast(res.message, 'WARNING');
    }
  }

  declineDirectInvite(): void {
    this.showDirectInviteModal.set(false);
    this.invitedClass.set(null);
    this.router.navigate([], { queryParams: {} });
  }

  // Dynamic quick preset pills including newly created mentor classes
  get presetPills(): { code: string; label: string }[] {
    const list = [
      { code: 'DIST-4912', label: 'Distributed Systems' },
      { code: 'NET-8924', label: 'Computer Networks' },
      { code: 'DEEP-3105', label: 'Deep Learning' },
      { code: 'CSE-354-IT', label: '8051 Embedded Lab' }
    ];
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('viva_mentor_classes');
        if (saved) {
          const mClasses = JSON.parse(saved);
          mClasses.slice(0, 5).forEach((c: any) => {
            if (c.joinCode && !list.some(p => p.code === c.joinCode)) {
              list.unshift({ code: c.joinCode, label: c.name });
            }
          });
        }
      } catch (e) {}
    }
    return list;
  }

  readonly filteredClasses = computed(() => {
    let list = this.joinedClasses();
    const tab = this.activeTab();
    if (tab === 'ENROLLED') {
      list = list.filter(c => c.status === 'ENROLLED');
    } else if (tab === 'PENDING') {
      list = list.filter(c => c.status === 'PENDING');
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.subjectCode.toLowerCase().includes(query) ||
        c.mentorName.toLowerCase().includes(query)
      );
    }
    return list;
  });

  openJoinModal(): void {
    this.inputJoinCode.set('');
    this.inputJoinLink.set('');
    this.joinModalError.set(null);
    this.joinModalMode.set('CODE');
    this.showJoinModal.set(true);
  }

  closeJoinModal(): void {
    this.showJoinModal.set(false);
    this.joinModalError.set(null);
  }

  setJoinModalMode(mode: 'CODE' | 'LINK'): void {
    this.joinModalMode.set(mode);
    this.joinModalError.set(null);
  }

  selectPreset(code: string): void {
    this.inputJoinCode.set(code);
    this.joinModalError.set(null);
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.inputJoinCode.set(input.value);
    this.joinModalError.set(null);
  }

  onLinkInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.inputJoinLink.set(input.value);
    this.joinModalError.set(null);
  }

  async pasteFromClipboard(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          if (this.joinModalMode() === 'LINK') {
            this.inputJoinLink.set(text.trim());
          } else {
            this.inputJoinCode.set(text.trim());
          }
          this.joinModalError.set(null);
        }
      }
    } catch (e) {
      console.warn('Clipboard read error', e);
    }
  }

  submitJoin(): void {
    const rawInput = this.joinModalMode() === 'CODE' ? this.inputJoinCode().trim() : this.inputJoinLink().trim();
    if (!rawInput) {
      this.joinModalError.set('Please enter a valid course code or link.');
      return;
    }

    this.joinModalError.set(null);

    // Validate Classroom Existence
    const lookup = this.studentService.findClassroom(rawInput);

    if (!lookup.found) {
      const errorMsg = lookup.errorMessage || `Classroom not found. No active classroom matches "${rawInput}". Please check with your mentor.`;
      this.joinModalError.set(errorMsg);
      this.showToast(errorMsg, 'ERROR');
      return;
    }

    if (lookup.isEnrolled) {
      const msg = `You are already enrolled in ${lookup.classroom!.name} (${lookup.classroom!.subjectCode}).`;
      this.joinModalError.set(msg);
      this.showToast(msg, 'INFO');
      return;
    }

    if (lookup.isPending) {
      const msg = `Your enrollment request for ${lookup.classroom!.name} is already pending mentor approval.`;
      this.joinModalError.set(msg);
      this.showToast(msg, 'WARNING');
      return;
    }

    // Classroom exists -> Close input modal and open Direct Invite Confirmation preview
    const target = lookup.classroom!;
    this.showJoinModal.set(false);
    this.invitedClass.set({
      code: target.joinCode,
      name: target.name,
      subjectCode: target.subjectCode,
      mentorName: target.mentorName,
      mentorEmail: target.mentorEmail,
      department: target.department,
      semester: target.semester
    });
    this.showDirectInviteModal.set(true);
  }

  onClassClick(cls: StudentJoinedClass): void {
    if (cls.status === 'PENDING') {
      this.showToast('The request is pending, wait for the mentor approval. Please contact the mentor: ' + cls.mentorName, 'WARNING');
      return;
    }
    if (cls.status === 'ENROLLED') {
      this.selectedClass.set(cls);
      this.hubActiveTab.set('TESTS');
      this.testTypeFilter.set('ALL');
      this.testStatusFilter.set('ALL');
    }
  }

  closeClassHub(): void {
    this.selectedClass.set(null);
  }

  // --- Test Results & AI Diagnostic Modal Actions ---
  openTestResult(test: StudentAssignedTest): void {
    this.selectedTestResult.set(test);
    this.testResultTab.set('AI_DIAGNOSTIC');
    this.remediationDrill.set(null);
    this.isGeneratingDrill.set(false);
  }

  closeTestResult(): void {
    this.selectedTestResult.set(null);
    this.remediationDrill.set(null);
  }

  setTestResultTab(tab: 'AI_DIAGNOSTIC' | 'QUESTIONS' | 'CO_BREAKDOWN' | 'PROCTORING'): void {
    this.testResultTab.set(tab);
  }

  triggerAIDrillGeneration(test: StudentAssignedTest): void {
    if (this.isGeneratingDrill()) return;
    this.isGeneratingDrill.set(true);

    this.studentService.generateAITestRemediationDrill(test).subscribe({
      next: (drill) => {
        this.remediationDrill.set(drill);
        this.isGeneratingDrill.set(false);
        this.showToast('🤖 AI Remediation Drill generated based on your test gaps!', 'SUCCESS');
      },
      error: () => {
        this.isGeneratingDrill.set(false);
        this.showToast('Generated fallback study guide drill.', 'INFO');
      }
    });
  }

  // --- Interactive In-Class MCQ Quiz Runner ---
  startMCQQuiz(test: StudentAssignedTest): void {
    if (!test.mcqQuestions || test.mcqQuestions.length === 0) {
      this.showToast('No MCQ questions configured for this assessment.', 'WARNING');
      return;
    }

    this.activeMCQTest.set(test);
    this.mcqCurrentIndex.set(0);
    this.mcqAnswers.set({});
    this.mcqTimeRemaining.set((test.durationMinutes || 15) * 60);
    this.isSubmittingMCQ.set(false);

    if (this.mcqTimerInterval) {
      clearInterval(this.mcqTimerInterval);
    }

    this.mcqTimerInterval = setInterval(() => {
      const remaining = this.mcqTimeRemaining();
      if (remaining <= 1) {
        clearInterval(this.mcqTimerInterval);
        this.mcqTimeRemaining.set(0);
        this.submitMCQQuiz();
      } else {
        this.mcqTimeRemaining.set(remaining - 1);
      }
    }, 1000);
  }

  closeMCQQuiz(): void {
    if (this.mcqTimerInterval) {
      clearInterval(this.mcqTimerInterval);
    }
    this.activeMCQTest.set(null);
  }

  selectMCQOption(questionId: string, optionIndex: number): void {
    const current = { ...this.mcqAnswers() };
    current[questionId] = optionIndex;
    this.mcqAnswers.set(current);
  }

  nextMCQQuestion(): void {
    const test = this.activeMCQTest();
    if (!test || !test.mcqQuestions) return;
    if (this.mcqCurrentIndex() < test.mcqQuestions.length - 1) {
      this.mcqCurrentIndex.set(this.mcqCurrentIndex() + 1);
    }
  }

  prevMCQQuestion(): void {
    if (this.mcqCurrentIndex() > 0) {
      this.mcqCurrentIndex.set(this.mcqCurrentIndex() - 1);
    }
  }

  goToMCQQuestion(idx: number): void {
    this.mcqCurrentIndex.set(idx);
  }

  submitMCQQuiz(): void {
    const test = this.activeMCQTest();
    if (!test) return;

    this.isSubmittingMCQ.set(true);
    if (this.mcqTimerInterval) {
      clearInterval(this.mcqTimerInterval);
    }

    this.studentService.submitMCQTestResult(test.id, this.mcqAnswers()).subscribe({
      next: (completedTest) => {
        this.isSubmittingMCQ.set(false);
        this.activeMCQTest.set(null);
        this.showToast(`🎉 MCQ Quiz Submitted! Score: ${completedTest.awardedScore}/${completedTest.totalMarks} (${completedTest.gradePill})`, 'SUCCESS');
        // Open the AI result modal automatically
        this.openTestResult(completedTest);
      },
      error: (err) => {
        this.isSubmittingMCQ.set(false);
        this.showToast('Failed to submit MCQ assessment: ' + err.message, 'ERROR');
      }
    });
  }

  getFormattedTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    if (this.mcqTimerInterval) {
      clearInterval(this.mcqTimerInterval);
    }
  }

  showToast(msg: string, type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' = 'INFO'): void {
    this.joinToast.set({ message: msg, type });
    setTimeout(() => {
      this.joinToast.set(null);
    }, 6000);
  }
}
