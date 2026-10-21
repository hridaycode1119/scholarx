import {
  Component,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface StatItem {
  icon: string;
  number: string;
  label: string;
  sub: string;
}

export interface PillarItem {
  icon: string;
  title: string;
  desc: string;
  badge: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  institution: string;
  avatar: string;
  stat: string;
}

export interface CaseStudyStat {
  metric: string;
  label: string;
  detail: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  // Navigation & UI States
  readonly activeSection = signal<string>('hero');
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly selectedSuiteTab = signal<'STUDENT' | 'FACULTY' | 'ADMIN'>('STUDENT');
  readonly selectedObeTab = signal<'CO_ATTAINMENT' | 'BLOOM_TAXONOMY' | 'INTEGRITY_INDEX'>('CO_ATTAINMENT');

  // Modals & Toasts
  readonly showDemoModal = signal<boolean>(false);
  readonly showVideoModal = signal<boolean>(false);
  readonly demoSuccessToast = signal<string | null>(null);
  readonly isSubmittingDemo = signal<boolean>(false);
  readonly newsletterEmail = signal<string>('');
  readonly newsletterSuccess = signal<boolean>(false);

  // Live Simulator Interaction States
  readonly simulatedQuestionIndex = signal<number>(0);
  readonly isSimulatedListening = signal<boolean>(false);

  // Demo Form
  demoForm = {
    fullName: '',
    email: '',
    institution: 'Apex Autonomous University',
    role: 'Dean / Controller of Examinations',
    studentsCount: '2,500 - 10,000 Students',
    interestArea: 'Live Oral Viva & NBA/NAAC Accreditation'
  };

  // Top KPIs
  readonly stats: StatItem[] = [
    { icon: '/assets/homepage/stat-1.png', number: '52,400+', label: 'Students Evaluated', sub: 'Across 480+ examination cycles' },
    { icon: '/assets/homepage/stat-2.png', number: '180+', label: 'Faculty Examiners', sub: 'Active viva defense panelists' },
    { icon: '/assets/homepage/stat-3.png', number: '14+', label: 'Autonomous Campuses', sub: 'Tier-1 NBA & NAAC A++ accredited' },
    { icon: '/assets/homepage/stat-4.png', number: '99.4%', label: 'Evaluation Authenticity', sub: 'Zero unverified grade discrepancies' }
  ];

  // 4 Core Capability Pillars
  readonly pillars: PillarItem[] = [
    {
      icon: '/assets/homepage/strip-viva.png',
      title: 'AI Oral Viva Examination',
      desc: 'Adaptive conversational voice questioning with Bloom’s taxonomy scoring and follow-up probes.',
      badge: 'Core Engine'
    },
    {
      icon: '/assets/homepage/strip-proctor.png',
      title: 'Biometric Edge Proctoring',
      desc: 'Sub-200ms tab-switch interception, face continuity verification, and live candidate strike logs.',
      badge: 'Edge AI'
    },
    {
      icon: '/assets/homepage/strip-obe.png',
      title: 'OBE & Accreditation Analytics',
      desc: 'Automated CO-PO attainment matrices mapped directly to NBA Tier-1 and NAAC Criterion 2 audits.',
      badge: 'Accreditation'
    },
    {
      icon: '/assets/homepage/strip-campus.png',
      title: 'Multi-Campus Governance',
      desc: 'Centralized directory, student support ticketing hub, exam scheduling, and immutable audit logs.',
      badge: 'Enterprise'
    }
  ];

  // Simulated Viva Defense Prompts
  readonly sampleVivaQuestions = [
    {
      code: 'CS601-Q2',
      subject: 'Distributed Systems & Cloud Invariants',
      bloom: "Bloom's Level 5: Evaluate",
      question: 'Explain the concept of normalization in DBMS and how CAP theorem trade-offs force eventual consistency in distributed microservices.',
      followUp: 'If a node experiences network partitioning, how would you prevent split-brain without sacrificing write throughput?',
      co: 'CO3: Distributed Consensus & SMR',
      clarityScore: '94%',
      depthScore: '91%'
    },
    {
      code: 'AI402-Q4',
      subject: 'Neural Networks & Deep Learning',
      bloom: "Bloom's Level 6: Create",
      question: 'Why do Multi-Head Attention mechanisms scale quadratically with sequence length, and how does FlashAttention optimize GPU SRAM memory hierarchy?',
      followUp: 'How would you re-architect the causal mask to preserve linear computational complexity for 1M context windows?',
      co: 'CO4: Transformer Optimization',
      clarityScore: '96%',
      depthScore: '93%'
    },
    {
      code: 'EC305-Q1',
      subject: 'Embedded Systems & Microcontrollers',
      bloom: "Bloom's Level 4: Analyze",
      question: 'Analyze why register bank switching in the 8051 microcontroller is preferred over stack push/pop during high-frequency ISR execution.',
      followUp: 'What hardware race condition arises if nested interrupts overwrite the PSW register bank selector bits?',
      co: 'CO2: Low-Latency ISR Protocols',
      clarityScore: '92%',
      depthScore: '89%'
    }
  ];

  // Testimonials
  readonly testimonials: TestimonialItem[] = [
    {
      quote: "ScholarX eliminated the subjectivity of oral examinations. Our faculty panels now evaluate conceptual depth with verifiable audio transcripts and instant NBA CO-PO mapping.",
      author: "Dr. K. R. Soundararajan",
      role: "Dean of Academic Affairs & Accreditation Chair",
      institution: "Apex Autonomous Engineering University",
      avatar: "/assets/stakeholder-faculty.jpg",
      stat: "85% reduction in accreditation prep time"
    },
    {
      quote: "Students who previously memorized textbooks were challenged by ScholarX's adaptive AI follow-up probes. It cultivates genuine engineering articulation.",
      author: "Prof. Ananya Sen",
      role: "Controller of Examinations & HOD Computer Science",
      institution: "National Autonomous Institute of Tech",
      avatar: "/assets/stakeholder-admin.jpg",
      stat: "Zero unverified viva grading anomalies"
    },
    {
      quote: "Practicing on the ScholarX viva simulator gave me the confidence to defend my final year capstone architecture before external industry examiners.",
      author: "Rohit Krishnan",
      role: "B.Tech Final Year Scholar (Class of 2026)",
      institution: "State Autonomous Institute",
      avatar: "/assets/stakeholder-student.jpg",
      stat: "Viva readiness jumped from 68% to 94%"
    }
  ];

  // Case Studies & Institution Proof Points
  readonly caseStudyStats: CaseStudyStat[] = [
    { metric: '72%', label: 'Faster Grade Normalization', detail: 'Instant bell-curve moderation between parallel examiner panels' },
    { metric: '100%', label: 'Accreditation Parity', detail: 'One-click compliance exports for NBA Tier-1 and NAAC Criterion 2.6' },
    { metric: '0.4s', label: 'Adaptive Question Synthesis', detail: 'AI generated questions aligned with Bloom’s taxonomy in sub-second latency' },
    { metric: '99.98%', label: 'Enterprise Uptime SLA', detail: 'Resilient multi-tenant architecture with edge network fallback' }
  ];

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    }
  }

  handleScroll(): void {
    if (typeof window === 'undefined') return;
    const y = window.scrollY;
    if (y < 500) {
      this.activeSection.set('hero');
    } else if (y < 1200) {
      this.activeSection.set('viva');
    } else if (y < 2200) {
      this.activeSection.set('obe');
    } else if (y < 3200) {
      this.activeSection.set('ocr');
    } else if (y < 4200) {
      this.activeSection.set('roles');
    } else {
      this.activeSection.set('contact');
    }
  }

  scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    this.isMobileMenuOpen.set(false);
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  setSuiteTab(tab: 'STUDENT' | 'FACULTY' | 'ADMIN'): void {
    this.selectedSuiteTab.set(tab);
  }

  setObeTab(tab: 'CO_ATTAINMENT' | 'BLOOM_TAXONOMY' | 'INTEGRITY_INDEX'): void {
    this.selectedObeTab.set(tab);
  }

  selectSampleQuestion(idx: number): void {
    this.simulatedQuestionIndex.set(idx);
  }

  toggleSimulatedMic(): void {
    this.isSimulatedListening.update(v => !v);
  }

  openDemoModal(): void {
    this.showDemoModal.set(true);
  }

  closeDemoModal(): void {
    this.showDemoModal.set(false);
  }

  openVideoModal(): void {
    this.showVideoModal.set(true);
  }

  closeVideoModal(): void {
    this.showVideoModal.set(false);
  }

  submitDemoRequest(): void {
    if (!this.demoForm.fullName || !this.demoForm.email) return;
    this.isSubmittingDemo.set(true);
    setTimeout(() => {
      this.isSubmittingDemo.set(false);
      this.showDemoModal.set(false);
      this.demoSuccessToast.set(`Thank you, ${this.demoForm.fullName}! Our institutional liaison will schedule your live viva consultation within 2 hours.`);
      setTimeout(() => this.demoSuccessToast.set(null), 6000);
    }, 700);
  }

  subscribeNewsletter(): void {
    if (!this.newsletterEmail()) return;
    this.newsletterSuccess.set(true);
    setTimeout(() => {
      this.newsletterEmail.set('');
      this.newsletterSuccess.set(false);
    }, 4000);
  }
}
