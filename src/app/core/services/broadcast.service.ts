import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { BroadcastItem, GlobalNoticeBar, AiEngineConfig, AiEngineLog, TargetAudience, AdRegistrationRecord } from '../models';

@Injectable({
  providedIn: 'root'
})
export class BroadcastService {

  // 1. GLOBAL DASHBOARD NOTICE BAR
  readonly globalNotice = signal<GlobalNoticeBar>({
    id: 'notif-global-1',
    message: '📢 University Academic Notice: Midterm Oral Evaluation viva schedule is live across all campuses. All mentors are advised to verify proctoring video links.',
    type: 'INFO',
    targetAudience: 'ALL',
    active: true,
    updatedAt: 'Just now'
  });

  // 2. BROADCAST ADVERTISEMENTS & PICTURE BANNERS WITH MENTOR ROUTING
  readonly broadcastItems = signal<BroadcastItem[]>([
    {
      id: 'ad-1',
      title: 'Google Cloud & IEEE National AI Hackathon 2026',
      tagline: 'Annual Student Innovation Challenge • \$25,000 in Research Grants',
      description: 'Registration is officially open for undergraduate and graduate engineering teams. Mentors can nominate up to 3 candidate teams per department. Fast-track evaluations and industry internships for winning finalists.',
      fullDetails: `## Official Hackathon Statement & Guidelines
- **Eligibility:** 2nd to 4th-year engineering and computing students.
- **Team Size:** 2 to 4 students per squad.
- **Tracks:** Generative AI for Education, Autonomous Agentic Systems, Outcome-Based Evaluation Automation.
- **Sponsor & Coordinator:** Hosted by Apex Institute of Technology & Google Cloud.
- **Mentor Routing:** All registered students will have their profile and submission sent directly to the assigned faculty mentor's dashboard for verification and letter of recommendation.`,
      imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      targetAudience: 'ALL',
      category: 'BANNER_AD',
      active: true,
      ctaText: 'Register Team Now',
      ctaLink: '#hackathon-2026',
      createdAt: '2026-03-01',
      sponsorCollege: 'Apex Institute of Technology',
      assignedMentorId: 'SX-M401',
      assignedMentorName: 'Prof. Aris Thorne',
      requiresRegistration: true,
      registrationCount: 14
    },
    {
      id: 'ad-2',
      title: 'Faculty Summit: AI & Outcome-Based Accreditation',
      tagline: 'NBA Criteria 3 & 4 Automated Compliance Workshop',
      description: 'Special 2-hour technical seminar on automating Course Outcome (CO) attainment reporting with ScholarX AI test rubrics. Earn official accreditation certification.',
      fullDetails: `## Faculty Summit Scope & Outcomes
- **Target Audience:** All CSE, ECE, and AI faculty members.
- **Accreditation Focus:** Mapping viva rubrics into NBA Tier-1 CO-PO attainment matrices.
- **Certification:** Digital certificate issued by the National Board of Accreditation.
- **Lead Coordinator:** Dr. Aisha Khan, Dean of Academic QA.`,
      imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
      targetAudience: 'MENTORS_ONLY',
      category: 'CAMPUS_EVENT',
      active: true,
      ctaText: 'Reserve Faculty Seat',
      ctaLink: '#faculty-summit',
      createdAt: '2026-03-02',
      sponsorCollege: 'Horizon Engineering College',
      assignedMentorId: 'SX-M402',
      assignedMentorName: 'Dr. Aisha Khan',
      requiresRegistration: true,
      registrationCount: 8
    },
    {
      id: 'ad-3',
      title: 'Oral VIVA Student Diagnostic Simulation Hub',
      tagline: 'Interactive Practice with AI Proctor & Audio Waveform Check',
      description: 'Students can test their camera, microphone, and take mock oral question drills before the live midterm examination starts to avoid technical penalties.',
      fullDetails: `## Diagnostic VIVA Practice Instructions
- **Objective:** Verify candidate WebRTC audio latency and camera permissions before actual assessment.
- **Simulation Time:** 10 minutes per mock oral questionnaire.
- **Mentor Notification:** Completion logs and candidate device readiness scores are sent directly to the respective class mentor.`,
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
      targetAudience: 'STUDENTS_ONLY',
      category: 'BANNER_AD',
      active: true,
      ctaText: 'Launch Practice Simulator',
      ctaLink: '#student-mock',
      createdAt: '2026-03-02',
      sponsorCollege: 'Apex Institute of Technology',
      assignedMentorId: 'SX-M401',
      assignedMentorName: 'Prof. Aris Thorne',
      requiresRegistration: true,
      registrationCount: 22
    }
  ]);

