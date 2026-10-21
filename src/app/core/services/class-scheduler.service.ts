import { Injectable, signal, computed } from '@angular/core';
import {
  ClassExamSession,
  ClassStudentVivaSlot,
  ClassScheduleKpis,
  ClassExamType,
  VivaSlotStatus,
  BloomLevel,
  MentorClass
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ClassSchedulerService {

  // Selected State Signals
  readonly selectedClassId = signal<string>('cls-401');
  readonly selectedDate = signal<string>('2026-09-15');
  readonly selectedExamType = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly activeTab = signal<'SESSIONS' | 'STUDENT_SLOTS' | 'HALL_PASSES'>('SESSIONS');
  readonly selectedSlotForModal = signal<ClassStudentVivaSlot | null>(null);

  // Mentor's Assigned Classes
  readonly mentorClasses = signal<MentorClass[]>([
    {
      id: 'cls-401',
      name: 'Deep Learning & Transformers (Sec A)',
      subjectCode: 'CS801',
      department: 'Computer Science & AI',
      semester: 7,
      academicYear: '2026-2027',
      joinCode: 'DL-801-A',
      enrolledCount: 48,
      pendingRequestsCount: 2,
      status: 'ACTIVE',
      createdAt: '2026-08-01'
    },
    {
      id: 'cls-402',
      name: 'Distributed Systems & Cloud (Sec B)',
      subjectCode: 'CS702',
      department: 'Computer Science & AI',
      semester: 6,
      academicYear: '2026-2027',
      joinCode: 'DS-702-B',
      enrolledCount: 42,
      pendingRequestsCount: 0,
      status: 'ACTIVE',
      createdAt: '2026-08-01'
    },
    {
      id: 'cls-403',
      name: 'Computer Vision & GenAI Lab (Sec A)',
      subjectCode: 'CS604',
      department: 'Computer Science & AI',
      semester: 6,
      academicYear: '2026-2027',
      joinCode: 'CV-604-A',
      enrolledCount: 36,
      pendingRequestsCount: 1,
      status: 'ACTIVE',
      createdAt: '2026-08-01'
    },
    {
      id: 'cls-404',
      name: 'AI Safety & Alignment Capstone (Sec C)',
      subjectCode: 'AI805',
      department: 'Computer Science & AI',
      semester: 8,
      academicYear: '2026-2027',
      joinCode: 'SAFE-805-C',
      enrolledCount: 28,
      pendingRequestsCount: 0,
      status: 'ACTIVE',
      createdAt: '2026-08-01'
    }
  ]);

  // Master Class Exam & Viva Sessions
  readonly sessions = signal<ClassExamSession[]>([
    {
      sessionId: 'sess-dl-viva-01',
      classId: 'cls-401',
      className: 'Deep Learning & Transformers (Sec A)',
      courseCode: 'CS801',
      section: 'Section A',
      academicYear: '2026-2027',
      semester: 7,
      title: 'Oral VIVA Round 1: Attention & Self-Attention Architectures',
      examType: 'ORAL_VIVA_1ON1',
      mode: 'VIRTUAL_WEBRTC',
      venueOrChannel: 'WebRTC VIVA Room: DL-ALPHA-801',
      date: '2026-09-15',
      overallStartTime: '09:00',
      overallEndTime: '12:00',
      totalStudentsEnrolled: 8, // Initial active batch
      evaluatedCount: 2,
      status: 'LIVE_TODAY',
      syllabusUnitFocus: 'Unit 2: Transformer Multi-Head Self-Attention & Positional Encoding',
      targetCourseOutcomes: ['CO1: Mathematical foundations of Attention', 'CO2: FlashAttention & KV Cache GPU efficiency'],
      hasAiCoPilotEnabled: true,
      studentSlots: [
        {
          slotId: 'slot-dl-01',
          studentId: 'stu-101',
          studentName: 'Aarav Sharma',
          rollNumber: '2023CS0101',
          studentAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          timeSlot: '09:00 - 09:15',
          startTime: '09:00',
          endTime: '09:15',
          durationMinutes: 15,
          status: 'EVALUATED',
          assignedTopic: 'Scaled Dot-Product Attention & Softmax temperature dynamics',
          bloomLevel: 'EVALUATE',
          maxScore: 25,
          awardedScore: 23.5,
          rubricFeedbackSummary: 'Outstanding conceptual clarity on QK^T / sqrt(d_k) scaling. Correctly derived gradient stability under extreme sequence lengths.',
          meetingLinkOrRoom: 'WebRTC Room Alpha',
          aiCoPilotReady: true
        },
        {
          slotId: 'slot-dl-02',
          studentId: 'stu-102',
          studentName: 'Priya Sundaram',
          rollNumber: '2023CS0102',
          studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          timeSlot: '09:15 - 09:30',
          startTime: '09:15',
          endTime: '09:30',
          durationMinutes: 15,
          status: 'EVALUATED',
          assignedTopic: 'Rotary Position Embeddings (RoPE) vs Sinusoidal encodings',
          bloomLevel: 'ANALYZE',
          maxScore: 25,
          awardedScore: 24.0,
          rubricFeedbackSummary: 'Excellent explanation of 2D complex plane rotation of query/key vectors. Handled follow-up questions on context window extension with ease.',
          meetingLinkOrRoom: 'WebRTC Room Alpha',
          aiCoPilotReady: true
        },
        {
          slotId: 'slot-dl-03',
          studentId: 'stu-103',
          studentName: 'Rohan Deshmukh',
          rollNumber: '2023CS0103',
          studentAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
          timeSlot: '09:30 - 09:45',
          startTime: '09:30',
          endTime: '09:45',
          durationMinutes: 15,
          status: 'VIVA_IN_PROGRESS',
          assignedTopic: 'Key-Value (KV) Caching in Autoregressive Generation',
          bloomLevel: 'APPLY',
          maxScore: 25,
          meetingLinkOrRoom: 'WebRTC Room Alpha',
          aiCoPilotReady: true
        },
        {
          slotId: 'slot-dl-04',
          studentId: 'stu-104',
          studentName: 'Kavya Nair',
          rollNumber: '2023CS0104',
          studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          timeSlot: '09:45 - 10:00',
          startTime: '09:45',
          endTime: '10:00',
          durationMinutes: 15,
          status: 'SCHEDULED',
          assignedTopic: 'Multi-Query Attention (MQA) vs Grouped-Query Attention (GQA)',
          bloomLevel: 'ANALYZE',
          maxScore: 25,
          meetingLinkOrRoom: 'WebRTC Room Alpha',
          aiCoPilotReady: true
        },
        {
          slotId: 'slot-dl-05',
          studentId: 'stu-105',
          studentName: 'Devansh Verma',
          rollNumber: '2023CS0105',
          studentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          timeSlot: '10:00 - 10:15',
          startTime: '10:00',
          endTime: '10:15',
          durationMinutes: 15,
          status: 'SCHEDULED',
          assignedTopic: 'FlashAttention 2: Forward & Backward Tiling on SRAM',
          bloomLevel: 'CREATE',
          maxScore: 25,
          meetingLinkOrRoom: 'WebRTC Room Alpha',
          aiCoPilotReady: true
        },
        {
          slotId: 'slot-dl-06',
          studentId: 'stu-106',
          studentName: 'Sanya Mirza',
          rollNumber: '2023CS0106',
          studentAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          timeSlot: '10:15 - 10:30',
          startTime: '10:15',
          endTime: '10:30',
          durationMinutes: 15,
          status: 'SCHEDULED',
          assignedTopic: 'Layer Normalization vs RMSNorm in deep decoder stacks',
          bloomLevel: 'UNDERSTAND',
          maxScore: 25,
          meetingLinkOrRoom: 'WebRTC Room Alpha',
          aiCoPilotReady: true
        },
        {
          slotId: 'slot-dl-07',
          studentId: 'stu-107',
          studentName: 'Aditya Birla',
          rollNumber: '2023CS0107',
          studentAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          timeSlot: '10:30 - 10:45',
          startTime: '10:30',
          endTime: '10:45',
          durationMinutes: 15,
          status: 'SCHEDULED',
          assignedTopic: 'LoRA Low-Rank Adaptation mathematical factorization (W_0 + BA)',
          bloomLevel: 'APPLY',
          maxScore: 25,
          meetingLinkOrRoom: 'WebRTC Room Alpha',
          aiCoPilotReady: true
        },
        {
          slotId: 'slot-dl-08',
          studentId: 'stu-108',
          studentName: 'Meera Iyer',
          rollNumber: '2023CS0108',
          studentAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
          timeSlot: '10:45 - 11:00',
          startTime: '10:45',
          endTime: '11:00',
          durationMinutes: 15,
          status: 'SCHEDULED',
          assignedTopic: 'Quantization & QLoRA: NF4 Double Quantization and Paged Optimizers',
          bloomLevel: 'ANALYZE',
          maxScore: 25,
          meetingLinkOrRoom: 'WebRTC Room Alpha',
          aiCoPilotReady: true
        }
      ]
    },
    {
      sessionId: 'sess-dl-theory-02',
      classId: 'cls-401',
      className: 'Deep Learning & Transformers (Sec A)',
      courseCode: 'CS801',
      section: 'Section A',
      academicYear: '2026-2027',
      semester: 7,
      title: 'Midterm Comprehensive Theory Assessment (AI-Proctored)',
      examType: 'THEORY_MIDTERM',
      mode: 'PHYSICAL_ROOM',
      venueOrChannel: 'Grand Vivekananda Auditorium (Block A)',
      date: '2026-09-18',
      overallStartTime: '10:00',
      overallEndTime: '12:30',
      totalStudentsEnrolled: 48,
      evaluatedCount: 0,
      status: 'UPCOMING',
      syllabusUnitFocus: 'Units 1, 2 & 3: CNNs, Attention, Transformers & Fine-Tuning Paradigms',
      targetCourseOutcomes: ['CO1', 'CO2', 'CO3'],
      hasAiCoPilotEnabled: true,
      studentSlots: []
    },
    {
      sessionId: 'sess-ds-viva-01',
      classId: 'cls-402',
      className: 'Distributed Systems & Cloud (Sec B)',
      courseCode: 'CS702',
      section: 'Section B',
      academicYear: '2026-2027',
      semester: 6,
      title: 'Lab Practical Viva: Raft Consensus & Microservice RPCs',
      examType: 'LAB_PRACTICAL',
      mode: 'PHYSICAL_ROOM',
      venueOrChannel: 'Turing Advanced AI Lab 302',
      date: '2026-09-16',
      overallStartTime: '14:00',
      overallEndTime: '17:00',
      totalStudentsEnrolled: 42,
      evaluatedCount: 0,
      status: 'UPCOMING',
      syllabusUnitFocus: 'Unit 3: Distributed Consensus, Leader Election & gRPC streaming',
      targetCourseOutcomes: ['CO3: Raft State Machine Replication', 'CO4: Network Partition Handling'],
      hasAiCoPilotEnabled: true,
      studentSlots: []
    }
  ]);

  // Computed Current Class
  readonly currentClass = computed(() => {
    const cid = this.selectedClassId();
    return this.mentorClasses().find(c => c.id === cid) || this.mentorClasses()[0];
  });

  // Computed Filtered Sessions for the Selected Class
  readonly filteredSessions = computed<ClassExamSession[]>(() => {
    const cid = this.selectedClassId();
    const type = this.selectedExamType();
    const query = this.searchQuery().toLowerCase().trim();

    return this.sessions().filter(s => {
      const matchClass = s.classId === cid;
      const matchType = type === 'ALL' || s.examType === type;
      const matchQuery = !query ||
        s.title.toLowerCase().includes(query) ||
        s.syllabusUnitFocus.toLowerCase().includes(query) ||
        s.venueOrChannel.toLowerCase().includes(query);
      return matchClass && matchType && matchQuery;
    });
  });

  // Computed Filtered Student Viva Slots across the Selected Class
  readonly currentClassStudentSlots = computed<ClassStudentVivaSlot[]>(() => {
    const sessions = this.filteredSessions();
    const allSlots: ClassStudentVivaSlot[] = [];
    for (const sess of sessions) {
      if (sess.studentSlots && sess.studentSlots.length > 0) {
        allSlots.push(...sess.studentSlots);
      }
    }

    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return allSlots;

    return allSlots.filter(st =>
      st.studentName.toLowerCase().includes(query) ||
      st.rollNumber.toLowerCase().includes(query) ||
      st.assignedTopic.toLowerCase().includes(query)
    );
  });

  // Computed Class Schedule KPIs
  readonly classKpis = computed<ClassScheduleKpis>(() => {
    const cls = this.currentClass();
    const classSessions = this.sessions().filter(s => s.classId === cls.id);
    const allSlots = this.currentClassStudentSlots();

    const evaluated = allSlots.filter(s => s.status === 'EVALUATED').length;
    const totalSlotsCount = allSlots.length;
    const compRate = totalSlotsCount > 0 ? Math.round((evaluated / totalSlotsCount) * 100) : 0;

    return {
      totalScheduledSessions: classSessions.length,
      totalClassStudents: cls.enrolledCount,
      vivasCompleted: evaluated,
      vivasPending: totalSlotsCount - evaluated,
      completionRatePercent: compRate,
      nextSessionTime: 'Sep 15 at 09:00 AM (WebRTC Viva Room)'
    };
  });

  // Add New Class Exam / Viva Session
  createClassExamSession(sessionData: {
    title: string;
    examType: ClassExamType;
    mode: 'PHYSICAL_ROOM' | 'VIRTUAL_WEBRTC';
    venueOrChannel: string;
    date: string;
    overallStartTime: string;
    overallEndTime: string;
    syllabusUnitFocus: string;
    targetCourseOutcomes: string[];
    generate1on1Slots: boolean;
  }): ClassExamSession {
    const cls = this.currentClass();
    const sessionId = `sess-${cls.subjectCode.toLowerCase()}-${Date.now().toString().slice(-4)}`;

    let generatedSlots: ClassStudentVivaSlot[] = [];
    if (sessionData.generate1on1Slots) {
      generatedSlots = this.generateSequentialVivaSlots(
        sessionData.overallStartTime,
        sessionData.date,
        sessionData.syllabusUnitFocus
      );
    }

    const newSession: ClassExamSession = {
      sessionId,
      classId: cls.id,
      className: cls.name,
      courseCode: cls.subjectCode,
      section: cls.name.includes('Sec A') ? 'Section A' : 'Section B',
      academicYear: cls.academicYear,
      semester: cls.semester,
      title: sessionData.title,
      examType: sessionData.examType,
      mode: sessionData.mode,
      venueOrChannel: sessionData.venueOrChannel,
      date: sessionData.date,
      overallStartTime: sessionData.overallStartTime,
      overallEndTime: sessionData.overallEndTime,
      totalStudentsEnrolled: generatedSlots.length > 0 ? generatedSlots.length : cls.enrolledCount,
      evaluatedCount: 0,
      status: sessionData.date === '2026-09-15' ? 'LIVE_TODAY' : 'UPCOMING',
      syllabusUnitFocus: sessionData.syllabusUnitFocus,
      targetCourseOutcomes: sessionData.targetCourseOutcomes,
      studentSlots: generatedSlots,
      hasAiCoPilotEnabled: true
    };

    this.sessions.update(prev => [newSession, ...prev]);
    return newSession;
  }

  // Update a Student Slot's Viva Status & Score
  updateSlotEvaluation(sessionId: string, slotId: string, awardedScore: number, feedback: string): void {
    this.sessions.update(prevSessions =>
      prevSessions.map(sess => {
        if (sess.sessionId !== sessionId) return sess;
        const updatedSlots = sess.studentSlots.map(slot => {
          if (slot.slotId !== slotId) return slot;
          return {
            ...slot,
            status: 'EVALUATED' as VivaSlotStatus,
            awardedScore,
            rubricFeedbackSummary: feedback
          };
        });
        const evalCount = updatedSlots.filter(s => s.status === 'EVALUATED').length;
        return {
          ...sess,
          evaluatedCount: evalCount,
          studentSlots: updatedSlots
        };
      })
    );
  }

  // Helper to generate 15-min sequential viva slots for students
  private generateSequentialVivaSlots(startTime: string, date: string, topicFocus: string): ClassStudentVivaSlot[] {
    const sampleStudents = [
      { id: 'stu-201', name: 'Tanvi Desai', roll: '2023CS0110', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
      { id: 'stu-202', name: 'Harsh Vardhan', roll: '2023CS0111', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
      { id: 'stu-203', name: 'Ishita Roy', roll: '2023CS0112', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
      { id: 'stu-204', name: 'Varun Grover', roll: '2023CS0113', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' }
    ];

    const [startH, startM] = startTime.split(':').map(Number);
    let currentMinutes = (startH * 60) + (startM || 0);

    return sampleStudents.map((st, i) => {
      const slotStart = this.minutesToTime(currentMinutes);
      currentMinutes += 15;
      const slotEnd = this.minutesToTime(currentMinutes);

      return {
        slotId: `slot-gen-${Date.now().toString().slice(-4)}-${i + 1}`,
        studentId: st.id,
        studentName: st.name,
        rollNumber: st.roll,
        studentAvatar: st.avatar,
        timeSlot: `${slotStart} - ${slotEnd}`,
        startTime: slotStart,
        endTime: slotEnd,
        durationMinutes: 15,
        status: 'SCHEDULED',
        assignedTopic: `${topicFocus} (Subtopic Module #${i + 1})`,
        bloomLevel: (['UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE'][i % 4]) as BloomLevel,
        maxScore: 25,
        meetingLinkOrRoom: 'WebRTC Room Alpha',
        aiCoPilotReady: true
      };
    });
  }

  private minutesToTime(totalMin: number): string {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
