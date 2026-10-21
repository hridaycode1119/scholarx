import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { 
  MentorClass, 
  AssessmentQuestion, 
  BloomLevel, 
  GenerateQuestionsRequest, 
  Assessment 
} from '../../../../core/models';

@Component({
  selector: 'app-ai-generator',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './ai-generator.html',
  styleUrl: './ai-generator.scss'
})
export class AiGeneratorComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);
  private readonly router = inject(Router);

  readonly currentStep = signal<1 | 2 | 3 | 4>(1);
  readonly classes = signal<MentorClass[]>([]);
  readonly isGenerating = signal<boolean>(false);
  readonly regeneratingQuestionId = signal<string | null>(null);

  // Configuration Form
  selectedClassId = '';
  title = 'Oral VIVA Assessment on Distributed Consensus';
  topic = 'Paxos and Raft consensus, two-phase commit, Byzantine fault tolerance, and network partition recovery.';
  difficulty: 'EASY' | 'INTERMEDIATE' | 'ADVANCED' = 'INTERMEDIATE';
  questionCount = 4;
  targetCo = 'CO3';
  poTarget = 'PO2';
  durationMinutes = 20;
  totalMarks = 40;
  customInstructions = 'Focus on failure scenarios and recovery procedures in high-latency wireless networks.';

  readonly availableBloomLevels: BloomLevel[] = [
    'REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'
  ];
  selectedBloomLevels: BloomLevel[] = ['ANALYZE', 'EVALUATE', 'CREATE'];

  // Generated Questions
  readonly questions = signal<AssessmentQuestion[]>([]);

  // Generation status text progression
  readonly aiStatusMessage = signal<string>('Analyzing syllabus topics and Bloom taxonomy constraints...');

  ngOnInit(): void {
    this.provider.getMentorClasses().subscribe({
      next: (data) => {
        this.classes.set(data);
        if (data.length > 0) {
          this.selectedClassId = data[0].id;
        }
      }
    });
  }

  toggleBloomLevel(level: BloomLevel): void {
    if (this.selectedBloomLevels.includes(level)) {
      if (this.selectedBloomLevels.length > 1) {
        this.selectedBloomLevels = this.selectedBloomLevels.filter(l => l !== level);
      }
    } else {
      this.selectedBloomLevels = [...this.selectedBloomLevels, level];
    }
  }

  startAiGeneration(): void {
    this.currentStep.set(2);
    this.isGenerating.set(true);

    const steps = [
      'Ingesting syllabus topics and target Course Outcomes (CO)...',
      'Synthesizing Bloom taxonomy distribution and mark rubrics...',
      'Drafting scenario-based oral viva evaluation criteria...',
      'Finalizing key concept evaluation points...'
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        this.aiStatusMessage.set(steps[stepIdx]);
      }
    }, 450);

    const payload: GenerateQuestionsRequest = {
      classId: this.selectedClassId,
      subject: 'Distributed Systems',
      topic: this.topic,
      difficulty: this.difficulty,
      questionCount: this.questionCount,
      bloomLevels: this.selectedBloomLevels,
      coTarget: this.targetCo,
      poTarget: this.poTarget,
      customInstructions: this.customInstructions
    };

    this.provider.generateAiQuestions(payload).subscribe({
      next: (generated) => {
        clearInterval(interval);
        // Ensure mark distribution matches
        const adjusted = generated.map((q, idx) => ({
          ...q,
          questionIndex: idx + 1,
          marks: Math.floor(this.totalMarks / generated.length)
        }));
        this.questions.set(adjusted);
        this.isGenerating.set(false);
        this.currentStep.set(3);
      },
      error: () => {
        clearInterval(interval);
        this.isGenerating.set(false);
        this.currentStep.set(1);
      }
    });
  }

  regenerateQuestion(q: AssessmentQuestion): void {
    this.regeneratingQuestionId.set(q.id);
    this.provider.regenerateSingleQuestion(q.id).subscribe({
      next: (replacement) => {
        this.questions.update(items =>
          items.map(item => item.id === q.id ? { ...replacement, questionIndex: item.questionIndex, marks: item.marks } : item)
        );
        this.regeneratingQuestionId.set(null);
      },
      error: () => this.regeneratingQuestionId.set(null)
    });
  }

  deleteQuestion(id: string): void {
    if (this.questions().length <= 1) return;
    this.questions.update(items => items.filter(q => q.id !== id).map((q, idx) => ({ ...q, questionIndex: idx + 1 })));
  }

  addManualQuestion(): void {
    const newQ: AssessmentQuestion = {
      id: `manual-${Date.now()}`,
      questionIndex: this.questions().length + 1,
      prompt: 'New oral question prompt...',
      marks: 10,
      bloomLevel: 'ANALYZE',
      coTarget: this.targetCo,
      poTarget: this.poTarget
    };
    this.questions.update(items => [...items, newQ]);
  }

  goToReview(): void {
    this.currentStep.set(4);
  }

  finalizeAssessment(status: 'DRAFT' | 'PUBLISHED'): void {
    const selectedClass = this.classes().find(c => c.id === this.selectedClassId);
    const newAssessment: Assessment = {
      id: `asm-${Date.now()}`,
      classId: this.selectedClassId,
      className: selectedClass?.name || 'Class Cohort',
      title: this.title,
      description: this.topic,
      durationMinutes: this.durationMinutes,
      totalMarks: this.questions().reduce((sum, q) => sum + q.marks, 0),
      status,
      questions: this.questions(),
      publishedAt: status === 'PUBLISHED' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };

    this.provider.createAssessment(newAssessment).subscribe({
      next: () => {
        this.router.navigate(['/mentor/assessments']);
      }
    });
  }
}