  // 3. STUDENT REGISTRATIONS RECORD REGISTRY (Routed directly to Mentors)
  readonly registrations = signal<AdRegistrationRecord[]>([
    {
      id: 'reg-1',
      adId: 'ad-1',
      adTitle: 'Google Cloud & IEEE National AI Hackathon 2026',
      studentName: 'Rahul Sharma',
      studentEmail: 'rahul.s@apex.edu',
      rollNumber: '20230121',
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Science & Engineering',
      yearSemester: 'Year 3 / Sem 6',
      phone: '+91 98765 43210',
      statementOrRemarks: 'Project proposal on distributed consensus algorithm visualization for educational classrooms.',
      mentorId: 'SX-M401',
      mentorName: 'Prof. Aris Thorne',
      submittedAt: 'Today at 10:14 AM',
      status: 'ACCEPTED'
    },
    {
      id: 'reg-2',
      adId: 'ad-1',
      adTitle: 'Google Cloud & IEEE National AI Hackathon 2026',
      studentName: 'Ananya Sen',
      studentEmail: 'ananya.s@apex.edu',
      rollNumber: '20230145',
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Science & AI',
      yearSemester: 'Year 3 / Sem 6',
      phone: '+91 98111 22334',
      statementOrRemarks: 'Autonomous agentic multi-model oral viva evaluation framework.',
      mentorId: 'SX-M401',
      mentorName: 'Prof. Aris Thorne',
      submittedAt: 'Today at 11:30 AM',
      status: 'PENDING'
    },
    {
      id: 'reg-3',
      adId: 'ad-1',
      adTitle: 'Google Cloud & IEEE National AI Hackathon 2026',
      studentName: 'Vikram Malhotra',
      studentEmail: 'vikram.m@horizon.edu',
      rollNumber: '20230188',
      collegeName: 'Horizon Engineering College',
      department: 'Computer Science',
      yearSemester: 'Year 2 / Sem 4',
      phone: '+91 98222 33445',
      statementOrRemarks: 'Real-time eye-tracking and pose orientation proctoring plug-in.',
      mentorId: 'SX-M401',
      mentorName: 'Prof. Aris Thorne',
      submittedAt: 'Yesterday at 04:15 PM',
      status: 'PENDING'
    },
    {
      id: 'reg-4',
      adId: 'ad-3',
      adTitle: 'Oral VIVA Student Diagnostic Simulation Hub',
      studentName: 'Priya Patel',
      studentEmail: 'priya.p@apex.edu',
      rollNumber: '20230192',
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Networks',
      yearSemester: 'Year 2 / Sem 3',
      phone: '+91 98333 44556',
      statementOrRemarks: 'Diagnostic verification request for home broadband setup.',
      mentorId: 'SX-M401',
      mentorName: 'Prof. Aris Thorne',
      submittedAt: 'Today at 08:50 AM',
      status: 'ACCEPTED'
    }
  ]);

  // 4. SPOTLIGHT POPUP AD STATE ON DASHBOARD OPEN
  readonly activePopupAd = signal<BroadcastItem | null>(null);

  // 5. DETAIL MODAL & REGISTRATION MODAL STATES
  readonly activeDetailAd = signal<BroadcastItem | null>(null);
  readonly activeRegisterAd = signal<BroadcastItem | null>(null);

  // 6. AI ENGINE CONFIGURATION & TELEMETRY
  readonly aiEngineConfig = signal<AiEngineConfig>({
    activeModel: 'Llama-3.3-70B-Instruct-vLLM (FP8 TensorRT-LLM)',
    modelFamily: 'Meta Llama 3',
    temperature: 0.35,
    maxTokens: 2048,
    contextWindow: 16384,
    topP: 0.90,
    tokensPerSecond: 88.4,
    gpuVramUsagePercent: 72,
    kvCacheHitRatePercent: 93.6,
    status: 'ONLINE',
    lastUpdated: 'Today at 18:25 UTC'
  });

  // 7. LIVE STREAMING AI INFERENCE & ENGINE LOGS
  readonly aiLogs = signal<AiEngineLog[]>([
    {
      id: 'log-1',
      timestamp: '18:28:44.102',
      level: 'INFERENCE',
      component: 'vLLM-Engine',
      message: 'Generated 4 Oral VIVA rubrics for CS401 (Paxos consensus) in 284ms [86.2 tps]',
      durationMs: 284
    },
    {
      id: 'log-2',
      timestamp: '18:27:12.890',
      level: 'OPTIMIZATION',
      component: 'KV-Cache',
      message: 'KV PagedAttention cache hit rate maintained at 93.6%. 14 candidate viva sessions concurrent.',
      durationMs: 42
    },
    {
      id: 'log-3',
      timestamp: '18:25:01.004',
      level: 'INFO',
      component: 'Model-Supervisor',
      message: 'Hot-swap checkpoint verified: Llama-3.3-70B-Instruct-vLLM active on 2x NVIDIA A100-80GB.',
      durationMs: 650
    }
  ]);

