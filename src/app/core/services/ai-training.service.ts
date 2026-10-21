import { Injectable, signal, computed, inject } from '@angular/core';
import { GeminiAiService } from './gemini-ai.service';
import {
  CourseKnowledgeDocument,
  LoraTrainingMetrics,
  ModelComparisonResult,
  CourseAiCheckpoint,
  KnowledgeDocType,
  BloomLevel
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class AiTrainingService {
  private readonly geminiAi = inject(GeminiAiService);

  // Selected state signals
  readonly selectedCourseCode = signal<string>('CS801');
  readonly activeTab = signal<'KNOWLEDGE_BASE' | 'TRAINING_SIMULATOR' | 'COMPARISON_ARENA' | 'CHECKPOINTS'>('KNOWLEDGE_BASE');
  readonly currentComparisonPrompt = signal<string>('Derive the mathematical reason why dot-product attention is scaled by 1/sqrt(d_k) and analyze what happens to softmax gradients under high-dimensional keys.');
  readonly isRunningArenaTest = signal<boolean>(false);
  readonly isTrainingRunning = signal<boolean>(false);

  // Mentor's Courses
  readonly courses = signal<{ code: string; name: string; classId: string; semester: string }[]>([
    { code: 'CS801', name: 'Deep Learning & Transformers', classId: 'cls-401', semester: 'Sem 7' },
    { code: 'CS702', name: 'Distributed Systems & Cloud', classId: 'cls-402', semester: 'Sem 6' },
    { code: 'CS604', name: 'Computer Vision & GenAI Lab', classId: 'cls-403', semester: 'Sem 6' },
    { code: 'AI805', name: 'AI Safety & Alignment Capstone', classId: 'cls-404', semester: 'Sem 8' }
  ]);

  // Master Ingested Course Documents Knowledge Base
  readonly documents = signal<CourseKnowledgeDocument[]>([
    {
      id: 'doc-dl-01',
      courseCode: 'CS801',
      courseName: 'Deep Learning & Transformers',
      classId: 'cls-401',
      fileName: 'CS801_University_Syllabus_Rubrics_2026.pdf',
      fileSizeMb: 4.8,
      docType: 'SYLLABUS_PDF',
      uploadedAt: '2026-08-10 14:20',
      totalChunksExtracted: 840,
      embeddingDimensions: 1536,
      indexingStatus: 'INDEXED',
      coveredUnits: ['Unit 1: Deep Feedforward Nets', 'Unit 2: Transformer Attention', 'Unit 3: LoRA & Fine-Tuning'],
      mappedCourseOutcomes: ['CO1', 'CO2', 'CO3'],
      summarySnippet: 'Official autonomous university syllabus specification covering transformer multi-head self-attention, scaled dot-product derivations, and Bloom level cognitive assessment rubrics.'
    },
    {
      id: 'doc-dl-02',
      courseCode: 'CS801',
      courseName: 'Deep Learning & Transformers',
      classId: 'cls-401',
      fileName: 'Attention_Is_All_You_Need_Research_Spec.pdf',
      fileSizeMb: 2.1,
      docType: 'TEXTBOOK_CHAPTER',
      uploadedAt: '2026-08-12 09:15',
      totalChunksExtracted: 460,
      embeddingDimensions: 1536,
      indexingStatus: 'INDEXED',
      coveredUnits: ['Unit 2: Transformer Multi-Head Self-Attention & Positional Encoding'],
      mappedCourseOutcomes: ['CO1', 'CO2'],
      summarySnippet: 'Seminal paper detailing scaled dot-product attention formulation, softmax scaling factor sqrt(d_k), and multi-head projection matrices.'
    },
    {
      id: 'doc-dl-03',
      courseCode: 'CS801',
      courseName: 'Deep Learning & Transformers',
      classId: 'cls-401',
      fileName: 'Past_EndSem_Question_Bank_2024_2025.pdf',
      fileSizeMb: 8.4,
      docType: 'PAST_EXAM_PAPER',
      uploadedAt: '2026-08-20 16:45',
      totalChunksExtracted: 1120,
      embeddingDimensions: 1536,
      indexingStatus: 'INDEXED',
      coveredUnits: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4'],
      mappedCourseOutcomes: ['CO1', 'CO2', 'CO3', 'CO4'],
      summarySnippet: 'Compilation of 120 past university viva and theory examination questions with faculty marking rubrics and expected derivations.'
    },
    {
      id: 'doc-dl-04',
      courseCode: 'CS801',
      courseName: 'Deep Learning & Transformers',
      classId: 'cls-401',
      fileName: 'LoRA_and_QLoRA_FineTuning_Engineering_Guide.pdf',
      fileSizeMb: 3.5,
      docType: 'TEXTBOOK_CHAPTER',
      uploadedAt: '2026-08-25 11:30',
      totalChunksExtracted: 620,
      embeddingDimensions: 1536,
      indexingStatus: 'INDEXED',
      coveredUnits: ['Unit 3: LoRA Factorization & Parameter-Efficient Fine-Tuning (PEFT)'],
      mappedCourseOutcomes: ['CO3', 'CO4'],
      summarySnippet: 'Comprehensive handbook detailing Low-Rank Adaptation (W = W0 + BA), rank selection r, alpha scaling, and memory reduction on single-GPU clusters.'
    },
    {
      id: 'doc-ds-01',
      courseCode: 'CS702',
      courseName: 'Distributed Systems & Cloud',
      classId: 'cls-402',
      fileName: 'CS702_Raft_Consensus_Specification_2026.pdf',
      fileSizeMb: 5.2,
      docType: 'SYLLABUS_PDF',
      uploadedAt: '2026-08-14 10:00',
      totalChunksExtracted: 910,
      embeddingDimensions: 1536,
      indexingStatus: 'INDEXED',
      coveredUnits: ['Unit 3: Distributed Consensus & State Machine Replication'],
      mappedCourseOutcomes: ['CO3', 'CO4'],
      summarySnippet: 'Raft consensus algorithm covering leader election, log replication, randomized election timeouts, and network split-brain isolation.'
    }
  ]);

  // Master LoRA Fine-Tuning Telemetry State
  readonly trainingMetrics = signal<LoraTrainingMetrics>({
    trainingJobId: 'job-lora-cs801-v2',
    courseCode: 'CS801',
    baseModelName: 'Meta Llama-3.3-70B-Instruct (Base FP16)',
    adapterName: 'ScholarX-LoRA-CS801-DeepLearning-v2.1',
    currentEpoch: 4,
    totalEpochs: 5,
    currentStep: 420,
    totalSteps: 500,
    currentLoss: 0.384,
    initialLoss: 2.450,
    currentPerplexity: 4.12,
    basePerplexity: 12.80,
    gpuDevice: 'NVIDIA A100-SXM4-80GB (Node-Cluster-02)',
    vramUsedGb: 48.2,
    vramMaxGb: 80.0,
    learningRate: 0.0002,
    status: 'COMPLETED',
    lossHistory: [
      { step: 0, epoch: 0, loss: 2.450, learningRate: 0.00005, vramGb: 46.1 },
      { step: 50, epoch: 1, loss: 1.820, learningRate: 0.00020, vramGb: 47.5 },
      { step: 100, epoch: 1, loss: 1.410, learningRate: 0.00020, vramGb: 47.9 },
      { step: 150, epoch: 2, loss: 1.090, learningRate: 0.00019, vramGb: 48.0 },
      { step: 200, epoch: 2, loss: 0.880, learningRate: 0.00018, vramGb: 48.1 },
      { step: 250, epoch: 3, loss: 0.710, learningRate: 0.00016, vramGb: 48.2 },
      { step: 300, epoch: 3, loss: 0.580, learningRate: 0.00014, vramGb: 48.2 },
      { step: 350, epoch: 4, loss: 0.470, learningRate: 0.00011, vramGb: 48.2 },
      { step: 400, epoch: 4, loss: 0.405, learningRate: 0.00008, vramGb: 48.2 },
      { step: 420, epoch: 4, loss: 0.384, learningRate: 0.00006, vramGb: 48.2 }
    ]
  });

  // Master Course Checkpoints
  readonly checkpoints = signal<CourseAiCheckpoint[]>([
    {
      checkpointId: 'chk-cs801-v2.1',
      courseCode: 'CS801',
      checkpointName: 'ScholarX-CS801-Transformers-Checkpoint-v2.1',
      version: 'v2.1 (Production)',
      baseModel: 'Meta Llama-3.3-70B-Instruct',
      loraRank: 32,
      loraAlpha: 64,
      trainedAt: '2026-09-08 18:30',
      finalLoss: 0.384,
      perplexity: 4.12,
      isActiveForVivas: true,
      deployedToClassId: 'cls-401'
    },
    {
      checkpointId: 'chk-cs801-v1.0',
      courseCode: 'CS801',
      checkpointName: 'ScholarX-CS801-Baseline-v1.0',
      version: 'v1.0 (Archived)',
      baseModel: 'Mistral-Large-2407',
      loraRank: 16,
      loraAlpha: 32,
      trainedAt: '2026-08-15 11:00',
      finalLoss: 0.690,
      perplexity: 6.45,
      isActiveForVivas: false,
      deployedToClassId: 'cls-401'
    },
    {
      checkpointId: 'chk-cs702-v1.4',
      courseCode: 'CS702',
      checkpointName: 'ScholarX-CS702-DistributedCloud-v1.4',
      version: 'v1.4 (Production)',
      baseModel: 'Meta Llama-3.3-70B-Instruct',
      loraRank: 32,
      loraAlpha: 64,
      trainedAt: '2026-09-02 15:45',
      finalLoss: 0.412,
      perplexity: 4.55,
      isActiveForVivas: true,
      deployedToClassId: 'cls-402'
    }
  ]);

  // Model Comparison Arena Test Cases
  readonly comparisonResult = signal<ModelComparisonResult>({
    prompt: 'Derive the mathematical reason why dot-product attention is scaled by 1/sqrt(d_k) and analyze what happens to softmax gradients under high-dimensional keys.',
    courseContext: 'CS801 Deep Learning • Unit 2: Transformer Multi-Head Self-Attention',
    targetBloomLevel: 'EVALUATE',
    baseModelName: 'Base Llama-3.3-70B-Instruct',
    baseModelOutput: `Dot-product attention computes softmax(QK^T / sqrt(d_k)) * V. The scaling factor 1/sqrt(d_k) is used because when d_k is large, the dot products grow large in magnitude. When dot products are large, the softmax function pushes values into regions with very small gradients, causing the vanishing gradient problem. Scaling counteracts this growth.`,
    baseRubricScore: 68,
    fineTunedModelName: 'ScholarX-CS801-FineTuned Checkpoint (v2.1)',
    fineTunedModelOutput: `### Academic Course Outcome (CO1 & CO2) Derivation:
1. **Mathematical Assumption:** Assume components of $q$ and $k$ are independent random variables with mean $\\mu = 0$ and variance $\\sigma^2 = 1$.
2. **Variance Growth:** The dot product $q \\cdot k = \\sum_{i=1}^{d_k} q_i k_i$ has mean $0$ and variance $\\text{Var}(q \\cdot k) = d_k$.
3. **Softmax Gradient Saturation:** For large $d_k$, the magnitude of $QK^T$ scales with $\\sqrt{d_k}$. As inputs into $\\text{softmax}(z)$ grow into extreme positive/negative domains, the Jacobian $\\frac{\\partial \\text{softmax}(z)_i}{\\partial z_j} = s_i(\\delta_{ij} - s_j)$ drives softmax derivatives asymptotically towards $0$, completely halting backpropagation gradient flow into key and query weight matrices ($W_K, W_Q$).
4. **Normalized Invariance:** Dividing by $\\sqrt{d_k}$ normalizes the variance back to $\\text{Var}\\left(\\frac{q \\cdot k}{\\sqrt{d_k}}\\right) = 1$, guaranteeing gradient stability across multi-head projections.

**Examiner Viva Scoring Rubric Match:** 100% compliant with Autonomous Unit 2 syllabus CO1 attainment criteria.`,
    fineTunedRubricScore: 98,
    latencyMs: 420,
    highlightedRubricKeywords: ['Variance = d_k', 'Jacobian Softmax Saturation', 'Independent Random Variables', 'Backpropagation Gradient Flow', 'W_Q & W_K Weight Matrices']
  });

  // Computed Filtered Documents
  readonly filteredDocuments = computed<CourseKnowledgeDocument[]>(() => {
    const code = this.selectedCourseCode();
    return this.documents().filter(d => d.courseCode === code);
  });

  // Computed Course Checkpoints
  readonly courseCheckpoints = computed<CourseAiCheckpoint[]>(() => {
    const code = this.selectedCourseCode();
    return this.checkpoints().filter(c => c.courseCode === code);
  });

  // Computed Knowledge Stats
  readonly courseStats = computed(() => {
    const docs = this.filteredDocuments();
    const chks = this.courseCheckpoints();
    const metrics = this.trainingMetrics();

    const totalChunks = docs.reduce((acc, d) => acc + d.totalChunksExtracted, 0);
    const totalMb = docs.reduce((acc, d) => acc + d.fileSizeMb, 0);
    const activeCheckpoint = chks.find(c => c.isActiveForVivas) || chks[0];

    return {
      totalDocuments: docs.length,
      totalChunksVectorized: totalChunks,
      totalKnowledgeMb: Math.round(totalMb * 10) / 10,
      activeModelVersion: activeCheckpoint ? activeCheckpoint.version : 'v2.1',
      currentPerplexity: metrics.currentPerplexity,
      lossReductionPercent: Math.round(((metrics.initialLoss - metrics.currentLoss) / metrics.initialLoss) * 100),
      gpuMemoryUsageGb: `${metrics.vramUsedGb} / ${metrics.vramMaxGb} GB`
    };
  });

  // Actions
  uploadDocument(docData: {
    fileName: string;
    fileSizeMb: number;
    docType: KnowledgeDocType;
    coveredUnits: string[];
    mappedCourseOutcomes: string[];
    summarySnippet: string;
  }): CourseKnowledgeDocument {
    const code = this.selectedCourseCode();
    const course = this.courses().find(c => c.code === code) || this.courses()[0];

    const newDoc: CourseKnowledgeDocument = {
      id: `doc-${code.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      courseCode: code,
      courseName: course.name,
      classId: course.classId,
      fileName: docData.fileName,
      fileSizeMb: docData.fileSizeMb,
      docType: docData.docType,
      uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      totalChunksExtracted: Math.floor(docData.fileSizeMb * 120),
      embeddingDimensions: 1536,
      indexingStatus: 'INDEXED',
      coveredUnits: docData.coveredUnits,
      mappedCourseOutcomes: docData.mappedCourseOutcomes,
      summarySnippet: docData.summarySnippet
    };

    this.documents.update(prev => [newDoc, ...prev]);
    return newDoc;
  }

  // Run arena comparison test
  runArenaTest(promptText: string): void {
    this.isRunningArenaTest.set(true);
    this.currentComparisonPrompt.set(promptText);

    const code = this.selectedCourseCode();
    const course = this.courses().find(c => c.code === code) || this.courses()[0];
    const docs = this.filteredDocuments();
    const units = docs.flatMap(d => d.coveredUnits);

    const startTime = Date.now();

    this.geminiAi.runArenaComparison(promptText, code, course.name, units).subscribe({
      next: (res) => {
        const latency = Date.now() - startTime;
        this.comparisonResult.set({
          prompt: promptText,
          courseContext: `${code} Curriculum • ${course.name}`,
          targetBloomLevel: 'ANALYZE',
          baseModelName: 'Base Llama-3.3-70B-Instruct (Generic)',
          baseModelOutput: res.baseResponse,
          baseRubricScore: res.baseScore || 68,
          fineTunedModelName: `ScholarX-${code}-FineTuned Checkpoint (v2.1 Gemini-Enhanced)`,
          fineTunedModelOutput: res.tunedResponse,
          fineTunedRubricScore: res.tunedScore || 98,
          latencyMs: latency,
          highlightedRubricKeywords: [
            'Curriculum Ingestion',
            'Outcome-Based Derivations',
            'Mathematical Formulations',
            'Examiner Viva Question Bank'
          ]
        });
        this.isRunningArenaTest.set(false);
      },
      error: () => {
        this.isRunningArenaTest.set(false);
      }
    });
  }

  // Deploy Checkpoint to Live Vivas
  deployCheckpoint(checkpointId: string): void {
    this.checkpoints.update(prev =>
      prev.map(c => ({
        ...c,
        isActiveForVivas: c.checkpointId === checkpointId
      }))
    );
  }
}
