import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { GeminiAiService } from '../../../../core/services/gemini-ai.service';
import { MentorClass, ClassAnalyticsSummary } from '../../../../core/models';

export type AccreditationBody = 'NBA' | 'NAAC' | 'ABET' | 'ISO';

export interface AccreditationReportCard {
  id: string;
  title: string;
  code: string;
  category: string;
  description: string;
  standardReference: string;
  icon: string;
  format: string;
  badgeColor: string;
  sampleItemsCount: number;
}

export interface GradeDistributionBin {
  range: string;
  count: number;
  percentage: number;
  color: string;
}

export interface BloomSpreadItem {
  level: string;
  label: string;
  plannedWeight: number;
  actualMastery: number;
}

@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-hub.html',
  styleUrl: './reports-hub.scss'
})
export class ReportsHubComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);
  private readonly geminiService = inject(GeminiAiService);

  readonly classes = signal<MentorClass[]>([]);
  readonly selectedClassId = signal<string>('cls-401');
  readonly selectedAccreditationBody = signal<AccreditationBody>('NBA');
  readonly isLoading = signal<boolean>(true);

  // Active Modals
  readonly isCertificateModalOpen = signal<boolean>(false);
  readonly isQrVerificationModalOpen = signal<boolean>(false);
  readonly isExecutiveSummaryModalOpen = signal<boolean>(false);
  readonly isBatchExportModalOpen = signal<boolean>(false);

  // Gemini AI Executive Summary State
  readonly isAiSynthesizing = signal<boolean>(false);
  readonly aiExecutiveSummary = signal<{
    complianceVerdict: string;
    executiveSummary: string;
    keyStrengths: string[];
    cqiActionNarrative: string;
    inspectorRemarks: string;
  } | null>(null);

  // Batch Export Selection
  readonly selectedBatchCourses = signal<string[]>(['cls-401', 'cls-402']);

  // PDF & Package Export Progress
  readonly activeDownloadingReportId = signal<string | null>(null);
  readonly downloadProgress = signal<number>(0);
  readonly downloadStatusText = signal<string>('Idle');
  readonly downloadStatus = signal<'IDLE' | 'PREPARING' | 'GENERATING' | 'DOWNLOADING' | 'COMPLETE' | 'ERROR'>('IDLE');

  // Cryptographic Signature Telemetry
  readonly cryptographicHash = 'SHA256:d8a57b8921e3f6046e7f849e782e38c71d2b861e604f387192a95c47814c40b2';
  readonly sealTimestamp = '2026-09-08T18:30:00.000Z';
  readonly digitalSigner = 'Prof. Aris Thorne (SX-M401), Lead Course Mentor & OBE Chair';
  readonly verificationUrl = 'https://trust.scholarx.edu/verify/cert-401-2026';

  // Grade Distribution Bins
  readonly gradeDistribution = signal<GradeDistributionBin[]>([
    { range: '< 50%', count: 2, percentage: 4.2, color: '#EF4444' },
    { range: '50-59%', count: 4, percentage: 8.3, color: '#F59E0B' },
    { range: '60-69%', count: 8, percentage: 16.7, color: '#3B82F6' },
    { range: '70-79%', count: 18, percentage: 37.5, color: '#10B981' },
    { range: '80-89%', count: 12, percentage: 25.0, color: '#0B4A39' },
    { range: '90-100%', count: 4, percentage: 8.3, color: '#21DB93' }
  ]);

  // Bloom Cognitive Spread
  readonly bloomSpread = signal<BloomSpreadItem[]>([
    { level: 'L1', label: 'Remember', plannedWeight: 15, actualMastery: 88 },
    { level: 'L2', label: 'Understand', plannedWeight: 20, actualMastery: 82 },
    { level: 'L3', label: 'Apply', plannedWeight: 25, actualMastery: 78 },
    { level: 'L4', label: 'Analyze', plannedWeight: 20, actualMastery: 74 },
    { level: 'L5', label: 'Evaluate', plannedWeight: 15, actualMastery: 69 },
    { level: 'L6', label: 'Create', plannedWeight: 5, actualMastery: 72 }
  ]);

  // Detailed Report Cards
  readonly availableReports: AccreditationReportCard[] = [
    {
      id: 'sar-dossier',
      title: 'NBA Tier-I/II SAR Criterion 3 Master Dossier',
      code: 'NBA-SAR-C3',
      category: 'Program Accreditation',
      description: 'Official inspection bundle including Table 3.1 articulation matrices, direct/indirect CIE distributions, and CQI Action Taken Reports (ATR).',
      standardReference: 'NBA Washington Accord Criterion 3.1-3.3',
      icon: '📑',
      format: 'PDF (Formal SAR Dossier)',
      badgeColor: 'bg-[#E6F4F0] text-[#0B4A39]',
      sampleItemsCount: 48
    },
    {
      id: 'co-certificate',
      title: 'Course Outcome Attainment Certificate',
      code: 'CERT-CO-OBE',
      category: 'Tamper-Proof Certificate',
      description: 'Cryptographically sealed certificate stamped with SHA-256 digital signature, certifying CO1-CO5 attainment levels and Level 3 compliance.',
      standardReference: 'ABET Outcome 1-7 / NBA Criterion 3.2',
      icon: '🔐',
      format: 'Signed PDF & Ledger QR',
      badgeColor: 'bg-[#ECFDF5] text-[#065F46]',
      sampleItemsCount: 5
    },
    {
      id: 'co-po-matrix',
      title: 'CO-PO Articulation & Correlation Matrix',
      code: 'MAT-CO-PO',
      category: 'Curriculum Articulation',
      description: 'Comprehensive correlation sheet mapping syllabus units to PO1-PO12 and PSO1-PSO2 with articulation weights (1: Slight, 2: Moderate, 3: Substantial).',
      standardReference: 'NAAC Metric 2.6.1 & NBA 3.1.2',
      icon: '🎯',
      format: 'PDF & Excel (.xlsx)',
      badgeColor: 'bg-[#FFFBEB] text-[#92400E]',
      sampleItemsCount: 60
    },
    {
      id: 'cie-diagnostics',
      title: 'CIE & Oral VIVA Diagnostic Breakdown',
      code: 'CIE-VIVA-DIAG',
      category: 'Formative Evaluation',
      description: 'Question-level cognitive analysis with Bloom levels, rubrics, audio-verified viva logs, and identified student deficit remediation clusters.',
      standardReference: 'NAAC Continuous Internal Evaluation (CIE)',
      icon: '📊',
      format: 'PDF Analytics Report',
      badgeColor: 'bg-[#F0FDF4] text-[#166534]',
      sampleItemsCount: 186
    },
    {
      id: 'student-marksheet',
      title: 'Student-by-Student OBE Attainment Ledger',
      code: 'STU-OBE-LEDGER',
      category: 'Granular Marksheet',
      description: 'Complete student roster scorebook comparing internal theory, viva oral probes, lab practicals, exit survey scores, and remedial attempts.',
      standardReference: 'Institutional Examination Board',
      icon: '👥',
      format: 'Excel (.xlsx) / CSV Sheet',
      badgeColor: 'bg-[#F8FAF9] text-[#0B4A39]',
      sampleItemsCount: 48
    },
    {
      id: 'proctoring-audit',
      title: 'Central Proctoring & Malpractice Audit Logbook',
      code: 'PROC-INTEG-AUDIT',
      category: 'Exam Security & Forensics',
      description: 'AI biometric anomaly telemetry, integrity index (59%), incident timestamps, examiner disciplinary interventions, and WebRTC recording logs.',
      standardReference: 'ISO/IEC 27001 Security Audit',
      icon: '🛡️',
      format: 'PDF Forensic Dossier',
      badgeColor: 'bg-[#FEF2F2] text-[#991B1B]',
      sampleItemsCount: 14
    }
  ];

  ngOnInit(): void {
    this.provider.getMentorClasses().subscribe({
      next: (data) => {
        this.classes.set(data);
        if (data.length > 0) {
          this.selectedClassId.set(data[0].id);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  readonly selectedClass = computed(() => {
    return this.classes().find(c => c.id === this.selectedClassId());
  });

  setAccreditationBody(body: AccreditationBody): void {
    this.selectedAccreditationBody.set(body);
  }

  // Live Gemini Executive Summary Synthesizer
  synthesizeExecutiveSummary(): void {
    this.isAiSynthesizing.set(true);
    this.isExecutiveSummaryModalOpen.set(true);

    const code = this.selectedClass()?.subjectCode || 'CS401';
    const name = this.selectedClass()?.name || 'Distributed Systems';

    const coList = [
      { code: 'CO1', description: 'Distributed Architectures & Consensus', score: 82.4, level: 3 },
      { code: 'CO2', description: 'RPC & Inter-Process Protocols', score: 70.0, level: 3 },
      { code: 'CO3', description: 'Consensus Models & Raft Replication', score: 76.6, level: 3 },
      { code: 'CO4', description: 'Byzantine Fault Tolerance & Failover', score: 48.0, level: 1 },
      { code: 'CO5', description: 'Distributed Storage & CAP Theorem', score: 62.0, level: 2 }
    ];

    this.geminiService.generateAccreditationExecutiveSummary(
      code,
      name,
      this.selectedAccreditationBody(),
      82.4,
      70.0,
      coList,
      4
    ).subscribe({
      next: (summary) => {
        this.aiExecutiveSummary.set(summary);
        this.isAiSynthesizing.set(false);
      },
      error: () => {
        this.isAiSynthesizing.set(false);
      }
    });
  }

  // Certificate Modal Handlers
  openCertificateModal(): void {
    this.isCertificateModalOpen.set(true);
  }

  closeCertificateModal(): void {
    this.isCertificateModalOpen.set(false);
  }

  openQrModal(): void {
    this.isQrVerificationModalOpen.set(true);
  }

  closeQrModal(): void {
    this.isQrVerificationModalOpen.set(false);
  }

  closeExecutiveSummaryModal(): void {
    this.isExecutiveSummaryModalOpen.set(false);
  }

  // Batch Export Modal Handlers
  openBatchExportModal(): void {
    this.isBatchExportModalOpen.set(true);
  }

  closeBatchExportModal(): void {
    this.isBatchExportModalOpen.set(false);
  }

  toggleBatchCourse(courseId: string): void {
    if (this.selectedBatchCourses().includes(courseId)) {
      if (this.selectedBatchCourses().length > 1) {
        this.selectedBatchCourses.update(list => list.filter(id => id !== courseId));
      }
    } else {
      this.selectedBatchCourses.update(list => [...list, courseId]);
    }
  }

  // Multi-File Package Downloader
  executeBatchExport(type: 'ZIP' | 'PDF_MASTER' | 'EXCEL'): void {
    this.closeBatchExportModal();
    this.activeDownloadingReportId.set('batch-package');
    this.downloadStatus.set('PREPARING');
    this.downloadProgress.set(15);
    this.downloadStatusText.set(`Assembling accreditation files for ${this.selectedBatchCourses().length} courses...`);

    setTimeout(() => {
      this.downloadStatus.set('GENERATING');
      this.downloadProgress.set(45);
      this.downloadStatusText.set('Generating CO-PO articulation matrices, SAR narratives & cryptographic proofs...');
    }, 450);

    setTimeout(() => {
      this.downloadStatus.set('DOWNLOADING');
      this.downloadProgress.set(80);
      this.downloadStatusText.set(`Compiling ${type === 'ZIP' ? '.ZIP archive' : type === 'PDF_MASTER' ? 'Master PDF Dossier' : 'Accreditation Excel Workbook'}...`);
    }, 900);

    this.provider.downloadClassPdfReport(this.selectedClassId()).subscribe({
      next: (blob) => {
        this.downloadProgress.set(100);
        this.downloadStatusText.set('Export package compiled successfully! ✓');
        this.downloadStatus.set('COMPLETE');

        const ext = type === 'ZIP' ? 'zip' : type === 'EXCEL' ? 'xlsx' : 'pdf';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ScholarX_Accreditation_Package_${this.selectedAccreditationBody()}_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setTimeout(() => {
          this.activeDownloadingReportId.set(null);
          this.downloadStatus.set('IDLE');
          this.downloadProgress.set(0);
        }, 3000);
      },
      error: () => {
        this.downloadStatus.set('ERROR');
        this.downloadStatusText.set('Export failed. Please check network connectivity.');
      }
    });
  }

  // Individual Report Downloader
  downloadReport(report: AccreditationReportCard): void {
    this.activeDownloadingReportId.set(report.id);
    this.downloadStatus.set('PREPARING');
    this.downloadProgress.set(10);
    this.downloadStatusText.set(`Preparing ${report.title}...`);

    const int1 = setTimeout(() => {
      this.downloadStatus.set('GENERATING');
      this.downloadProgress.set(50);
      this.downloadStatusText.set('Compiling assessment data, Bloom taxonomy rubrics and SHA-256 digital stamp...');
    }, 400);

    const int2 = setTimeout(() => {
      this.downloadStatus.set('DOWNLOADING');
      this.downloadProgress.set(85);
      this.downloadStatusText.set('Synthesizing PDF download stream...');
    }, 800);

    this.provider.downloadClassPdfReport(this.selectedClassId()).subscribe({
      next: (blob) => {
        clearTimeout(int1);
        clearTimeout(int2);
        this.downloadProgress.set(100);
        this.downloadStatusText.set('Report downloaded successfully! ✓');
        this.downloadStatus.set('COMPLETE');

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const code = this.selectedClass()?.subjectCode || 'CS401';
        a.download = `ScholarX_${code}_${report.code}_${this.selectedAccreditationBody()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setTimeout(() => {
          this.activeDownloadingReportId.set(null);
          this.downloadStatus.set('IDLE');
          this.downloadProgress.set(0);
        }, 3000);
      },
      error: () => {
        clearTimeout(int1);
        clearTimeout(int2);
        this.downloadStatus.set('ERROR');
        this.downloadStatusText.set('Error downloading report.');
      }
    });
  }
}