  constructor() {
    const initialAd = this.broadcastItems().find(b => b.active) || null;
    if (initialAd) {
      this.activePopupAd.set(initialAd);
    }
  }

  // Filtered broadcasts for mentors
  readonly mentorVisibleBroadcasts = computed(() =>
    this.broadcastItems().filter(b => b.active && (b.targetAudience === 'ALL' || b.targetAudience === 'MENTORS_ONLY'))
  );

  // Filtered broadcasts for students
  readonly studentVisibleBroadcasts = computed(() =>
    this.broadcastItems().filter(b => b.active && (b.targetAudience === 'ALL' || b.targetAudience === 'STUDENTS_ONLY'))
  );

  // Registrations filtered for a specific mentor (e.g. Prof. Aris Thorne SX-M401)
  getRegistrationsForMentor(mentorId: string): AdRegistrationRecord[] {
    return this.registrations().filter(r => r.mentorId === mentorId);
  }

  // Submit Student Registration Form (Routes directly to Mentor)
  submitStudentRegistration(dto: {
    adId: string;
    adTitle: string;
    studentName: string;
    studentEmail: string;
    rollNumber: string;
    collegeName: string;
    department: string;
    yearSemester: string;
    phone?: string;
    statementOrRemarks?: string;
    mentorId: string;
    mentorName: string;
  }): AdRegistrationRecord {
    const record: AdRegistrationRecord = {
      ...dto,
      id: `reg-${Date.now()}`,
      submittedAt: 'Just now',
      status: 'PENDING'
    };

    this.registrations.update(prev => [record, ...prev]);

    // Increment ad registration count
    this.broadcastItems.update(items =>
      items.map(item => item.id === dto.adId ? { ...item, registrationCount: (item.registrationCount || 0) + 1 } : item)
    );

    this.addLog({
      level: 'INFO',
      component: 'Student-Registry',
      message: `Student ${dto.studentName} (${dto.rollNumber}) submitted ad registration for "${dto.adTitle}". Routed to mentor ${dto.mentorName} (${dto.mentorId}).`
    });

    return record;
  }

  updateRegistrationStatus(id: string, status: 'ACCEPTED' | 'REJECTED'): void {
    this.registrations.update(items =>
      items.map(r => r.id === id ? { ...r, status } : r)
    );
  }

  // Modal Triggers
  openAdDetails(ad: BroadcastItem): void {
    this.activeDetailAd.set(ad);
  }

  closeAdDetails(): void {
    this.activeDetailAd.set(null);
  }

  openAdRegistration(ad: BroadcastItem): void {
    this.activeRegisterAd.set(ad);
  }

  closeAdRegistration(): void {
    this.activeRegisterAd.set(null);
  }

  dismissPopupAd(): void {
    this.activePopupAd.set(null);
  }

  showAdInPopup(ad: BroadcastItem): void {
    this.activePopupAd.set(ad);
  }

  // Notice Bar Control
  updateGlobalNotice(message: string, type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS', targetAudience: TargetAudience, active: boolean): void {
    this.globalNotice.set({
      id: `notif-${Date.now()}`,
      message,
      type,
      targetAudience,
      active,
      updatedAt: 'Just now'
    });
  }

  dismissGlobalNotice(): void {
    this.globalNotice.update(n => ({ ...n, active: false }));
  }

