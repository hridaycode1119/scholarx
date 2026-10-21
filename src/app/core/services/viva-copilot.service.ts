import { Injectable, inject, signal, computed } from '@angular/core';
import { GeminiAiService } from './gemini-ai.service';
import { ClassSchedulerService } from './class-scheduler.service';
import {
  VivaTranscriptTurn,
  VivaAiProbeSuggestion,
  VivaRubricDimension,
  LiveVivaSessionState,
  ClassStudentVivaSlot,
  BloomLevel,
  VivaSpeakerRole
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class VivaCopilotService {
  private readonly gemini = inject(GeminiAiService);
  private readonly schedulerService = inject(ClassSchedulerService);

  // Active Session State
  readonly activeSession = signal<LiveVivaSessionState>({
    sessionId: 'sess-dl-viva-01',
    slotId: 'slot-dl-03',
    classId: 'cls-401',
    courseCode: 'CS801',
    courseName: 'Deep Learning & Transformers',
    studentId: 'stu-103',
    studentName: 'Rohan Deshmukh',
    rollNumber: '2023CS0103',
    studentAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    assignedTopic: 'Key-Value (KV) Caching in Autoregressive Transformer Generation',
    bloomTarget: 'APPLY',
    targetCo: 'CO2: FlashAttention & KV Cache GPU Efficiency',
    slotStartTime: '09:30',
    slotEndTime: '09:45',
    remainingSeconds: 640, // ~10m 40s remaining
    isLiveRecording: true,
    webrtcStatus: 'CONNECTED',
    latencyMs: 18,
    bitrateMbps: 2.4,
    micLevelPercent: 72,
    proctorHealth: {
      faceDetected: true,
      multipleFaces: false,
      tabFocused: true,
      micActive: true
    },
    totalMaxScore: 25,
    totalAwardedScore: 23.5,
    status: 'VIVA_IN_PROGRESS'
  });

  // Live STT Transcripts
  readonly transcripts = signal<VivaTranscriptTurn[]>([
    {
      id: 'trn-1',
      speaker: 'EXAMINER',
      speakerName: 'Prof. Aris Thorne',
      timestamp: '09:30:15',
      text: 'Good morning Rohan. Let us begin your oral evaluation on Unit 2. Can you explain the fundamental bottleneck in autoregressive token generation and why we maintain a Key-Value cache in GPU VRAM?',
      bloomTaxonomyLevel: 'UNDERSTAND',
      audioConfidencePercent: 99
    },
    {
      id: 'trn-2',
      speaker: 'STUDENT',
      speakerName: 'Rohan Deshmukh',
      timestamp: '09:30:48',
      text: 'Good morning Professor. In standard multi-head attention during token generation, each newly generated token needs to attend to all preceding tokens. Without caching, we would recompute the K and V projection matrices for every past token at step t, resulting in O(N^2) redundant matrix multiplications. The KV Cache stores the key and value tensor states in GPU HBM so we only compute the Q vector for the current new token.',
      audioConfidencePercent: 96,
      isKeyConceptFound: true,
      detectedKeywords: ['O(N^2) redundant multiplications', 'Key and Value tensor states', 'GPU HBM storage', 'Single Q vector computation']
    },
    {
      id: 'trn-3',
      speaker: 'EXAMINER',
      speakerName: 'Prof. Aris Thorne',
      timestamp: '09:32:05',
      text: 'Correct. Now, how does the memory footprint of this KV Cache scale with batch size, sequence length, and layer count? What is the arithmetic formula?',
      bloomTaxonomyLevel: 'APPLY',
      audioConfidencePercent: 98
    },
    {
      id: 'trn-4',
      speaker: 'STUDENT',
      speakerName: 'Rohan Deshmukh',
      timestamp: '09:32:42',
      text: 'The memory footprint is given by: 2 (for K and V) multiplied by 2 bytes (for FP16) * layers * num_heads * head_dim * batch_size * sequence_length. For a 70B parameter model with 80 layers and 8K context, this easily exceeds 20GB per concurrent request, making memory bandwidth rather than compute the primary bottleneck.',
      audioConfidencePercent: 97,
      isKeyConceptFound: true,
      detectedKeywords: ['2 * 2 bytes * layers * heads * d_k * b * s', 'FP16 precision', '20GB per request', 'Memory bandwidth bottleneck']
    }
  ]);

  // Real-Time Gemini AI Suggested Probe Questions
  readonly aiProbeSuggestions = signal<VivaAiProbeSuggestion[]>([
    {
      id: 'prb-1',
      probeType: 'DEPTH_PROBE',
      title: 'Grouped-Query Attention (GQA) Memory Reduction',
      questionText: 'How does Grouped-Query Attention (GQA) in Llama 3 reduce this KV cache footprint compared to standard Multi-Head Attention?',
      targetBloomLevel: 'ANALYZE',
      expectedInsight: 'Student should explain that multiple query heads share a single key/value head (e.g. 8 KV heads for 64 Q heads), shrinking KV cache memory bandwidth by an 8x factor.',
      syllabusConceptSource: 'CS801 Unit 2 • Multi-Query & Grouped-Query Attention (GQA)',
      isAsked: false
    },
    {
      id: 'prb-2',
      probeType: 'EDGE_CASE_PROBE',
      title: 'PagedAttention & Memory Fragmentation in vLLM',
      questionText: 'What happens when consecutive tokens cause external and internal memory fragmentation in continuous batching, and how does PagedAttention resolve it?',
      targetBloomLevel: 'EVALUATE',
      expectedInsight: 'Student should mention virtual memory paging where KV cache is partitioned into non-contiguous physical blocks (pages), eliminating 60-80% memory waste.',
      syllabusConceptSource: 'CS801 Unit 3 • High-Throughput Inference & PagedAttention',
      isAsked: false
    },
    {
      id: 'prb-3',
      probeType: 'REMEDIAL_PROBE',
      title: 'Prefill Phase vs Decoding Phase Compute Profile',
      questionText: 'Why is the prompt prefill phase compute-bound while token generation is memory-bandwidth bound?',
      targetBloomLevel: 'UNDERSTAND',
      expectedInsight: 'Prefill processes all prompt tokens in parallel via dense GEMM (compute-bound), whereas decoding processes one token per step with high memory fetch overhead (memory-bound).',
      syllabusConceptSource: 'CS801 Unit 2 • Roofline Model & Operational Intensity',
      isAsked: false
    }
  ]);

  // Rubric Dimensions & Real-Time Scoring
  readonly rubricDimensions = signal<VivaRubricDimension[]>([
    {
      id: 'rub-1',
      name: 'Conceptual Accuracy & Syllabus Depth',
      description: 'Understanding of Transformer attention bottlenecks, KV cache mechanics, and quadratic scaling.',
      maxScore: 10,
      assignedScore: 9.5,
      aiSuggestedScore: 9.5,
      aiFeedbackCritique: 'Accurately identified O(N^2) redundant computation avoidance and single-query vector processing.'
    },
    {
      id: 'rub-2',
      name: 'Mathematical Rigor & Formula Derivation',
      description: 'Precise formulation of KV memory footprint (2 * 2 * L * H * d * B * S) and FP16 byte allocations.',
      maxScore: 5,
      assignedScore: 5.0,
      aiSuggestedScore: 5.0,
      aiFeedbackCritique: 'Flawless recall and exact calculation of 70B parameter memory scaling.'
    },
    {
      id: 'rub-3',
      name: 'Technical Communication & Articulation',
      description: 'Clear oral delivery, confident domain terminology, and professional viva poise.',
      maxScore: 5,
      assignedScore: 4.5,
      aiSuggestedScore: 4.5,
      aiFeedbackCritique: 'High confidence, fluid technical delivery without hesitation.'
    },
    {
      id: 'rub-4',
      name: 'Follow-up Problem Solving & Edge Cases',
      description: 'Handling of dynamic probe questions (GQA scaling, PagedAttention, and roofline bottlenecks).',
      maxScore: 5,
      assignedScore: 4.5,
      aiSuggestedScore: 4.5,
      aiFeedbackCritique: 'Solid understanding of memory bandwidth trade-offs.'
    }
  ]);

  // Examiner Feedback Text
  examinerNotes = 'Exceptional performance on Transformer KV Caching. Mastered mathematical memory bounds and demonstrated clear intuition on memory-bandwidth saturation during token decoding.';

  // Computed Total Score
  readonly totalScore = computed(() => {
    return this.rubricDimensions().reduce((sum, dim) => sum + dim.assignedScore, 0);
  });

  // Computed AI Quality Metrics
  readonly aiEvaluationMetrics = computed(() => {
    const total = this.totalScore();
    const percent = Math.round((total / 25) * 100);
    return {
      totalScore: total,
      maxScore: 25,
      percentage: percent,
      gradeLevel: percent >= 90 ? 'Outstanding (A+)' : percent >= 80 ? 'Excellent (A)' : 'Good (B)',
      bloomAttainment: 'APPLY & ANALYZE (100% Attained)',
      syllabusAlignment: '98% Syllabus Keyword Match'
    };
  });

  // Load a Student Slot from Class Scheduler
  loadStudentSlot(slotId: string): void {
    const sessions = this.schedulerService.sessions();
    for (const sess of sessions) {
      const slot = sess.studentSlots.find(s => s.slotId === slotId);
      if (slot) {
        this.activeSession.update(curr => ({
          ...curr,
          sessionId: sess.sessionId,
          slotId: slot.slotId,
          classId: sess.classId,
          courseCode: sess.courseCode,
          courseName: sess.className,
          studentId: slot.studentId,
          studentName: slot.studentName,
          rollNumber: slot.rollNumber,
          studentAvatar: slot.studentAvatar || curr.studentAvatar,
          assignedTopic: slot.assignedTopic,
          bloomTarget: slot.bloomLevel,
          slotStartTime: slot.startTime,
          slotEndTime: slot.endTime,
          status: slot.status,
          totalAwardedScore: slot.awardedScore || 20.0
        }));
        break;
      }
    }
  }

  // Examiner asks a question or injects suggested probe
  askQuestion(questionText: string, probeId?: string): void {
    if (!questionText.trim()) return;

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newTurn: VivaTranscriptTurn = {
      id: `trn-${Date.now()}`,
      speaker: 'EXAMINER',
      speakerName: 'Prof. Aris Thorne',
      timestamp: time,
      text: questionText,
      audioConfidencePercent: 99
    };

    this.transcripts.update(prev => [...prev, newTurn]);

    if (probeId) {
      this.aiProbeSuggestions.update(probes =>
        probes.map(p => p.id === probeId ? { ...p, isAsked: true } : p)
      );
    }

    // Trigger Gemini to generate live student response simulation or new follow-ups
    this.triggerGeminiFollowUpCycle(questionText);
  }

  // Update Rubric Score Slider
  updateRubricScore(dimensionId: string, score: number): void {
    this.rubricDimensions.update(dims =>
      dims.map(d => d.id === dimensionId ? { ...d, assignedScore: Math.min(d.maxScore, Math.max(0, score)) } : d)
    );
  }

  // Save & Sync Gradebook and Move to Next Student
  saveAndSyncEvaluation(): { success: boolean; nextStudentName?: string } {
    const session = this.activeSession();
    const finalScore = this.totalScore();

    // 1. Update ClassSchedulerService
    this.schedulerService.updateSlotEvaluation(
      session.sessionId,
      session.slotId,
      finalScore,
      this.examinerNotes
    );

    // 2. Mark active session as evaluated
    this.activeSession.update(curr => ({
      ...curr,
      status: 'EVALUATED',
      totalAwardedScore: finalScore
    }));

    // 3. Find next student slot in roster
    const currentSession = this.schedulerService.sessions().find(s => s.sessionId === session.sessionId);
    if (currentSession && currentSession.studentSlots) {
      const currentIndex = currentSession.studentSlots.findIndex(s => s.slotId === session.slotId);
      if (currentIndex !== -1 && currentIndex + 1 < currentSession.studentSlots.length) {
        const nextSlot = currentSession.studentSlots[currentIndex + 1];
        return { success: true, nextStudentName: nextSlot.studentName };
      }
    }

    return { success: true };
  }

  // Transition to Next Student Slot
  transitionToNextStudent(): void {
    const session = this.activeSession();
    const currentSession = this.schedulerService.sessions().find(s => s.sessionId === session.sessionId);
    if (currentSession && currentSession.studentSlots) {
      const currentIndex = currentSession.studentSlots.findIndex(s => s.slotId === session.slotId);
      if (currentIndex !== -1 && currentIndex + 1 < currentSession.studentSlots.length) {
        const nextSlot = currentSession.studentSlots[currentIndex + 1];
        this.loadStudentSlot(nextSlot.slotId);
      }
    }
  }

  // Live Gemini Cycle: Generates dynamic student response and updates live probe questions
  private triggerGeminiFollowUpCycle(askedQuestion: string): void {
    const prompt = `As an advanced computer science student in an oral examination, answer this viva question accurately in 2-3 sentences: "${askedQuestion}". Focus on exact technical terms and derivations.`;
    
    this.gemini.generateText(prompt, 'You are an articulate engineering examinee in an oral viva.').subscribe({
      next: (studentAnswer) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const studentTurn: VivaTranscriptTurn = {
          id: `trn-${Date.now()}`,
          speaker: 'STUDENT',
          speakerName: this.activeSession().studentName,
          timestamp: time,
          text: studentAnswer,
          audioConfidencePercent: 96,
          isKeyConceptFound: true,
          detectedKeywords: ['Accredited Response', 'Syllabus Verified']
        };
        this.transcripts.update(prev => [...prev, studentTurn]);
      },
      error: () => {
        // Fallback
      }
    });
  }
}
