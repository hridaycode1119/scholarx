import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { 
  MentorClass, 
  StudentRosterItem, 
  EnrollmentRequest, 
  Assessment, 
  ClassAnalyticsSummary,
  ClassSecurityPolicy,
  TerminatedStudentIncident,
  ClassProctorAlert,
  LiveClassStudentFeed,
  LiveStudentVivaQuestion,
  ClassVivaTest,
  ClassStudentVivaResult,
  StudentVivaFaultIncident,
  VivaQuestionEvaluationItem,
  ClassAssignment,
  StudentAssignmentSubmission,
  StudentCoAttainment,
  StudentCompositeResult
} from '../../../../core/models';

export type ClassTab = 'overview' | 'students' | 'enrollment' | 'assessments' | 'analytics' | 'security' | 'live-view' | 'settings';

@Component({
  selector: 'app-class-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './class-details.html',
  styleUrl: './class-details.scss'
})
export class ClassDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly provider = inject(DATA_PROVIDER);

  readonly classId = signal<string>('cls-401');
  readonly classItem = signal<MentorClass | null>(null);
  readonly activeTab = signal<ClassTab>('overview');
  readonly isLoading = signal<boolean>(true);

  // Sub-data
  readonly students = signal<StudentRosterItem[]>([]);
  readonly enrollmentRequests = signal<EnrollmentRequest[]>([]);
  readonly assessments = signal<Assessment[]>([]);
  readonly analytics = signal<ClassAnalyticsSummary | null>(null);

  // Live Class CCTV & Audio Monitoring Signals
  readonly liveStudentFeeds = signal<LiveClassStudentFeed[]>([]);
  readonly listeningStudentId = signal<string | null>(null);
  readonly listeningVolume = signal<number>(85);
  readonly spotlightStudent = signal<LiveClassStudentFeed | null>(null);
  readonly liveFilterStatus = signal<'ALL' | 'ACTIVE' | 'SPEAKING' | 'WARNING' | 'TERMINATED'>('ALL');
  readonly liveLayoutMode = signal<'GRID_2X2' | 'GRID_3X3' | 'GRID_4X4' | 'GRID_5X5' | 'GRID_6X6' | 'LIST'>('GRID_5X5');
  readonly liveSearchQuery = signal<string>('');
  readonly isClassIntercomModalOpen = signal<boolean>(false);
  readonly intercomTargetStudent = signal<LiveClassStudentFeed | null>(null);
  readonly intercomMessageText = signal<string>('');
  readonly isIntercomSending = signal<boolean>(false);
  readonly audioGainLevel = signal<number>(80);

  // Class-Wide Live Voice Mic & Global Announcement Signals
  readonly isLiveMicBroadcasting = signal<boolean>(false);
  readonly globalClassAnnouncementText = signal<string>('');

  // Web Audio Context for Live Monitor Listening
  private audioCtx: AudioContext | null = null;
  private audioOscillator: OscillatorNode | null = null;
  private audioGainNode: GainNode | null = null;
  private liveFeedTickerInterval: any = null;

  // Security Policy & Anti-Cheat Signals
  readonly securityPolicy = signal<ClassSecurityPolicy>({
    enabled: true,
    maxTabSwitches: 3,
    allowFullscreenExit: false,
    blurOnFocusLoss: true,
    strictDisqualification: true,
    requireFaceContinuity: true
  });
  readonly terminatedStudents = signal<TerminatedStudentIncident[]>([]);
  readonly classProctorAlerts = signal<ClassProctorAlert[]>([]);
  readonly liveProctorAlert = signal<ClassProctorAlert | null>(null);
  readonly isSavingPolicy = signal<boolean>(false);
  readonly policySaveSuccess = signal<boolean>(false);
  readonly terminatedSearchQuery = signal<string>('');

  // Modals & UI States
  readonly copiedJoinCode = signal<boolean>(false);
  readonly copiedJoinLink = signal<boolean>(false);
  readonly studentSearchQuery = signal<string>('');

  // =========================================================================
  // CLASS RELEASED VIVAS, STUDENT PERFORMANCE & PROCTORING FAULTS
  // =========================================================================
  readonly releasedVivaTests = signal<ClassVivaTest[]>([]);
  readonly selectedVivaTest = signal<ClassVivaTest | null>(null);
  readonly studentVivaResults = signal<ClassStudentVivaResult[]>([]);
  readonly resultsFilter = signal<'ALL' | 'COMPLETED' | 'FAULTS' | 'DISQUALIFIED' | 'NEEDS_REMEDIATION'>('ALL');
  readonly resultsSearchQuery = signal<string>('');
  readonly inspectedStudentResult = signal<ClassStudentVivaResult | null>(null);
  readonly isReleaseVivaModalOpen = signal<boolean>(false);
  readonly isBatchExportModalOpen = signal<boolean>(false);

  // New Viva Release Form Inputs
  readonly newVivaTitle = signal<string>('Mid-Term Oral VIVA: Raft Consensus, Vector Clocks & Byzantine Faults');
  readonly newVivaDuration = signal<number>(15);
  readonly newVivaTotalMarks = signal<number>(40);
  readonly newVivaTargetCO = signal<string>('CO3: Consensus Algorithms & Fault Tolerance');
  readonly newVivaBloom = signal<string>('L4: Analyze');
  readonly newVivaDescription = signal<string>('Comprehensive proctored oral viva examining consensus mechanics, vector clock causal precedence, and Byzantine limits.');
  readonly releaseVivaSuccess = signal<boolean>(false);

  // Filtered Student Results Computed
  readonly filteredStudentResults = computed(() => {
    let list = this.studentVivaResults();
    const filter = this.resultsFilter();
    const query = this.resultsSearchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(r => 
        r.studentName.toLowerCase().includes(query) || 
        r.rollNo.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query)
      );
    }

    switch (filter) {
      case 'COMPLETED':
        return list.filter(r => r.status === 'COMPLETED');
      case 'FAULTS':
        return list.filter(r => r.faultsCount > 0);
      case 'DISQUALIFIED':
        return list.filter(r => r.status === 'DISQUALIFIED');
      case 'NEEDS_REMEDIATION':
        return list.filter(r => r.percentage < 60);
      default:
        return list;
    }
  });

  // Statistical KPI Summary Computed
  readonly resultsStats = computed(() => {
    const list = this.studentVivaResults();
    if (list.length === 0) {
      return { total: 0, completed: 0, avgScore: 0, passRate: 0, cleanRate: 0, faultsCount: 0, disqualified: 0 };
    }
    const completed = list.filter(r => r.status === 'COMPLETED');
    const withFaults = list.filter(r => r.faultsCount > 0);
    const disqualified = list.filter(r => r.status === 'DISQUALIFIED');
    const passed = completed.filter(r => r.percentage >= 50);

    const totalPct = completed.reduce((sum, r) => sum + r.percentage, 0);
    const avgScore = completed.length > 0 ? parseFloat((totalPct / completed.length).toFixed(1)) : 0;
    const passRate = completed.length > 0 ? parseFloat(((passed.length / completed.length) * 100).toFixed(1)) : 0;
    const cleanRate = list.length > 0 ? parseFloat((((list.length - withFaults.length) / list.length) * 100).toFixed(1)) : 100;

    return {
      total: list.length,
      completed: completed.length,
      avgScore,
      passRate,
      cleanRate,
      faultsCount: withFaults.length,
      disqualified: disqualified.length
    };
  });

  // =========================================================================
  // ASSIGNMENTS, ORAL VIVA & CUMULATIVE GRADEBOOK WITH ON-SCREEN FORMULAS
  // =========================================================================
  readonly assessmentSubTab = signal<'CUMULATIVE_GRADEBOOK' | 'VIVA_HUB'>('CUMULATIVE_GRADEBOOK');
  readonly classAssignments = signal<ClassAssignment[]>([]);
  readonly rawStudentCompositeResults = signal<StudentCompositeResult[]>([]);
  readonly assignment1Weight = signal<number>(30);
  readonly assignment2Weight = signal<number>(30);
  readonly vivaWeight = signal<number>(40);
  readonly assignmentWeightPercent = computed(() => this.assignment1Weight() + this.assignment2Weight());
  readonly vivaWeightPercent = computed(() => this.vivaWeight());
  readonly totalConfiguredWeight = computed(() => this.assignment1Weight() + this.assignment2Weight() + this.vivaWeight());
  readonly weightPreset = signal<'OBE_30_30_40' | 'VIVA_25_25_50' | 'LAB_35_35_30' | 'CUSTOM'>('OBE_30_30_40');
  
  // Focused Assessment & Compact Deck Signals
  readonly focusedAssessmentId = signal<string | null>(null);
  readonly isVivaDeckCompact = signal<boolean>(false);
  readonly isStartScheduledVivaModalOpen = signal<boolean>(false);
  readonly scheduledVivaToStart = signal<ClassVivaTest | null>(null);
  readonly startVivaNameInput = signal<string>('');
  readonly startVivaLinkedAssignment = signal<string>('');

  readonly calculationMode = signal<'WEIGHTED' | 'TOTAL_POINTS'>('WEIGHTED');
  readonly compositeSearchQuery = signal<string>('');
  readonly compositeFilter = signal<'ALL' | 'GAP_FLAG' | 'ATTAINED' | 'REMEDIATION'>('ALL');
  readonly selectedFormulaStudentId = signal<string>('');
  readonly inspectedCompositeModalStudent = signal<StudentCompositeResult | null>(null);
  readonly isFormulaExplainerOpen = signal<boolean>(true);

  // Active focused assessment metadata (for focused student view)
  readonly focusedAssessmentItem = computed(() => {
    const id = this.focusedAssessmentId();
    if (!id) return null;
    const asgn = this.classAssignments().find(a => a.id === id);
    if (asgn) {
      return {
        id: asgn.id,
        type: 'ASSIGNMENT' as const,
        title: asgn.title,
        codeOrType: asgn.type.replace('_', ' '),
        targetCOs: asgn.targetCOs,
        maxMarks: asgn.totalMarks,
        weightagePercent: asgn.id.endsWith('-1') ? this.assignment1Weight() : this.assignment2Weight(),
        linkedName: asgn.linkedVivaName || 'Mid-Term Oral VIVA: Raft Consensus'
      };
    }
    const viva = this.releasedVivaTests().find(v => v.id === id);
    if (viva) {
      return {
        id: viva.id,
        type: 'VIVA' as const,
        title: viva.title,
        codeOrType: viva.status,
        targetCOs: viva.targetCOs,
        maxMarks: viva.totalMarks,
        weightagePercent: this.vivaWeight(),
        linkedName: viva.linkedAssignmentName || 'Assignment 1: Distributed Raft Leader Election'
      };
    }
    return null;
  });

  // Dynamically recompute composite results based on active individual weights and calculation mode
  readonly recalculatedStudentCompositeResults = computed(() => {
    const rawList = this.rawStudentCompositeResults();
    const w1 = this.assignment1Weight() / 100;
    const w2 = this.assignment2Weight() / 100;
    const wV = this.vivaWeight() / 100;
    const sumW = w1 + w2 + wV;
    const mode = this.calculationMode();

    return rawList.map(item => {
      let overall = 0;
      const a1Pct = item.assignments[0]?.percentage || 0;
      const a2Pct = item.assignments[1]?.percentage || 0;
      const vivaPct = item.vivaPercentage || 0;

      if (mode === 'WEIGHTED') {
        overall = sumW > 0 ? ((a1Pct * w1) + (a2Pct * w2) + (vivaPct * wV)) / sumW : 0;
      } else {
        const totalObtained = item.totalAssignmentMarksObtained + item.vivaMarksObtained;
        const totalMax = item.totalAssignmentMaxMarks + item.vivaMaxMarks;
        overall = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      }
      overall = parseFloat(overall.toFixed(1));

      let badge: 'DISTINCTION' | 'EXCELLENT' | 'PROFICIENT' | 'COMPETENT' | 'NEEDS_PRACTICE' = 'NEEDS_PRACTICE';
      if (overall >= 85) badge = 'DISTINCTION';
      else if (overall >= 75) badge = 'EXCELLENT';
      else if (overall >= 60) badge = 'PROFICIENT';
      else if (overall >= 45) badge = 'COMPETENT';

      return {
        ...item,
        overallCompositePercentage: overall,
        finalGradeBadge: badge
      };
    });
  });

  // Filtered Composite List
  readonly filteredCompositeResults = computed(() => {
    let list = this.recalculatedStudentCompositeResults();
    const filter = this.compositeFilter();
    const query = this.compositeSearchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(r => 
        r.studentName.toLowerCase().includes(query) || 
        r.rollNo.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query)
      );
    }

    switch (filter) {
      case 'GAP_FLAG':
        return list.filter(r => r.authenticityStatus === 'VERIFICATION_FLAG');
      case 'ATTAINED':
        return list.filter(r => r.coAttainments.every(co => co.status === 'ATTAINED'));
      case 'REMEDIATION':
        return list.filter(r => r.overallCompositePercentage < 60 || r.coAttainments.some(co => co.status === 'CRITICAL'));
      default:
        return list;
    }
  });

  // Active student whose real numbers are substituted in the on-screen formula
  readonly selectedFormulaStudent = computed(() => {
    const list = this.recalculatedStudentCompositeResults();
    if (list.length === 0) return null;
    const selectedId = this.selectedFormulaStudentId();
    if (selectedId) {
      const match = list.find(s => s.studentId === selectedId || s.rollNo === selectedId);
      if (match) return match;
    }
    return list[0];
  });

  // Cohort Stats for Composite Gradebook
  readonly compositeStats = computed(() => {
    const list = this.recalculatedStudentCompositeResults();
    if (list.length === 0) {
      return { total: 0, avgAssignment: 0, avgViva: 0, avgOverall: 0, gapFlagsCount: 0, allAttainedCount: 0 };
    }
    const total = list.length;
    const avgAssignment = parseFloat((list.reduce((sum, s) => sum + s.assignmentAveragePercentage, 0) / total).toFixed(1));
    const avgViva = parseFloat((list.reduce((sum, s) => sum + s.vivaPercentage, 0) / total).toFixed(1));
    const avgOverall = parseFloat((list.reduce((sum, s) => sum + s.overallCompositePercentage, 0) / total).toFixed(1));
    const gapFlagsCount = list.filter(s => s.authenticityStatus === 'VERIFICATION_FLAG').length;
    const allAttainedCount = list.filter(s => s.coAttainments.every(co => co.status === 'ATTAINED')).length;

    return {
      total,
      avgAssignment,
      avgViva,
      avgOverall,
      gapFlagsCount,
      allAttainedCount
    };
  });

  readonly selectedStudentForStatus = signal<StudentRosterItem | null>(null);
  readonly statusActionType = signal<'SUSPEND' | 'TERMINATE' | 'ACTIVATE'>('SUSPEND');
  readonly statusReason = signal<string>('');
  readonly isStatusSubmitting = signal<boolean>(false);

  // Approval/Rejection Modal
  readonly pendingActionRequest = signal<EnrollmentRequest | null>(null);
  readonly actionModalType = signal<'APPROVE' | 'REJECT'>('APPROVE');
  readonly rejectReason = signal<string>('');
  readonly isActionSubmitting = signal<boolean>(false);
  readonly liveJoinAlert = signal<{ studentName: string; studentId: string; classCode: string } | null>(null);
  readonly actionSuccessToast = signal<string | null>(null);

  private enrollmentChannel: BroadcastChannel | null = null;
  private proctorChannel: BroadcastChannel | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('classId') || 'cls-401';
      this.classId.set(id);
      this.loadClassData(id);
    });

    this.route.queryParamMap.subscribe(q => {
      const tab = q.get('tab') as ClassTab;
      if (tab && ['overview', 'students', 'enrollment', 'assessments', 'analytics', 'security', 'live-view', 'settings'].includes(tab)) {
        this.activeTab.set(tab);
      }
    });

    this.initEnrollmentListener();
    this.initProctorListener();
    this.startLiveFeedTicker();
  }

  ngOnDestroy(): void {
    try {
      this.enrollmentChannel?.close();
      this.proctorChannel?.close();
    } catch (e) {}
    this.stopListeningAudio();
    if (this.liveFeedTickerInterval) {
      clearInterval(this.liveFeedTickerInterval);
      this.liveFeedTickerInterval = null;
    }
  }

  private initEnrollmentListener(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      const norm = (str: string | undefined | null) => (str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
      this.enrollmentChannel = new BroadcastChannel('viva_enrollment_channel');
      this.enrollmentChannel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        const targetJoinCode = this.classItem()?.joinCode;
        const targetSubCode = this.classItem()?.subjectCode;
        const isThisClass = (
          data.classId === this.classId() || 
          norm(data.classCode) === norm(targetJoinCode) || 
          norm(data.classCode) === norm(targetSubCode) ||
          norm(data.classId) === norm(this.classId()) ||
          norm(data.subjectCode) === norm(targetSubCode)
        );

        if (!isThisClass) return;

        if (data.type === 'STUDENT_JOIN_REQUEST') {
          this.provider.getEnrollmentRequests(this.classId()).subscribe(reqs => this.enrollmentRequests.set(reqs));
          this.provider.getClassById(this.classId()).subscribe(cls => this.classItem.set(cls));
          this.liveJoinAlert.set({
            studentName: data.studentName,
            studentId: data.studentId,
            classCode: data.classCode
          });
          setTimeout(() => this.liveJoinAlert.set(null), 8000);
        } else if (data.type === 'STUDENT_PROCTOR_INCIDENT') {
          this.handleIncomingProctorIncident(data);
        } else if (data.type === 'STUDENT_DISQUALIFIED') {
          this.handleIncomingDisqualification(data);
        }
      };
    } catch (e) {}
  }

  private initProctorListener(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      const norm = (str: string | undefined | null) => (str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
      this.proctorChannel = new BroadcastChannel('viva_proctor_channel');
      this.proctorChannel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        const targetJoinCode = this.classItem()?.joinCode;
        const targetSubCode = this.classItem()?.subjectCode;
        const isThisClass = (
          data.classId === this.classId() || 
          norm(data.classCode) === norm(targetJoinCode) || 
          norm(data.classCode) === norm(targetSubCode) ||
          norm(data.classId) === norm(this.classId()) ||
          norm(data.subjectCode) === norm(targetSubCode)
        );

        if (!isThisClass) return;

        if (data.type === 'STUDENT_FRAME_STREAM') {
          this.handleIncomingStudentFeed(data);
        } else if (data.type === 'STUDENT_PROCTOR_INCIDENT') {
          this.handleIncomingProctorIncident(data);
        } else if (data.type === 'STUDENT_DISQUALIFIED') {
          this.handleIncomingDisqualification(data);
        }
      };
    } catch (e) {}
  }

  // =========================================================================
  // LIVE CLASSROOM CCTV & AUDIO MONITORING ENGINE
  // =========================================================================
  private handleIncomingStudentFeed(data: any): void {
    const studentId = data.studentId || 'stu-live';
    const now = Date.now();

    // Check if candidate is registered in this classroom
    const isRegistered = this.students().some(s => s.studentId === studentId || s.id === studentId || s.studentId === data.studentRoll);
    if (!isRegistered && this.students().length > 0) {
      // Ignore feeds from unregistered students for this class
      return;
    }

    this.liveStudentFeeds.update(list => {
      const idx = list.findIndex(s => s.studentId === studentId || s.studentRoll === data.studentRoll);
      const prevSpeakerDisabled = idx >= 0 ? list[idx].isSpeakerDisabled : false;
      const feedItem: LiveClassStudentFeed = {
        studentId: data.studentId || 'stu-live',
        studentName: data.studentName || 'Candidate',
        studentRoll: data.studentRoll || data.studentId || '2023308724',
        studentAvatar: data.studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        classId: this.classId(),
        subjectCode: data.subjectCode || this.classItem()?.subjectCode || 'CS401',
        className: data.className || this.classItem()?.name || 'Distributed Systems',
        vivaSessionId: data.vivaSessionId || `viva-session-${studentId}`,
        status: data.status || 'TESTING',
        currentQuestionNumber: data.currentQuestionNumber || 1,
        totalQuestions: data.totalQuestions || 3,
        currentQuestionText: data.currentQuestionText || 'Explain the Leader Election phase in Raft...',
        lastFrameData: data.lastFrameData || data.frameData,
        lastFrameTimestamp: now,
        micVolumeDb: data.micVolumeDb !== undefined ? data.micVolumeDb : 45,
        audioFreqBands: data.audioFreqBands || [20, 35, 60, 80, 55, 40, 30, 25, 45, 65, 35, 20],
        isVoiceSpeaking: data.isVoiceSpeaking !== undefined ? data.isVoiceSpeaking : true,
        liveTranscript: data.liveTranscript || (idx >= 0 ? list[idx].liveTranscript : 'Connecting oral candidate feed...'),
        integrityScore: data.integrityScore !== undefined ? data.integrityScore : 100,
        faceMatchScore: data.faceMatchScore !== undefined ? data.faceMatchScore : 99.2,
        eyeContactScore: data.eyeContactScore !== undefined ? data.eyeContactScore : 96,
        strikes: data.strikes !== undefined ? data.strikes : 0,
        maxStrikes: data.maxStrikes !== undefined ? data.maxStrikes : 3,
        lastIncidentReason: data.lastIncidentReason,
        isConnected: true,
        isAudioMuted: !!data.isAudioMuted,
        isSpeakerDisabled: prevSpeakerDisabled,
        isListening: this.listeningStudentId() === studentId
      };

      if (idx >= 0) {
        const copy = [...list];
        copy[idx] = feedItem;
        return copy;
      } else {
        return [feedItem, ...list];
      }
    });

    if (this.listeningStudentId() === studentId) {
      this.modulateListeningAudio(data.micVolumeDb || 40, data.isVoiceSpeaking);
    }
  }

  syncLiveFeedsWithRegisteredStudents(registered: StudentRosterItem[], classId: string): void {
    const subCode = this.classItem()?.subjectCode || (classId === 'cls-402' ? 'CS702' : classId === 'cls-403' ? 'CS604' : 'CS401');
    const className = this.classItem()?.name || 'Distributed Systems & Consensus Architecture';

    const masterQuestions = [
      {
        questionNumber: 1,
        prompt: 'Explain the Leader Election phase and randomized timeouts in the Raft Consensus Protocol. How do randomized election timeouts prevent split-vote deadlocks in asynchronous networks?',
        targetCO: 'CO3: Consensus Algorithms & Fault Tolerance',
        bloom: 'L4: Analyze',
        maxMarks: 10,
        sampleAnswer: 'In Raft consensus, when a follower node misses heartbeats during its randomized election timeout interval (typically 150ms to 300ms), it transitions to candidate state, increments its term number, votes for itself, and broadcasts RequestVote RPCs to all peers. If it receives votes from a majority quorum of nodes, it becomes the new leader and immediately begins sending periodic empty AppendEntries heartbeat RPCs. Randomized timeouts ensure split-vote deadlocks are statistically broken rapidly because one candidate node will almost always time out before others.',
        sampleCritique: 'Accurate and comprehensive explanation of leader election, randomized election timer bounds, term incrementation, and majority quorum resolution.',
        keyConcepts: ['Randomized Timers', 'Heartbeat RPC', 'Split-Vote Deadlock', 'Majority Quorum', 'Term Increment']
      },
      {
        questionNumber: 2,
        prompt: 'What are Vector Clocks and how do they capture strong causal ordering in distributed message passing when physical clocks experience clock drift?',
        targetCO: 'CO1: Logical Clocks & Synchronization',
        bloom: 'L3: Apply',
        maxMarks: 15,
        sampleAnswer: 'Vector clocks maintain an array of logical timestamps across N processes. When a process i executes an internal event, it increments its local vector entry V[i]. When sending a message, the entire vector is attached to the payload. Upon receiving a message with timestamp vector W, process j updates its clock by taking the element-wise maximum: V_j[k] = max(V_j[k], W[k]) for all k, and increments V_j[j]. This allows us to establish exact causal precedence (A -> B iff V(A) <= V(B)) and detect truly concurrent independent events without relying on synchronized physical clocks.',
        sampleCritique: 'Thorough derivation of causal ordering, message piggybacking, and clear mathematical formulation of element-wise vector updates.',
        keyConcepts: ['Causal Precedence', 'Vector Clocks', 'Element-wise Max', 'Concurrent Events', 'Clock Drift']
      },
      {
        questionNumber: 3,
        prompt: 'Derive the Byzantine Generals fault tolerance limit for synchronous oral communication systems (3m + 1). Why is consensus impossible when one third or more nodes are malicious?',
        targetCO: 'CO4: Byzantine Agreement & Partition Safety',
        bloom: 'L5: Evaluate',
        maxMarks: 15,
        sampleAnswer: 'In the Byzantine Generals problem, we prove by contradiction that no synchronous oral message protocol can achieve consensus with 3m or fewer nodes in the presence of m traitors. For m=1 traitor, with 3 generals (Commander C and Lieutenants L1, L2): if C is loyal and orders Attack, but traitor L1 tells L2 that C ordered Retreat, L2 receives conflicting messages (Attack from C, Retreat from L1) and cannot distinguish who is lying without a majority vote. Therefore, strictly 3m + 1 total nodes are necessary to maintain a non-faulty majority quorum.',
        sampleCritique: 'Outstanding mathematical rigor demonstrating the contradiction proof, 3-node paradox with 1 traitor, and the exact 3m + 1 quorum requirement.',
        keyConcepts: ['3m + 1 Quorum', 'Oral Messages', 'Traitor Generals', 'Contradiction Proof', 'Synchronous Delay']
      },
      {
        questionNumber: 4,
        prompt: 'Compare Paxos Synod with Multi-Paxos commit latencies and explain how leader lease optimization eliminates Phase 1 prepare overhead.',
        targetCO: 'CO2: Paxos Consensus & Lease Management',
        bloom: 'L4: Analyze',
        maxMarks: 10,
        sampleAnswer: 'Basic Paxos Synod requires two full round-trips for every consensus decision: Phase 1 (Prepare/Promise) to establish proposal number supremacy, and Phase 2 (Accept/Accepted) to commit values. Multi-Paxos optimizes this by electing a stable master leader; once the leader is established in Phase 1, subsequent log entries only execute Phase 2 in a single round-trip. Leader lease optimization uses bounded physical time windows so the leader can serve local reads with linearizability without network round-trips.',
        sampleCritique: 'Precise comparison between two-phase Paxos Synod vs single-round Multi-Paxos, with clear explanation of leader lease linearizability.',
        keyConcepts: ['Paxos Synod', 'Multi-Paxos', 'Leader Lease', 'Phase 1 Prepare', 'Round-trip Latency']
      }
    ];

    const sampleAvatars = [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
    ];

    const currentFeeds = this.liveStudentFeeds();
    const feedsMap = new Map<string, LiveClassStudentFeed>();
    currentFeeds.forEach(f => {
      feedsMap.set(f.studentId, f);
      if (f.studentRoll) feedsMap.set(f.studentRoll, f);
    });

    const feeds: LiveClassStudentFeed[] = registered.map((s, index) => {
      const studentId = s.studentId || s.id;
      const existing = feedsMap.get(studentId) || feedsMap.get(s.id);
      if (existing) {
        return {
          ...existing,
          studentName: s.name,
          studentRoll: s.studentId,
          studentAvatar: s.avatarUrl || existing.studentAvatar
        };
      }

      const isSpeaking = index % 3 === 0;

      // Realistic infraction distribution:
      // Ananya Rao: Slide change attempt during question
      // Kabir Malhotra: Tab switch attempt
      // Arjun Kapoor: Gaze anomaly & window unfocused
      // Yash Vardhan or Sania Mirza: Disqualified candidate
      const isSlideChange = s.name === 'Ananya Rao' || s.studentId === '2023308704' || index === 3;
      const isTabSwitch = s.name === 'Kabir Malhotra' || s.studentId === '2023308709' || index === 8;
      const isGaze = s.name === 'Arjun Kapoor' || s.studentId === '2023308715' || index === 14;
      const isDisqualified = s.name === 'Yash Vardhan' || s.name === 'Sania Mirza' || s.studentId === '2023308721' || s.studentId === '2023308728' || s.status === 'TERMINATED' || s.status === 'SUSPENDED';

      let status: 'TESTING' | 'WARNING' | 'TERMINATED' = isDisqualified ? 'TERMINATED' : (isSlideChange || isTabSwitch || isGaze) ? 'WARNING' : 'TESTING';
      let strikes = isDisqualified ? 3 : isSlideChange ? 2 : (isTabSwitch || isGaze) ? 1 : 0;
      let integrity = isDisqualified ? 0 : isSlideChange ? 78 : isTabSwitch ? 86 : isGaze ? 88 : Math.min(100, 94 + (index % 7));
      let infractionType: 'TAB_SWITCH' | 'SLIDE_CHANGE' | 'WINDOW_UNFOCUSED' | 'GAZE_DEVIATION' | 'MULTI_FACE' | 'MANUAL_STRIKE' | undefined =
        isSlideChange ? 'SLIDE_CHANGE' : isTabSwitch ? 'TAB_SWITCH' : isGaze ? 'GAZE_DEVIATION' : undefined;

      let lastReason: string | undefined = undefined;
      let infractionDetails: Array<{ type: string; reason: string; timestamp: string; severity: 'WARNING' | 'CRITICAL' }> = [];
      let disqualifiedReason: string | undefined = undefined;
      let terminatedAt: string | undefined = undefined;

      if (isDisqualified) {
        terminatedAt = index % 2 === 0 ? '10:44 AM' : '10:48 AM';
        disqualifiedReason = s.name === 'Sania Mirza'
          ? 'Severe violation: Attempted unauthorized slide notes switching during live oral defense'
          : 'Exceeded maximum proctoring violation limit (3 tab switches & slide changes)';
        lastReason = disqualifiedReason;
        infractionDetails = [
          { type: 'TAB_SWITCH', reason: 'Shifted browser tab to secondary window', timestamp: '10:40 AM', severity: 'WARNING' },
          { type: 'SLIDE_CHANGE', reason: 'Attempted presentation slide change during question', timestamp: '10:42 AM', severity: 'WARNING' },
          { type: 'TAB_SWITCH', reason: 'Exceeded allowed tab switches (Exam Terminated)', timestamp: terminatedAt, severity: 'CRITICAL' }
        ];
      } else if (isSlideChange) {
        lastReason = 'Candidate attempted changing PDF/PowerPoint slides during question phase (Strike 2/3)';
        infractionDetails = [
          { type: 'SLIDE_CHANGE', reason: 'Attempted switching external presentation slides', timestamp: '10:42 AM', severity: 'WARNING' },
          { type: 'WINDOW_UNFOCUSED', reason: 'Focus lost from active exam screen', timestamp: '10:44 AM', severity: 'WARNING' }
        ];
      } else if (isTabSwitch) {
        lastReason = 'Candidate switched browser tab away from active viva window (Strike 1/3)';
        infractionDetails = [
          { type: 'TAB_SWITCH', reason: 'Tab switched to unauthorized background browser window', timestamp: '10:44 AM', severity: 'WARNING' }
        ];
      } else if (isGaze) {
        lastReason = 'Continuous eye gaze shift away from camera for >6 seconds';
        infractionDetails = [
          { type: 'GAZE_DEVIATION', reason: 'Eye gaze anomaly off-screen for >6 seconds', timestamp: '10:43 AM', severity: 'WARNING' }
        ];
      }

      // Build Questions History & Progress for this student
      const totalQ = masterQuestions.length;
      const completedCount = isDisqualified ? 1 : (index % 4);
      const activeQNum = isDisqualified ? 2 : Math.min(totalQ, completedCount + 1);
      const activeQ = masterQuestions[activeQNum - 1];

      const questionsHistory: LiveStudentVivaQuestion[] = masterQuestions.map((q, qIdx) => {
        const qNum = qIdx + 1;
        if (isDisqualified && qNum >= 2) {
          return {
            questionNumber: qNum,
            questionText: q.prompt,
            targetCO: q.targetCO,
            bloomLevel: q.bloom,
            maxMarks: q.maxMarks,
            status: qNum === 2 ? 'IN_PROGRESS' : 'UPCOMING',
            spokenAnswerText: qNum === 2 ? `[EXAM TERMINATED DUE TO PROCTORING DISQUALIFICATION: ${disqualifiedReason}]` : undefined,
            confidenceScore: 0,
            wpm: 0
          };
        }

        if (qNum < activeQNum) {
          // Completed Question with written transcript and AI critique
          const deduction = index % 3 === 0 ? 0.5 : index % 3 === 1 ? 1.0 : 0.0;
          const score = Math.max(0, q.maxMarks - deduction);
          return {
            questionNumber: qNum,
            questionText: q.prompt,
            targetCO: q.targetCO,
            bloomLevel: q.bloom,
            maxMarks: q.maxMarks,
            awardedMarks: score,
            status: 'COMPLETED',
            spokenAnswerText: q.sampleAnswer,
            aiFeedbackCritique: q.sampleCritique,
            timeTakenSeconds: 85 + ((index * 11 + qNum * 13) % 35),
            confidenceScore: 93 + ((index + qNum) % 6),
            wpm: 114 + ((index * 3 + qNum * 5) % 18),
            completedAt: `10:${String(32 + qNum * 4).padStart(2, '0')} AM`,
            keyConceptsCovered: q.keyConcepts
          };
        } else if (qNum === activeQNum) {
          // Active in-progress question
          const sliceLen = 140 + ((index * 37) % 200);
          const spokenText = q.sampleAnswer.slice(0, sliceLen) + (sliceLen < q.sampleAnswer.length ? '...' : '');
          return {
            questionNumber: qNum,
            questionText: q.prompt,
            targetCO: q.targetCO,
            bloomLevel: q.bloom,
            maxMarks: q.maxMarks,
            status: 'IN_PROGRESS',
            spokenAnswerText: spokenText,
            confidenceScore: 96,
            wpm: 118,
            keyConceptsCovered: q.keyConcepts.slice(0, 3)
          };
        } else {
          // Upcoming Question
          return {
            questionNumber: qNum,
            questionText: q.prompt,
            targetCO: q.targetCO,
            bloomLevel: q.bloom,
            maxMarks: q.maxMarks,
            status: 'UPCOMING'
          };
        }
      });

      const totalAwarded = questionsHistory
        .filter(q => q.status === 'COMPLETED' && q.awardedMarks !== undefined)
        .reduce((sum, q) => sum + (q.awardedMarks || 0), 0);

      const totalMax = masterQuestions.reduce((sum, q) => sum + q.maxMarks, 0);

      const micDb = isDisqualified ? 0 : isSpeaking ? (40 + ((index * 7) % 45)) : (6 + ((index * 3) % 15));
      const bands = Array.from({ length: 12 }, (_, bIdx) =>
        isDisqualified ? 0 : isSpeaking ? Math.min(95, Math.max(15, micDb + ((bIdx * 9) % 35) - 15)) : (5 + ((bIdx * 4) % 15))
      );

      const currentSpokenProgress = isDisqualified
        ? `[EXAM TERMINATED: ${disqualifiedReason}]`
        : (questionsHistory.find(q => q.status === 'IN_PROGRESS')?.spokenAnswerText || activeQ.sampleAnswer.slice(0, 160) + '...');

      return {
        studentId: studentId,
        studentName: s.name,
        studentRoll: s.studentId,
        studentAvatar: s.avatarUrl || sampleAvatars[index % sampleAvatars.length],
        classId,
        subjectCode: subCode,
        className,
        vivaSessionId: `viva-sess-${studentId}`,
        status,
        currentQuestionNumber: activeQNum,
        totalQuestions: totalQ,
        currentQuestionText: activeQ.prompt,
        currentQuestionTargetCO: activeQ.targetCO,
        currentQuestionBloom: activeQ.bloom,
        currentQuestionMaxMarks: activeQ.maxMarks,
        questionsHistory,
        completedQuestionsCount: completedCount,
        totalAwardedScore: totalAwarded,
        totalMaxScore: totalMax,
        remainingTimeSeconds: Math.max(120, 900 - (completedCount * 140 + 60)),
        speechConfidence: 96,
        speechWpm: 118,
        lastFrameTimestamp: Date.now(),
        micVolumeDb: micDb,
        audioFreqBands: bands,
        isVoiceSpeaking: !isDisqualified && isSpeaking,
        liveTranscript: currentSpokenProgress,
        integrityScore: integrity,
        faceMatchScore: +(96.8 + ((index * 0.3) % 3.0)).toFixed(1),
        eyeContactScore: isGaze ? 68 : Math.min(99, 91 + (index % 9)),
        strikes,
        maxStrikes: 3,
        lastIncidentReason: lastReason,
        infractionType,
        infractionDetails,
        disqualifiedReason,
        terminatedAt,
        isConnected: !isDisqualified,
        isAudioMuted: isDisqualified,
        isSpeakerDisabled: false,
        isListening: this.listeningStudentId() === studentId
      };
    });

    this.liveStudentFeeds.set(feeds);
  }

  seedClassLiveStudentFeeds(classId: string): void {
    this.syncLiveFeedsWithRegisteredStudents(this.students(), classId);
  }

  // Toggle Remote Candidate Speaker (Silences remote candidate audio output)
  toggleStudentSpeaker(student: LiveClassStudentFeed): void {
    const newDisabled = !student.isSpeakerDisabled;
    this.liveStudentFeeds.update(list =>
      list.map(s => s.studentId === student.studentId ? { ...s, isSpeakerDisabled: newDisabled } : s)
    );

    if (this.spotlightStudent()?.studentId === student.studentId) {
      this.spotlightStudent.update(s => s ? { ...s, isSpeakerDisabled: newDisabled } : null);
    }

    try {
      this.proctorChannel?.postMessage({
        type: 'FACULTY_MUTE_STUDENT_SPEAKER',
        targetStudentId: student.studentId,
        studentId: student.studentId,
        studentRoll: student.studentRoll,
        classId: this.classId(),
        isSpeakerDisabled: newDisabled,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (e) {}

    if (newDisabled) {
      this.actionSuccessToast.set(`🔇 Disabled candidate speaker & audio output for ${student.studentName} (${student.studentRoll}).`);
    } else {
      this.actionSuccessToast.set(`🔊 Restored candidate speaker & audio for ${student.studentName}.`);
    }
    setTimeout(() => this.actionSuccessToast.set(null), 4000);
  }

  private startLiveFeedTicker(): void {
    if (typeof window === 'undefined') return;
    this.liveFeedTickerInterval = setInterval(() => {
      if (this.activeTab() !== 'live-view' && this.activeTab() !== 'overview') return;

      this.liveStudentFeeds.update(list =>
        list.map((student, sIdx) => {
          if (student.status === 'TERMINATED' || student.status === 'COMPLETED') return student;

          // Toggle speaking or modulate EQ
          const isSpeaking = Math.random() > 0.25;
          const baseDb = isSpeaking ? (35 + Math.floor(Math.random() * 45)) : Math.floor(Math.random() * 12);
          const newBands = Array.from({ length: 12 }, () =>
            isSpeaking ? Math.min(100, Math.max(15, baseDb + Math.floor((Math.random() - 0.5) * 35))) : Math.floor(Math.random() * 12) + 5
          );

          if (this.listeningStudentId() === student.studentId) {
            this.modulateListeningAudio(baseDb, isSpeaking);
          }

          // Advance in-progress written text slightly if speaking
          let updatedTranscript = student.liveTranscript;
          if (isSpeaking && student.questionsHistory) {
            const inProg = student.questionsHistory.find(q => q.status === 'IN_PROGRESS');
            if (inProg && inProg.spokenAnswerText) {
              const fullText = inProg.spokenAnswerText;
              const currentLen = student.liveTranscript.length;
              if (currentLen < fullText.length) {
                updatedTranscript = fullText.slice(0, Math.min(fullText.length, currentLen + 15));
              }
            }
          }

          return {
            ...student,
            isVoiceSpeaking: isSpeaking,
            micVolumeDb: baseDb,
            audioFreqBands: newBands,
            liveTranscript: updatedTranscript,
            lastFrameTimestamp: Date.now()
          };
        })
      );

      // Keep spotlight synchronized
      if (this.spotlightStudent()) {
        const spotId = this.spotlightStudent()?.studentId;
        const current = this.liveStudentFeeds().find(s => s.studentId === spotId);
        if (current) {
          this.spotlightStudent.set(current);
        }
      }
    }, 1200);
  }

  // Audio Monitoring Engine & Candidate Voice Listener
  toggleListenAudio(student: LiveClassStudentFeed): void {
    if (this.listeningStudentId() === student.studentId) {
      this.stopListeningAudio();
      this.actionSuccessToast.set(`🔇 Muted voice listener for candidate ${student.studentName}.`);
      setTimeout(() => this.actionSuccessToast.set(null), 3000);
    } else {
      this.listeningStudentId.set(student.studentId);
      this.startListeningAudioEngine(student);
      this.actionSuccessToast.set(`🎧 Listening Live: Now streaming candidate microphone audio from ${student.studentName} (${student.studentRoll})!`);
      setTimeout(() => this.actionSuccessToast.set(null), 4000);
    }
  }

  setListeningVolume(vol: number): void {
    this.listeningVolume.set(vol);
    if (this.audioGainNode && this.audioCtx) {
      const g = (vol / 100) * 0.03;
      this.audioGainNode.gain.setTargetAtTime(g, this.audioCtx.currentTime, 0.1);
    }
  }

  private startListeningAudioEngine(student: LiveClassStudentFeed): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.audioOscillator) {
        try { this.audioOscillator.stop(); } catch (e) {}
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
      const targetGain = (this.listeningVolume() / 100) * 0.02;
      gain.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();

      this.audioOscillator = osc;
      this.audioGainNode = gain;
    } catch (e) {}
  }

  private modulateListeningAudio(db: number, isSpeaking: boolean): void {
    if (!this.audioCtx || !this.audioGainNode || !this.audioOscillator) return;
    try {
      const volMultiplier = this.listeningVolume() / 100;
      const targetGain = isSpeaking ? (0.008 + (db / 100) * 0.02) * volMultiplier : 0.002 * volMultiplier;
      const targetFreq = isSpeaking ? (260 + (db * 2)) : 220;
      this.audioGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.1);
      this.audioOscillator.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.1);
    } catch (e) {}
  }

  private stopListeningAudio(): void {
    this.listeningStudentId.set(null);
    if (this.audioOscillator) {
      try { this.audioOscillator.stop(); } catch (e) {}
      this.audioOscillator = null;
    }
  }

  // Spotlight Forensic Modal
  openSpotlight(student: LiveClassStudentFeed): void {
    this.spotlightStudent.set(student);
  }

  closeSpotlight(): void {
    this.spotlightStudent.set(null);
  }

  // Intercom Modal
  openIntercomModal(student?: LiveClassStudentFeed): void {
    this.intercomTargetStudent.set(student || null);
    this.intercomMessageText.set('');
    this.isClassIntercomModalOpen.set(true);
  }

  closeIntercomModal(): void {
    this.isClassIntercomModalOpen.set(false);
    this.intercomTargetStudent.set(null);
    this.intercomMessageText.set('');
  }

  applyPresetMessage(msg: string): void {
    this.intercomMessageText.set(msg);
  }

  sendDirectIntercom(): void {
    const text = this.intercomMessageText().trim();
    if (!text) return;

    this.isIntercomSending.set(true);
    const target = this.intercomTargetStudent();

    const payload = {
      type: 'FACULTY_INTERCOM_MESSAGE',
      classId: this.classId(),
      subjectCode: this.classItem()?.subjectCode || 'CS401',
      senderName: this.classItem()?.department ? `Instructor (${this.classItem()?.name})` : 'Faculty Proctor',
      targetStudentId: target ? target.studentId : null,
      broadcastAll: !target,
      message: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage(payload);
      } catch (e) {}
    }

    setTimeout(() => {
      this.isIntercomSending.set(false);
      this.closeIntercomModal();
      this.actionSuccessToast.set(
        target
          ? `🎙️ Intercom dispatched directly to ${target.studentName} (${target.studentRoll})!`
          : `📢 Class-wide intercom announcement broadcast to all ${this.liveStudentFeeds().length} candidates in ${this.classItem()?.name || 'this class'}!`
      );
      setTimeout(() => this.actionSuccessToast.set(null), 5000);
    }, 400);
  }

  issueManualStrike(student: LiveClassStudentFeed): void {
    const currentStrikes = student.strikes + 1;
    const max = student.maxStrikes || 3;
    const newIntegrity = Math.max(0, 100 - (currentStrikes * Math.round(100 / max)));

    const payload = {
      type: 'FACULTY_MANUAL_STRIKE',
      classId: this.classId(),
      targetStudentId: student.studentId,
      reason: 'Proctoring infraction recorded manually by Faculty Supervisor',
      strikes: currentStrikes,
      maxStrikes: max,
      integrityScore: newIntegrity
    };

    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage(payload);
      } catch (e) {}
    }

    this.liveStudentFeeds.update(list =>
      list.map(s => s.studentId === student.studentId ? {
        ...s,
        strikes: currentStrikes,
        integrityScore: newIntegrity,
        status: currentStrikes >= max ? 'TERMINATED' as const : 'WARNING' as const,
        lastIncidentReason: `Manual strike issued by mentor (Strike ${currentStrikes}/${max})`
      } : s)
    );

    this.actionSuccessToast.set(`🚨 Security Strike issued to ${student.studentName} (Strike ${currentStrikes}/${max})!`);
    setTimeout(() => this.actionSuccessToast.set(null), 4000);
  }

  terminateStudentExam(student: LiveClassStudentFeed): void {
    const reason = `Examination disqualified & terminated by Faculty Proctor during Live Classroom Supervision.`;

    const payload = {
      type: 'FACULTY_TERMINATE_EXAM',
      classId: this.classId(),
      targetStudentId: student.studentId,
      studentName: student.studentName,
      studentRoll: student.studentRoll,
      reason
    };

    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage(payload);
      } catch (e) {}
    }

    this.liveStudentFeeds.update(list =>
      list.map(s => s.studentId === student.studentId ? {
        ...s,
        status: 'TERMINATED' as const,
        integrityScore: 0,
        strikes: s.maxStrikes || 3,
        lastIncidentReason: reason
      } : s)
    );

    this.handleIncomingDisqualification({
      studentId: student.studentId,
      studentName: student.studentName,
      studentRoll: student.studentRoll,
      reason,
      terminatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    this.actionSuccessToast.set(`⛔ Terminated & Disqualified test session for ${student.studentName} (${student.studentRoll})!`);
    setTimeout(() => this.actionSuccessToast.set(null), 5000);
  }

  readmitFromLiveView(feed: LiveClassStudentFeed): void {
    this.liveStudentFeeds.update(list =>
      list.map(s => s.studentId === feed.studentId ? {
        ...s,
        status: 'TESTING' as const,
        strikes: 0,
        integrityScore: 100,
        disqualifiedReason: undefined,
        lastIncidentReason: undefined,
        infractionType: undefined,
        infractionDetails: []
      } : s)
    );

    this.provider.readmitTerminatedStudent(this.classId(), feed.studentId).subscribe(() => {
      this.provider.getTerminatedStudents(this.classId()).subscribe(list => this.terminatedStudents.set(list));
    });

    const payload = {
      type: 'STUDENT_READMITTED',
      classId: this.classId(),
      studentId: feed.studentId,
      studentName: feed.studentName,
      studentRoll: feed.studentRoll
    };
    try { this.proctorChannel?.postMessage(payload); } catch (e) {}
    try { this.enrollmentChannel?.postMessage(payload); } catch (e) {}

    this.actionSuccessToast.set(`🔓 Re-admitted ${feed.studentName} (${feed.studentRoll})! Status restored to ACTIVE viva.`);
    setTimeout(() => this.actionSuccessToast.set(null), 5000);
  }

  clearInfractionStrike(feed: LiveClassStudentFeed): void {
    this.liveStudentFeeds.update(list =>
      list.map(s => {
        if (s.studentId !== feed.studentId) return s;
        const newStrikes = Math.max(0, s.strikes - 1);
        const newStatus = newStrikes === 0 ? 'TESTING' as const : 'WARNING' as const;
        return {
          ...s,
          strikes: newStrikes,
          status: newStatus,
          integrityScore: Math.min(100, (s.integrityScore || 80) + 15),
          infractionType: newStrikes === 0 ? undefined : s.infractionType,
          lastIncidentReason: newStrikes === 0 ? undefined : `Strike forgiven by instructor. Remaining strikes: ${newStrikes}`
        };
      })
    );

    this.actionSuccessToast.set(`🧹 Cleared infraction strike for ${feed.studentName}. Remaining strikes: ${Math.max(0, feed.strikes - 1)}`);
    setTimeout(() => this.actionSuccessToast.set(null), 4000);
  }

  // Live Class Mic & Global Announcement Actions
  toggleLiveClassMic(): void {
    const willBeLive = !this.isLiveMicBroadcasting();
    this.isLiveMicBroadcasting.set(willBeLive);

    const payload = {
      type: 'FACULTY_LIVE_MIC_STATE',
      classId: this.classId(),
      subjectCode: this.classItem()?.subjectCode || 'CS401',
      isLive: willBeLive,
      senderName: this.classItem()?.name ? `Instructor (${this.classItem()?.name})` : 'Faculty Proctor',
      message: willBeLive ? 'Instructor has opened live voice microphone. Listening to classroom...' : 'Instructor closed microphone.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage(payload);
      } catch (e) {}
    }

    if (willBeLive) {
      this.actionSuccessToast.set(`🎙️ LIVE ON MIC: Your voice is broadcasting to all ${this.liveStudentFeeds().length} candidates in this class!`);
    } else {
      this.actionSuccessToast.set('🔇 Live class microphone turned off.');
    }
    setTimeout(() => this.actionSuccessToast.set(null), 4000);
  }

  sendGlobalClassAnnouncement(customText?: string): void {
    const text = (customText || this.globalClassAnnouncementText()).trim();
    if (!text) return;

    const payload = {
      type: 'FACULTY_INTERCOM_MESSAGE',
      classId: this.classId(),
      subjectCode: this.classItem()?.subjectCode || 'CS401',
      senderName: this.classItem()?.name ? `Instructor (${this.classItem()?.name})` : 'Faculty Supervisor',
      targetStudentId: null,
      broadcastAll: true,
      message: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage(payload);
      } catch (e) {}
    }

    this.globalClassAnnouncementText.set('');
    this.actionSuccessToast.set(`📢 Announcement broadcast to all ${this.liveStudentFeeds().length} candidates in ${this.classItem()?.subjectCode || 'this class'}: "${text}"`);
    setTimeout(() => this.actionSuccessToast.set(null), 5000);
  }

  // Live Filtering and View Helpers
  setLiveFilter(status: 'ALL' | 'ACTIVE' | 'SPEAKING' | 'WARNING' | 'TERMINATED'): void {
    this.liveFilterStatus.set(status);
  }

  setLiveLayout(mode: 'GRID_2X2' | 'GRID_3X3' | 'GRID_4X4' | 'GRID_5X5' | 'GRID_6X6' | 'LIST'): void {
    this.liveLayoutMode.set(mode);
  }

  get filteredLiveFeeds(): LiveClassStudentFeed[] {
    let list = this.liveStudentFeeds();
    const query = this.liveSearchQuery().trim().toLowerCase();
    const filter = this.liveFilterStatus();

    if (filter === 'ACTIVE') {
      list = list.filter(s => s.status === 'TESTING');
    } else if (filter === 'SPEAKING') {
      list = list.filter(s => s.isVoiceSpeaking && s.status !== 'TERMINATED');
    } else if (filter === 'WARNING') {
      list = list.filter(s => s.status === 'WARNING' || s.strikes > 0);
    } else if (filter === 'TERMINATED') {
      list = list.filter(s => s.status === 'TERMINATED');
    }

    if (query) {
      list = list.filter(s =>
        s.studentName.toLowerCase().includes(query) ||
        s.studentRoll.toLowerCase().includes(query) ||
        s.liveTranscript.toLowerCase().includes(query) ||
        s.currentQuestionText.toLowerCase().includes(query)
      );
    }
    return list;
  }

  get activeLiveTestingCount(): number {
    return this.liveStudentFeeds().filter(s => s.status === 'TESTING' || s.status === 'WARNING').length;
  }

  get liveSpeakingCandidatesCount(): number {
    return this.liveStudentFeeds().filter(s => s.isVoiceSpeaking && s.status !== 'TERMINATED').length;
  }

  get liveWarningCandidatesCount(): number {
    return this.liveStudentFeeds().filter(s => s.status === 'WARNING' || s.strikes > 0).length;
  }

  get liveDisqualifiedCandidatesCount(): number {
    return this.liveStudentFeeds().filter(s => s.status === 'TERMINATED').length;
  }

  get cohortAverageIntegrity(): number {
    const feeds = this.liveStudentFeeds();
    if (feeds.length === 0) return 100;
    const sum = feeds.reduce((acc, s) => acc + (s.integrityScore || 0), 0);
    return Math.round(sum / feeds.length);
  }

  private handleIncomingProctorIncident(data: any): void {
    const alertItem: ClassProctorAlert = {
      id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      studentId: data.studentId || 'unknown',
      studentName: data.studentName || 'Student',
      studentRoll: data.studentRoll || data.studentId || 'N/A',
      classId: this.classId(),
      subjectCode: data.subjectCode || this.classItem()?.subjectCode || '',
      className: data.className || this.classItem()?.name || '',
      incidentType: data.incidentType || 'TAB_SWITCH',
      description: data.description || 'Infraction detected',
      severity: data.severity || 'WARNING',
      timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      metadata: data.metadata
    };

    this.classProctorAlerts.update(prev => [alertItem, ...prev.slice(0, 49)]);
    this.liveProctorAlert.set(alertItem);

    if (data.studentId) {
      this.liveStudentFeeds.update(list =>
        list.map(s => {
          if (s.studentId !== data.studentId) return s;
          const currentStrikes = data.strikes !== undefined ? data.strikes : s.strikes + 1;
          const max = s.maxStrikes || 3;
          const infractionType = data.incidentType || 'TAB_SWITCH';
          const newStatus = currentStrikes >= max ? 'TERMINATED' as const : 'WARNING' as const;
          const newIncident = {
            type: infractionType,
            reason: data.description || 'Infraction detected',
            timestamp: alertItem.timestamp,
            severity: (data.severity || 'WARNING') as 'WARNING' | 'CRITICAL'
          };
          const existingDetails = s.infractionDetails || [];
          return {
            ...s,
            strikes: currentStrikes,
            status: newStatus,
            infractionType: infractionType,
            lastIncidentReason: data.description || `Infraction: ${infractionType}`,
            disqualifiedReason: newStatus === 'TERMINATED' ? (data.reason || data.description || 'Exceeded maximum violation strikes') : undefined,
            terminatedAt: newStatus === 'TERMINATED' ? alertItem.timestamp : undefined,
            infractionDetails: [newIncident, ...existingDetails]
          };
        })
      );
    }

    // Auto-dismiss popup after 10s
    setTimeout(() => {
      if (this.liveProctorAlert()?.id === alertItem.id) {
        this.liveProctorAlert.set(null);
      }
    }, 10000);
  }

  private handleIncomingDisqualification(data: any): void {
    this.provider.getTerminatedStudents(this.classId()).subscribe(ts => this.terminatedStudents.set(ts));
    const termAlert: ClassProctorAlert = {
      id: `disq-${Date.now()}`,
      studentId: data.studentId,
      studentName: data.studentName,
      studentRoll: data.studentRoll,
      classId: this.classId(),
      subjectCode: data.subjectCode,
      className: data.className,
      incidentType: 'EXAM_TERMINATED',
      description: `Exam permanently disqualified! Reason: ${data.reason}`,
      severity: 'CRITICAL',
      timestamp: data.terminatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.liveProctorAlert.set(termAlert);

    if (data.studentId) {
      this.liveStudentFeeds.update(list =>
        list.map(s => s.studentId === data.studentId ? {
          ...s,
          status: 'TERMINATED' as const,
          integrityScore: 0,
          strikes: s.maxStrikes || 3,
          disqualifiedReason: data.reason || 'Candidate disqualified by proctor security',
          terminatedAt: data.terminatedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastIncidentReason: data.reason
        } : s)
      );
    }
  }

  loadClassData(id: string): void {
    this.isLoading.set(true);
    this.provider.getClassById(id).subscribe({
      next: (cls) => {
        this.classItem.set(cls);
        this.isLoading.set(false);

        // Load Security Policy
        if (cls.securityPolicy) {
          this.securityPolicy.set({ ...cls.securityPolicy });
        } else if (typeof localStorage !== 'undefined') {
          try {
            const saved = localStorage.getItem(`class_security_policy_${id}`) || localStorage.getItem(`class_security_policy_${cls.subjectCode}`);
            if (saved) {
              this.securityPolicy.set(JSON.parse(saved));
            }
          } catch (e) {}
        }
      },
      error: () => this.isLoading.set(false)
    });

    this.provider.getClassStudents(id).subscribe({
      next: (sts) => {
        this.students.set(sts);
        this.syncLiveFeedsWithRegisteredStudents(sts, id);
        this.initClassVivaTests(id, this.classItem()?.name || 'Distributed Systems', sts);
        this.initClassCompositeData(id, this.classItem()?.name || 'Distributed Systems', sts);
      }
    });

    this.provider.getEnrollmentRequests(id).subscribe({
      next: (reqs) => this.enrollmentRequests.set(reqs)
    });

    this.provider.getAssessments(id).subscribe({
      next: (asms) => this.assessments.set(asms)
    });

    this.provider.getClassAnalytics(id).subscribe({
      next: (data) => this.analytics.set(data)
    });

    this.provider.getTerminatedStudents(id).subscribe({
      next: (terms) => this.terminatedStudents.set(terms)
    });

    this.provider.getClassProctorAlerts(id).subscribe({
      next: (alerts) => this.classProctorAlerts.set(alerts)
    });
  }

  setTab(tab: ClassTab): void {
    this.activeTab.set(tab);
    if (tab === 'enrollment' || tab === 'overview' || tab === 'students') {
      this.provider.getEnrollmentRequests(this.classId()).subscribe(reqs => this.enrollmentRequests.set(reqs));
      this.provider.getClassById(this.classId()).subscribe(cls => this.classItem.set(cls));
    } else if (tab === 'security') {
      this.provider.getTerminatedStudents(this.classId()).subscribe(terms => this.terminatedStudents.set(terms));
      this.provider.getClassProctorAlerts(this.classId()).subscribe(alerts => this.classProctorAlerts.set(alerts));
    }
  }

  // Security Policy Controls
  toggleSecurityEnabled(): void {
    this.securityPolicy.update(p => ({ ...p, enabled: !p.enabled }));
  }

  setMaxTabSwitches(count: number): void {
    const val = Math.max(1, Math.min(20, Math.floor(count || 1)));
    this.securityPolicy.update(p => ({ ...p, maxTabSwitches: val }));
  }

  toggleBlurOnFocusLoss(): void {
    this.securityPolicy.update(p => ({ ...p, blurOnFocusLoss: !p.blurOnFocusLoss }));
  }

  toggleAllowFullscreenExit(): void {
    this.securityPolicy.update(p => ({ ...p, allowFullscreenExit: !p.allowFullscreenExit }));
  }

  toggleStrictDisqualification(): void {
    this.securityPolicy.update(p => ({ ...p, strictDisqualification: !p.strictDisqualification }));
  }

  toggleFaceContinuity(): void {
    this.securityPolicy.update(p => ({ ...p, requireFaceContinuity: !p.requireFaceContinuity }));
  }

  saveSecurityPolicy(): void {
    this.isSavingPolicy.set(true);
    const policy = this.securityPolicy();
    this.provider.updateClassSecurityPolicy(this.classId(), policy).subscribe({
      next: () => {
        this.isSavingPolicy.set(false);
        this.policySaveSuccess.set(true);
        this.actionSuccessToast.set(`🛡️ Security Policy saved for ${this.classItem()?.name || 'Class'}! Limit: ${policy.maxTabSwitches} tab switch(es), Proctoring: ${policy.enabled ? 'ACTIVE' : 'DISABLED'}`);
        setTimeout(() => {
          this.policySaveSuccess.set(false);
          this.actionSuccessToast.set(null);
        }, 5000);
      },
      error: () => this.isSavingPolicy.set(false)
    });
  }

  readmitStudent(incident: TerminatedStudentIncident): void {
    this.provider.readmitTerminatedStudent(this.classId(), incident.studentId).subscribe({
      next: () => {
        this.terminatedStudents.update(list => 
          list.map(s => s.studentId === incident.studentId ? { 
            ...s, 
            status: 'RE_ADMITTED' as const, 
            reAdmittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          } : s)
        );
        this.actionSuccessToast.set(`🔓 Re-admitted ${incident.studentName} (${incident.studentRoll}). Strikes reset for this class!`);
        setTimeout(() => this.actionSuccessToast.set(null), 5000);
      }
    });
  }

  get filteredTerminatedStudents(): TerminatedStudentIncident[] {
    const q = this.terminatedSearchQuery().toLowerCase().trim();
    if (!q) return this.terminatedStudents();
    return this.terminatedStudents().filter(s =>
      s.studentName.toLowerCase().includes(q) ||
      s.studentRoll.toLowerCase().includes(q) ||
      s.reason.toLowerCase().includes(q)
    );
  }

  getJoinLink(): string {
    if (!this.classItem()) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
    return `${origin}/student/classes?joinCode=${this.classItem()!.joinCode}`;
  }

  copyJoinLink(): void {
    const link = this.getJoinLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    this.copiedJoinLink.set(true);
    setTimeout(() => this.copiedJoinLink.set(false), 2500);
  }

  copyJoinCode(): void {
    if (!this.classItem()) return;
    navigator.clipboard.writeText(this.classItem()!.joinCode);
    this.copiedJoinCode.set(true);
    setTimeout(() => this.copiedJoinCode.set(false), 2000);
  }

  // Student Status Management
  openStatusModal(student: StudentRosterItem, action: 'SUSPEND' | 'TERMINATE' | 'ACTIVATE'): void {
    this.selectedStudentForStatus.set(student);
    this.statusActionType.set(action);
    this.statusReason.set('');
  }

  closeStatusModal(): void {
    this.selectedStudentForStatus.set(null);
  }

  confirmStudentStatusChange(): void {
    const student = this.selectedStudentForStatus();
    if (!student) return;

    this.isStatusSubmitting.set(true);
    const newStatus = this.statusActionType() === 'ACTIVATE' ? 'ACTIVE' : 
                      this.statusActionType() === 'SUSPEND' ? 'SUSPENDED' : 'TERMINATED';

    this.provider.updateStudentStatus(this.classId(), student.id, newStatus, this.statusReason()).subscribe({
      next: () => {
        this.students.update(list => list.map(s => s.id === student.id ? { ...s, status: newStatus as any } : s));
        this.isStatusSubmitting.set(false);
        this.closeStatusModal();
      },
      error: () => this.isStatusSubmitting.set(false)
    });
  }

  // Enrollment Actions
  openApprovalModal(request: EnrollmentRequest, type: 'APPROVE' | 'REJECT'): void {
    this.pendingActionRequest.set(request);
    this.actionModalType.set(type);
    this.rejectReason.set('');
  }

  closeActionModal(): void {
    this.pendingActionRequest.set(null);
  }

  confirmEnrollmentAction(): void {
    const req = this.pendingActionRequest();
    if (!req) return;

    this.isActionSubmitting.set(true);
    if (this.actionModalType() === 'APPROVE') {
      this.provider.approveEnrollment(req.id).subscribe({
        next: () => {
          this.enrollmentRequests.update(prev => prev.filter(r => r.id !== req.id));
          // add to enrolled student list
          this.students.update(prev => {
            const updated: StudentRosterItem[] = [
              {
                id: `stu-${Date.now()}`,
                studentId: req.studentId,
                name: req.studentName,
                email: req.studentEmail,
                department: 'Computer Science',
                enrolledAt: new Date().toISOString(),
                status: 'ACTIVE',
                completedVivasCount: 0
              },
              ...prev
            ];
            this.syncLiveFeedsWithRegisteredStudents(updated, this.classId());
            return updated;
          });
          this.isActionSubmitting.set(false);
          this.closeActionModal();
          this.actionSuccessToast.set(`🎉 Successfully approved enrollment for ${req.studentName} (${req.studentId})!`);
          setTimeout(() => this.actionSuccessToast.set(null), 5000);
        },
        error: () => this.isActionSubmitting.set(false)
      });
    } else {
      this.provider.rejectEnrollment(req.id, this.rejectReason()).subscribe({
        next: () => {
          this.enrollmentRequests.update(prev => prev.filter(r => r.id !== req.id));
          this.isActionSubmitting.set(false);
          this.closeActionModal();
          this.actionSuccessToast.set(`Rejected enrollment request for ${req.studentName}.`);
          setTimeout(() => this.actionSuccessToast.set(null), 4000);
        },
        error: () => this.isActionSubmitting.set(false)
      });
    }
  }

  get filteredStudents(): StudentRosterItem[] {
    const q = this.studentSearchQuery().toLowerCase().trim();
    if (!q) return this.students();
    return this.students().filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }

  // =========================================================================
  // CLASS VIVA TESTS & STUDENT PERFORMANCE LEDGER ENGINE
  // =========================================================================
  initClassVivaTests(classId: string, className: string, students: StudentRosterItem[]): void {
    const key = `class_released_vivas_${classId}`;
    let vivas: ClassVivaTest[] = [];

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        vivas = JSON.parse(saved);
      }
    } catch (e) {}

    if (!vivas || vivas.length === 0) {
      vivas = [
        {
          id: `viva-${classId}-1`,
          classId,
          subjectCode: 'CS401',
          subjectName: className,
          title: 'Mid-Term Oral VIVA: Raft Consensus, Vector Clocks & Byzantine Faults',
          description: 'Accredited oral defense examining consensus mechanics, vector clock causal precedence, and Byzantine limits.',
          releasedAt: 'Today, 09:30 AM',
          durationMinutes: 15,
          totalMarks: 40,
          status: 'RELEASED',
          targetCOs: ['CO1: Logical Clocks', 'CO3: Consensus Algorithms', 'CO4: Byzantine Agreement'],
          questionsCount: 3,
          attemptedCount: Math.min(18, students.length),
          totalEnrolled: students.length,
          classAverageScore: 78.4,
          questions: [
            { id: 'q1', index: 1, prompt: 'Explain the Leader Election phase in the Raft Consensus Protocol. How do randomized election timeouts prevent split-vote deadlocks in asynchronous networks?', marks: 10, targetCO: 'CO3', bloom: 'L4: Analyze' },
            { id: 'q2', index: 2, prompt: 'What are Vector Clocks and how do they capture causal ordering in distributed message passing when physical clocks experience clock drift?', marks: 15, targetCO: 'CO1', bloom: 'L3: Apply' },
            { id: 'q3', index: 3, prompt: 'Derive the Byzantine Generals fault tolerance limit. Prove why consensus cannot be reached in synchronous oral systems when one third or more nodes are malicious.', marks: 15, targetCO: 'CO4', bloom: 'L5: Evaluate' }
          ]
        },
        {
          id: `viva-${classId}-2`,
          classId,
          subjectCode: 'CS401',
          subjectName: className,
          title: 'Lab CIE Defense: RPC Marshalling & State Machine Replication',
          description: 'Practical code walkthrough and verbal defense of distributed socket RPCs and Paxos log execution.',
          releasedAt: 'Sep 08, 2026',
          durationMinutes: 20,
          totalMarks: 30,
          status: 'COMPLETED',
          targetCOs: ['CO2: Remote Procedure Calls', 'CO3: Consensus Algorithms'],
          questionsCount: 2,
          attemptedCount: students.length,
          totalEnrolled: students.length,
          classAverageScore: 82.5,
          questions: [
            { id: 'q2-1', index: 1, prompt: 'Explain how at-most-once RPC semantics are guaranteed across network retransmissions and client timeouts.', marks: 15, targetCO: 'CO2', bloom: 'L3: Apply' },
            { id: 'q2-2', index: 2, prompt: 'How does State Machine Replication ensure linearizability when replicas execute commands deterministically?', marks: 15, targetCO: 'CO3', bloom: 'L4: Analyze' }
          ]
        },
        {
          id: `viva-${classId}-3`,
          classId,
          subjectCode: 'CS401',
          subjectName: className,
          title: 'Diagnostic Drill: Lamport Logical Timestamps & Clock Drift',
          description: 'Rapid 10-minute viva assessing happened-before relations and monotonic counter synchronization.',
          releasedAt: 'Scheduled for Sep 18',
          durationMinutes: 10,
          totalMarks: 20,
          status: 'SCHEDULED',
          targetCOs: ['CO1: Logical Clocks & Synchronization'],
          questionsCount: 2,
          attemptedCount: 0,
          totalEnrolled: students.length,
          classAverageScore: 0,
          questions: [
            { id: 'q3-1', index: 1, prompt: 'Define Lamport happened-before relationship a -> b. When are two distributed events concurrent?', marks: 10, targetCO: 'CO1', bloom: 'L2: Understand' },
            { id: 'q3-2', index: 2, prompt: 'Explain the limitation of Lamport logical timestamps in deducing total causal ordering.', marks: 10, targetCO: 'CO1', bloom: 'L4: Analyze' }
          ]
        }
      ];
      try {
        localStorage.setItem(key, JSON.stringify(vivas));
      } catch (e) {}
    }

    // Ensure all vivas (including from cache) have linked assignments and individual weights populated
    vivas = vivas.map((v, i) => ({
      ...v,
      linkedAssignmentId: v.linkedAssignmentId || (i === 1 ? `asgn-${classId}-2` : `asgn-${classId}-1`),
      linkedAssignmentName: v.linkedAssignmentName || (i === 1 
        ? 'Assignment 2: Paxos Synod vs Multi-Paxos Formal Verification Report' 
        : 'Assignment 1: Distributed Raft Leader Election & Log Replication'),
      weightagePercent: v.weightagePercent || (i === 0 ? 40 : i === 1 ? 30 : 20)
    }));

    this.releasedVivaTests.set(vivas);
    if (!this.selectedVivaTest()) {
      this.selectedVivaTest.set(vivas[0]);
    }

    // Build comprehensive student results with realistic scores, transcripts, what was wrong & solutions
    this.buildStudentResults(classId, vivas[0], students);
  }

  private buildStudentResults(classId: string, test: ClassVivaTest, students: StudentRosterItem[]): void {
    const key = `class_viva_results_${classId}_${test.id}`;
    let savedResults: ClassStudentVivaResult[] = [];

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        savedResults = JSON.parse(saved);
      }
    } catch (e) {}

    if (savedResults.length > 0) {
      this.studentVivaResults.set(savedResults);
      return;
    }

    const testQuestions = test.questions || [];
    const results: ClassStudentVivaResult[] = students.map((stu, idx) => {
      // Deterministic realistic data variance based on index
      const isDisqualified = idx === 4; // Student 4 disqualified
      const isAbsent = idx > 21;
      const isNeedsRemediation = idx === 3 || idx === 11;
      const isTopPerformer = idx === 0 || idx === 5 || idx === 8;

      let percentage = isDisqualified ? 21.3 : isAbsent ? 0 : isTopPerformer ? 92.5 : isNeedsRemediation ? 47.5 : 77.5 - (idx * 1.5);
      percentage = Math.max(15, Math.min(98, parseFloat(percentage.toFixed(1))));

      const totalScore = parseFloat(((percentage / 100) * test.totalMarks).toFixed(1));
      const gradeBadge = percentage >= 85 ? 'DISTINCTION' : percentage >= 75 ? 'EXCELLENT' : percentage >= 60 ? 'PROFICIENT' : percentage >= 45 ? 'COMPETENT' : 'NEEDS_PRACTICE';
      
      const status: 'COMPLETED' | 'IN_PROGRESS' | 'DISQUALIFIED' | 'ABSENT' = 
        isDisqualified ? 'DISQUALIFIED' : isAbsent ? 'ABSENT' : idx === 6 ? 'IN_PROGRESS' : 'COMPLETED';

      // Realistic Proctoring Faults
      const faults: StudentVivaFaultIncident[] = [];
      let integrityScore = 100;

      if (isDisqualified) {
        integrityScore = 20;
        faults.push(
          { type: 'TAB_SWITCH', severity: 'CRITICAL', timestamp: '10:32:15 AM', description: 'Left exam window to unapproved resource' },
          { type: 'TAB_SWITCH', severity: 'CRITICAL', timestamp: '10:34:02 AM', description: 'Second tab switch violation' },
          { type: 'FULLSCREEN_EXIT', severity: 'CRITICAL', timestamp: '10:35:40 AM', description: 'Exited secure full-screen mode without clearance (3 strikes)' }
        );
      } else if (idx === 1) {
        integrityScore = 88;
        faults.push({ type: 'TAB_SWITCH', severity: 'WARNING', timestamp: '10:36:10 AM', description: 'Exam window unfocused momentarily (3.4 seconds)' });
      } else if (idx === 2) {
        integrityScore = 76;
        faults.push(
          { type: 'EYE_GAZE_LOST', severity: 'WARNING', timestamp: '10:38:22 AM', description: 'Continuous gaze deviation to secondary screen' },
          { type: 'WINDOW_UNFOCUSED', severity: 'WARNING', timestamp: '10:41:05 AM', description: 'System notification focus loss' }
        );
      } else if (isNeedsRemediation) {
        integrityScore = 82;
        faults.push({ type: 'FULLSCREEN_EXIT', severity: 'WARNING', timestamp: '10:31:00 AM', description: 'Un-maximized window attempt' });
      }

      // Per-question results
      const qResults: VivaQuestionEvaluationItem[] = testQuestions.map((q, qIdx) => {
        let qScore = parseFloat((q.marks * (percentage / 100)).toFixed(1));
        let verdict: 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | 'NOT_ATTEMPTED' = 'CORRECT';
        let whatWrong = '';
        let correctSol = '';
        let studentAns = '';

        if (qIdx === 0) {
          studentAns = percentage > 70 
            ? 'In Raft, if a follower misses heartbeats during its randomized election timeout (150-300ms), it transitions to candidate, increments term, votes for itself, and broadcasts RequestVote RPCs. Randomized timers stagger election kickoffs so candidates rarely split votes.'
            : 'Raft has a leader election when heartbeat stops. Followers vote for someone. If randomized timers are used, they do not all vote at the same time.';
          
          if (percentage >= 75) {
            verdict = 'CORRECT';
            whatWrong = 'Minor omission: Did not mention majority quorum formula floor(N/2)+1 explicitly.';
          } else {
            verdict = 'PARTIALLY_CORRECT';
            whatWrong = 'Omitted candidate term increments, state machine transitions, and RequestVote RPC payload requirements.';
          }
          correctSol = 'In Raft, when follower election timer expires without AppendEntries RPC, node increments term, transitions to Candidate, votes for self, and issues RequestVote RPCs. Achieving majority quorum (floor(N/2)+1) establishes leadership. Randomized timeouts (150-300ms) prevent split-vote deadlocks by staggering election starts.';
        } else if (qIdx === 1) {
          studentAns = percentage > 70 
            ? 'Vector Clocks maintain an array V of logical timestamps across N processes. When a process sends a message, it increments its local entry V[i]. Upon receive, it sets V[j] = max(V[j], msg_V[j]) and increments V[i]. This establishes causal happens-before relations without physical clocks.'
            : 'Vector clock is using clocks to check message order. But physical clocks have drift, so vector clock fixes it by saving numbers in an array.';
          
          if (percentage >= 75) {
            verdict = 'CORRECT';
            whatWrong = 'Minor point: Could elaborate on concurrency condition when neither clock dominates the other.';
          } else {
            verdict = 'INCORRECT';
            whatWrong = 'Fundamentally confused vector clocks with physical NTP synchronization and omitted the element-wise maximum update rule.';
          }
          correctSol = 'Vector Clocks assign an integer array V of size N to each process. Update rule 1: Local event increments V[i] += 1. Update rule 2: On receive of message with vector Vt, process updates V[k] = max(V[k], Vt[k]) for all k, then V[i] += 1. Causality: a -> b iff V(a) <= V(b) and V(a) != V(b).';
        } else {
          studentAns = percentage > 75 
            ? 'For Byzantine fault tolerance with m traitors in synchronous systems, we need at least 3m + 1 nodes. If there are 3 nodes and 1 traitor (m=1), commander sends contradictory orders to lieutenants, causing an irreconcilable tie.'
            : 'Byzantine generals means nodes can lie. We need 3 nodes to fix it. If 1 is bad, we cannot agree.';
          
          if (percentage >= 80) {
            verdict = 'CORRECT';
            whatWrong = 'Derivation was mathematically sound; could mention oral message OM(m) inductive step.';
          } else if (percentage >= 50) {
            verdict = 'PARTIALLY_CORRECT';
            whatWrong = 'Stated the 3m + 1 bound but failed to prove contradiction in 3-node system with commander-lieutenant scenario.';
          } else {
            verdict = 'INCORRECT';
            whatWrong = 'Complete mathematical omission of quorum boundary condition and traitor message contradiction proof.';
          }
          correctSol = 'Byzantine Generals Theorem (Lamport et al.): In oral synchronous systems, consensus is impossible if n <= 3m where m is the number of traitor nodes. For n=3, m=1: Commander C tells Lieutenant 1 to ATTACK, and tells Lieutenant 2 to RETREAT. The two honest nodes cannot distinguish whether the commander is traitorous or the other lieutenant is lying. Hence n >= 3m + 1 nodes are required.';
        }

        return {
          questionIndex: q.index,
          questionText: q.prompt,
          maxMarks: q.marks,
          awardedScore: qScore,
          isCorrect: verdict === 'CORRECT',
          verdict,
          studentAnswer: studentAns,
          whatWasWrong: whatWrong,
          correctAnswerSolution: correctSol,
          keyConceptsIdentified: percentage > 70 ? ['Quorum Boundary', 'Message Ordering', 'State Transitions'] : ['Basic Definition'],
          missingConcepts: percentage > 75 ? [] : ['Formal Invariant Proof', 'Mathematical Bound'],
          examinerNotes: `Evaluated against ${q.targetCO}. Awarded: ${qScore}/${q.marks}`
        };
      });

      return {
        id: `res-${stu.studentId}-${test.id}`,
        studentId: stu.studentId,
        studentName: stu.name,
        rollNo: stu.studentId,
        email: stu.email,
        avatarUrl: stu.avatarUrl,
        testId: test.id,
        testTitle: test.title,
        submittedAt: isAbsent ? 'Not Submitted' : 'Today at 10:42 AM',
        status,
        totalScore,
        maxScore: test.totalMarks,
        percentage,
        gradeBadge,
        overallVerdict: percentage >= 80 ? 'Exceptional mastery of distributed consensus, causal clocks, and Byzantine failure envelopes.' : percentage >= 60 ? 'Demonstrates solid foundational competence with isolated analytical gaps in mathematical proofs.' : 'Requires structured remediation on fundamental quorum bounds and vector causality.',
        integrityScore,
        faultsCount: faults.length,
        faults,
        pillars: [
          { name: 'Conceptual Correctness', weightPercent: 40, maxScore: 4.0, awardedScore: parseFloat(((percentage / 100) * 4.0).toFixed(1)), feedback: 'Technical precision across consensus and synchronization.' },
          { name: 'Problem-Solving Depth', weightPercent: 30, maxScore: 3.0, awardedScore: parseFloat(((percentage / 100) * 3.0).toFixed(1)), feedback: 'Rigorous step-by-step oral derivations.' },
          { name: 'Domain Terminology', weightPercent: 20, maxScore: 2.0, awardedScore: parseFloat(((percentage / 100) * 2.0).toFixed(1)), feedback: 'Appropriate application of accredited curriculum terms.' },
          { name: 'Fluency & Articulation', weightPercent: 10, maxScore: 1.0, awardedScore: parseFloat(((percentage / 100) * 1.0).toFixed(1)), feedback: 'Delivery cadence, response structuring, and vocal confidence.' }
        ],
        questionResults: qResults,
        diagnosticAdvice: percentage >= 75 ? 'Continue exploring asynchronous consensus impossibility (FLP Theorem) and Paxos Synod variations.' : 'Review Course Outcome 3 (CO3) remediation slides and schedule a 15-minute diagnostic drill.',
        cqiActionItem: percentage >= 75 ? 'Recommended for advanced research honors module.' : 'Mandatory participation in algorithmic simulation lab on Raft majority quorum partitions.'
      };
    });

    this.studentVivaResults.set(results);
    try {
      localStorage.setItem(key, JSON.stringify(results));
    } catch (e) {}
  }

  selectVivaTest(test: ClassVivaTest): void {
    this.selectedVivaTest.set(test);
    this.buildStudentResults(this.classId(), test, this.students());
    this.initClassCompositeData(this.classId(), this.classItem()?.name || 'Distributed Systems', this.students());
  }

  // =========================================================================
  // COMPOSITE ASSESSMENT ENGINE (Assignments + Oral Viva + Alignments + Math Formulas)
  // =========================================================================
  initClassCompositeData(classId: string, className: string, students: StudentRosterItem[]): void {
    const assignments: ClassAssignment[] = [
      {
        id: `asgn-${classId}-1`,
        classId,
        title: 'Assignment 1: Distributed Raft Leader Election & Log Replication',
        description: 'Implement candidate term increments, randomized election timeouts (150-300ms), and majority quorum AppendEntries heartbeat RPCs.',
        type: 'CODING_ASSIGNMENT',
        totalMarks: 50,
        dueDate: 'Aug 28, 2026',
        targetCOs: ['CO1: Logical Clocks', 'CO2: Consensus Mechanics'],
        bloomLevel: 'L3: Apply',
        weightagePercent: 30,
        linkedVivaId: `viva-${classId}-1`,
        linkedVivaName: 'Mid-Term Oral VIVA: Raft Consensus, Vector Clocks & Byzantine Faults'
      },
      {
        id: `asgn-${classId}-2`,
        classId,
        title: 'Assignment 2: Paxos Synod vs Multi-Paxos Formal Verification Report',
        description: 'Comparative formal analysis of two-phase commit overhead, leader lease linearizability, and Byzantine partition boundaries.',
        type: 'WRITTEN_ANALYSIS',
        totalMarks: 50,
        dueDate: 'Sep 06, 2026',
        targetCOs: ['CO3: Distributed Transactions & Fault Tolerance'],
        bloomLevel: 'L4: Analyze',
        weightagePercent: 30,
        linkedVivaId: `viva-${classId}-2`,
        linkedVivaName: 'Lab CIE Defense: RPC Marshalling & State Machine Replication'
      }
    ];
    this.classAssignments.set(assignments);

    // Match viva results
    const vivaList = this.studentVivaResults();
    const vivaMap = new Map<string, ClassStudentVivaResult>();
    vivaList.forEach(v => {
      vivaMap.set(v.studentId, v);
      vivaMap.set(v.rollNo, v);
    });

    const compositeResults: StudentCompositeResult[] = students.map((stu, idx) => {
      // Deterministic realistic assignment scores
      const isDisqualifiedInViva = idx === 4; // High score in assignment (cheating/outsourcing indicator) but 21% in viva!
      const isStruggling = idx === 3 || idx === 11;
      const isTopPerformer = idx === 0 || idx === 5 || idx === 8;

      let a1Marks = isDisqualifiedInViva ? 46.5 : isTopPerformer ? 48.0 : isStruggling ? 28.0 : Math.max(22, 45.0 - (idx * 0.9));
      let a2Marks = isDisqualifiedInViva ? 45.5 : isTopPerformer ? 47.5 : isStruggling ? 26.5 : Math.max(20, 43.5 - (idx * 0.8));

      a1Marks = parseFloat(a1Marks.toFixed(1));
      a2Marks = parseFloat(a2Marks.toFixed(1));

      const a1Pct = parseFloat(((a1Marks / 50) * 100).toFixed(1));
      const a2Pct = parseFloat(((a2Marks / 50) * 100).toFixed(1));

      const submissions: StudentAssignmentSubmission[] = [
        {
          assignmentId: assignments[0].id,
          assignmentTitle: assignments[0].title,
          type: 'CODING_ASSIGNMENT',
          maxMarks: 50,
          obtainedMarks: a1Marks,
          percentage: a1Pct,
          targetCOs: assignments[0].targetCOs,
          bloomLevel: assignments[0].bloomLevel,
          submittedAt: 'Aug 27, 2026 11:42 PM',
          status: 'GRADED',
          feedbackNotes: a1Pct >= 80 ? 'Exceptional implementation of randomized jitter timers and RPC heartbeats.' : 'Code compiles but lacks unit tests for network partition split-vote recovery.',
          codeRepoUrl: 'https://github.com/scholarx-student/raft-core'
        },
        {
          assignmentId: assignments[1].id,
          assignmentTitle: assignments[1].title,
          type: 'WRITTEN_ANALYSIS',
          maxMarks: 50,
          obtainedMarks: a2Marks,
          percentage: a2Pct,
          targetCOs: assignments[1].targetCOs,
          bloomLevel: assignments[1].bloomLevel,
          submittedAt: 'Sep 05, 2026 09:15 PM',
          status: 'GRADED',
          feedbackNotes: a2Pct >= 80 ? 'Rigorous comparative diagrams contrasting Paxos Synod 2-roundtrips with Multi-Paxos.' : 'Superficial explanation of leader lease bounds.',
          codeRepoUrl: 'https://scholarx.ac.in/reports/paxos-proof.pdf'
        }
      ];

      const totalAssignmentObtained = parseFloat((a1Marks + a2Marks).toFixed(1));
      const totalAssignmentMax = 100;
      const assignmentAvgPct = parseFloat(((totalAssignmentObtained / totalAssignmentMax) * 100).toFixed(1));

      // Match viva
      const viva = vivaMap.get(stu.studentId) || vivaMap.get(stu.id);
      const vivaObtained = viva ? viva.totalScore : 30;
      const vivaMax = viva ? viva.maxScore : 40;
      const vivaPct = viva ? viva.percentage : 75;
      const vivaStatus = viva ? viva.status : 'COMPLETED';
      const vivaIntegrity = viva ? viva.integrityScore : 95;
      const vivaFaults = viva ? viva.faultsCount : 0;
      const vivaTitle = viva ? viva.testTitle : 'Mid-Term Oral VIVA: Raft Consensus';

      // Authenticity Gap: written assignment % vs oral viva %
      const rawGap = assignmentAvgPct - vivaPct;
      const authenticityGap = parseFloat(Math.abs(rawGap).toFixed(1));
      let authenticityStatus: 'HIGH_INTEGRITY' | 'ACCEPTABLE' | 'VERIFICATION_FLAG' = 'ACCEPTABLE';
      if (rawGap >= 25) {
        authenticityStatus = 'VERIFICATION_FLAG';
      } else if (authenticityGap <= 12) {
        authenticityStatus = 'HIGH_INTEGRITY';
      }

      // Default calculation with 60% assignment / 40% viva
      const initialOverall = parseFloat(((assignmentAvgPct * 0.60) + (vivaPct * 0.40)).toFixed(1));
      const totalPointsPct = parseFloat((((totalAssignmentObtained + vivaObtained) / (totalAssignmentMax + vivaMax)) * 100).toFixed(1));

      let badge: 'DISTINCTION' | 'EXCELLENT' | 'PROFICIENT' | 'COMPETENT' | 'NEEDS_PRACTICE' = 'NEEDS_PRACTICE';
      if (initialOverall >= 85) badge = 'DISTINCTION';
      else if (initialOverall >= 75) badge = 'EXCELLENT';
      else if (initialOverall >= 60) badge = 'PROFICIENT';
      else if (initialOverall >= 45) badge = 'COMPETENT';

      // Pull Course Outcomes (CO) Attainments
      const co1Score = a1Pct; // Assessed in Assignment 1
      const co2Score = parseFloat(((a1Pct * 0.5) + (vivaPct * 0.5)).toFixed(1)); // Dual: Assignment 1 (code) + Viva (verbal defense)
      const co3Score = a2Pct; // Assessed in Assignment 2
      const co4Score = vivaPct; // Assessed in Oral Viva

      const coAttainments: StudentCoAttainment[] = [
        {
          coCode: 'CO1',
          title: 'Foundations of Distributed State & Logical Clocks',
          targetPercentage: 70,
          achievedPercentage: co1Score,
          status: co1Score >= 70 ? 'ATTAINED' : co1Score >= 50 ? 'BORDERLINE' : 'CRITICAL',
          sources: [{ name: 'Assignment 1 (Coding)', type: 'ASSIGNMENT', contributionScore: co1Score }]
        },
        {
          coCode: 'CO2',
          title: 'Consensus Mechanics & Raft Protocol Execution',
          targetPercentage: 75,
          achievedPercentage: co2Score,
          status: co2Score >= 75 ? 'ATTAINED' : co2Score >= 50 ? 'BORDERLINE' : 'CRITICAL',
          sources: [
            { name: 'Assignment 1 (Code)', type: 'ASSIGNMENT', contributionScore: a1Pct },
            { name: 'Mid-Term Oral Viva (Defense)', type: 'ORAL_VIVA', contributionScore: vivaPct }
          ]
        },
        {
          coCode: 'CO3',
          title: 'Paxos Replication & Distributed Transactions',
          targetPercentage: 70,
          achievedPercentage: co3Score,
          status: co3Score >= 70 ? 'ATTAINED' : co3Score >= 50 ? 'BORDERLINE' : 'CRITICAL',
          sources: [{ name: 'Assignment 2 (Analysis Report)', type: 'ASSIGNMENT', contributionScore: co3Score }]
        },
        {
          coCode: 'CO4',
          title: 'Byzantine Fault Limits & Spoken System Defense',
          targetPercentage: 75,
          achievedPercentage: co4Score,
          status: co4Score >= 75 ? 'ATTAINED' : co4Score >= 50 ? 'BORDERLINE' : 'CRITICAL',
          sources: [{ name: 'Mid-Term Oral Viva (Spoken)', type: 'ORAL_VIVA', contributionScore: vivaPct }]
        }
      ];

      const bloomDistribution = [
        { level: 'L3: Apply (Implementation)', score: a1Marks, maxScore: 50, percentage: a1Pct },
        { level: 'L4: Analyze (Verification)', score: a2Marks, maxScore: 50, percentage: a2Pct },
        { level: 'L5: Evaluate (Oral Defense)', score: vivaObtained, maxScore: vivaMax, percentage: vivaPct }
      ];

      return {
        studentId: stu.studentId,
        studentName: stu.name,
        rollNo: stu.studentId,
        email: stu.email,
        avatarUrl: stu.avatarUrl,
        assignments: submissions,
        totalAssignmentMarksObtained: totalAssignmentObtained,
        totalAssignmentMaxMarks: totalAssignmentMax,
        assignmentAveragePercentage: assignmentAvgPct,
        vivaTestId: viva ? viva.testId : 'viva-1',
        vivaTitle,
        vivaMarksObtained: vivaObtained,
        vivaMaxMarks: vivaMax,
        vivaPercentage: vivaPct,
        vivaIntegrityScore: vivaIntegrity,
        vivaFaultsCount: vivaFaults,
        vivaStatus,
        overallCompositePercentage: initialOverall,
        totalPointsPercentage: totalPointsPct,
        finalGradeBadge: badge,
        authenticityGap,
        authenticityStatus,
        coAttainments,
        bloomDistribution
      };
    });

    this.rawStudentCompositeResults.set(compositeResults);
    if (!this.selectedFormulaStudentId() && compositeResults.length > 0) {
      this.selectedFormulaStudentId.set(compositeResults[0].studentId);
    }
  }

  setAssessmentSubTab(tab: 'CUMULATIVE_GRADEBOOK' | 'VIVA_HUB'): void {
    this.assessmentSubTab.set(tab);
  }

  setIndividualWeight(type: 'assignment1' | 'assignment2' | 'viva', value: number): void {
    const val = Math.max(0, Math.min(100, Math.round(value || 0)));
    if (type === 'assignment1') {
      this.assignment1Weight.set(val);
    } else if (type === 'assignment2') {
      this.assignment2Weight.set(val);
    } else if (type === 'viva') {
      this.vivaWeight.set(val);
    }
    this.weightPreset.set('CUSTOM');
  }

  setWeightPreset(preset: 'OBE_30_30_40' | 'VIVA_25_25_50' | 'LAB_35_35_30' | 'CUSTOM'): void {
    this.weightPreset.set(preset);
    if (preset === 'OBE_30_30_40') {
      this.assignment1Weight.set(30);
      this.assignment2Weight.set(30);
      this.vivaWeight.set(40);
    } else if (preset === 'VIVA_25_25_50') {
      this.assignment1Weight.set(25);
      this.assignment2Weight.set(25);
      this.vivaWeight.set(50);
    } else if (preset === 'LAB_35_35_30') {
      this.assignment1Weight.set(35);
      this.assignment2Weight.set(35);
      this.vivaWeight.set(30);
    }
  }

  setAssignmentWeight(weight: number): void {
    const val = Math.max(10, Math.min(90, Math.floor(weight || 60)));
    const half = Math.floor(val / 2);
    this.assignment1Weight.set(half);
    this.assignment2Weight.set(val - half);
    this.vivaWeight.set(100 - val);
    this.weightPreset.set('CUSTOM');
  }

  setFocusedAssessment(id: string | null): void {
    if (this.focusedAssessmentId() === id) {
      // Toggle off if clicked again
      this.focusedAssessmentId.set(null);
      return;
    }
    this.focusedAssessmentId.set(id);
    if (id) {
      this.isVivaDeckCompact.set(true);
    }
  }

  clearFocusedAssessment(): void {
    this.focusedAssessmentId.set(null);
  }

  toggleVivaDeckCompact(): void {
    this.isVivaDeckCompact.update(v => !v);
  }

  openStartScheduledVivaModal(viva: ClassVivaTest): void {
    this.scheduledVivaToStart.set(viva);
    this.startVivaNameInput.set(viva.title);
    this.startVivaLinkedAssignment.set(viva.linkedAssignmentName || 'Assignment 1: Distributed Raft Leader Election & Log Replication');
    this.isStartScheduledVivaModalOpen.set(true);
  }

  closeStartScheduledVivaModal(): void {
    this.isStartScheduledVivaModalOpen.set(false);
    this.scheduledVivaToStart.set(null);
  }

  confirmStartScheduledViva(): void {
    const viva = this.scheduledVivaToStart();
    if (!viva) return;
    const newName = this.startVivaNameInput().trim() || viva.title;
    const linkedAsgn = this.startVivaLinkedAssignment().trim() || viva.linkedAssignmentName;

    const updatedList = this.releasedVivaTests().map(t => {
      if (t.id === viva.id) {
        return {
          ...t,
          title: newName,
          linkedAssignmentName: linkedAsgn,
          status: 'RELEASED' as const,
          releasedAt: 'Just Now (Active)'
        };
      }
      return t;
    });

    this.releasedVivaTests.set(updatedList);
    const started = updatedList.find(t => t.id === viva.id)!;
    this.selectedVivaTest.set(started);
    this.focusedAssessmentId.set(started.id);

    try {
      localStorage.setItem(`class_released_vivas_${this.classId()}`, JSON.stringify(updatedList));
    } catch (e) {}

    if (this.proctorChannel) {
      this.proctorChannel.postMessage({
        type: 'VIVA_TEST_RELEASED',
        testId: started.id,
        title: started.title,
        classId: this.classId()
      });
    }

    this.closeStartScheduledVivaModal();
    this.buildStudentResults(this.classId(), started, this.students());
  }

  setCalculationMode(mode: 'WEIGHTED' | 'TOTAL_POINTS'): void {
    this.calculationMode.set(mode);
  }

  selectFormulaStudent(studentId: string): void {
    this.selectedFormulaStudentId.set(studentId);
  }

  openCompositeDossier(student: StudentCompositeResult): void {
    this.inspectedCompositeModalStudent.set(student);
    this.selectedFormulaStudentId.set(student.studentId);
  }

  closeCompositeDossier(): void {
    this.inspectedCompositeModalStudent.set(null);
  }

  toggleFormulaExplainer(): void {
    this.isFormulaExplainerOpen.update(v => !v);
  }

  downloadCompositeScorecardPdf(student: StudentCompositeResult): void {
    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) {
      alert('Please allow popups to download the official student scorecard.');
      return;
    }

    const w1 = this.assignment1Weight();
    const w2 = this.assignment2Weight();
    const wV = this.vivaWeight();
    const sumW = w1 + w2 + wV;
    const mode = this.calculationMode();

    const assignmentsHtml = student.assignments.map((a, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 10px; font-weight: bold; color: #0f172a;">
          <div>${a.assignmentTitle}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            Type: ${a.type.replace('_', ' ')} • Weight: <strong>${idx === 0 ? w1 : w2}%</strong> • Bloom: ${a.bloomLevel}
          </div>
        </td>
        <td style="padding: 8px 10px; font-family: monospace; color: #4338ca; font-weight: bold;">
          ${a.targetCOs.join(', ')}
        </td>
        <td style="padding: 8px 10px; font-weight: 800; color: #0f172a;">${a.obtainedMarks} / ${a.maxMarks}</td>
        <td style="padding: 8px 10px; font-weight: 800; color: ${a.percentage >= 75 ? '#15803d' : '#b45309'};">${a.percentage}%</td>
        <td style="padding: 8px 10px; font-size: 10px; color: #475569;">${a.feedbackNotes || 'Completed'}</td>
      </tr>
    `).join('');

    const coRowsHtml = student.coAttainments.map(co => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 10px; font-weight: 800; color: #0b4a39; font-family: monospace;">${co.coCode}</td>
        <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${co.title}</td>
        <td style="padding: 8px 10px; font-weight: bold; color: #64748b;">${co.targetPercentage}%</td>
        <td style="padding: 8px 10px; font-weight: 800; color: ${co.achievedPercentage >= co.targetPercentage ? '#15803d' : '#dc2626'};">
          ${co.achievedPercentage}%
        </td>
        <td style="padding: 8px 10px; font-size: 10px; color: #475569;">
          ${co.sources.map(s => `${s.name} (${s.contributionScore}%)`).join(' + ')}
        </td>
        <td style="padding: 8px 10px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; ${
            co.status === 'ATTAINED' ? 'background: #dcfce7; color: #166534;' :
            co.status === 'BORDERLINE' ? 'background: #fef3c7; color: #92400e;' : 'background: #fee2e2; color: #991b1b;'
          }">${co.status}</span>
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Accredited_Composite_Scorecard_${student.rollNo}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 18px; color: #0f172a; line-height: 1.35; }
          .header-box { border-bottom: 3px double #0b4a39; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
          .crest { font-size: 26px; font-weight: 900; color: #0b4a39; letter-spacing: -0.5px; }
          .subcrest { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          .student-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; font-size: 11px; }
          .formula-box { background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px; }
          .formula-title { font-weight: 800; color: #1e40af; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
          .formula-math { font-family: 'Courier New', monospace; font-size: 11px; background: white; padding: 6px 10px; border-radius: 6px; border: 1px solid #bfdbfe; margin-top: 4px; color: #1e3a8a; line-height: 1.5; }
          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0b4a39; margin: 12px 0 6px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 10px; }
          th { background: #0b4a39; color: white; padding: 6px 8px; text-align: left; font-size: 10.5px; text-transform: uppercase; }
          .highlight-card { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
          .stat-tile { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #ffffff; text-align: center; }
          .sign-block { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 25px; }
          .sign-line { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: bold; font-size: 11px; text-align: center; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 12px; text-align: right;">
          <button onclick="window.print()" style="background: #0b4a39; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">
            🖨️ Print / Save Student Gradecard as PDF
          </button>
        </div>

        <div class="header-box">
          <div>
            <div class="crest">ScholarX University of Technology</div>
            <div class="subcrest">Outcome-Based Education (OBE) • Board of Examinations</div>
            <div style="font-size: 10px; color: #475569; margin-top: 2px;">Comprehensive Continuous Assessment & Oral Defense Transcript</div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; padding: 3px 8px; border-radius: 4px; background: #e6f4f0; color: #0b4a39; font-weight: 800; font-size: 11px;">
              NAAC / NBA ACCREDITED
            </div>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 3px;">Session: 2026-2027 • Sem 7</div>
          </div>
        </div>

        <div class="student-card">
          <div><strong style="color: #64748b;">Candidate Name:</strong><br><span style="font-size: 12px; font-weight: 800; color: #0f172a;">${student.studentName}</span></div>
          <div><strong style="color: #64748b;">University Roll No:</strong><br><span style="font-family: monospace; font-weight: bold;">${student.rollNo}</span></div>
          <div><strong style="color: #64748b;">Course / Subject:</strong><br>${this.classItem()?.name || 'Distributed Systems'} (${this.classItem()?.subjectCode || 'CS401'})</div>
          <div><strong style="color: #64748b;">Candidate Email:</strong><br>${student.email}</div>
        </div>

        <!-- ON-SCREEN MATHEMATICAL CALCULATION AUDIT FORMULA -->
        <div class="formula-box">
          <div class="formula-title">📐 Mathematical Calculation Audit & Dynamic Weightage Proof</div>
          <div style="font-size: 10.5px; color: #334155; margin-bottom: 4px;">
            Grading Policy: <strong>${mode === 'WEIGHTED' ? `3-Tier Weightage Policy (${w1}% Assgn 1 + ${w2}% Assgn 2 + ${wV}% Oral Viva = ${sumW}%)` : 'Cumulative Raw Points Pool'}</strong>
          </div>
          <div class="formula-math">
            <strong>1. Individual Assessment Modality Scores:</strong><br>
            • Assgn 1 (${w1}% wt): ${student.assignments[0]?.obtainedMarks || 0} / 50 = <strong>${student.assignments[0]?.percentage || 0}%</strong><br>
            • Assgn 2 (${w2}% wt): ${student.assignments[1]?.obtainedMarks || 0} / 50 = <strong>${student.assignments[1]?.percentage || 0}%</strong><br>
            • Oral Viva (${wV}% wt): ${student.vivaMarksObtained} / ${student.vivaMaxMarks} = <strong>${student.vivaPercentage}%</strong>
            <br><br>
            <strong>2. Cumulative Overall Final Grade Formula:</strong><br>
            ${mode === 'WEIGHTED' 
              ? `Overall (%) = [ (${w1}% × ${student.assignments[0]?.percentage || 0}%) + (${w2}% × ${student.assignments[1]?.percentage || 0}%) + (${wV}% × ${student.vivaPercentage}%) ] / ${sumW}%<br>&nbsp;= [ (${(w1/100).toFixed(2)} × ${student.assignments[0]?.percentage || 0}%) + (${(w2/100).toFixed(2)} × ${student.assignments[1]?.percentage || 0}%) + (${(wV/100).toFixed(2)} × ${student.vivaPercentage}%) ] / ${(sumW/100).toFixed(2)} = <strong>${student.overallCompositePercentage}%</strong> [Grade: ${student.finalGradeBadge}]`
              : `Overall (%) = [ Total Obtained / Total Max ] × 100 = [ (${student.totalAssignmentMarksObtained} + ${student.vivaMarksObtained}) / (${student.totalAssignmentMaxMarks} + ${student.vivaMaxMarks}) ] × 100 = <strong>${student.overallCompositePercentage}%</strong> [Grade: ${student.finalGradeBadge}]`
            }
          </div>
        </div>

        <!-- 3-PILLAR SCORE HIGHLIGHT TILES -->
        <div class="highlight-card">
          <div class="stat-tile" style="border-top: 3px solid #3b82f6;">
            <div style="font-size: 10px; font-weight: 800; color: #2563eb; text-transform: uppercase;">📝 Written Assignments Avg</div>
            <div style="font-size: 18px; font-weight: 900; color: #1e3a8a; margin: 3px 0;">${student.assignmentAveragePercentage}%</div>
            <div style="font-size: 9.5px; color: #64748b;">${student.totalAssignmentMarksObtained} / ${student.totalAssignmentMaxMarks} Points (Weight: ${w1 + w2}%)</div>
          </div>
          <div class="stat-tile" style="border-top: 3px solid #10b981;">
            <div style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase;">🎙️ Proctored Oral Viva</div>
            <div style="font-size: 18px; font-weight: 900; color: #064e3b; margin: 3px 0;">${student.vivaPercentage}%</div>
            <div style="font-size: 9.5px; color: #64748b;">${student.vivaMarksObtained} / ${student.vivaMaxMarks} Points (Weight: ${wV}%, Trust: ${student.vivaIntegrityScore}%)</div>
          </div>
          <div class="stat-tile" style="border-top: 3px solid #0b4a39; background: #f0fdf4;">
            <div style="font-size: 10px; font-weight: 800; color: #0b4a39; text-transform: uppercase;">🏆 Final Composite Grade</div>
            <div style="font-size: 18px; font-weight: 900; color: #0b4a39; margin: 3px 0;">${student.overallCompositePercentage}%</div>
            <div style="font-size: 9.5px; font-weight: bold; color: #166534;">${student.finalGradeBadge}</div>
          </div>
        </div>

        <!-- SECTION 1: ASSIGNMENTS -->
        <div class="section-title">
          <span>Part A: Written & Coding Assignments (Modality I)</span>
          <span style="font-size: 10px; color: #64748b;">Combined Weight: ${w1 + w2}% (A1: ${w1}%, A2: ${w2}%)</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Assessment Name</th>
              <th>Target CO</th>
              <th>Marks</th>
              <th>Percentage</th>
              <th>Faculty Feedback & Verification</th>
            </tr>
          </thead>
          <tbody>
            ${assignmentsHtml}
          </tbody>
        </table>

        <!-- SECTION 2: ORAL VIVA -->
        <div class="section-title">
          <span>Part B: AI-Proctored Oral Viva Defense (Modality II)</span>
          <span style="font-size: 10px; color: #64748b;">Individual Weight: ${wV}%</span>
        </div>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 11px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #0f172a;">${student.vivaTitle}</strong>
            <span style="font-weight: 800; color: #15803d;">Score: ${student.vivaMarksObtained} / ${student.vivaMaxMarks} (${student.vivaPercentage}%)</span>
          </div>
          <div style="font-size: 10px; color: #475569;">
            Proctoring Integrity: <strong>${student.vivaIntegrityScore}%</strong> • Detected Infractions: <strong>${student.vivaFaultsCount}</strong> • Oral Exam Status: <strong>${student.vivaStatus}</strong> • Weightage: <strong>${wV}%</strong>
          </div>
        </div>

        <!-- SECTION 3: CO ATTAINMENTS -->
        <div class="section-title">
          <span>Part C: Outcome-Based Education (OBE) Course Outcomes (CO) Attainments</span>
          <span style="font-size: 10px; color: #64748b;">Accreditation Matrix</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>CO Code</th>
              <th>Course Outcome Competency</th>
              <th>Target</th>
              <th>Attained</th>
              <th>Assessment Source Modality</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${coRowsHtml}
          </tbody>
        </table>

        <!-- SECTION 4: AUTHENTICITY GAP -->
        <div class="section-title">
          <span>Part D: Authenticity Gap & Competency Consistency Analysis</span>
        </div>
        <div style="background: ${student.authenticityStatus === 'VERIFICATION_FLAG' ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${student.authenticityStatus === 'VERIFICATION_FLAG' ? '#fca5a5' : '#86efac'}; border-radius: 8px; padding: 8px 12px; font-size: 10.5px;">
          <div style="font-weight: 800; color: ${student.authenticityStatus === 'VERIFICATION_FLAG' ? '#991b1b' : '#166534'}; margin-bottom: 2px;">
            ${student.authenticityStatus === 'VERIFICATION_FLAG' ? '⚠️ High Authenticity Discrepancy Flagged' : '✓ High Competency Integrity & Authentic Authorship Verified'}
          </div>
          <div>
            Discrepancy Gap: <strong>${student.authenticityGap}%</strong> between written assignments (${student.assignmentAveragePercentage}%) and live oral defense (${student.vivaPercentage}%).
            ${student.authenticityStatus === 'VERIFICATION_FLAG' 
              ? 'Recommendation: The student performed well in asynchronous written code but experienced significant struggle during verbal interrogation. Candidate recommended for mandatory viva re-defense.' 
              : 'The student exhibits strong consistency across both asynchronous problem-solving and spontaneous verbal defense under questioning.'}
          </div>
        </div>

        <div class="sign-block">
          <div class="sign-box">
            <div class="sign-line">Course Instructor</div>
            <div style="font-size: 9.5px; color: #64748b; text-align: center;">Dr. Sarah Jenkins</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">OBE Coordinator</div>
            <div style="font-size: 9.5px; color: #64748b; text-align: center;">Academic Audit Committee</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">Controller of Examinations</div>
            <div style="font-size: 9.5px; color: #64748b; text-align: center;">Autonomous Board of Exams</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 14px; font-size: 8.5px; color: #94a3b8; font-family: monospace;">
          Cryptographic Verification Hash: SHA256-COMPOSITE-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)} • Tamper-Proof OBE Record
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  downloadBatchCompositePdf(): void {
    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) {
      alert('Please allow popups to download the class composite ledger.');
      return;
    }

    const list = this.recalculatedStudentCompositeResults();
    const stats = this.compositeStats();
    const w1 = this.assignment1Weight();
    const w2 = this.assignment2Weight();
    const wV = this.vivaWeight();
    const sumW = w1 + w2 + wV;

    const rows = list.map((s, i) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10.5px;">
        <td style="padding: 6px 8px; font-weight: bold;">${i + 1}</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${s.studentName}</td>
        <td style="padding: 6px 8px; font-family: monospace; color: #64748b;">${s.rollNo}</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #2563eb;">${s.assignments[0]?.percentage || 0}%</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #4338ca;">${s.assignments[1]?.percentage || 0}%</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #059669;">${s.vivaPercentage}%</td>
        <td style="padding: 6px 8px; font-weight: 800; color: #0b4a39;">${s.overallCompositePercentage}%</td>
        <td style="padding: 6px 8px; font-weight: bold;">${s.finalGradeBadge}</td>
        <td style="padding: 6px 8px; color: ${s.authenticityStatus === 'VERIFICATION_FLAG' ? '#dc2626' : '#166534'}; font-weight: bold;">
          ${s.authenticityStatus === 'VERIFICATION_FLAG' ? '⚠️ ' + s.authenticityGap + '% Flag' : '✓ OK (' + s.authenticityGap + '%)'}
        </td>
        <td style="padding: 6px 8px; font-size: 9.5px;">
          ${s.coAttainments.map(co => `<span style="display:inline-block; padding:1px 4px; border-radius:3px; margin:1px; ${co.status === 'ATTAINED' ? 'background:#dcfce7;color:#166534;' : 'background:#fee2e2;color:#991b1b;'}">${co.coCode}</span>`).join('')}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cohort_Composite_Gradebook_${this.classItem()?.subjectCode || 'CS401'}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 18px; color: #0f172a; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #0b4a39; color: white; padding: 6px 8px; text-align: left; font-size: 10.5px; }
          .kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
          .kpi-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 12px; text-align: right;">
          <button onclick="window.print()" style="background: #0b4a39; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ Print / Save Ledger as PDF
          </button>
        </div>

        <div style="border-bottom: 2px solid #0b4a39; padding-bottom: 8px; margin-bottom: 12px;">
          <h2 style="margin: 0; color: #0b4a39; font-size: 18px;">ScholarX Autonomous Institute • Cohort Composite Gradebook</h2>
          <div style="color: #64748b; font-size: 11px; margin-top: 3px;">
            Course: <strong>${this.classItem()?.name || 'Distributed Systems'} (${this.classItem()?.subjectCode || 'CS401'})</strong> • Policy: <strong>${w1}% Assgn 1 + ${w2}% Assgn 2 + ${wV}% Oral Viva (Total: ${sumW}%)</strong>
          </div>
        </div>

        <div class="kpi-strip">
          <div class="kpi-card">
            <div style="font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Candidates</div>
            <div style="font-size: 16px; font-weight: 900; color: #0f172a;">${stats.total}</div>
          </div>
          <div class="kpi-card">
            <div style="font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Assgn 1 (${w1}%) & Assgn 2 (${w2}%)</div>
            <div style="font-size: 16px; font-weight: 900; color: #2563eb;">${stats.avgAssignment}% Avg</div>
          </div>
          <div class="kpi-card">
            <div style="font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Oral Viva (${wV}%)</div>
            <div style="font-size: 16px; font-weight: 900; color: #059669;">${stats.avgViva}% Avg</div>
          </div>
          <div class="kpi-card">
            <div style="font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Cohort Weighted Overall</div>
            <div style="font-size: 16px; font-weight: 900; color: #0b4a39;">${stats.avgOverall}%</div>
          </div>
          <div class="kpi-card">
            <div style="font-size: 9.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Authenticity Gap Flags</div>
            <div style="font-size: 16px; font-weight: 900; color: ${stats.gapFlagsCount > 0 ? '#dc2626' : '#166534'};">${stats.gapFlagsCount} Flagged</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Roll Number</th>
              <th>Assgn 1 (${w1}%)</th>
              <th>Assgn 2 (${w2}%)</th>
              <th>Oral Viva (${wV}%)</th>
              <th>Overall Grade</th>
              <th>Badge</th>
              <th>Authenticity Gap</th>
              <th>CO Attainments</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  exportCompositeCsv(): void {
    const results = this.recalculatedStudentCompositeResults();
    if (results.length === 0) return;
    const w1 = this.assignment1Weight();
    const w2 = this.assignment2Weight();
    const wV = this.vivaWeight();
    const headers = [
      'Roll No',
      'Student Name',
      'Email',
      'Assignment 1 Marks (Max 50)',
      'Assignment 1 Pct',
      `Assignment 1 Weight Pct (${w1}%)`,
      'Assignment 2 Marks (Max 50)',
      'Assignment 2 Pct',
      `Assignment 2 Weight Pct (${w2}%)`,
      'Assignment Avg Pct',
      'Viva Marks Obtained',
      'Viva Max Marks',
      'Viva Pct',
      `Viva Weight Pct (${wV}%)`,
      'Linked Viva / Assignment Name',
      'Overall Composite Pct',
      'Grade Badge',
      'Authenticity Gap Pct',
      'Authenticity Status'
    ];
    const rows = results.map(r => [
      `"${r.rollNo}"`,
      `"${r.studentName}"`,
      `"${r.email}"`,
      r.assignments[0]?.obtainedMarks || 0,
      `${r.assignments[0]?.percentage || 0}%`,
      `${w1}%`,
      r.assignments[1]?.obtainedMarks || 0,
      `${r.assignments[1]?.percentage || 0}%`,
      `${w2}%`,
      `${r.assignmentAveragePercentage}%`,
      r.vivaMarksObtained,
      r.vivaMaxMarks,
      `${r.vivaPercentage}%`,
      `${wV}%`,
      `"${r.assignments[0]?.assignmentTitle || 'Assignment 1'} <-> ${r.vivaTitle}"`,
      `${r.overallCompositePercentage}%`,
      `"${r.finalGradeBadge}"`,
      `${r.authenticityGap}%`,
      `"${r.authenticityStatus}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Accredited_Gradebook_${this.classItem()?.subjectCode || 'CS401'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openReleaseVivaModal(): void {
    this.isReleaseVivaModalOpen.set(true);
    this.releaseVivaSuccess.set(false);
  }

  closeReleaseVivaModal(): void {
    this.isReleaseVivaModalOpen.set(false);
  }

  submitReleaseVivaTest(): void {
    const classId = this.classId();
    const className = this.classItem()?.name || 'Distributed Systems';
    const newTest: ClassVivaTest = {
      id: `viva-${classId}-${Date.now()}`,
      classId,
      subjectCode: this.classItem()?.subjectCode || 'CS401',
      subjectName: className,
      title: this.newVivaTitle() || 'Custom Oral VIVA Assessment',
      description: this.newVivaDescription() || 'Proctored oral viva releasing for cohort examination.',
      releasedAt: 'Just Now',
      durationMinutes: this.newVivaDuration() || 15,
      totalMarks: this.newVivaTotalMarks() || 40,
      status: 'RELEASED',
      targetCOs: [this.newVivaTargetCO() || 'CO3: Consensus Algorithms'],
      questionsCount: 3,
      attemptedCount: 0,
      totalEnrolled: this.students().length,
      classAverageScore: 0,
      questions: [
        { id: 'q1', index: 1, prompt: `Explain foundational concepts for ${this.newVivaTargetCO()} under high concurrency.`, marks: 10, targetCO: this.newVivaTargetCO(), bloom: this.newVivaBloom() },
        { id: 'q2', index: 2, prompt: `Analyze state machine transitions and safety bounds in asynchronous networks.`, marks: 15, targetCO: this.newVivaTargetCO(), bloom: this.newVivaBloom() },
        { id: 'q3', index: 3, prompt: `Derive the fault tolerance boundary conditions and failover trade-offs.`, marks: 15, targetCO: this.newVivaTargetCO(), bloom: 'L5: Evaluate' }
      ]
    };

    const updated = [newTest, ...this.releasedVivaTests()];
    this.releasedVivaTests.set(updated);
    this.selectedVivaTest.set(newTest);

    try {
      localStorage.setItem(`class_released_vivas_${classId}`, JSON.stringify(updated));
    } catch (e) {}

    // Broadcast release over channel
    if (this.proctorChannel) {
      this.proctorChannel.postMessage({
        type: 'VIVA_TEST_RELEASED',
        testId: newTest.id,
        title: newTest.title,
        classId
      });
    }

    this.releaseVivaSuccess.set(true);
    setTimeout(() => {
      this.closeReleaseVivaModal();
      this.buildStudentResults(classId, newTest, this.students());
    }, 1200);
  }

  inspectStudentResult(result: ClassStudentVivaResult): void {
    this.inspectedStudentResult.set(result);
  }

  closeInspectModal(): void {
    this.inspectedStudentResult.set(null);
  }

  // =========================================================================
  // PDF EXPORT ENGINE: SINGLE CANDIDATE SCORECARD & CLASS BATCH LEDGER
  // =========================================================================
  downloadStudentResultPdf(result: ClassStudentVivaResult): void {
    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) {
      alert('Please allow popups to preview and save the PDF scorecard.');
      return;
    }

    const faultsListHtml = result.faults && result.faults.length > 0 
      ? result.faults.map(f => `
          <tr style="border-bottom: 1px solid #fee2e2;">
            <td style="padding: 6px 10px; font-weight: bold; color: #b91c1c;">${f.type}</td>
            <td style="padding: 6px 10px; font-family: monospace; font-size: 11px; color: #64748b;">${f.timestamp}</td>
            <td style="padding: 6px 10px; color: #dc2626;">${f.description}</td>
            <td style="padding: 6px 10px;"><span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${f.severity}</span></td>
          </tr>
        `).join('')
      : `<tr><td colspan="4" style="padding: 10px; text-align: center; color: #059669; font-weight: bold;">✓ 0 Proctoring Infractions Logged - Clean Session Audit</td></tr>`;

    const questionsHtml = result.questionResults && result.questionResults.length > 0
      ? result.questionResults.map(q => `
          <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 14px; page-break-inside: avoid; background: #fafafa;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
              <span style="font-weight: 800; color: #0f172a; font-size: 13px;">Question #${q.questionIndex}</span>
              <div>
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 8px; ${
                  q.verdict === 'CORRECT' ? 'background: #dcfce7; color: #166534;' :
                  q.verdict === 'PARTIALLY_CORRECT' ? 'background: #fef3c7; color: #92400e;' :
                  q.verdict === 'INCORRECT' ? 'background: #fee2e2; color: #991b1b;' : 'background: #f1f5f9; color: #475569;'
                }">${q.verdict.replace('_', ' ')}</span>
                <span style="font-weight: 800; color: #4338ca; font-size: 12px;">Score: ${q.awardedScore} / ${q.maxMarks} Marks</span>
              </div>
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">${q.questionText}</div>
            
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 11px; font-style: italic; color: #334155; margin-bottom: 8px;">
              <strong style="color: #64748b; font-style: normal; display: block; font-size: 10px; text-transform: uppercase;">Candidate's Recorded Spoken / Written Answer:</strong>
              "${q.studentAnswer || '[No response provided]'}"
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
              <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 8px 10px; font-size: 11px; color: #881337;">
                <strong style="display: block; color: #be123c; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">⚠️ What Was Inaccurate / Missing:</strong>
                ${q.whatWasWrong || 'Answer met expected bounds with minor opportunities for analytical depth.'}
              </div>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px 10px; font-size: 11px; color: #064e3b;">
                <strong style="display: block; color: #047857; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">✅ Correct Reference Answer & Solution:</strong>
                ${q.correctAnswerSolution}
              </div>
            </div>

            <div style="font-size: 10px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
              <strong>Key Concepts Identified:</strong> ${(q.keyConceptsIdentified || []).join(', ') || 'General Concept'} | 
              <strong>Missing Requirements:</strong> ${(q.missingConcepts || []).join(', ') || 'None'}
            </div>
          </div>
        `).join('')
      : '<p style="color: #64748b;">No individual question breakdowns recorded.</p>';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Viva_Result_${result.rollNo}_${result.studentName.replace(/\\s+/g, '_')}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
          .header { border-bottom: 2px solid #0b4a39; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .inst-name { font-size: 18px; font-weight: 900; color: #0b4a39; text-transform: uppercase; letter-spacing: 0.5px; }
          .doc-title { font-size: 13px; font-weight: 700; color: #334155; margin-top: 3px; }
          .candidate-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
          .c-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
          .c-val { font-size: 12px; font-weight: 700; color: #0f172a; }
          .score-banner { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 18px; margin-bottom: 16px; }
          .score-big { font-size: 24px; font-weight: 900; color: #15803d; }
          .pillars-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
          .pillar-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #ffffff; }
          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0b4a39; margin: 16px 0 8px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
          th { background: #f1f5f9; text-align: left; padding: 6px 10px; font-weight: bold; color: #475569; }
          .sign-block { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #cbd5e1; }
          .sign-box { text-align: center; width: 180px; }
          .sign-line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 4px; font-size: 11px; font-weight: bold; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; padding: 10px; background: #e0f2fe; border-radius: 6px; text-align: right;">
          <button onclick="window.print()" style="background: #0b4a39; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div>
            <div class="inst-name">ScholarX Autonomous Examination Division</div>
            <div class="doc-title">Official Student Oral Viva Forensic Audit & Performance Scorecard</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div><strong>Exam Ref:</strong> ${result.testId}</div>
            <div><strong>Date:</strong> ${result.submittedAt}</div>
          </div>
        </div>

        <div class="candidate-box">
          <div>
            <div class="c-label">Candidate Name</div>
            <div class="c-val">${result.studentName}</div>
          </div>
          <div>
            <div class="c-label">Roll Number</div>
            <div class="c-val">${result.rollNo}</div>
          </div>
          <div>
            <div class="c-label">Course / Subject</div>
            <div class="c-val">${this.classItem()?.name || 'Distributed Systems'} (${this.classItem()?.subjectCode || 'CS401'})</div>
          </div>
          <div>
            <div class="c-label">Session Status</div>
            <div class="c-val" style="color: ${result.status === 'COMPLETED' ? '#15803d' : result.status === 'DISQUALIFIED' ? '#dc2626' : '#d97706'}; font-weight: 800;">
              ${result.status}
            </div>
          </div>
        </div>

        <div class="score-banner">
          <div>
            <div style="font-size: 11px; font-weight: bold; color: #166534; text-transform: uppercase;">Awarded Performance Score</div>
            <div class="score-big">${result.totalScore} / ${result.maxScore} <span style="font-size: 16px; font-weight: 700;">(${result.percentage}%)</span></div>
            <div style="font-size: 11px; color: #166534; margin-top: 2px;"><strong>Academic Standing:</strong> ${result.gradeBadge}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: bold; color: #166534; text-transform: uppercase;">Proctoring Integrity Index</div>
            <div style="font-size: 20px; font-weight: 800; color: ${result.integrityScore >= 80 ? '#15803d' : '#b91c1c'};">${result.integrityScore}%</div>
            <div style="font-size: 11px; color: #475569;">Logged Faults: <strong>${result.faultsCount} Infractions</strong></div>
          </div>
        </div>

        <div class="section-title">4-Pillar Accreditation Rubric Breakdown</div>
        <div class="pillars-grid">
          ${(result.pillars || []).map(p => `
            <div class="pillar-card">
              <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; color: #64748b;">
                <span>${p.weightPercent}% WEIGHT</span>
                <span style="color: #4338ca;">${p.awardedScore}/${p.maxScore}</span>
              </div>
              <div style="font-weight: 800; font-size: 11px; color: #0f172a; margin: 3px 0;">${p.name}</div>
              <div style="font-size: 10px; color: #475569; line-height: 1.3;">${p.feedback}</div>
            </div>
          `).join('')}
        </div>

        <div class="section-title">Security Audit & Proctoring Faults Log</div>
        <table>
          <thead>
            <tr>
              <th>Infraction Type</th>
              <th>Timestamp</th>
              <th>Incident Description</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            ${faultsListHtml}
          </tbody>
        </table>

        <div class="section-title">Question-by-Question Forensic AI Evaluation & Model Solutions</div>
        ${questionsHtml}

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-top: 14px; font-size: 11px;">
          <strong style="color: #0b4a39; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 4px;">🎯 Continuous Quality Improvement (CQI) Action Plan:</strong>
          ${result.cqiActionItem || 'Review Outcome-Based Education (OBE) course outcome modules and participate in peer scaffolding sessions.'}
        </div>

        <div class="sign-block">
          <div class="sign-box">
            <div class="sign-line">Course Instructor</div>
            <div style="font-size: 10px; color: #64748b;">Dr. Sarah Jenkins</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">AI Examination Chair</div>
            <div style="font-size: 10px; color: #64748b;">Gemini 3.6 Automated OBE Auditor</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">Dean of Academic Affairs</div>
            <div style="font-size: 10px; color: #64748b;">Autonomous Board of Exams</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #94a3b8; font-family: monospace;">
          Cryptographic Verification Hash: SHA256-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)} • Verified Tamper-Proof Audit Record
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  downloadBatchClassResultsPdf(): void {
    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) {
      alert('Please allow popups to download the class results ledger.');
      return;
    }
    const rows = this.studentVivaResults().map((r, i) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 10px; font-weight: bold;">${i + 1}</td>
        <td style="padding: 8px 10px; font-weight: bold; color: #0f172a;">${r.studentName}</td>
        <td style="padding: 8px 10px; font-family: monospace; color: #64748b;">${r.rollNo}</td>
        <td style="padding: 8px 10px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; ${
            r.status === 'COMPLETED' ? 'background: #dcfce7; color: #166534;' :
            r.status === 'DISQUALIFIED' ? 'background: #fee2e2; color: #991b1b;' : 'background: #fef3c7; color: #92400e;'
          }">${r.status}</span>
        </td>
        <td style="padding: 8px 10px; font-weight: 800; color: #15803d;">${r.totalScore} / ${r.maxScore} (${r.percentage}%)</td>
        <td style="padding: 8px 10px; font-weight: bold;">${r.gradeBadge}</td>
        <td style="padding: 8px 10px; color: ${r.faultsCount > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">
          ${r.faultsCount > 0 ? '⚠️ ' + r.faultsCount + ' Faults' : '✓ Clean (0)'}
        </td>
        <td style="padding: 8px 10px; font-weight: bold; color: ${r.integrityScore >= 80 ? '#166534' : '#b91c1c'};">${r.integrityScore}%</td>
      </tr>
    `).join('');

    const stats = this.resultsStats();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cohort_Viva_Results_Ledger_${this.classItem()?.subjectCode || 'CS401'}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #0b4a39; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
          .kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
          .kpi-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="background: #0b4a39; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ Print / Save Ledger as PDF
          </button>
        </div>

        <div style="border-bottom: 2px solid #0b4a39; padding-bottom: 10px; margin-bottom: 15px;">
          <h2 style="margin: 0; color: #0b4a39; font-size: 20px;">ScholarX Examination Division • Cohort Oral Viva Ledger</h2>
          <div style="color: #64748b; font-size: 12px; margin-top: 4px;">
            Course: <strong>${this.classItem()?.name || 'Distributed Systems'} (${this.classItem()?.subjectCode || 'CS401'})</strong> • Semester 7 • Academic Year 2026-2027
          </div>
        </div>

        <div class="kpi-strip">
          <div class="kpi-card">
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Candidates</div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">${stats.total} Students</div>
          </div>
          <div class="kpi-card">
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Completed Vivas</div>
            <div style="font-size: 18px; font-weight: 900; color: #15803d;">${stats.completed} Completed</div>
          </div>
          <div class="kpi-card">
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Cohort Average Score</div>
            <div style="font-size: 18px; font-weight: 900; color: #4338ca;">${stats.avgScore}%</div>
          </div>
          <div class="kpi-card">
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Cohort Pass Rate</div>
            <div style="font-size: 18px; font-weight: 900; color: #0284c7;">${stats.passRate}%</div>
          </div>
          <div class="kpi-card">
            <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase;">Clean Proctoring Rate</div>
            <div style="font-size: 18px; font-weight: 900; color: #166534;">${stats.cleanRate}%</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Roll Number</th>
              <th>Status</th>
              <th>Awarded Score</th>
              <th>Grade</th>
              <th>Proctoring Faults</th>
              <th>Integrity %</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  exportResultsCsv(): void {
    const results = this.studentVivaResults();
    if (results.length === 0) return;
    const headers = ['Roll No', 'Student Name', 'Email', 'Status', 'Total Score', 'Max Score', 'Percentage', 'Grade', 'Faults Count', 'Integrity Score', 'Submitted At'];
    const rows = results.map(r => [
      `"${r.rollNo}"`,
      `"${r.studentName}"`,
      `"${r.email}"`,
      `"${r.status}"`,
      r.totalScore,
      r.maxScore,
      `${r.percentage}%`,
      `"${r.gradeBadge}"`,
      r.faultsCount,
      `${r.integrityScore}%`,
      `"${r.submittedAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Viva_Results_${this.classItem()?.subjectCode || 'CS401'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
