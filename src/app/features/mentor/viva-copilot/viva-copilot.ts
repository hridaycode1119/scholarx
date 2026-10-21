import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { VivaCopilotService } from '../../../core/services/viva-copilot.service';
import { ClassSchedulerService } from '../../../core/services/class-scheduler.service';
import { VivaAiProbeSuggestion, VivaTranscriptTurn } from '../../../core/models';

@Component({
  selector: 'app-viva-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './viva-copilot.html',
  styleUrls: ['./viva-copilot.scss']
})
export class VivaCopilotComponent implements OnInit, OnDestroy {
  readonly vivaService = inject(VivaCopilotService);
  readonly schedulerService = inject(ClassSchedulerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // UI State Signals
  readonly isMuted = signal<boolean>(false);
  readonly isCameraOn = signal<boolean>(true);
  readonly isAiAutoProbeActive = signal<boolean>(true);
  readonly successToast = signal<string | null>(null);
  readonly showSyncSuccessModal = signal<boolean>(false);
  readonly nextStudentCandidate = signal<string | null>(null);

  // Examiner live question input bar
  examinerInputText = '';

  // Timer interval ID
  private timerInterval: any;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['slotId']) {
        this.vivaService.loadStudentSlot(params['slotId']);
      }
    });

    // Start countdown timer
    this.timerInterval = setInterval(() => {
      if (this.vivaService.activeSession().remainingSeconds > 0) {
        this.vivaService.activeSession.update(curr => ({
          ...curr,
          remainingSeconds: curr.remainingSeconds - 1
        }));
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  get formattedRemainingTime(): string {
    const totalSec = this.vivaService.activeSession().remainingSeconds;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  toggleMic(): void {
    this.isMuted.update(v => !v);
  }

  toggleCamera(): void {
    this.isCameraOn.update(v => !v);
  }

  sendExaminerQuestion(): void {
    if (!this.examinerInputText.trim()) return;
    this.vivaService.askQuestion(this.examinerInputText);
    this.examinerInputText = '';
  }

  askSuggestedProbe(probe: VivaAiProbeSuggestion): void {
    this.vivaService.askQuestion(probe.questionText, probe.id);
    this.showToast(`AI Suggested Question asked: "${probe.title}"`);
  }

  onScoreChange(dimensionId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const score = parseFloat(input.value) || 0;
    this.vivaService.updateRubricScore(dimensionId, score);
  }

  saveAndSyncToGradebook(): void {
    const res = this.vivaService.saveAndSyncEvaluation();
    if (res.success) {
      this.nextStudentCandidate.set(res.nextStudentName || null);
      this.showSyncSuccessModal.set(true);
    }
  }

  continueToNextStudent(): void {
    this.showSyncSuccessModal.set(false);
    this.vivaService.transitionToNextStudent();
    this.showToast(`Switched to next examinee: ${this.vivaService.activeSession().studentName}`);
  }

  returnToClassScheduler(): void {
    this.showSyncSuccessModal.set(false);
    this.router.navigate(['/mentor/class-scheduler']);
  }

  private showToast(msg: string): void {
    this.successToast.set(msg);
    setTimeout(() => {
      this.successToast.set(null);
    }, 4500);
  }
}
