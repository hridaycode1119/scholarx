import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { MentorClass, CourseOutcome } from '../../../../core/models';

@Component({
  selector: 'app-class-outcomes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './class-outcomes.html',
  styleUrl: './class-outcomes.scss'
})
export class ClassOutcomesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly provider = inject(DATA_PROVIDER);

  readonly classId = signal<string>('cls-401');
  readonly classItem = signal<MentorClass | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly saveSuccess = signal<boolean>(false);

  readonly programOutcomes = signal<string[]>(['PO1', 'PO2', 'PO3', 'PO4']);
  readonly availableBloomLevels = [
    'Remember (L1)',
    'Understand (L2)',
    'Apply (L3)',
    'Analyze (L4)',
    'Evaluate (L5)',
    'Create (L6)'
  ];

  readonly cos = signal<CourseOutcome[]>([]);
  readonly poMapping = signal<Record<string, number>>({});

  readonly totalWeightage = computed(() => {
    return this.cos().reduce((sum, item) => sum + (Number(item.weightagePercentage) || 0), 0);
  });

  readonly isWeightValid = computed(() => {
    return this.totalWeightage() === 100;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('classId') || 'cls-401';
      this.classId.set(id);
      this.loadData(id);
    });
  }

  loadData(id: string): void {
    this.isLoading.set(true);
    this.provider.getClassById(id).subscribe({
      next: (cls) => this.classItem.set(cls)
    });

    this.provider.getClassOutcomes(id).subscribe({
      next: (data) => {
        this.cos.set(data.cos || []);
        this.poMapping.set(data.poMapping || {});
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getPoCorrelation(coCode: string, poCode: string): number {
    return this.poMapping()[`${coCode}-${poCode}`] || 0;
  }

  cyclePoCorrelation(coCode: string, poCode: string): void {
    const key = `${coCode}-${poCode}`;
    const current = this.poMapping()[key] || 0;
    const next = (current + 1) % 4; // Cycles: 0 -> 1 -> 2 -> 3 -> 0
    this.poMapping.update(prev => ({ ...prev, [key]: next }));
  }

  addCourseOutcome(): void {
    const nextIndex = this.cos().length + 1;
    const newCo: CourseOutcome = {
      id: `co-${Date.now()}`,
      code: `CO${nextIndex}`,
      description: 'New Course Learning Objective...',
      bloomTarget: 'Apply (L3)',
      weightagePercentage: 10
    };
    this.cos.update(prev => [...prev, newCo]);
  }

  removeCourseOutcome(id: string): void {
    if (this.cos().length <= 1) return;
    this.cos.update(prev => prev.filter(c => c.id !== id));
  }

  saveOutcomes(): void {
    if (!this.isWeightValid()) return;

    this.isSaving.set(true);
    this.provider.saveClassOutcomes(this.classId(), {
      cos: this.cos(),
      poMapping: this.poMapping()
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
