import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentService } from '../../../core/services/student.service';
import { GeminiAiService } from '../../../core/services/gemini-ai.service';
import { AiOrchestratorService } from '../../../core/services/ai-orchestrator.service';
import { 
  MinedPYQ, 
  BloomLevel, 
  DetailedIndianSolution, 
  PracticeQuestionSolution, 
  MentorPracticePaper 
} from '../../../core/models';
import { QuestionPaperOcrService } from '../../../core/services/question-paper-ocr.service';

@Component({
  selector: 'app-student-paper-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-paper-upload.html',
  styleUrl: './student-paper-upload.scss'
})
export class StudentPaperUploadComponent implements OnInit, OnDestroy {
  readonly studentService = inject(StudentService);
  readonly ocrBackendService = inject(QuestionPaperOcrService);
  private readonly geminiService = inject(GeminiAiService);
  private readonly aiOrchestrator = inject(AiOrchestratorService);
  private readonly router = inject(Router);

  // Upload & Document State
  readonly isDragging = signal<boolean>(false);
  readonly uploadProgress = signal<number | null>(null);
  readonly fileExtractionStatusMessage = signal<string | null>(null);
  readonly uploadedFileName = signal<string | null>('Sample_EndSem_QuestionPaper.pdf');
  readonly uploadedFileSize = signal<string>('1.8 MB');
  readonly uploadedFileType = signal<'PDF' | 'IMAGE' | 'SCREENSHOT'>('PDF');
  readonly uploadedFilePreviewUrl = signal<string | null>(null);
  readonly rawPaperTranscript = signal<string>('');
  readonly isRawTranscriptVisible = signal<boolean>(false);
  readonly ocrConfidence = signal<number>(99.4);
  readonly isExtractingFileContent = signal<boolean>(false);
  readonly isDeblurFilterActive = signal<boolean>(true);

  // Presets State
  readonly selectedPreset = signal<'USER_SAMPLE_8051' | 'AKTU_OS' | 'SHARDA_SET'>('USER_SAMPLE_8051');

  // Step-by-Step Optical Laser Scanning & Blueprint Canvas State
  readonly paperScanStatus = signal<'IDLE' | 'SCANNING' | 'SCANNED' | 'EXTRACTING' | 'EXTRACTED'>('IDLE');
  readonly scanProgressPercent = signal<number>(0);
  readonly scanStatusMessage = signal<string>('Ready to scan and extract questions from paper or screenshot.');
  readonly showBlueprintCanvas = signal<boolean>(false);
  readonly currentScanningLineIndex = signal<number>(-1);
  readonly isScanBeamActive = signal<boolean>(false);
  readonly scanBeamYPercent = signal<number>(0);
  readonly scannedDetectedDiagramsCount = signal<number>(0);
  readonly scannedDetectedTablesCount = signal<number>(0);
  readonly scannedDetectedQuestionsCount = signal<number>(0);
  readonly activeScanningTelemetryLog = signal<string>('Optical OCR engine ready.');

  // Top-to-Bottom Pick-Up Stream
  readonly scannedPickedUpLines = signal<Array<{
    lineNumber: number;
    text: string;
    type: 'HEADER' | 'META' | 'INSTRUCTION' | 'SECTION' | 'QUESTION' | 'DIAGRAM' | 'TABLE' | 'FOOTER';
    caption?: string;
  }>>([]);

  // Extracted Questions & Practice Mode
  readonly extractedQuestions = signal<MinedPYQ[]>([]);
  readonly isProcessingQuestions = signal<boolean>(false);
  readonly paperContentMode = signal<'WITH_SOLUTIONS' | 'QUESTIONS_ONLY'>('WITH_SOLUTIONS');
  readonly activeSolutionTab = signal<Record<string, 'analogy' | 'math' | 'diagram' | 'rubric'>>({});
  readonly studentDraftAnswers = signal<Record<string, string>>({});
  readonly toastMessage = signal<string | null>(null);

  // Section & OR Filtering
  readonly selectedSectionFilter = signal<'ALL' | 'SECTION_C' | 'SECTION_D' | 'OR_PAIRS'>('ALL');
  readonly highlightedOrGroup = signal<string | null>(null);
  readonly detectedSectionFormulas = signal<Record<string, string>>({
    'SECTION-C': '3 × 10 = 30 Marks (Attempt Any 3 Questions of 10M Each)',
    'SECTION-D': 'All Questions Compulsory (10 Marks)'
  });

