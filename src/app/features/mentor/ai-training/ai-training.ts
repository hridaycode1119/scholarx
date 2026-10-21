import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AiTrainingService } from '../../../core/services/ai-training.service';
import {
  CourseKnowledgeDocument,
  LoraTrainingMetrics,
  ModelComparisonResult,
  CourseAiCheckpoint,
  KnowledgeDocType
} from '../../../core/models';

@Component({
  selector: 'app-ai-training',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ai-training.html',
  styleUrls: ['./ai-training.scss']
})
export class AiTrainingComponent implements OnInit {
  readonly aiService = inject(AiTrainingService);
  private readonly route = inject(ActivatedRoute);

  // UI State Signals
  readonly showUploadModal = signal<boolean>(false);
  readonly successToast = signal<string | null>(null);

  // Prompt Arena Input
  arenaPromptInput = 'Derive the mathematical reason why dot-product attention is scaled by 1/sqrt(d_k) and analyze what happens to softmax gradients under high-dimensional keys.';

  // Quick prompt chips
  readonly samplePrompts = [
    'Scaled Dot-Product Attention 1/sqrt(d_k) Derivation',
    'Rotary Position Embedding (RoPE) vs Sinusoidal Encodings',
    'KV Cache GPU Memory Footprint in Multi-Head vs GQA',
    'LoRA Parameter-Efficient Low-Rank Weight Factorization (W0 + BA)'
  ];

  // Upload Form
  readonly selectedRealFile = signal<File | null>(null);
  uploadForm = {
    fileName: '',
    fileSizeMb: 3.5,
    docType: 'SYLLABUS_PDF' as KnowledgeDocType,
    coveredUnits: 'Unit 2: Transformer Attention, Unit 3: LoRA PEFT',
    mappedCourseOutcomes: 'CO1, CO2, CO3',
    summarySnippet: ''
  };

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedRealFile.set(file);
      this.uploadForm.fileName = file.name;
      this.uploadForm.fileSizeMb = +(file.size / (1024 * 1024)).toFixed(2) || 0.5;
      
      // Auto-detect document type by filename extension / keyword
      const lower = file.name.toLowerCase();
      if (lower.includes('syllabus') || lower.includes('curriculum')) {
        this.uploadForm.docType = 'SYLLABUS_PDF';
      } else if (lower.includes('paper') || lower.includes('exam') || lower.includes('pyq') || lower.includes('midterm')) {
        this.uploadForm.docType = 'PAST_EXAM_PAPER';
      } else if (lower.includes('rubric') || lower.includes('outcome') || lower.includes('co_')) {
        this.uploadForm.docType = 'CO_RUBRIC_SPEC';
      } else {
        this.uploadForm.docType = 'TEXTBOOK_CHAPTER';
      }
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['course']) {
        this.aiService.selectedCourseCode.set(params['course']);
      }
      if (params['tab']) {
        const tab = params['tab'].toUpperCase();
        if (tab === 'KNOWLEDGE_BASE' || tab === 'TRAINING_SIMULATOR' || tab === 'COMPARISON_ARENA' || tab === 'CHECKPOINTS') {
          this.aiService.activeTab.set(tab as any);
        }
      }
      if (params['modal'] === 'upload') {
        this.showUploadModal.set(true);
      }
    });
  }

  selectCourse(code: string) {
    this.aiService.selectedCourseCode.set(code);
  }

  selectTab(tab: 'KNOWLEDGE_BASE' | 'TRAINING_SIMULATOR' | 'COMPARISON_ARENA' | 'CHECKPOINTS') {
    this.aiService.activeTab.set(tab);
  }

  applySamplePrompt(promptText: string) {
    this.arenaPromptInput = promptText;
    this.runArenaComparison();
  }

  runArenaComparison() {
    if (!this.arenaPromptInput.trim()) return;
    this.aiService.runArenaTest(this.arenaPromptInput);
    this.showToast('Running live side-by-side inference across Base vs Fine-Tuned checkpoint...');
  }

  deployCheckpoint(checkpointId: string) {
    this.aiService.deployCheckpoint(checkpointId);
    this.showToast(`Checkpoint ${checkpointId} deployed to live Viva AI Co-Pilot for ${this.aiService.selectedCourseCode()}!`);
  }

  submitUpload() {
    if (!this.uploadForm.fileName.trim()) return;

    const units = this.uploadForm.coveredUnits.split(',').map(s => s.trim());
    const cos = this.uploadForm.mappedCourseOutcomes.split(',').map(s => s.trim());

    const doc = this.aiService.uploadDocument({
      fileName: this.uploadForm.fileName,
      fileSizeMb: this.uploadForm.fileSizeMb,
      docType: this.uploadForm.docType,
      coveredUnits: units,
      mappedCourseOutcomes: cos,
      summarySnippet: this.uploadForm.summarySnippet || `Ingested academic knowledge file for ${this.aiService.selectedCourseCode()} covering ${this.uploadForm.coveredUnits}.`
    });

    this.showUploadModal.set(false);
    this.showToast(`Document "${doc.fileName}" parsed and indexed into ${doc.totalChunksExtracted} vector chunks!`);

    // Reset Form
    this.uploadForm.fileName = '';
    this.uploadForm.summarySnippet = '';
  }

  private showToast(msg: string) {
    this.successToast.set(msg);
    setTimeout(() => {
      this.successToast.set(null);
    }, 4500);
  }
}