  addBroadcastItem(item: Omit<BroadcastItem, 'id' | 'createdAt'>): BroadcastItem {
    const newItem: BroadcastItem = {
      ...item,
      id: `ad-${Date.now()}`,
      registrationCount: item.registrationCount || 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.broadcastItems.update(prev => [newItem, ...prev]);

    if (newItem.active) {
      this.activePopupAd.set(newItem);
    }
    return newItem;
  }

  toggleBroadcastActive(id: string): void {
    this.broadcastItems.update(items =>
      items.map(item => item.id === id ? { ...item, active: !item.active } : item)
    );
  }

  deleteBroadcast(id: string): void {
    this.broadcastItems.update(items => items.filter(item => item.id !== id));
    if (this.activePopupAd()?.id === id) {
      this.activePopupAd.set(null);
    }
  }

  // AI Engine Ad Synthesis with Mentor & College Parameters
  generateAdWithAi(
    topic: string,
    audience: TargetAudience,
    category: 'BANNER_AD' | 'CAMPUS_EVENT' | 'EXAM_ALERT',
    assignedMentor?: { id: string; name: string; college: string }
  ): Observable<Omit<BroadcastItem, 'id' | 'createdAt'>> {
    const curatedImageBank = [
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'
    ];

    const randomImg = curatedImageBank[Math.floor(Math.random() * curatedImageBank.length)];

    const mentorId = assignedMentor?.id || 'SX-M401';
    const mentorName = assignedMentor?.name || 'Prof. Aris Thorne';
    const sponsorCollege = assignedMentor?.college || 'Apex Institute of Technology';

    let title = `${topic} — Official Campus Announcement`;
    let tagline = `Sponsored by ${sponsorCollege} • Academic Initiative`;
    let description = `All student and faculty affiliates are invited to participate in the upcoming ${topic}. Key deadlines, evaluation criteria, and schedule parameters have been synchronized into your portal.`;
    let fullDetails = `## Official Announcement & Registration Dossier
- **Initiative Title:** ${topic}
- **Host Institution:** ${sponsorCollege}
- **Assigned Faculty Mentor:** ${mentorName} (Mentor ID: ${mentorId})
- **Application Processing:** Every registered student form is routed immediately to ${mentorName}'s dashboard for profile screening and acceptance.
- **Participation Perks:** Official certificate of completion, portfolio endorsement, and direct oral evaluation recommendation.`;

    let ctaText = 'Register Online';

    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('hackathon') || lowerTopic.includes('coding') || lowerTopic.includes('code')) {
      title = `National 48-Hour ${topic} 2026`;
      tagline = 'Innovate • Build • Compete for \$30,000 in Grants';
      description = 'Calling all student innovators and engineering researchers! Collaborate in multi-disciplinary squads, solve real-world industry AI challenges, and present solutions directly to tech leaders.';
      ctaText = 'Register Team Now';
    } else if (lowerTopic.includes('workshop') || lowerTopic.includes('seminar') || lowerTopic.includes('summit')) {
      title = `Executive Masterclass: ${topic}`;
      tagline = 'Accredited Faculty & Scholar Development Program';
      description = 'Join distinguished department deans and researchers for an intensive interactive session. Includes hands-on rubrics, peer evaluation benchmarks, and completion credentials.';
      ctaText = 'Reserve Seat';
    } else if (lowerTopic.includes('placement') || lowerTopic.includes('internship') || lowerTopic.includes('career')) {
      title = `Campus Placement & Industry Connect: ${topic}`;
      tagline = 'Tier-1 Engineering Recruiters On-Campus Drive';
      description = 'Pre-placement talks and interview shortlisting schedules are live. Ensure your verified oral viva scorecards and academic dossier are up to date in the portal.';
      ctaText = 'Submit Profile';
    }

    const generated: Omit<BroadcastItem, 'id' | 'createdAt'> = {
      title,
      tagline,
      description,
      fullDetails,
      imageUrl: randomImg,
      targetAudience: audience,
      category,
      ctaText,
      ctaLink: '#announcement',
      active: true,
      sponsorCollege,
      assignedMentorId: mentorId,
      assignedMentorName: mentorName,
      requiresRegistration: true,
      registrationCount: 0
    };

    this.addLog({
      level: 'INFERENCE',
      component: 'AI-Ad-Synthesizer',
      message: `Synthesized marketing banner for topic "${topic}" with mentor routing assigned to ${mentorName} (${mentorId}).`
    });

    return of(generated).pipe(delay(700));
  }

  updateAiConfig(partial: Partial<AiEngineConfig>): void {
    this.aiEngineConfig.update(prev => ({
      ...prev,
      ...partial,
      lastUpdated: 'Just now'
    }));
  }

  addLog(log: Omit<AiEngineLog, 'id' | 'timestamp'>): void {
    const newLog: AiEngineLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0')
    };
    this.aiLogs.update(logs => [newLog, ...logs.slice(0, 19)]);
  }

  runBenchmark(): void {
    this.addLog({
      level: 'INFERENCE',
      component: 'Benchmark-Runner',
      message: 'Running standardized VIVA Oral Question Synthesis benchmark...'
    });
  }

  flushKvCache(): void {
    this.addLog({
      level: 'OPTIMIZATION',
      component: 'KV-Cache',
      message: 'Triggered manual PagedAttention KV-cache flush. 48.2 GB GPU memory reclaimed.'
    });
  }
}