  readonly filteredQuestions = computed(() => {
    const list = this.extractedQuestions();
    const filter = this.selectedSectionFilter();
    if (filter === 'SECTION_C') {
      return list.filter(q => q.sectionName?.includes('SECTION-C') || q.sectionName?.includes('SECTION C'));
    }
    if (filter === 'SECTION_D') {
      return list.filter(q => q.sectionName?.includes('SECTION-D') || q.sectionName?.includes('SECTION D'));
    }
    if (filter === 'OR_PAIRS') {
      return list.filter(q => q.isOrChoice || q.hasOrAlternative);
    }
    return list;
  });

  scrollToAlternative(targetId?: string, orGroup?: string): void {
    if (orGroup) {
      this.highlightedOrGroup.set(orGroup);
    }
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
    setTimeout(() => {
      this.highlightedOrGroup.set(null);
    }, 3500);
  }

  // Inline Question Editing
  readonly editingQuestionId = signal<string | null>(null);
  readonly inlineEditText = signal<string>('');
  readonly isAutoHealing = signal<Record<string, boolean>>({});

  // Bound handler for clipboard paste
  private readonly handlePasteEvent = (event: ClipboardEvent) => this.onPasteClipboard(event);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('paste', this.handlePasteEvent);
    }
    // Load default sample preset on initial entry
    this.loadPresetSample('USER_SAMPLE_8051');
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('paste', this.handlePasteEvent);
    }
  }

  // --- Clipboard Screenshot Paste Handler ---
  async onPasteClipboard(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          const timestamp = new Date().toLocaleTimeString().replace(/[:\s]/g, '-');
          const fileName = `Clipboard_Screenshot_${timestamp}.png`;
          this.isExtractingFileContent.set(true);
          this.fileExtractionStatusMessage.set('Reading screenshot pixels from clipboard...');

          try {
            const doc = await this.ocrBackendService.extractContentFromFile(
              blob,
              fileName,
              'SCREENSHOT',
              (msg) => this.fileExtractionStatusMessage.set(msg)
            );

            this.uploadedFileName.set(doc.fileName);
            this.uploadedFileSize.set(doc.fileSize);
            this.uploadedFileType.set('SCREENSHOT');
            this.uploadedFilePreviewUrl.set(doc.previewUrl);
            this.rawPaperTranscript.set(doc.rawTranscript);
            this.ocrConfidence.set(doc.confidence);
            this.showToast('📸 Screenshot pasted from clipboard! Optical OCR scanning started.');
            this.startTopToBottomPickUp();
          } catch (err) {
            console.error('Screenshot extraction error:', err);
          } finally {
            this.isExtractingFileContent.set(false);
          }
          break;
        }
      }
    }
  }

  // --- Drag & Drop and File Input Handlers ---
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleIncomingFile(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleIncomingFile(input.files[0]);
    }
  }

  private async handleIncomingFile(file: File): Promise<void> {
    this.uploadedFileName.set(file.name);
    this.uploadedFileSize.set(`${(file.size / 1024).toFixed(1)} KB`);
    this.isExtractingFileContent.set(true);
    this.fileExtractionStatusMessage.set(`Reading ${file.name}...`);

    try {
      const doc = await this.ocrBackendService.extractContentFromFile(
        file,
        file.name,
        undefined,
        (msg) => this.fileExtractionStatusMessage.set(msg)
      );

      this.uploadedFileName.set(doc.fileName);
      this.uploadedFileSize.set(doc.fileSize);
      this.uploadedFileType.set(doc.fileType as any);
      this.uploadedFilePreviewUrl.set(doc.previewUrl);
      this.rawPaperTranscript.set(doc.rawTranscript);
      this.ocrConfidence.set(doc.confidence);
      this.fileExtractionStatusMessage.set(`Optical extraction complete: ${doc.rawTranscript.split('\n').length} lines.`);

      this.startTopToBottomPickUp();
    } catch (err: any) {
      console.error('OCR Extraction error:', err);
      this.fileExtractionStatusMessage.set('Extraction error, loading preset sample.');
      this.loadPresetSample('USER_SAMPLE_8051');
    } finally {
      this.isExtractingFileContent.set(false);
    }
  }

  // --- Top-to-Bottom Pick-Up Laser Scanning Animation ---
  startTopToBottomPickUp(): void {
    const raw = this.rawPaperTranscript();
    if (!raw.trim()) return;

    this.paperScanStatus.set('SCANNING');
    this.extractedQuestions.set([]);
    this.showBlueprintCanvas.set(true);
    this.scanProgressPercent.set(0);
    this.scannedPickedUpLines.set([]);
    this.isScanBeamActive.set(true);
    this.scannedDetectedQuestionsCount.set(0);
    this.scannedDetectedDiagramsCount.set(0);
    this.scannedDetectedTablesCount.set(0);

    const rawLines = raw.split('\n').filter(l => l.trim().length > 0);
    const totalLines = rawLines.length;

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= totalLines) {
        clearInterval(interval);
        this.scanProgressPercent.set(100);
        this.isScanBeamActive.set(false);
        this.paperScanStatus.set('EXTRACTED');
        this.activeScanningTelemetryLog.set(`Extraction complete! ${this.scannedDetectedQuestionsCount()} questions segmented cleanly.`);
        this.parseAndSegmentQuestionsFromTranscript();
        return;
      }

      const lineText = rawLines[idx];
      const lineNum = idx + 1;
      const progress = Math.round(((idx + 1) / totalLines) * 100);
      this.scanProgressPercent.set(progress);
      this.scanBeamYPercent.set(progress);
      this.currentScanningLineIndex.set(idx);

      let lineType: 'HEADER' | 'META' | 'INSTRUCTION' | 'SECTION' | 'QUESTION' | 'DIAGRAM' | 'TABLE' | 'FOOTER' = 'HEADER';
      const textUpper = lineText.toUpperCase();

      if (textUpper.includes('SECTION') || textUpper.includes('PART -') || textUpper.includes('GROUP')) {
        lineType = 'SECTION';
      } else if (textUpper.includes('MAX MARKS') || textUpper.includes('TIME:') || textUpper.includes('SEMESTER') || textUpper.includes('ROLL NO')) {
        lineType = 'META';
      } else if (textUpper.includes('NOTE:') || textUpper.includes('ATTEMPT ALL') || textUpper.includes('COMPULSORY')) {
        lineType = 'INSTRUCTION';
      } else if (/^(?:Q\.?\s*)?(?:\d{1,2})?\s*\.?\s*(?:\([a-d]\)|[a-d]\.|\b[a-d]\))\s*/i.test(lineText) || /^\d{1,2}\s*[.)]/i.test(lineText)) {
        lineType = 'QUESTION';
        this.scannedDetectedQuestionsCount.update(c => c + 1);
      } else if (textUpper.includes('DIAGRAM') || textUpper.includes('FIGURE') || textUpper.includes('PINOUT') || textUpper.includes('CIRCUIT')) {
        lineType = 'DIAGRAM';
        this.scannedDetectedDiagramsCount.update(c => c + 1);
      } else if (textUpper.includes('TABLE') || textUpper.includes('MATRIX') || textUpper.includes('PROCESS') || textUpper.includes('ALLOCATION')) {
        lineType = 'TABLE';
        this.scannedDetectedTablesCount.update(c => c + 1);
      }

      this.scannedPickedUpLines.update(list => [
        ...list,
        { lineNumber: lineNum, text: lineText, type: lineType }
      ]);

      this.activeScanningTelemetryLog.set(`[Line ${lineNum}/${totalLines}] Picked up ${lineType}: "${lineText.substring(0, 45)}..."`);
      idx++;
    }, 35);
  }

  // --- Accurate Question Parsing & Clean-Up ---
  async parseAndSegmentQuestionsFromTranscript(): Promise<void> {
    this.isProcessingQuestions.set(true);
    const transcript = this.rawPaperTranscript();

    // Call dedicated OCR backend service to parse sections, OR choices, auto-heal faint Q17, and synthesize 7-pillar model solutions
    const parsed = await this.ocrBackendService.parseQuestionsFromBackend(
      transcript,
      this.detectedSectionFormulas()
    );

    this.detectedSectionFormulas.set(parsed.sectionFormulas);
    this.extractedQuestions.set(parsed.questions);
    this.scannedDetectedQuestionsCount.set(parsed.questions.length);
    this.isProcessingQuestions.set(false);
  }

  // --- Mode & Solution Tabs Switching ---
  setSolutionTab(qId: string, tab: 'analogy' | 'math' | 'diagram' | 'rubric'): void {
    this.activeSolutionTab.update(m => ({ ...m, [qId]: tab }));
  }

  getSolutionTab(qId: string): 'analogy' | 'math' | 'diagram' | 'rubric' {
    return this.activeSolutionTab()[qId] || 'analogy';
  }

  saveDraftAnswer(qId: string, text: string): void {
    this.studentDraftAnswers.update(m => ({ ...m, [qId]: text }));
  }

  getWordCount(text?: string): number {
    if (!text) return 0;
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  // --- Inline Editing & Auto-Heal ---
  startInlineEdit(q: MinedPYQ): void {
    this.editingQuestionId.set(q.id);
    this.inlineEditText.set(q.questionText || q.question || '');
  }

  saveInlineEdit(qId: string): void {
    const text = this.inlineEditText().trim();
    if (!text) return;
    this.extractedQuestions.update(list => list.map(q => q.id === qId ? { ...q, questionText: text, question: text } : q));
    this.editingQuestionId.set(null);
    this.showToast('✓ Question text successfully updated.');
  }

  cancelInlineEdit(): void {
    this.editingQuestionId.set(null);
  }

  autoHealQuestion(q: MinedPYQ): void {
    this.isAutoHealing.update(m => ({ ...m, [q.id]: true }));
    const prompt = `Complete and refine this engineering exam question so it is grammatically correct and examination-ready:\n"${q.questionText || q.question}"`;

    this.geminiService.generateText(prompt, 'You are an engineering exam editor. Output ONLY the refined question prompt.').subscribe({
      next: (refined) => {
        const clean = refined.trim().replace(/^"|"$/g, '');
        this.extractedQuestions.update(list => list.map(item => item.id === q.id ? { ...item, questionText: clean, question: clean } : item));
        this.isAutoHealing.update(m => ({ ...m, [q.id]: false }));
        this.showToast('✨ AI auto-healed question prompt!');
      },
      error: () => {
        this.isAutoHealing.update(m => ({ ...m, [q.id]: false }));
      }
    });
  }

  // --- Save to Student Practice Papers Archive ---
  saveToStudentPracticePapers(): void {
    const questions = this.extractedQuestions();
    if (questions.length === 0) return;

    const paperId = `paper-ocr-${Date.now()}`;
    const now = new Date();
    const releaseTimeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const endTimeStr = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + deadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newPaper: MentorPracticePaper = {
      id: paperId,
      paperTitle: this.uploadedFileName()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'OCR Extracted Practice Drill',
      title: this.uploadedFileName()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'OCR Extracted Practice Drill',
      classId: 'cls-ocr-01',
      className: questions[0]?.subjectName || 'Engineering Examination',
      subjectCode: questions[0]?.subjectCode || 'CSE-301',
      motive: 'Student Self-Practice Drill from Paper OCR',
      targetCO: questions[0]?.targetCO || 'CO2',
      sourceFormat: 'PAPER_OCR',
      languageMode: 'ORIGINAL',
      difficulty: 'MEDIUM',
      resultState: 'NOT_ATTEMPTED',
      uploadedBy: 'Self-OCR Extraction Studio',
      uploadedAt: now.toISOString(),
      publishedAt: releaseTimeStr,
      releaseTime: releaseTimeStr,
      endTime: endTimeStr,
      durationValue: '3 Days',
      placeLocation: 'Self-Practice & OCR Archive',
      paperContentMode: this.paperContentMode(),
      status: 'ACTIVE',
      isTerminated: false,
      questionsCount: questions.length,
      questions: questions.map(q => ({
        ...q,
        isFromMentorPaper: true,
        mentorPaperMetadata: {
          paperTitle: this.uploadedFileName() || 'Extracted Paper',
          motive: 'Student OCR Self-Practice Drill',
          targetCO: q.targetCO,
          resultState: 'NOT_ATTEMPTED',
          uploadedBy: 'Self-OCR Studio'
        }
      }))
    };

    // Save into StudentService signals
    this.studentService.publishMentorPracticePaper(newPaper);
    this.showToast('✓ Paper saved to your Practice Archive! Accessible in PYQ Miner & Practice.');
  }

  startPracticeDrillNow(): void {
    this.saveToStudentPracticePapers();
    this.router.navigate(['/student/practice']);
  }

  printStudySheet(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  // --- Preset Loaders ---
  loadPresetSample(preset: 'USER_SAMPLE_8051' | 'AKTU_OS' | 'SHARDA_SET'): void {
    this.selectedPreset.set(preset);
    const { document } = this.ocrBackendService.getPresetSampleData(preset);
    this.uploadedFileName.set(document.fileName);
    this.uploadedFileSize.set(document.fileSize);
    this.uploadedFileType.set(document.fileType as any);
    this.uploadedFilePreviewUrl.set(document.previewUrl);
    this.rawPaperTranscript.set(document.rawTranscript);
    this.ocrConfidence.set(document.confidence);

    this.startTopToBottomPickUp();
  }
}
