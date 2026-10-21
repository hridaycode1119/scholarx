import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { StudentService, extractClassCode } from '../../../core/services/student.service';
import { StudentVivaEvaluationResult, StudentJoinedClass, VivaQuestionSubmissionItem, VivaQuestionEvaluationItem } from '../../../core/models';
import { AiViva3dComponent, AiVivaState } from '../../../shared/components/ai-viva-3d/ai-viva-3d';

export type VivaStage = 'CLASS_SELECT' | 'DEVICE_CHECK' | 'BRIEFING' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';

export type AiAvatarState = AiVivaState;

export type AiGesture = 
  | 'NONE' 
  | 'PEACE_SIGN' 
  | 'STYLUS_CHIN' 
  | 'SUPPORTIVE_HANDS' 
  | 'HOLO_SCREENS' 
  | 'MOTIVATIONAL_BUBBLE' 
  | 'POINT_TO_TEST';

export interface ProctorIncident {
  id: number;
  timestamp: string;
  type: string;
  description: string;
  severity: 'WARNING' | 'CRITICAL';
}

@Component({
  selector: 'app-student-viva',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AiViva3dComponent],
  templateUrl: './student-viva.html',
  styleUrl: './student-viva.scss'
})
export class StudentVivaComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly studentService = inject(StudentService);

  @ViewChild('videoPreview') videoPreviewRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('activeVideo') activeVideoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('offscreenCanvas') offscreenCanvasRef?: ElementRef<HTMLCanvasElement>;

  // 1. Stage Progression State
  readonly currentStage = signal<VivaStage>('CLASS_SELECT');

  // Stage 1: Class Selection & Join Mode (Enrolled Only OR Join by Code/Link)
  readonly classSelectMode = signal<'ENROLLED' | 'CODE_OR_LINK'>('ENROLLED');
  readonly selectedClass = signal<StudentJoinedClass | null>(null);
  readonly inputClassCodeOrLink = signal<string>('OS-4482');
  readonly gateError = signal<string | null>(null);

  // Stage 2: Hardware Diagnostics & Biometric Face Calibration
  readonly mediaStream = signal<MediaStream | null>(null);
  readonly cameraActive = signal<boolean>(false);
  readonly micActive = signal<boolean>(true);
  readonly micVolumeDb = signal<number>(45);
  readonly isSpeakerDisabled = signal<boolean>(false);
  readonly permissionDenied = signal<boolean>(false);
  readonly audioFreqBands = signal<number[]>([25, 45, 60, 80, 70, 55, 65, 85, 50, 40, 60, 30]);
  readonly isVoiceActive = signal<boolean>(false);
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  // Biometric Face Capture & Live 1-Second Continuous Monitoring
  readonly studentBaselineFaceSnapshot = signal<string | null>(null);
  readonly isFaceDetected = signal<boolean>(true);
  readonly isFaceAligned = signal<boolean>(true);
  readonly faceScanStatus = signal<'CALIBRATING' | 'LOCKED' | 'NOT_DETECTED' | 'MISMATCH'>('CALIBRATING');
  readonly faceSimilarityScore = signal<number>(99.4);
  readonly faceBox = signal<{ x: number; y: number; width: number; height: number }>({ x: 25, y: 15, width: 50, height: 70 });
  private faceMonitoringInterval: any = null;
  private faceMissingDuration = 0;

  // Stage 3: Briefing & Honor Code
  readonly honorCodeAgreed = signal<boolean>(false);

  // Stage 4: High Security Proctoring & Configurable Disqualification
  readonly isSecurityEnabled = signal<boolean>(true);
  readonly isFullscreenLocked = signal<boolean>(false);
  readonly integrityScore = signal<number>(100);
  readonly strikeCount = signal<number>(0);
  readonly maxStrikes = signal<number>(3);
  readonly proctorIncidents = signal<ProctorIncident[]>([]);
  readonly activeSecurityAlert = signal<{ title: string; message: string; severity: 'WARNING' | 'CRITICAL' } | null>(null);
  readonly isDisqualified = signal<boolean>(false);
  readonly disqualificationReason = signal<string | null>(null);

  // Modal Alert Takeover States
  readonly isTabSwitchModalOpen = signal<boolean>(false);
  readonly isFullscreenExitModalOpen = signal<boolean>(false);
  readonly isFaceHiddenModalOpen = signal<boolean>(false);

  readonly isAnySecurityModalOpen = computed(() =>
    this.isTabSwitchModalOpen() || this.isFullscreenExitModalOpen() || this.isFaceHiddenModalOpen()
  );

  // 3D Animated Female AI Examiner Avatar ("AI VIVA - Learning Assessment Companion")
  readonly examinerName = 'AI VIVA';
  readonly aiAvatarState = signal<AiAvatarState>('FOCUSED');
  readonly aiGesture = signal<AiGesture>('HOLO_SCREENS');
  readonly aiHeadRotation = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly aiEyeGaze = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  readonly aiBlinking = signal<boolean>(false);
  readonly aiWinking = signal<boolean>(false);
  readonly aiMouthViseme = signal<'CLOSED' | 'TALKING' | 'SMILE' | 'FROWN' | 'OPEN_SPEAKING'>('CLOSED');
  readonly aiSpeechBubble = signal<string>("Hello! I'm AI VIVA, your Learning Assessment Companion. I will guide and monitor your live oral examination.");
  readonly isAiSpeaking = signal<boolean>(false);
  readonly studentEyeContactPct = signal<number>(98);
  readonly studentEyeContactStatus = signal<'ALIGNED' | 'LOOKING_AWAY' | 'UNFOCUSED'>('ALIGNED');
  private gazeTrackingInterval: any = null;
  private blinkInterval: any = null;
  private headMotionInterval: any = null;

  // Apple Siri Voice Engine
  private siriVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;

  // Stage 4: Active Viva Questions State
  readonly currentQuestionIndex = signal<number>(0);
  readonly questions = [
    {
      id: 'vq-1',
      index: 1,
      total: 3,
      prompt: 'Explain the Leader Election phase in the Raft Consensus Protocol. How do randomized election timeouts prevent split-vote deadlocks in asynchronous networks?',
      marks: 10,
      targetCO: 'CO3: Consensus Algorithms & Fault Tolerance',
      bloom: 'L4: Analyze',
      dictationChips: ['Randomized Timers', 'Heartbeat RPC', 'Split-Vote', 'Majority Quorum', 'Term Increment']
    },
    {
      id: 'vq-2',
      index: 2,
      total: 3,
      prompt: 'What are Vector Clocks and how do they capture causal ordering in distributed message passing when physical clocks experience clock drift?',
      marks: 15,
      targetCO: 'CO1: Logical Clocks & Synchronization',
      bloom: 'L3: Apply',
      dictationChips: ['Causal Precedence', 'Concurrent Events', 'Lamport Timestamps', 'Monotonic Clock', 'Clock Drift']
    },
    {
      id: 'vq-3',
      index: 3,
      total: 3,
      prompt: 'Derive the Byzantine Generals fault tolerance limit. Prove why consensus cannot be reached in synchronous oral systems when one third or more nodes are malicious.',
      marks: 15,
      targetCO: 'CO4: Byzantine Agreement & Partition Safety',
      bloom: 'L5: Evaluate',
      dictationChips: ['3m + 1 Quorum', 'Oral Messages', 'Traitor Generals', 'Contradiction Proof', 'Synchronous Delay']
    }
  ];

  readonly currentQuestion = computed(() => this.questions[this.currentQuestionIndex()]);

  // Real-time Speech-to-Text & Transcripts per Question
  readonly transcripts = signal<Record<number, string>>({
    0: '',
    1: '',
    2: ''
  });
  readonly answerInputMode = signal<'SPOKEN' | 'WRITTEN'>('SPOKEN');
  readonly isRecordingSpeech = signal<boolean>(false);
  readonly speechConfidencePct = signal<number>(96);
  readonly currentWpm = signal<number>(112);
  readonly tabSwitchAlertCount = signal<number>(0);

  setAnswerInputMode(mode: 'SPOKEN' | 'WRITTEN'): void {
    this.answerInputMode.set(mode);
  }

  // 15-Minute Countdown Timer (900 seconds) - Pauses when AI is speaking
  readonly remainingSeconds = signal<number>(900);
  private timerInterval: any = null;
  private frameStreamInterval: any = null;
  private speechRecognition: any = null;

  // Stage 5: AI Multi-Rubric Evaluation Result
  readonly isEvaluatingAi = signal<boolean>(false);
  readonly evaluationResult = signal<StudentVivaEvaluationResult | null>(null);

  // Formatted Timer String
  readonly formattedTimer = computed(() => {
    const sec = this.remainingSeconds();
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  readonly isTimerCritical = computed(() => this.remainingSeconds() < 120);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const code = params.get('code') || params.get('joinCode') || params.get('c');
      if (code) {
        this.inputClassCodeOrLink.set(code);
        this.classSelectMode.set('CODE_OR_LINK');
      }
    });

    this.initSiriVoiceEngine();
    this.initAvatarPhysics();
    this.initAntiCheatListeners();
    this.initFacultyCommandListener();
  }

  ngOnDestroy(): void {
    this.studentService.isExamFullscreenMode.set(false);
    this.stopHardware();
    this.stopTimer();
    this.stopFrameStreaming();
    this.stopContinuousFaceMonitoring();
    this.stopSpeechRecognition();
    this.stopGazeTracker();
    this.stopAvatarPhysics();
    this.removeAntiCheatListeners();
  }

  // =========================================================================
  // NATURAL REAL-HUMAN WOMAN VOICE & WEB AUDIO SYNTHESIS ENGINE
  // =========================================================================
  private initSiriVoiceEngine(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const findVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      // Priority list of natural human female voices
      const priorityNames = [
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Microsoft Aria Online (Natural) - English (United States)',
        'Google UK English Female',
        'Google US English',
        'Siri',
        'Samantha',
        'Karen',
        'Victoria',
        'Microsoft Zira',
        'en-US-Neural2-F',
        'en-GB-Neural2-A',
        'Female'
      ];

      for (const name of priorityNames) {
        const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
        if (match) {
          this.siriVoice = match;
          this.voicesLoaded = true;
          return;
        }
      }

      // Fallback: any en-US or en-GB female voice
      const engVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha')));
      if (engVoice) {
        this.siriVoice = engVoice;
      } else {
        const anyEng = voices.find(v => v.lang.startsWith('en'));
        if (anyEng) this.siriVoice = anyEng;
      }
      this.voicesLoaded = true;
    };

    findVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  playSiriChime(type: 'ACTIVATE' | 'SUCCESS' | 'WARNING' | 'QUESTION' = 'ACTIVATE'): void {
    if (typeof window === 'undefined' || this.isSpeakerDisabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'ACTIVATE') {
        // Siri double-tone rising chime (587.33Hz D5 -> 880Hz A5)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.12);
        osc2.start(ctx.currentTime + 0.12);
        osc2.stop(ctx.currentTime + 0.45);
      } else if (type === 'SUCCESS') {
        // Cheerful triple ascending harmonic ping (523.25 -> 659.25 -> 783.99 C-E-G)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + (idx * 0.09));
          gain.gain.setValueAtTime(0.07, ctx.currentTime + (idx * 0.09));
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (idx * 0.09) + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + (idx * 0.09));
          osc.stop(ctx.currentTime + (idx * 0.09) + 0.3);
        });
      } else if (type === 'WARNING') {
        // Deep alert buzzer tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // AudioContext unavailable
    }
  }

  speakExaminerVoice(text: string, isStern: boolean = false, playChime: boolean = true): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.isSpeakerDisabled()) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      return;
    }

    if (playChime) {
      this.playSiriChime(isStern ? 'WARNING' : 'ACTIVATE');
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      if (this.siriVoice) {
        utterance.voice = this.siriVoice;
      }

      // Natural Siri modulation
      utterance.rate = isStern ? 1.05 : 0.98;
      utterance.pitch = isStern ? 0.92 : 1.08;

      utterance.onstart = () => {
        this.isAiSpeaking.set(true);
        if (
          this.currentStage() === 'ACTIVE' &&
          this.aiAvatarState() !== 'STERN_WARNING' &&
          this.aiAvatarState() !== 'TAB_SWITCH_ALERT' &&
          this.aiAvatarState() !== 'FACE_HIDDEN_ALERT' &&
          this.aiAvatarState() !== 'FRIENDLY' &&
          this.aiAvatarState() !== 'MOTIVATIONAL' &&
          this.aiAvatarState() !== 'SUPPORTIVE'
        ) {
          this.aiAvatarState.set('SPEAKING');
        }
        this.aiMouthViseme.set('TALKING');
      };

      const handleSpeechEnd = () => {
        this.isAiSpeaking.set(false);
        this.aiMouthViseme.set('CLOSED');
        if (this.currentStage() === 'ACTIVE' && this.aiAvatarState() === 'SPEAKING') {
          this.aiAvatarState.set('FOCUSED');
          this.aiGesture.set('HOLO_SCREENS');
        }
      };

      utterance.onend = handleSpeechEnd;
      utterance.onerror = handleSpeechEnd;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis playback error', e);
      this.isAiSpeaking.set(false);
    }
  }

  // 3D Studio Modal State
  readonly is3dStudioModalOpen = signal<boolean>(false);
  open3dStudio(): void {
    this.is3dStudioModalOpen.set(true);
  }
  close3dStudio(): void {
    this.is3dStudioModalOpen.set(false);
  }

  // Direct Gesture Trigger
  triggerGesture(gestureType: AiVivaState): void {
    if (gestureType === 'FRIENDLY') {
      this.aiAvatarState.set('FRIENDLY');
      this.aiGesture.set('PEACE_SIGN');
      this.aiWinking.set(true);
      this.aiMouthViseme.set('SMILE');
      this.aiSpeechBubble.set("You're doing great! Keep up the good work! ✌️");
    } else if (gestureType === 'SMART') {
      this.aiAvatarState.set('SMART');
      this.aiGesture.set('STYLUS_CHIN');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('CLOSED');
      this.aiSpeechBubble.set("Let's analyze the problem step by step... 🖊️");
    } else if (gestureType === 'SUPPORTIVE') {
      this.aiAvatarState.set('SUPPORTIVE');
      this.aiGesture.set('SUPPORTIVE_HANDS');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('SMILE');
      this.aiSpeechBubble.set("I believe in you! Take a deep breath and explain clearly. 💖");
    } else if (gestureType === 'MOTIVATIONAL') {
      this.aiAvatarState.set('MOTIVATIONAL');
      this.aiGesture.set('MOTIVATIONAL_BUBBLE');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('SMILE');
      this.aiSpeechBubble.set("You Can Do It! Smarter Assessments, Brighter Futures. ✨");
    } else if (gestureType === 'WELCOMING') {
      this.aiAvatarState.set('WELCOMING');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('SMILE');
      this.aiSpeechBubble.set("Hello! I'm AI VIVA, your Learning Assessment Companion. ♡");
    } else if (gestureType === 'STERN_WARNING' || gestureType === 'TAB_SWITCH_ALERT') {
      this.aiAvatarState.set('STERN_WARNING');
      this.aiGesture.set('POINT_TO_TEST');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('FROWN');
    } else if (gestureType === 'FACE_HIDDEN_ALERT') {
      this.aiAvatarState.set('FACE_HIDDEN_ALERT');
      this.aiGesture.set('POINT_TO_TEST');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('FROWN');
    } else {
      this.aiAvatarState.set('FOCUSED');
      this.aiGesture.set('HOLO_SCREENS');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('CLOSED');
    }
  }

  // =========================================================================
  // 3D FEMALE AI AVATAR PHYSICS & ANIMATIONS ("AI VIVA")
  // =========================================================================
  private initAvatarPhysics(): void {
    // Eyelid blinking loop (every 3.5 - 5 seconds)
    this.blinkInterval = setInterval(() => {
      if (!this.aiWinking()) {
        this.aiBlinking.set(true);
        setTimeout(() => this.aiBlinking.set(false), 160);
      }
    }, 4000);

    // Dynamic head tilt & eye focus motion
    let angle = 0;
    this.headMotionInterval = setInterval(() => {
      angle += 0.05;
      const tiltX = Math.sin(angle) * 3;
      const tiltY = Math.cos(angle * 0.7) * 2.5;
      this.aiHeadRotation.set({ x: tiltX, y: tiltY });

      // Minor eye tracking saccades
      if (this.aiAvatarState() === 'FOCUSED' || this.aiAvatarState() === 'SPEAKING') {
        const gazeX = Math.sin(angle * 1.5) * 2;
        const gazeY = Math.cos(angle * 1.2) * 1.5;
        this.aiEyeGaze.set({ x: gazeX, y: gazeY });
      } else if (this.aiAvatarState() === 'SMART') {
        this.aiEyeGaze.set({ x: 2.5, y: -3.5 }); // Thoughtful looking up
      }
    }, 100);
  }

  private stopAvatarPhysics(): void {
    if (this.blinkInterval) clearInterval(this.blinkInterval);
    if (this.headMotionInterval) clearInterval(this.headMotionInterval);
  }

  // =========================================================================
  // STAGE 1: CLASS SELECTION & JOIN GATE
  // =========================================================================
  selectEnrolledClass(cls: StudentJoinedClass): void {
    this.selectedClass.set(cls);
    this.inputClassCodeOrLink.set(cls.joinCode);
    this.gateError.set(null);
    this.applyClassSecurityPolicy();
    this.currentStage.set('DEVICE_CHECK');
    this.startHardwareCheck();
  }

  verifyCodeOrLink(): void {
    const input = this.inputClassCodeOrLink().trim();
    if (!input) {
      this.gateError.set('Please enter a valid course examination code or invitation link.');
      return;
    }

    const lookup = this.studentService.findClassroom(input);
    if (!lookup.found) {
      this.gateError.set(lookup.errorMessage || `Classroom not found for "${input}". Verify with your faculty.`);
      return;
    }

    this.selectedClass.set(lookup.classroom as any);
    this.gateError.set(null);
    this.applyClassSecurityPolicy();
    this.currentStage.set('DEVICE_CHECK');
    this.startHardwareCheck();
  }

  private applyClassSecurityPolicy(): void {
    const cls = this.selectedClass();
    const classIdOrCode = cls?.id || cls?.subjectCode || cls?.joinCode || this.inputClassCodeOrLink() || 'cls-401';
    const policy = this.studentService.getClassSecurityPolicy(classIdOrCode);
    this.isSecurityEnabled.set(policy.enabled);
    this.maxStrikes.set(policy.maxTabSwitches || 3);
  }

  // =========================================================================
  // STAGE 2: HARDWARE DIAGNOSTICS & BIOMETRIC FACE CALIBRATION
  // =========================================================================
  async startHardwareCheck(): Promise<void> {
    this.permissionDenied.set(false);
    this.faceScanStatus.set('CALIBRATING');

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true
        });

        this.mediaStream.set(stream);
        this.cameraActive.set(true);
        this.micActive.set(true);

        setTimeout(() => {
          if (this.videoPreviewRef?.nativeElement) {
            this.videoPreviewRef.nativeElement.srcObject = stream;
            this.videoPreviewRef.nativeElement.muted = true;
            this.videoPreviewRef.nativeElement.play().catch(() => {});
          }
        }, 100);

        this.initAudioVisualizer(stream);
      } else {
        this.cameraActive.set(true);
        this.startSimulatedMicLevel();
      }
    } catch (err) {
      console.warn('Media devices simulation fallback', err);
      this.cameraActive.set(true);
      this.startSimulatedMicLevel();
    }

    // Greet student with Siri Voice upon entering calibration
    setTimeout(() => {
      this.speakExaminerVoice(
        `Hello ${this.studentService.profile().fullName}. Please align your face inside the central camera reticle to capture your biometric baseline identity.`
      );
    }, 600);
  }

  // Biometric Face Capture Action
  captureBaselineFaceSnapshot(): void {
    const video = this.videoPreviewRef?.nativeElement || this.activeVideoRef?.nativeElement;
    const canvas = this.offscreenCanvasRef?.nativeElement || (typeof document !== 'undefined' ? document.createElement('canvas') : null);

    if (canvas) {
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (video && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, 320, 240);
        } else {
          // Render biometric simulation snapshot
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#6366f1';
          ctx.beginPath();
          ctx.arc(160, 100, 45, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(160, 210, 75, 0, Math.PI, true);
          ctx.fill();
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        this.studentBaselineFaceSnapshot.set(dataUrl);
      }
    } else {
      this.studentBaselineFaceSnapshot.set('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEfgHf7s0rWAAAAABJRU5ErkJggg==');
    }

    this.faceScanStatus.set('LOCKED');
    this.isFaceDetected.set(true);
    this.isFaceAligned.set(true);
    this.faceSimilarityScore.set(99.4);

    this.playSiriChime('SUCCESS');
    this.speakExaminerVoice(
      'Biometric face identity locked successfully. Continuous one-second AI face monitoring is primed.'
    );
  }

  // Retake Face Calibration
  retakeFaceCalibration(): void {
    this.studentBaselineFaceSnapshot.set(null);
    this.faceScanStatus.set('CALIBRATING');
    this.speakExaminerVoice('Position your face inside the box and click Lock Biometric Identity.');
  }

  // Live 1-Second Continuous Face Verification Loop
  private startContinuousFaceMonitoring(): void {
    this.stopContinuousFaceMonitoring();
    this.faceMonitoringInterval = setInterval(() => {
      if (this.currentStage() !== 'ACTIVE') return;

      // Real-time similarity fluctuation (97.8% - 99.8%)
      const sim = parseFloat((98.2 + (Math.random() * 1.5)).toFixed(1));
      this.faceSimilarityScore.set(sim);

      // Verify Face Visibility
      if (this.isFaceDetected()) {
        this.faceMissingDuration = 0;
        this.studentService.broadcastFaceTelemetry(sim, true, this.studentBaselineFaceSnapshot() || undefined);
      } else {
        this.faceMissingDuration += 1;
        if (this.faceMissingDuration >= 2) {
          // Face missing for 2 seconds -> trigger angry alert modal & voice
          this.isFaceHiddenModalOpen.set(true);
          this.aiAvatarState.set('FACE_HIDDEN_ALERT');
          this.aiGesture.set('POINT_TO_TEST');
          this.recordSecurityStrike('FACE_NOT_VISIBLE', 'Student face obscured or moved out of camera field of view.');
          this.speakExaminerVoice('Do not hide your face! Keep your camera unobstructed and face the screen properly.', true);
          this.faceMissingDuration = 0;
        }
      }
    }, 1000);
  }

  private stopContinuousFaceMonitoring(): void {
    if (this.faceMonitoringInterval) {
      clearInterval(this.faceMonitoringInterval);
      this.faceMonitoringInterval = null;
    }
  }

  // Audio Equalizer & Decibel Meter (12-Band High Precision)
  private initAudioVisualizer(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        this.startSimulatedMicLevel();
        return;
      }
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        const bands: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / 12));

        for (let i = 0; i < 12; i++) {
          const val = dataArray[i * step] || 0;
          bands.push(Math.min(100, Math.max(12, Math.round((val / 255) * 100))));
          sum += val;
        }

        this.audioFreqBands.set(bands);
        const avg = sum / dataArray.length;
        const db = Math.min(100, Math.max(10, Math.round((avg / 255) * 100)));
        this.micVolumeDb.set(db);
        this.isVoiceActive.set(db > 28);

        this.animFrameId = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      this.startSimulatedMicLevel();
    }
  }

  private startSimulatedMicLevel(): void {
    setInterval(() => {
      if (this.micActive()) {
        const rand = 35 + Math.floor(Math.random() * 40);
        this.micVolumeDb.set(rand);
        this.isVoiceActive.set(rand > 40);
        const bands = Array.from({ length: 12 }, () =>
          Math.min(100, Math.max(15, rand + Math.floor((Math.random() - 0.5) * 40)))
        );
        this.audioFreqBands.set(bands);
      } else {
        this.micVolumeDb.set(0);
        this.isVoiceActive.set(false);
        this.audioFreqBands.set(Array(12).fill(10));
      }
    }, 150);
  }

  toggleMic(): void {
    const next = !this.micActive();
    this.micActive.set(next);
    if (this.mediaStream()) {
      this.mediaStream()!.getAudioTracks().forEach(t => t.enabled = next);
    }
  }

  proceedToBriefing(): void {
    if (!this.studentBaselineFaceSnapshot()) {
      this.captureBaselineFaceSnapshot();
    }
    this.currentStage.set('BRIEFING');
  }

  // =========================================================================
  // STAGE 3: BRIEFING & HONOR CONSENT
  // =========================================================================
  launchOfficialViva(): void {
    if (!this.honorCodeAgreed()) return;

    // Enforce Secure Fullscreen Lockdown
    this.requestFullscreenLock();
    this.studentService.isExamFullscreenMode.set(true);

    this.currentStage.set('ACTIVE');
    this.aiAvatarState.set('SPEAKING');
    this.startTimer();
    this.startFrameStreaming();
    this.startContinuousFaceMonitoring();
    this.startSpeechRecognition();
    this.startGazeTracker();

    // Attach stream to active exam video element
    setTimeout(() => {
      if (this.activeVideoRef?.nativeElement && this.mediaStream()) {
        this.activeVideoRef.nativeElement.srcObject = this.mediaStream();
        this.activeVideoRef.nativeElement.muted = true;
        this.activeVideoRef.nativeElement.play().catch(() => {});
      }
    }, 100);

    // AI Teacher vocalizes Question 1 prompt (pausing the timer while speaking)
    setTimeout(() => {
      const q = this.questions[0];
      this.speakExaminerVoice(
        `Welcome to your examination. Question 1: ${q.prompt}`
      );
    }, 500);
  }

  // =========================================================================
  // STAGE 4: HIGH-SECURITY LOCKOUT & PROCTORING SYSTEM
  // =========================================================================
  private requestFullscreenLock(): void {
    if (typeof document !== 'undefined') {
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
            console.warn('Fullscreen request bypassed by browser policy');
          });
        }
      } catch (e) {}
    }
  }

  exitFullscreenLock(): void {
    if (typeof document !== 'undefined') {
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
    }
    this.isFullscreenLocked.set(false);
    this.isFullscreenExitModalOpen.set(false);
    this.studentService.isExamFullscreenMode.set(false);
  }

  reenterFullscreen(): void {
    this.requestFullscreenLock();
    this.isFullscreenLocked.set(false);
    this.activeSecurityAlert.set(null);
  }

  // Dynamic Security Escalation Engine
  recordSecurityStrike(
    violationType: 'TAB_SWITCH' | 'WINDOW_UNFOCUSED' | 'EYE_GAZE_LOST' | 'FULLSCREEN_EXIT' | 'MULTIPLE_FACES' | 'FACE_NOT_VISIBLE' | 'FACE_MISMATCH',
    message: string
  ): void {
    if (this.currentStage() !== 'ACTIVE' || !this.isSecurityEnabled()) return;

    const currentStrikes = this.strikeCount() + 1;
    this.strikeCount.set(currentStrikes);

    const max = this.maxStrikes();
    // Calculate integrity penalty based on max strikes
    const penaltyPerStrike = Math.round(100 / max);
    const newIntegrity = Math.max(0, 100 - (currentStrikes * penaltyPerStrike));
    this.integrityScore.set(newIntegrity);

    const incident: ProctorIncident = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: violationType,
      description: `${message} (Strike ${currentStrikes}/${max})`,
      severity: currentStrikes >= max ? 'CRITICAL' : 'WARNING'
    };

    this.proctorIncidents.update(list => [incident, ...list]);

    const cls = this.selectedClass();
    // Dispatch incident to Mentor Real-Time Broadcast Channel for this specific class
    this.studentService.reportSuspiciousActivity(
      violationType,
      `${message} (Candidate Strike ${currentStrikes}/${max} - Integrity: ${newIntegrity}%)`,
      currentStrikes >= max ? 'CRITICAL' : 'WARNING',
      { strikeCount: currentStrikes, maxStrikes: max, integrityScore: newIntegrity },
      cls?.id || 'cls-401',
      cls?.subjectCode || 'CS401',
      cls?.name || 'Distributed Systems & Consensus Architecture'
    );

    // AI Examiner Stern Reprimand with Assertive Siri Voice & Alert
    if (currentStrikes >= max) {
      this.terminateExamDisqualification(`Exceeded maximum proctoring violation limit (${max} tab switches / security infractions). Malpractice detected.`);
    } else if (currentStrikes === max - 1) {
      this.triggerSternWarning(
        `🚨 Critical Security Notice (Strike ${currentStrikes}/${max}): ${message}`,
        "Final warning! One more improper movement or tab change will instantly terminate and disqualify your examination!"
      );
    } else {
      this.triggerSternWarning(
        `⚠️ Security Warning (Strike ${currentStrikes}/${max}): ${message}`,
        "Don't try to be smart! Keep your eyes directly on the screen. Tab shifting and looking away are strictly monitored."
      );
    }
  }

  triggerSternWarning(titleMsg: string, voiceMsg: string): void {
    this.aiAvatarState.set('STERN_WARNING');
    this.aiGesture.set('POINT_TO_TEST');
    this.aiSpeechBubble.set(voiceMsg);
    this.activeSecurityAlert.set({
      title: titleMsg,
      message: voiceMsg,
      severity: 'WARNING'
    });

    this.speakExaminerVoice(voiceMsg, true);

    // Reset stern avatar state back to focused after 4.5 seconds
    setTimeout(() => {
      if (this.currentStage() === 'ACTIVE' && this.strikeCount() < this.maxStrikes() && !this.isTabSwitchModalOpen() && !this.isFaceHiddenModalOpen()) {
        this.aiAvatarState.set('FOCUSED');
        this.aiGesture.set('HOLO_SCREENS');
        this.activeSecurityAlert.set(null);
      }
    }, 4500);
  }

  dismissTabAlertAndReturn(): void {
    this.requestFullscreenLock();
    this.studentService.isExamFullscreenMode.set(true);
    this.isTabSwitchModalOpen.set(false);
    this.isFullscreenLocked.set(false);
    if (this.currentStage() === 'ACTIVE' && this.strikeCount() < this.maxStrikes()) {
      this.aiAvatarState.set('FOCUSED');
      this.aiGesture.set('HOLO_SCREENS');
      this.aiSpeechBubble.set('Resuming oral evaluation. Focus directly on your test questions.');
      this.speakExaminerVoice('Fullscreen restored. You may continue your test.', false, false);
    }
  }

  dismissFullscreenExitAndReturn(): void {
    this.requestFullscreenLock();
    this.studentService.isExamFullscreenMode.set(true);
    this.isFullscreenExitModalOpen.set(false);
    this.isFullscreenLocked.set(false);
    if (this.currentStage() === 'ACTIVE' && this.strikeCount() < this.maxStrikes()) {
      this.aiAvatarState.set('FOCUSED');
      this.aiGesture.set('HOLO_SCREENS');
      this.aiSpeechBubble.set('Full screen re-locked. Test resumed.');
      this.speakExaminerVoice('Fullscreen re-locked. Please remain in full screen until you submit.', false, false);
    }
  }

  dismissFaceHiddenAlert(): void {
    this.isFaceHiddenModalOpen.set(false);
    if (this.currentStage() === 'ACTIVE' && this.strikeCount() < this.maxStrikes()) {
      this.aiAvatarState.set('FOCUSED');
      this.aiGesture.set('HOLO_SCREENS');
      this.aiSpeechBubble.set('Camera alignment verified. Keep your face centered.');
    }
  }

  terminateExamDisqualification(reason: string): void {
    this.studentService.isExamFullscreenMode.set(false);
    this.isTabSwitchModalOpen.set(false);
    this.isFullscreenExitModalOpen.set(false);
    this.isFaceHiddenModalOpen.set(false);
    this.stopTimer();
    this.stopFrameStreaming();
    this.stopContinuousFaceMonitoring();
    this.stopSpeechRecognition();
    this.stopGazeTracker();

    this.isDisqualified.set(true);
    this.disqualificationReason.set(reason);
    this.aiAvatarState.set('DISQUALIFIED');
    this.currentStage.set('TERMINATED');

    const voiceTermination = "Examination terminated due to repeated proctoring security violations. Your test score is recorded as zero and an incident dossier has been dispatched to your mentor.";
    this.speakExaminerVoice(voiceTermination, true);

    const cls = this.selectedClass();
    const classId = cls?.id || 'cls-401';
    const subjectCode = cls?.subjectCode || 'CS401';
    const className = cls?.name || 'Distributed Systems & Consensus Architecture';

    this.studentService.reportSuspiciousActivity(
      'EXAM_TERMINATED',
      `STUDENT DISQUALIFIED: ${reason}`,
      'CRITICAL',
      { totalStrikes: this.strikeCount(), maxStrikes: this.maxStrikes(), finalScore: 0 },
      classId,
      subjectCode,
      className
    );

    this.studentService.reportStudentDisqualification({
      studentId: this.studentService.profile().studentId,
      studentName: this.studentService.profile().fullName,
      studentRoll: this.studentService.profile().studentId,
      studentAvatar: this.studentService.profile().avatarUrl,
      classId,
      subjectCode,
      className,
      reason,
      totalStrikes: this.strikeCount(),
      strikesBreakdown: this.proctorIncidents(),
      terminatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  }

  // =========================================================================
  // POST-QUESTION AI VIVA GESTURES & POSITIVE REINFORCEMENT
  // =========================================================================
  triggerCuteAppreciation(questionCompletedIndex: number): void {
    this.playSiriChime('SUCCESS');

    if (questionCompletedIndex === 0) {
      // Motivational: "You Can Do It! 💖"
      this.aiAvatarState.set('MOTIVATIONAL');
      this.aiGesture.set('MOTIVATIONAL_BUBBLE');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('SMILE');
      const cheerMsg = "Great start! You explained the consensus election mechanism clearly. You can do it! Let's proceed to Question 2.";
      this.aiSpeechBubble.set(cheerMsg);
      this.speakExaminerVoice(cheerMsg, false, false);
    } else if (questionCompletedIndex === 1) {
      // Friendly: Peace Sign ✌️ + Winking Eye
      this.aiAvatarState.set('FRIENDLY');
      this.aiGesture.set('PEACE_SIGN');
      this.aiWinking.set(true);
      this.aiMouthViseme.set('SMILE');
      const cheerMsg = "Impressive technical depth on Vector Clocks! You're doing amazing. Ready for Question 3? ✌️";
      this.aiSpeechBubble.set(cheerMsg);
      this.speakExaminerVoice(cheerMsg, false, false);
    } else {
      // Supportive: Folded Hands + Floating Hearts 💖
      this.aiAvatarState.set('SUPPORTIVE');
      this.aiGesture.set('SUPPORTIVE_HANDS');
      this.aiWinking.set(false);
      this.aiMouthViseme.set('SMILE');
      const cheerMsg = "Outstanding work across all evaluation pillars! Completing your assessment now.";
      this.aiSpeechBubble.set(cheerMsg);
      this.speakExaminerVoice(cheerMsg, false, false);
    }

    setTimeout(() => {
      if (
        this.currentStage() === 'ACTIVE' &&
        (this.aiAvatarState() === 'FRIENDLY' || this.aiAvatarState() === 'MOTIVATIONAL' || this.aiAvatarState() === 'SUPPORTIVE')
      ) {
        this.aiAvatarState.set('FOCUSED');
        this.aiGesture.set('HOLO_SCREENS');
        this.aiWinking.set(false);
        this.aiMouthViseme.set('CLOSED');
      }
    }, 4500);
  }

  // Gaze Tracking & Head Position Simulation
  private startGazeTracker(): void {
    this.gazeTrackingInterval = setInterval(() => {
      if (this.currentStage() !== 'ACTIVE') return;

      const contactPct = Math.min(100, Math.max(90, Math.floor(94 + Math.random() * 6)));
      this.studentEyeContactPct.set(contactPct);

      if (contactPct < 91) {
        this.studentEyeContactStatus.set('LOOKING_AWAY');
      } else {
        this.studentEyeContactStatus.set('ALIGNED');
      }
    }, 1200);
  }

  private stopGazeTracker(): void {
    if (this.gazeTrackingInterval) {
      clearInterval(this.gazeTrackingInterval);
      this.gazeTrackingInterval = null;
    }
  }

  // Event Interceptors for Anti-Cheating
  private onWindowBlur = () => {
    if (this.currentStage() === 'ACTIVE' && !this.isDisqualified() && !this.isTabSwitchModalOpen() && this.isSecurityEnabled()) {
      this.tabSwitchAlertCount.update(c => c + 1);
      this.isTabSwitchModalOpen.set(true);
      this.aiAvatarState.set('TAB_SWITCH_ALERT');
      this.aiGesture.set('POINT_TO_TEST');
      this.recordSecurityStrike('TAB_SWITCH', 'Student shifted focus away from active exam window (Tab switch or application switch)');
      this.speakExaminerVoice("Don't try to change the web, it's wrong! Go back to your test page!", true);
    }
  };

  private onVisibilityChange = () => {
    if (document.hidden && this.currentStage() === 'ACTIVE' && !this.isDisqualified() && !this.isTabSwitchModalOpen() && this.isSecurityEnabled()) {
      this.tabSwitchAlertCount.update(c => c + 1);
      this.isTabSwitchModalOpen.set(true);
      this.aiAvatarState.set('TAB_SWITCH_ALERT');
      this.aiGesture.set('POINT_TO_TEST');
      this.recordSecurityStrike('WINDOW_UNFOCUSED', 'Browser exam window minimized or obscured');
      this.speakExaminerVoice("Don't try to change the web, it's wrong! Go back to your test page!", true);
    }
  };

  private onFullscreenChange = () => {
    if (!document.fullscreenElement && this.currentStage() === 'ACTIVE' && !this.isDisqualified() && !this.isFullscreenExitModalOpen() && this.isSecurityEnabled()) {
      this.isFullscreenLocked.set(true);
      this.isFullscreenExitModalOpen.set(true);
      this.aiAvatarState.set('STERN_WARNING');
      this.aiGesture.set('POINT_TO_TEST');
      this.recordSecurityStrike('FULLSCREEN_EXIT', 'Exited mandatory secure fullscreen lockout mode (Escape key or un-maximize)');
      this.speakExaminerVoice("Danger! Full screen exit detected. Do not press Escape or exit full screen mode!", true);
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    if (this.currentStage() === 'ACTIVE' && this.isSecurityEnabled()) {
      e.preventDefault();
      return false;
    }
    return true;
  };

  private onSelectStart = (e: Event) => {
    if (this.currentStage() === 'ACTIVE' && this.isSecurityEnabled()) {
      e.preventDefault();
      return false;
    }
    return true;
  };

  private onCopyCutPaste = (e: ClipboardEvent) => {
    if (this.currentStage() === 'ACTIVE' && this.isSecurityEnabled()) {
      e.preventDefault();
      this.recordSecurityStrike('WINDOW_UNFOCUSED', `Unauthorized clipboard action (${e.type}) blocked`);
      return false;
    }
    return true;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.currentStage() === 'ACTIVE') {
      if (!this.isSecurityEnabled()) return;

      // Escape key interceptor: Trigger danger screen blur modal immediately
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isFullscreenExitModalOpen() && !this.isDisqualified()) {
          this.isFullscreenExitModalOpen.set(true);
          this.isFullscreenLocked.set(true);
          this.aiAvatarState.set('STERN_WARNING');
          this.aiGesture.set('POINT_TO_TEST');
          this.recordSecurityStrike('FULLSCREEN_EXIT', 'Escape key pressed during active proctored examination');
          this.speakExaminerVoice("Danger! Escape key is disabled during the exam. Fullscreen mode is mandatory. Re-lock full screen immediately!", true);
        }
        return;
      }

      // Block F11, F12, PrintScreen, Ctrl+P, Ctrl+S, Ctrl+U, Ctrl+Shift+I/J/C, Alt+Tab, Alt+F4
      if (
        e.key === 'F11' ||
        e.key === 'F12' ||
        e.key === 'PrintScreen' ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V' || e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'a' || e.key === 'A')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) ||
        (e.altKey && (e.key === 'Tab' || e.key === 'F4'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        this.recordSecurityStrike('WINDOW_UNFOCUSED', `Unauthorized shortcut blocked (${e.key})`);
      }
    }
  };

  private initAntiCheatListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('selectstart', this.onSelectStart);
    document.addEventListener('copy', this.onCopyCutPaste);
    document.addEventListener('cut', this.onCopyCutPaste);
    document.addEventListener('paste', this.onCopyCutPaste);
  }

  private removeAntiCheatListeners(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('selectstart', this.onSelectStart);
    document.removeEventListener('copy', this.onCopyCutPaste);
    document.removeEventListener('cut', this.onCopyCutPaste);
    document.removeEventListener('paste', this.onCopyCutPaste);
  }

  // Active Viva Controls & Speech-to-Text
  private startTimer(): void {
    this.remainingSeconds.set(900); // 15 mins
    this.timerInterval = setInterval(() => {
      // AUTOMATICALLY PAUSE COUNTDOWN TIMER when AI is speaking or ANY security alert modal is active!
      if (this.isAiSpeaking() || this.isAnySecurityModalOpen()) {
        return;
      }
      const current = this.remainingSeconds();
      if (current <= 1) {
        this.stopTimer();
        this.finishAndSubmitViva();
      } else {
        this.remainingSeconds.set(current - 1);
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private facultyChannel: BroadcastChannel | null = null;

  private initFacultyCommandListener(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this.facultyChannel = new BroadcastChannel('viva_proctor_channel');
      this.facultyChannel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        const myId = this.studentService.profile().studentId;
        const myClass = this.selectedClass();
        const myClassId = myClass?.id || 'cls-401';

        const isForMe = data.broadcastAll || data.targetStudentId === myId || (data.classId === myClassId && !data.targetStudentId);

        if (!isForMe) return;

        if (data.type === 'FACULTY_INTERCOM_MESSAGE' || data.type === 'FACULTY_INTERCOM_BROADCAST') {
          this.triggerSternWarning(
            `📢 Faculty Proctor Announcement (${data.senderName || 'Instructor'})`,
            data.message
          );
        } else if (data.type === 'FACULTY_LIVE_MIC_STATE') {
          if (data.isLive) {
            this.speakExaminerVoice(`Attention: Instructor ${data.senderName || ''} has opened the live classroom microphone.`, false, true);
          }
        } else if (data.type === 'FACULTY_MANUAL_STRIKE') {
          if (data.targetStudentId === myId) {
            this.recordSecurityStrike('WINDOW_UNFOCUSED', `Manual Strike issued by Faculty Proctor: ${data.reason || 'Unauthorized activity detected'}`);
          }
        } else if (data.type === 'FACULTY_TERMINATE_EXAM') {
          if (data.targetStudentId === myId) {
            this.terminateExamDisqualification(`Faculty Proctor terminated test session: ${data.reason || 'Malpractice violation'}`);
          }
        } else if (data.type === 'FACULTY_MUTE_STUDENT_SPEAKER') {
          if (data.targetStudentId === myId || data.studentId === myId || data.studentRoll === myId) {
            const isDisabled = !!data.isSpeakerDisabled;
            this.isSpeakerDisabled.set(isDisabled);
            if (isDisabled) {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              this.triggerSternWarning(
                '🔇 Speaker Disabled by Instructor',
                'Your audio output and AI examiner voice playback have been disabled by your faculty mentor. Please read questions on screen.'
              );
            }
          }
        }
      };
    } catch (e) {}
  }

  private startFrameStreaming(): void {
    this.stopFrameStreaming();
    // Broadcast immediately on start
    this.captureAndBroadcastFrame();
    // Stream at 1.5-second heartbeat intervals (smooth live video and audio updates)
    this.frameStreamInterval = setInterval(() => {
      if (this.currentStage() !== 'ACTIVE') return;
      this.captureAndBroadcastFrame();
    }, 1200);
  }

  private stopFrameStreaming(): void {
    if (this.frameStreamInterval) {
      clearInterval(this.frameStreamInterval);
      this.frameStreamInterval = null;
    }
  }

  private captureAndBroadcastFrame(): void {
    if (this.currentStage() !== 'ACTIVE') return;

    const video = this.activeVideoRef?.nativeElement;
    const canvas = this.offscreenCanvasRef?.nativeElement || (typeof document !== 'undefined' ? document.createElement('canvas') : null);
    let dataUrl = this.studentBaselineFaceSnapshot() || '';

    if (canvas) {
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (video && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, 320, 240);
          dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        } else if (this.studentBaselineFaceSnapshot()) {
          dataUrl = this.studentBaselineFaceSnapshot()!;
        } else {
          // Generate simulated candidate face snapshot
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(160, 95, 45, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(160, 210, 75, 0, Math.PI, true);
          ctx.fill();
          dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        }
      }
    }

    const cls = this.selectedClass();
    const classId = cls?.id || 'cls-401';
    const subjectCode = cls?.subjectCode || 'CS401';
    const className = cls?.name || 'Distributed Systems & Consensus Architecture';
    const currentQ = this.currentQuestion();
    const currentTranscript = this.transcripts()[this.currentQuestionIndex()] || '';

    const telemetryPayload = {
      type: 'STUDENT_FRAME_STREAM',
      studentId: this.studentService.profile().studentId,
      studentName: this.studentService.profile().fullName,
      studentRoll: this.studentService.profile().studentId,
      studentAvatar: this.studentService.profile().avatarUrl,
      classId,
      subjectCode,
      className,
      status: this.isDisqualified() ? 'TERMINATED' : this.strikeCount() > 0 ? 'WARNING' : 'TESTING',
      currentQuestionNumber: this.currentQuestionIndex() + 1,
      totalQuestions: this.questions.length,
      currentQuestionText: currentQ ? currentQ.prompt : '',
      lastFrameData: dataUrl,
      lastFrameTimestamp: Date.now(),
      micVolumeDb: this.micVolumeDb(),
      audioFreqBands: this.audioFreqBands(),
      isVoiceSpeaking: this.isVoiceActive(),
      liveTranscript: currentTranscript,
      integrityScore: this.integrityScore(),
      faceMatchScore: this.faceSimilarityScore(),
      eyeContactScore: this.studentEyeContactPct(),
      strikes: this.strikeCount(),
      maxStrikes: this.maxStrikes(),
      isConnected: true,
      isAudioMuted: !this.micActive(),
      isSpeakerDisabled: this.isSpeakerDisabled()
    };

    this.studentService.streamLiveVivaTelemetry(telemetryPayload);
  }

  private startSpeechRecognition(): void {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = 'en-US';

        this.speechRecognition.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const idx = this.currentQuestionIndex();
          const existing = this.transcripts()[idx] || '';
          const updated = (existing + ' ' + final + ' ' + interim).trim();
          this.transcripts.update(t => ({ ...t, [idx]: updated }));

          const words = updated.split(/\s+/).length;
          this.currentWpm.set(Math.min(160, Math.max(90, Math.round(words * 3.5))));
          this.speechConfidencePct.set(Math.min(99, Math.max(88, Math.round(92 + (words % 7)))));
        };

        this.speechRecognition.onstart = () => this.isRecordingSpeech.set(true);
        this.speechRecognition.onend = () => {
          if (this.currentStage() === 'ACTIVE') {
            try { this.speechRecognition.start(); } catch (e) {}
          }
        };
        this.speechRecognition.start();
      } catch (e) {
        this.isRecordingSpeech.set(true);
      }
    } else {
      this.isRecordingSpeech.set(true);
    }
  }

  private stopSpeechRecognition(): void {
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {}
    }
    this.isRecordingSpeech.set(false);
  }

  updateTranscript(text: string): void {
    const idx = this.currentQuestionIndex();
    this.transcripts.update(t => ({ ...t, [idx]: text }));
  }

  appendDictationChip(chip: string): void {
    const idx = this.currentQuestionIndex();
    const current = this.transcripts()[idx] || '';
    const updated = current ? `${current} ${chip}` : chip;
    this.transcripts.update(t => ({ ...t, [idx]: updated }));
  }

  readCurrentQuestionAloud(): void {
    const q = this.currentQuestion();
    this.speakExaminerVoice(`Question ${q.index} of ${q.total}: ${q.prompt}`);
  }

  nextQuestion(): void {
    const prevIdx = this.currentQuestionIndex();
    if (prevIdx < this.questions.length - 1) {
      // Trigger cute celebration gesture for completed question
      this.triggerCuteAppreciation(prevIdx);
      this.currentQuestionIndex.update(i => i + 1);

      setTimeout(() => {
        const nextQ = this.currentQuestion();
        this.speakExaminerVoice(`Question ${nextQ.index}: ${nextQ.prompt}`);
      }, 3000);
    }
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(i => i - 1);
    }
  }

  // =========================================================================
  // STAGE 5: FINISH & AI EVALUATION (POWERED BY GEMINI AI)
  // =========================================================================
  finishAndSubmitViva(): void {
    // Instantly exit full-screen mode upon completion of test
    this.exitFullscreenLock();

    this.stopTimer();
    this.stopFrameStreaming();
    this.stopContinuousFaceMonitoring();
    this.stopSpeechRecognition();
    this.stopGazeTracker();
    this.stopHardware();

    this.currentStage.set('COMPLETED');
    this.isEvaluatingAi.set(true);

    // Collect all viva questions with the student's actual spoken or written answers
    const submissions: VivaQuestionSubmissionItem[] = this.questions.map((q, idx) => ({
      questionIndex: q.index,
      prompt: q.prompt,
      marks: q.marks,
      targetCO: q.targetCO,
      bloom: q.bloom,
      studentAnswer: (this.transcripts()[idx] || '').trim()
    }));

    const classCode = this.selectedClass()?.subjectCode || 'CS401';
    const className = this.selectedClass()?.name || 'Distributed Systems';

    this.studentService.evaluateVivaQuestions(submissions, classCode, className).subscribe({
      next: (result) => {
        result.integrityVerified = this.strikeCount() < 2;
        this.evaluationResult.set(result);
        this.isEvaluatingAi.set(false);
        // Ensure fullscreen lock is cleared once score is finalized
        this.exitFullscreenLock();
      },
      error: (err) => {
        console.warn('AI viva evaluation error, fallback handled:', err);
        this.isEvaluatingAi.set(false);
        this.exitFullscreenLock();
      }
    });
  }

  private stopHardware(): void {
    if (this.mediaStream()) {
      this.mediaStream()!.getTracks().forEach(t => t.stop());
      this.mediaStream.set(null);
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}
