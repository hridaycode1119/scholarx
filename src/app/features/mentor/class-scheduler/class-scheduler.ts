import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ClassSchedulerService } from '../../../core/services/class-scheduler.service';
import {
  ClassExamSession,
  ClassStudentVivaSlot,
  ClassExamType,
  VivaSlotStatus,
  BloomLevel
} from '../../../core/models';

@Component({
  selector: 'app-class-scheduler',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './class-scheduler.html',
  styleUrls: ['./class-scheduler.scss']
})
export class ClassSchedulerComponent implements OnInit {
  readonly schedulerService = inject(ClassSchedulerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // UI State
  readonly showCreateModal = signal<boolean>(false);
  readonly showEvaluationModal = signal<boolean>(false);
  readonly selectedSlotForEval = signal<{ session: ClassExamSession; slot: ClassStudentVivaSlot } | null>(null);
  readonly successToast = signal<string | null>(null);

  // New Session Form
  newSessionForm = {
    title: '',
    examType: 'ORAL_VIVA_1ON1' as ClassExamType,
    mode: 'VIRTUAL_WEBRTC' as 'PHYSICAL_ROOM' | 'VIRTUAL_WEBRTC',
    venueOrChannel: 'WebRTC VIVA Room: DL-ALPHA-801',
    date: '2026-09-15',
    overallStartTime: '09:00',
    overallEndTime: '12:00',
    syllabusUnitFocus: 'Unit 2: Transformer Attention & GPU KV Cache',
    targetCourseOutcomes: 'CO1, CO2',
    generate1on1Slots: true
  };

  // Evaluation Form
  evalForm = {
    awardedScore: 22,
    rubricFeedback: 'Demonstrated solid understanding of attention mechanisms and gradient propagation.'
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['classId']) {
        this.schedulerService.selectedClassId.set(params['classId']);
      }
      if (params['tab']) {
        const tab = params['tab'].toUpperCase();
        if (tab === 'SESSIONS' || tab === 'STUDENT_SLOTS' || tab === 'HALL_PASSES') {
          this.schedulerService.activeTab.set(tab as any);
        }
      }
      if (params['modal'] === 'create') {
        this.showCreateModal.set(true);
      }
    });
  }

  selectClass(classId: string) {
    this.schedulerService.selectedClassId.set(classId);
  }

  selectTab(tab: 'SESSIONS' | 'STUDENT_SLOTS' | 'HALL_PASSES') {
    this.schedulerService.activeTab.set(tab);
  }

  openEvaluationModal(session: ClassExamSession, slot: ClassStudentVivaSlot) {
    this.selectedSlotForEval.set({ session, slot });
    this.evalForm.awardedScore = slot.awardedScore || 20;
    this.evalForm.rubricFeedback = slot.rubricFeedbackSummary || '';
    this.showEvaluationModal.set(true);
  }

  closeEvaluationModal() {
    this.showEvaluationModal.set(false);
    this.selectedSlotForEval.set(null);
  }

  saveEvaluation() {
    const data = this.selectedSlotForEval();
    if (!data) return;

    this.schedulerService.updateSlotEvaluation(
      data.session.sessionId,
      data.slot.slotId,
      this.evalForm.awardedScore,
      this.evalForm.rubricFeedback
    );

    this.showEvaluationModal.set(false);
    this.showToast(`Viva score (${this.evalForm.awardedScore}/25) recorded for ${data.slot.studentName}!`);
  }

  submitCreateSession() {
    if (!this.newSessionForm.title.trim()) return;

    const coList = this.newSessionForm.targetCourseOutcomes.split(',').map(s => s.trim());

    const created = this.schedulerService.createClassExamSession({
      title: this.newSessionForm.title,
      examType: this.newSessionForm.examType,
      mode: this.newSessionForm.mode,
      venueOrChannel: this.newSessionForm.venueOrChannel,
      date: this.newSessionForm.date,
      overallStartTime: this.newSessionForm.overallStartTime,
      overallEndTime: this.newSessionForm.overallEndTime,
      syllabusUnitFocus: this.newSessionForm.syllabusUnitFocus,
      targetCourseOutcomes: coList,
      generate1on1Slots: this.newSessionForm.generate1on1Slots
    });

    this.showCreateModal.set(false);
    this.showToast(`Class session "${created.title}" scheduled with ${created.studentSlots.length} student viva slots!`);

    // Reset Form
    this.newSessionForm.title = '';
  }

  launchCoPilotForSlot(slot: ClassStudentVivaSlot) {
    this.showToast(`Launching Live Viva Co-Pilot for ${slot.studentName} (${slot.rollNumber})...`);
    this.router.navigate(['/mentor/viva-copilot'], { queryParams: { slotId: slot.slotId } });
  }

  private showToast(msg: string) {
    this.successToast.set(msg);
    setTimeout(() => {
      this.successToast.set(null);
    }, 4500);
  }
}
