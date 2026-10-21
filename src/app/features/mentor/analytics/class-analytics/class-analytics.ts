import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { GeminiAiService } from '../../../../core/services/gemini-ai.service';
import {
  MentorClass,
  ClassAnalyticsSummary,
  CoAttainmentMetric,
  PoAttainmentDetail,
  BloomDomainAttainment,
  StudentAttainmentRecord,
  RemediationActionPlan
} from '../../../../core/models';

export interface RadarVertexPoint {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  axisCode: string;
  axisTitle: string;
  actualScore: number;
  targetBenchmark: number;
  departmentBaseline: number;
  level: number;
  status: 'EXCEEDED' | 'MET' | 'BELOW_TARGET';
  details: string;
}

@Component({
  selector: 'app-class-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './class-analytics.html',
  styleUrl: './class-analytics.scss'
})
export class ClassAnalyticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly provider = inject(DATA_PROVIDER);
  private readonly geminiAiService = inject(GeminiAiService);

  readonly classId = signal<string>('cls-401');
  readonly classItem = signal<MentorClass | null>(null);
  readonly summary = signal<ClassAnalyticsSummary | null>(null);
  readonly isLoading = signal<boolean>(true);

  // Direct vs. Indirect Attainment Slider (NBA Criterion 3 80:20 standard)
  readonly directWeight = signal<number>(80);
  readonly indirectWeight = computed(() => 100 - this.directWeight());
  readonly targetBenchmark = signal<number>(70);

  // Radar View Mode: 'PO' (Program Outcomes) or 'BLOOM' (Bloom's Taxonomy)
  readonly radarMode = signal<'PO' | 'BLOOM'>('PO');
  readonly hoveredRadarVertex = signal<RadarVertexPoint | null>(null);

  // Student Roster Filter & Search
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'ALL' | 'AT_RISK' | 'BENCHMARK_MET' | 'HIGH_PERFORMER'>('ALL');
  readonly studentRoster = signal<StudentAttainmentRecord[]>([]);

  // Gemini AI Continuous Quality Improvement (CQI) Remediation Plan
  readonly isGeneratingCqi = signal<boolean>(false);
  readonly selectedRemediationPlan = signal<RemediationActionPlan | null>(null);
  readonly isCqiModalOpen = signal<boolean>(false);
  readonly assignedRemedialCount = signal<number>(0);

  // NBA / NAAC SAR Criterion 3 Export Modal
  readonly isSarModalOpen = signal<boolean>(false);

  // PDF Export States
  readonly pdfStatus = signal<'IDLE' | 'GENERATING' | 'DOWNLOADING' | 'COMPLETE' | 'ERROR'>('IDLE');
  readonly pdfProgress = signal<number>(0);

  // Toast Notification
  readonly toastMessage = signal<string | null>(null);

  // Dynamic Calculated COs based on Direct/Indirect Weights
  readonly calculatedCoAttainments = computed<CoAttainmentMetric[]>(() => {
    const rawCos = this.summary()?.coAttainments || [];
    const dWeight = this.directWeight() / 100;
    const iWeight = this.indirectWeight() / 100;
    const benchmark = this.targetBenchmark();

    return rawCos.map(co => {
      const direct = co.directScore ?? co.actualAttainment;
      const indirect = co.indirectScore ?? (co.actualAttainment * 0.95);
      const calculated = parseFloat((direct * dWeight + indirect * iWeight).toFixed(1));

      let level: 1 | 2 | 3 = 1;
      let status: 'EXCEEDED' | 'MET' | 'BELOW_TARGET' = 'BELOW_TARGET';

      if (calculated >= benchmark + 5) {
        level = 3;
        status = 'EXCEEDED';
      } else if (calculated >= benchmark - 3) {
        level = 2;
        status = 'MET';
      } else {
        level = 1;
        status = 'BELOW_TARGET';
      }

      return {
        ...co,
        actualAttainment: calculated,
        attainmentLevel: level,
        status
      };
    });
  });

  // Dynamic Calculated POs based on Direct/Indirect Weights
  readonly calculatedPoAttainments = computed<PoAttainmentDetail[]>(() => {
    const rawPos = this.summary()?.poAttainments || [];
    const dWeight = this.directWeight() / 100;
    const iWeight = this.indirectWeight() / 100;
    const benchmark = this.targetBenchmark();

    return rawPos.map(po => {
      const calculated = parseFloat((po.directScore * dWeight + po.indirectScore * iWeight).toFixed(1));
      let level: 1 | 2 | 3 = 1;
      if (calculated >= benchmark + 5) level = 3;
      else if (calculated >= benchmark - 3) level = 2;
      else level = 1;

      return {
        ...po,
        calculatedAttainment: calculated,
        attainmentLevel: level
      };
    });
  });

  // Dynamic Overall Class Attainment
  readonly overallCohortScore = computed<number>(() => {
    const cos = this.calculatedCoAttainments();
    if (!cos.length) return this.summary()?.averageScore || 74.2;
    const sum = cos.reduce((acc, c) => acc + c.actualAttainment, 0);
    return parseFloat((sum / cos.length).toFixed(1));
  });

  // Radar Chart Trigonometry & Visual Calculation
  readonly radarCenter = 200;
  readonly radarRadius = 135;
  readonly concentricLevels = [20, 40, 60, 80, 100];

  readonly radarAxesCount = computed(() => {
    return this.radarMode() === 'PO'
      ? (this.calculatedPoAttainments().length || 6)
      : (this.summary()?.bloomAttainments?.length || 6);
  });

  readonly radarSpokeAngles = computed(() => {
    const count = this.radarAxesCount();
    const angles: number[] = [];
    for (let i = 0; i < count; i++) {
      angles.push((2 * Math.PI * i) / count - Math.PI / 2);
    }
    return angles;
  });

  // Concentric SVG polygon points for web grid
  readonly concentricPolygons = computed(() => {
    const angles = this.radarSpokeAngles();
    const cx = this.radarCenter;
    const cy = this.radarCenter;
    const r = this.radarRadius;

    return this.concentricLevels.map(pct => {
      const levelRadius = (r * pct) / 100;
      const points = angles.map(angle => {
        const x = cx + levelRadius * Math.cos(angle);
        const y = cy + levelRadius * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return { percentage: pct, points };
    });
  });

  // Spoke lines from center to outer edge
  readonly radarSpokes = computed(() => {
    const angles = this.radarSpokeAngles();
    const cx = this.radarCenter;
    const cy = this.radarCenter;
    const r = this.radarRadius;

    return angles.map((angle, idx) => ({
      x1: cx,
      y1: cy,
      x2: (cx + r * Math.cos(angle)).toFixed(1),
      y2: (cy + r * Math.sin(angle)).toFixed(1),
      index: idx
    }));
  });

  // Radar Vertex Points & Polygons
  readonly radarVertices = computed<RadarVertexPoint[]>(() => {
    const angles = this.radarSpokeAngles();
    const cx = this.radarCenter;
    const cy = this.radarCenter;
    const r = this.radarRadius;
    const mode = this.radarMode();

    if (mode === 'PO') {
      const pos = this.calculatedPoAttainments();
      return pos.map((po, idx) => {
        const angle = angles[idx] || 0;
        const actualRadius = (r * Math.min(100, Math.max(0, po.calculatedAttainment))) / 100;
        const x = cx + actualRadius * Math.cos(angle);
        const y = cy + actualRadius * Math.sin(angle);

        const labelRadius = r + 24;
        const labelX = cx + labelRadius * Math.cos(angle);
        const labelY = cy + labelRadius * Math.sin(angle);

        const status: 'EXCEEDED' | 'MET' | 'BELOW_TARGET' =
          po.calculatedAttainment >= po.targetBenchmark + 5 ? 'EXCEEDED' :
          po.calculatedAttainment >= po.targetBenchmark - 3 ? 'MET' : 'BELOW_TARGET';

        return {
          x,
          y,
          labelX,
          labelY,
          axisCode: po.poCode,
          axisTitle: po.title,
          actualScore: po.calculatedAttainment,
          targetBenchmark: po.targetBenchmark,
          departmentBaseline: po.departmentBaseline,
          level: po.attainmentLevel,
          status,
          details: po.description
        };
      });
    } else {
      const blooms = this.summary()?.bloomAttainments || [];
      return blooms.map((b, idx) => {
        const angle = angles[idx] || 0;
        const actualRadius = (r * Math.min(100, Math.max(0, b.actualAttainment))) / 100;
        const x = cx + actualRadius * Math.cos(angle);
        const y = cy + actualRadius * Math.sin(angle);

        const labelRadius = r + 24;
        const labelX = cx + labelRadius * Math.cos(angle);
        const labelY = cy + labelRadius * Math.sin(angle);

        const status: 'EXCEEDED' | 'MET' | 'BELOW_TARGET' =
          b.actualAttainment >= b.targetBenchmark + 5 ? 'EXCEEDED' :
          b.actualAttainment >= b.targetBenchmark - 3 ? 'MET' : 'BELOW_TARGET';

        return {
          x,
          y,
          labelX,
          labelY,
          axisCode: b.level,
          axisTitle: b.label,
          actualScore: b.actualAttainment,
          targetBenchmark: b.targetBenchmark,
          departmentBaseline: b.departmentBaseline,
          level: b.actualAttainment >= 70 ? 3 : b.actualAttainment >= 60 ? 2 : 1,
          status,
          details: `${b.questionCount} viva/exam questions evaluated across syllabus.`
        };
      });
    }
  });

  // SVG Polygon Points Strings
  readonly actualPolygonPoints = computed(() => {
    return this.radarVertices().map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');
  });

  readonly benchmarkPolygonPoints = computed(() => {
    const angles = this.radarSpokeAngles();
    const cx = this.radarCenter;
    const cy = this.radarCenter;
    const r = this.radarRadius;
    const bench = this.targetBenchmark();
    const benchRadius = (r * bench) / 100;

    return angles.map(angle => {
      const x = cx + benchRadius * Math.cos(angle);
      const y = cy + benchRadius * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  });

  readonly baselinePolygonPoints = computed(() => {
    const angles = this.radarSpokeAngles();
    const cx = this.radarCenter;
    const cy = this.radarCenter;
    const r = this.radarRadius;
    const vertices = this.radarVertices();

    return vertices.map((v, idx) => {
      const angle = angles[idx] || 0;
      const baseRadius = (r * v.departmentBaseline) / 100;
      const x = cx + baseRadius * Math.cos(angle);
      const y = cy + baseRadius * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  });

  // Filtered Student Roster
  readonly filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();
    let list = this.studentRoster();

    if (filter !== 'ALL') {
      list = list.filter(s => s.status === filter);
    }

    if (q) {
      list = list.filter(s =>
        s.studentName.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q)
      );
    }

    return list;
  });

  // Quick Metrics
  readonly atRiskCount = computed(() => {
    return this.studentRoster().filter(s => s.status === 'AT_RISK').length;
  });

  readonly highPerformerCount = computed(() => {
    return this.studentRoster().filter(s => s.status === 'HIGH_PERFORMER').length;
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

    this.provider.getClassAnalytics(id).subscribe({
      next: (data) => {
        this.summary.set(data);
        if (data.directIndirectConfig) {
          this.directWeight.set(data.directIndirectConfig.directWeightPercentage);
          this.targetBenchmark.set(data.directIndirectConfig.benchmarkThreshold);
        }
        if (data.studentRoster) {
          this.studentRoster.set(data.studentRoster);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  setRadarMode(mode: 'PO' | 'BLOOM'): void {
    this.radarMode.set(mode);
    this.hoveredRadarVertex.set(null);
  }

  hoverVertex(vertex: RadarVertexPoint | null): void {
    this.hoveredRadarVertex.set(vertex);
  }

  // Trigger Gemini AI CQI Remediation Plan
  openCqiRemediationModal(hotspot: { topic: string; coCode: string; affectedStudentsCount: number }): void {
    this.isCqiModalOpen.set(true);
    this.isGeneratingCqi.set(true);
    this.selectedRemediationPlan.set(null);

    const co = this.calculatedCoAttainments().find(c => c.coCode === hotspot.coCode);
    const coDesc = co?.description || 'Fault Tolerance & Distributed Replication';
    const currentScore = co?.actualAttainment || 48.0;

    this.geminiAiService.generateCqiRemediationPlan(
      this.classItem()?.subjectCode || 'CS401',
      this.classItem()?.name || 'Distributed Systems',
      hotspot.coCode,
      coDesc,
      hotspot.topic,
      currentScore,
      this.targetBenchmark(),
      hotspot.affectedStudentsCount
    ).subscribe({
      next: (plan) => {
        this.selectedRemediationPlan.set(plan);
        this.isGeneratingCqi.set(false);
      },
      error: (err) => {
        console.error('Error generating CQI Plan:', err);
        this.isGeneratingCqi.set(false);
      }
    });
  }

  closeCqiModal(): void {
    this.isCqiModalOpen.set(false);
    this.selectedRemediationPlan.set(null);
  }

  dispatchRemediationActionPlan(): void {
    const plan = this.selectedRemediationPlan();
    if (!plan) return;

    // Mark at-risk students as assigned
    this.studentRoster.update(list =>
      list.map(s => {
        if (s.status === 'AT_RISK') {
          return { ...s, remedialAssigned: true, remedialVivaId: `viv-rem-${Date.now()}` };
        }
        return s;
      })
    );

    this.assignedRemedialCount.set(plan.affectedStudentsCount);
    this.showToast(`✨ Remedial Action Plan dispatched to ${plan.affectedStudentsCount} students for ${plan.coCode}!`);
    this.closeCqiModal();
  }

  assignRemedialViva(student: StudentAttainmentRecord): void {
    this.studentRoster.update(list =>
      list.map(s => {
        if (s.studentId === student.studentId) {
          return { ...s, remedialAssigned: true, remedialVivaId: `viv-rem-${Date.now()}` };
        }
        return s;
      })
    );
    this.showToast(`🎯 Formative Remedial Oral VIVA scheduled for ${student.studentName} (${student.rollNumber})`);
  }

  triggerRemediationDrill(hotspot: { topic: string; coCode: string }): void {
    this.router.navigate(['/mentor/assessments/generate'], {
      queryParams: {
        classId: this.classId(),
        coTarget: hotspot.coCode,
        topic: `Remedial Scaffolding Drill: ${hotspot.topic} - NBA CQI targeted intervention.`
      }
    });
  }

  openSarModal(): void {
    this.isSarModalOpen.set(true);
  }

  closeSarModal(): void {
    this.isSarModalOpen.set(false);
  }

  exportSarCsv(): void {
    const pos = this.calculatedPoAttainments();
    let csv = 'PO Code,Title,Direct Score (%),Indirect Score (%),Calculated Attainment (%),Department Baseline (%),Attainment Level,Accreditation Status\n';

    pos.forEach(p => {
      const status = p.calculatedAttainment >= p.targetBenchmark ? 'MET' : 'GAP_IDENTIFIED';
      csv += `"${p.poCode}","${p.title}",${p.directScore},${p.indirectScore},${p.calculatedAttainment},${p.departmentBaseline},Level ${p.attainmentLevel},${status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScholarX_${this.classItem()?.subjectCode || 'CS401'}_SAR_Criterion3_Attainment.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.showToast('📥 NBA SAR Criterion 3 Attainment Sheet exported successfully.');
  }

  exportPdfDossier(): void {
    this.pdfStatus.set('GENERATING');
    this.pdfProgress.set(15);

    const int1 = setTimeout(() => this.pdfProgress.set(45), 300);
    const int2 = setTimeout(() => this.pdfProgress.set(80), 600);

    this.provider.downloadClassPdfReport(this.classId()).subscribe({
      next: (blob) => {
        clearTimeout(int1);
        clearTimeout(int2);
        this.pdfProgress.set(100);
        this.pdfStatus.set('DOWNLOADING');

        // Create browser download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ScholarX_${this.classItem()?.subjectCode || 'CS401'}_Accreditation_Dossier.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setTimeout(() => this.pdfStatus.set('COMPLETE'), 500);
        setTimeout(() => this.pdfStatus.set('IDLE'), 3500);
      },
      error: () => {
        clearTimeout(int1);
        clearTimeout(int2);
        this.pdfStatus.set('ERROR');
      }
    });
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 4000);
  }
}
