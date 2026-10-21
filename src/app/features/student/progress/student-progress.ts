import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../../core/services/student.service';

@Component({
  selector: 'app-student-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-progress.html',
  styleUrl: './student-progress.scss'
})
export class StudentProgressComponent {
  readonly studentService = inject(StudentService);
  readonly profile = this.studentService.profile;

  // Selected course filter for progress
  readonly selectedSubject = signal<string>('CS401');

  // Bloom's Cognitive Domains Mastery Radar Data (6 Axes: Remembering, Understanding, Applying, Analyzing, Evaluating, Creating)
  readonly bloomLevels = [
    { label: 'Remembering (L1)', score: 92, target: 70, angle: 0 },
    { label: 'Understanding (L2)', score: 88, target: 70, angle: 60 },
    { label: 'Applying (L3)', score: 82, target: 70, angle: 120 },
    { label: 'Analyzing (L4)', score: 78, target: 70, angle: 180 },
    { label: 'Evaluating (L5)', score: 74, target: 70, angle: 240 },
    { label: 'Creating (L6)', score: 68, target: 70, angle: 300 }
  ];

  // Course Outcome Attainment Progress Bars (CO1 to CO6)
  readonly courseOutcomes = [
    { code: 'CO1', name: 'Message Passing & RPC Fundamentals', score: 88.5, benchmark: 70, status: 'PROFICIENT' },
    { code: 'CO2', name: 'Logical Timestamps & Vector Clocks', score: 84.0, benchmark: 70, status: 'PROFICIENT' },
    { code: 'CO3', name: 'Raft & Paxos Consensus Protocols', score: 79.2, benchmark: 70, status: 'COMPETENT' },
    { code: 'CO4', name: 'Byzantine Fault Tolerance & Partition Safety', score: 56.4, benchmark: 70, status: 'REMEDIATION' },
    { code: 'CO5', name: 'Distributed Storage & Consistency Models', score: 82.0, benchmark: 70, status: 'PROFICIENT' },
    { code: 'CO6', name: 'Cloud Native Microservices Orchestration', score: 75.0, benchmark: 70, status: 'COMPETENT' }
  ];

  // Historical Assessment Ledger Items
  readonly assessmentHistory = [
    {
      id: 'h-1',
      title: 'Midterm Spoken Oral VIVA: Raft Consensus',
      course: 'CS401 Distributed Systems',
      date: '2026-03-08',
      type: 'ORAL_VIVA',
      score: '36.5 / 40 (91.2%)',
      integrity: '100% Verified',
      status: 'VERIFIED',
      coTarget: 'CO3'
    },
    {
      id: 'h-2',
      title: 'Formative Assessment 1: RPC Mechanisms',
      course: 'CS401 Distributed Systems',
      date: '2026-02-28',
      type: 'THEORY_CIE',
      score: '23.5 / 25 (94.0%)',
      integrity: '100% Verified',
      status: 'VERIFIED',
      coTarget: 'CO1'
    },
    {
      id: 'h-3',
      title: 'Lab CIE: 8051 Microcontroller Serial Baud Rate',
      course: 'CSE-354 Embedded Lab',
      date: '2026-02-15',
      type: 'LAB_PRACTICAL',
      score: '26.0 / 30 (86.7%)',
      integrity: '100% Verified',
      status: 'VERIFIED',
      coTarget: 'CO2'
    },
    {
      id: 'h-4',
      title: 'Diagnostic Oral Drill: Quorum Partitioning',
      course: 'CS401 Distributed Systems',
      date: '2026-02-02',
      type: 'PRACTICE_DRILL',
      score: '8.0 / 10 (80.0%)',
      integrity: 'Self-Practice',
      status: 'COMPLETED',
      coTarget: 'CO4'
    }
  ];

  // SVG Radar Polygon Calculations
  readonly radarCenter = 150;
  readonly radarRadius = 110;

  getPointCoordinates(angleDegrees: number, valuePercent: number): { x: number; y: number } {
    const angleRad = (angleDegrees - 90) * (Math.PI / 180);
    const r = (valuePercent / 100) * this.radarRadius;
    const x = this.radarCenter + r * Math.cos(angleRad);
    const y = this.radarCenter + r * Math.sin(angleRad);
    return { x, y };
  }

  readonly actualPolygonPoints = computed(() => {
    return this.bloomLevels
      .map(b => {
        const pt = this.getPointCoordinates(b.angle, b.score);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');
  });

  readonly targetPolygonPoints = computed(() => {
    return this.bloomLevels
      .map(b => {
        const pt = this.getPointCoordinates(b.angle, b.target);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');
  });

  downloadReportPdf(): void {
    alert('📥 Downloading Official OBE Assessment Performance Report (.PDF) for Sahil Kumar (2023308724)...');
  }
}
