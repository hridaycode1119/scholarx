import { Injectable, signal, computed } from '@angular/core';
import {
  FacultyWorkloadItem,
  VivaStudentQueueItem,
  UnassignedStudentCandidate,
  DepartmentWorkloadSummary,
  AutoBalanceResult,
  CollegeWorkloadGroup,
  SubjectTaughtInfo
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class WorkloadService {

  // Selected filters
  readonly selectedCollege = signal<string>('ALL');
  readonly selectedDepartment = signal<string>('ALL');
  readonly searchSubject = signal<string>('');
  readonly selectedSubjectFilter = signal<string>('ALL');

  // Campuses list
  readonly collegeList = [
    { id: 'ALL', name: 'All Campuses & Universities', badge: '🌐 Global', city: 'Multi-Campus' },
    { id: 'Apex Institute of Technology', name: 'Apex Institute of Technology', badge: '🏛️ Main Campus', city: 'Silicon Valley, CA' },
    { id: 'Horizon Engineering College', name: 'Horizon Engineering College', badge: '🏛️ North Campus', city: 'Boston, MA' },
    { id: 'Vanguard University Campus', name: 'Vanguard University Campus', badge: '🏛️ East Campus', city: 'Austin, TX' },
    { id: 'Metro Polytechnic Institute', name: 'Metro Polytechnic Institute', badge: '🏛️ South Campus', city: 'Seattle, WA' }
  ];

  // Master faculty list with current workloads, subjects taught & live active classes
  readonly facultyList = signal<FacultyWorkloadItem[]>([
    {
      id: 'fac-1',
      facultyId: 'SX-M401',
      name: 'Prof. Aris Thorne',
      department: 'Computer Science & AI',
      collegeName: 'Apex Institute of Technology',
      email: 'a.thorne@apex.edu',
      specializations: ['Distributed Systems', 'Cloud Computing', 'AI Algorithms'],
      subjectsTaught: [
        { code: 'CS401', name: 'Distributed Systems & Consensus', department: 'Computer Science & AI', weeklyHours: 8.0, activeVivasCount: 28, studentsEnrolled: 84 },
        { code: 'CS502', name: 'Cloud Computing & Microservices', department: 'Computer Science & AI', weeklyHours: 6.0, activeVivasCount: 18, studentsEnrolled: 62 }
      ],
      activeClassesList: [
        {
          classId: 'cls-401',
          className: 'CS-401A Distributed Systems',
          subjectCode: 'CS401',
          subjectName: 'Distributed Systems & Consensus',
          section: 'Section A (Year 3)',
          currentActivityStatus: 'LIVE_VIVA_IN_PROGRESS',
          currentTopic: 'Unit 4: Raft Consensus & Byzantine Fault Tolerance',
          studentsEnrolled: 42,
          studentsAttending: 40,
          evaluatedVivasCount: 28,
          totalVivasScheduled: 42,
          roomOrChannel: 'Exam Room 302 • Channel CS401-A',
          activeStudentName: 'Rahul Sharma (20230121)',
          timeRemainingOrDuration: '12 mins left in viva session'
        },
        {
          classId: 'cls-502',
          className: 'CS-502B Cloud Computing',
          subjectCode: 'CS502',
          subjectName: 'Cloud Computing & Microservices',
          section: 'Section B (Year 4)',
          currentActivityStatus: 'UPCOMING_VIVA_SESSION',
          currentTopic: 'Unit 3: Kubernetes Ingress, Service Meshes & Istio',
          studentsEnrolled: 38,
          studentsAttending: 36,
          evaluatedVivasCount: 0,
          totalVivasScheduled: 38,
          roomOrChannel: 'Virtual Channel Alpha',
          timeRemainingOrDuration: 'Scheduled at 02:00 PM Today'
        }
      ],
      weeklyTeachingHours: 14.0,
      weeklyVivaHours: 11.5,
      totalWeeklyHours: 25.5,
      maxWeeklyHours: 24.0,
      activeVivasAssigned: 46,
      maxVivaCapacity: 40,
      evaluatedVivas: 28,
      pendingVivas: 18,
      status: 'OVERLOADED',
      burnoutRiskPercent: 88,
      assignedVivasQueue: [
        { id: 'viva-1', studentName: 'Rahul Sharma', rollNumber: '20230121', subjectCode: 'CS401', subjectName: 'Distributed Systems & Consensus', scheduledTime: 'Tomorrow, 10:00 AM', collegeName: 'Apex Institute', vivaType: 'MIDTERM', durationMinutes: 15 },
        { id: 'viva-2', studentName: 'Ananya Sen', rollNumber: '20230145', subjectCode: 'CS401', subjectName: 'Distributed Systems & Consensus', scheduledTime: 'Tomorrow, 10:20 AM', collegeName: 'Apex Institute', vivaType: 'MIDTERM', durationMinutes: 15 },
        { id: 'viva-3', studentName: 'Vikram Malhotra', rollNumber: '20230188', subjectCode: 'CS502', subjectName: 'Cloud Computing & Microservices', scheduledTime: 'Tomorrow, 10:40 AM', collegeName: 'Apex Institute', vivaType: 'MIDTERM', durationMinutes: 15 },
        { id: 'viva-4', studentName: 'Priya Patel', rollNumber: '20230192', subjectCode: 'CS401', subjectName: 'Distributed Systems & Consensus', scheduledTime: 'Tomorrow, 11:00 AM', collegeName: 'Apex Institute', vivaType: 'MIDTERM', durationMinutes: 15 },
        { id: 'viva-5', studentName: 'Devansh Roy', rollNumber: '20230205', subjectCode: 'CS502', subjectName: 'Cloud Computing & Microservices', scheduledTime: 'Tomorrow, 11:20 AM', collegeName: 'Apex Institute', vivaType: 'MIDTERM', durationMinutes: 15 },
        { id: 'viva-6', studentName: 'Kavya Iyer', rollNumber: '20230218', subjectCode: 'CS401', subjectName: 'Distributed Systems & Consensus', scheduledTime: 'Tomorrow, 11:40 AM', collegeName: 'Apex Institute', vivaType: 'MIDTERM', durationMinutes: 15 }
      ]
    },
    {
      id: 'fac-2',
      facultyId: 'SX-M402',
      name: 'Dr. Aisha Khan',
      department: 'Computer Science & AI',
      collegeName: 'Apex Institute of Technology',
      email: 'aisha.k@apex.edu',
      specializations: ['Deep Learning', 'Neural Architectures', 'Computer Vision'],
      subjectsTaught: [
        { code: 'AI501', name: 'Deep Learning & Neural Networks', department: 'Computer Science & AI', weeklyHours: 7.0, activeVivasCount: 16, studentsEnrolled: 75 },
        { code: 'AI602', name: 'Computer Vision Architectures', department: 'Computer Science & AI', weeklyHours: 5.0, activeVivasCount: 10, studentsEnrolled: 50 }
      ],
      activeClassesList: [
        {
          classId: 'cls-AI501',
          className: 'AI-501A Deep Learning',
          subjectCode: 'AI501',
          subjectName: 'Deep Learning & Neural Networks',
          section: 'Section A (Year 3)',
          currentActivityStatus: 'ACTIVE_CLASSROOM',
          currentTopic: 'Unit 5: Transformer Attention Mechanisms & Multi-Head Projections',
          studentsEnrolled: 48,
          studentsAttending: 45,
          evaluatedVivasCount: 16,
          totalVivasScheduled: 48,
          roomOrChannel: 'Lecture Hall 4A • Live Stream Active',
          timeRemainingOrDuration: 'Lecture in Progress (45m elapsed)'
        },
        {
          classId: 'cls-AI602',
          className: 'AI-602B Computer Vision',
          subjectCode: 'AI602',
          subjectName: 'Computer Vision Architectures',
          section: 'Section B (Year 4)',
          currentActivityStatus: 'STANDBY_GRADING',
          currentTopic: 'Unit 2: ResNet Feature Pyramid Networks & Object Detection',
          studentsEnrolled: 27,
          studentsAttending: 27,
          evaluatedVivasCount: 10,
          totalVivasScheduled: 27,
          roomOrChannel: 'AI Vision Lab 2',
          timeRemainingOrDuration: 'Lab Submissions Ready for Evaluation'
        }
      ],
      weeklyTeachingHours: 12.0,
      weeklyVivaHours: 6.5,
      totalWeeklyHours: 18.5,
      maxWeeklyHours: 24.0,
      activeVivasAssigned: 26,
      maxVivaCapacity: 40,
      evaluatedVivas: 16,
      pendingVivas: 10,
      status: 'BALANCED',
      burnoutRiskPercent: 44,
      assignedVivasQueue: [
        { id: 'viva-7', studentName: 'Tanya Bose', rollNumber: '20230230', subjectCode: 'AI501', subjectName: 'Deep Learning & Neural Networks', scheduledTime: 'Wed, 02:00 PM', collegeName: 'Apex Institute', vivaType: 'MIDTERM', durationMinutes: 15 },
        { id: 'viva-8', studentName: 'Rohan Mehra', rollNumber: '20230245', subjectCode: 'AI602', subjectName: 'Computer Vision Architectures', scheduledTime: 'Wed, 02:20 PM', collegeName: 'Apex Institute', vivaType: 'MIDTERM', durationMinutes: 15 }
      ]
    },
    {
      id: 'fac-3',
      facultyId: 'SX-M403',
      name: 'Prof. Li Wei',
      department: 'Computer Networks',
      collegeName: 'Horizon Engineering College',
      email: 'li.wei@horizon.edu',
      specializations: ['Network Protocols', 'Cybersecurity', '5G Edge Systems'],
      subjectsTaught: [
        { code: 'NET302', name: 'Computer Networks & Protocols', department: 'Computer Networks', weeklyHours: 9.0, activeVivasCount: 12, studentsEnrolled: 90 },
        { code: 'NET405', name: '5G Edge & Network Security', department: 'Computer Networks', weeklyHours: 6.0, activeVivasCount: 8, studentsEnrolled: 45 }
      ],
      activeClassesList: [
        {
          classId: 'cls-NET302',
          className: 'NET-302 Computer Networks',
          subjectCode: 'NET302',
          subjectName: 'Computer Networks & Protocols',
          section: 'Section 1 (Year 2)',
          currentActivityStatus: 'LIVE_VIVA_IN_PROGRESS',
          currentTopic: 'Unit 3: BGP Routing Policies & CIDR Subnetting',
          studentsEnrolled: 45,
          studentsAttending: 42,
          evaluatedVivasCount: 12,
          totalVivasScheduled: 45,
          roomOrChannel: 'Networking Lab 101 • Oral VIVA Booth 1',
          activeStudentName: 'Samir Ghosh (20230260)',
          timeRemainingOrDuration: '8 mins remaining in oral viva'
        }
      ],
      weeklyTeachingHours: 15.0,
      weeklyVivaHours: 5.0,
      totalWeeklyHours: 20.0,
      maxWeeklyHours: 24.0,
      activeVivasAssigned: 20,
      maxVivaCapacity: 35,
      evaluatedVivas: 12,
      pendingVivas: 8,
      status: 'BALANCED',
      burnoutRiskPercent: 52,
      assignedVivasQueue: [
        { id: 'viva-9', studentName: 'Samir Ghosh', rollNumber: '20230260', subjectCode: 'NET302', subjectName: 'Computer Networks & Protocols', scheduledTime: 'Thu, 11:00 AM', collegeName: 'Horizon College', vivaType: 'MIDTERM', durationMinutes: 15 }
      ]
    },
    {
      id: 'fac-4',
      facultyId: 'SX-M404',
      name: 'Dr. Marcus Vance',
      department: 'Software Engineering',
      collegeName: 'Vanguard University Campus',
      email: 'm.vance@vanguard.edu',
      specializations: ['Distributed Systems', 'DevOps & CI/CD', 'Microservices'],
      subjectsTaught: [
        { code: 'SE405', name: 'Software Architecture & Design', department: 'Software Engineering', weeklyHours: 6.0, activeVivasCount: 10, studentsEnrolled: 65 },
        { code: 'SE501', name: 'DevOps & Continuous Deployment', department: 'Software Engineering', weeklyHours: 4.0, activeVivasCount: 8, studentsEnrolled: 40 }
      ],
      activeClassesList: [
        {
          classId: 'cls-SE405',
          className: 'SE-405 Software Architecture',
          subjectCode: 'SE405',
          subjectName: 'Software Architecture & Design',
          section: 'Section A (Year 3)',
          currentActivityStatus: 'UPCOMING_VIVA_SESSION',
          currentTopic: 'Unit 2: Event-Driven Microservices & Saga Orchestration',
          studentsEnrolled: 40,
          studentsAttending: 38,
          evaluatedVivasCount: 10,
          totalVivasScheduled: 40,
          roomOrChannel: 'Software Studio B',
          timeRemainingOrDuration: 'Starts Tomorrow at 03:00 PM'
        }
      ],
      weeklyTeachingHours: 10.0,
      weeklyVivaHours: 4.5,
      totalWeeklyHours: 14.5,
      maxWeeklyHours: 24.0,
      activeVivasAssigned: 18,
      maxVivaCapacity: 40,
      evaluatedVivas: 10,
      pendingVivas: 8,
      status: 'BALANCED',
      burnoutRiskPercent: 32,
      assignedVivasQueue: [
        { id: 'viva-10', studentName: 'Aditi Rao', rollNumber: '20230275', subjectCode: 'SE405', subjectName: 'Software Architecture & Design', scheduledTime: 'Thu, 03:00 PM', collegeName: 'Vanguard Campus', vivaType: 'MIDTERM', durationMinutes: 15 }
      ]
    },
    {
      id: 'fac-5',
      facultyId: 'SX-M405',
      name: 'Dr. Elena Rostova',
      department: 'Computer Science & AI',
      collegeName: 'Horizon Engineering College',
      email: 'elena.r@horizon.edu',
      specializations: ['Natural Language Processing', 'AI Ethics', 'Information Retrieval'],
      subjectsTaught: [
        { code: 'AI502', name: 'NLP & Large Language Models', department: 'Computer Science & AI', weeklyHours: 10.0, activeVivasCount: 26, studentsEnrolled: 80 },
        { code: 'AI403', name: 'Information Retrieval & Search', department: 'Computer Science & AI', weeklyHours: 6.0, activeVivasCount: 18, studentsEnrolled: 55 }
      ],
      activeClassesList: [
        {
          classId: 'cls-AI502',
          className: 'AI-502 NLP & LLMs',
          subjectCode: 'AI502',
          subjectName: 'NLP & Large Language Models',
          section: 'Section 1 (Year 4)',
          currentActivityStatus: 'ACTIVE_CLASSROOM',
          currentTopic: 'Unit 4: Direct Preference Optimization (DPO) & Alignment',
          studentsEnrolled: 50,
          studentsAttending: 48,
          evaluatedVivasCount: 25,
          totalVivasScheduled: 50,
          roomOrChannel: 'Auditorium North • AI Interactive Lab',
          timeRemainingOrDuration: 'Hands-on Lab Session Active'
        }
      ],
      weeklyTeachingHours: 16.0,
      weeklyVivaHours: 9.0,
      totalWeeklyHours: 25.0,
      maxWeeklyHours: 24.0,
      activeVivasAssigned: 44,
      maxVivaCapacity: 40,
      evaluatedVivas: 25,
      pendingVivas: 19,
      status: 'OVERLOADED',
      burnoutRiskPercent: 86,
      assignedVivasQueue: [
        { id: 'viva-11', studentName: 'Zainab Qureshi', rollNumber: '20230290', subjectCode: 'AI502', subjectName: 'NLP & Large Language Models', scheduledTime: 'Fri, 10:00 AM', collegeName: 'Horizon College', vivaType: 'MIDTERM', durationMinutes: 15 },
        { id: 'viva-12', studentName: 'Nitin Kapoor', rollNumber: '20230302', subjectCode: 'AI502', subjectName: 'NLP & Large Language Models', scheduledTime: 'Fri, 10:20 AM', collegeName: 'Horizon College', vivaType: 'MIDTERM', durationMinutes: 15 }
      ]
    },
    {
      id: 'fac-6',
      facultyId: 'SX-M406',
      name: 'Prof. Rajesh Nair',
      department: 'Electrical & Robotics',
      collegeName: 'Metro Polytechnic Institute',
      email: 'rajesh.n@metro.edu',
      specializations: ['Robotics Kinematics', 'Embedded IoT', 'Control Systems'],
      subjectsTaught: [
        { code: 'ROB401', name: 'Autonomous Robotics & Kinematics', department: 'Electrical & Robotics', weeklyHours: 8.0, activeVivasCount: 18, studentsEnrolled: 58 },
        { code: 'ROB502', name: 'Embedded Systems & Control IoT', department: 'Electrical & Robotics', weeklyHours: 5.0, activeVivasCount: 10, studentsEnrolled: 42 }
      ],
      activeClassesList: [
        {
          classId: 'cls-ROB401',
          className: 'ROB-401 Autonomous Robotics',
          subjectCode: 'ROB401',
          subjectName: 'Autonomous Robotics & Kinematics',
          section: 'Section A (Year 3)',
          currentActivityStatus: 'LIVE_VIVA_IN_PROGRESS',
          currentTopic: 'Unit 3: Inverse Kinematics & PID Controller Tuning',
          studentsEnrolled: 35,
          studentsAttending: 34,
          evaluatedVivasCount: 18,
          totalVivasScheduled: 35,
          roomOrChannel: 'Robotics Workcell 3 • Live Intercom',
          activeStudentName: 'Arjun Das (20230315)',
          timeRemainingOrDuration: '5 mins left in viva examination'
        }
      ],
      weeklyTeachingHours: 13.0,
      weeklyVivaHours: 7.0,
      totalWeeklyHours: 20.0,
      maxWeeklyHours: 24.0,
      activeVivasAssigned: 28,
      maxVivaCapacity: 35,
      evaluatedVivas: 18,
      pendingVivas: 10,
      status: 'NEAR_CAPACITY',
      burnoutRiskPercent: 68,
      assignedVivasQueue: [
        { id: 'viva-13', studentName: 'Arjun Das', rollNumber: '20230315', subjectCode: 'ROB401', subjectName: 'Autonomous Robotics & Kinematics', scheduledTime: 'Fri, 02:00 PM', collegeName: 'Metro Institute', vivaType: 'MIDTERM', durationMinutes: 15 }
      ]
    }
  ]);

  // Unassigned Candidate Pool waiting for oral viva mentor allocation
  readonly unassignedStudents = signal<UnassignedStudentCandidate[]>([
    { id: 'un-1', studentName: 'Siddharth Varma', rollNumber: '20230340', subjectCode: 'CS401', subjectName: 'Distributed Systems & Consensus', requiredSpecialization: 'Distributed Systems', collegeName: 'Apex Institute of Technology', preferredTimeSlot: 'Morning (10 AM - 12 PM)' },
    { id: 'un-2', studentName: 'Meera Nambiar', rollNumber: '20230355', subjectCode: 'CS502', subjectName: 'Cloud Computing & Microservices', requiredSpecialization: 'Cloud Computing', collegeName: 'Apex Institute of Technology', preferredTimeSlot: 'Afternoon (2 PM - 4 PM)' },
    { id: 'un-3', studentName: 'Kunal Joshi', rollNumber: '20230370', subjectCode: 'AI501', subjectName: 'Deep Learning & Neural Networks', requiredSpecialization: 'Deep Learning', collegeName: 'Horizon Engineering College', preferredTimeSlot: 'Morning (10 AM - 12 PM)' },
    { id: 'un-4', studentName: 'Sneha Kulkarni', rollNumber: '20230385', subjectCode: 'SE405', subjectName: 'Software Architecture & Design', requiredSpecialization: 'Microservices', collegeName: 'Vanguard University Campus', preferredTimeSlot: 'Afternoon (2 PM - 4 PM)' },
    { id: 'un-5', studentName: 'Harsh Vardhan', rollNumber: '20230401', subjectCode: 'NET302', subjectName: 'Computer Networks & Protocols', requiredSpecialization: 'Network Protocols', collegeName: 'Horizon Engineering College', preferredTimeSlot: 'Morning (10 AM - 12 PM)' }
  ]);

  // All Unique Subjects list for filter chips
  readonly allSubjects = computed(() => {
    const map = new Map<string, { code: string; name: string; department: string }>();
    for (const f of this.facultyList()) {
      for (const s of f.subjectsTaught) {
        if (!map.has(s.code)) {
          map.set(s.code, { code: s.code, name: s.name, department: s.department });
        }
      }
    }
    return Array.from(map.values());
  });

  // Filtered faculty based on college, department, subject filter, and search
  readonly filteredFaculty = computed(() => {
    const college = this.selectedCollege();
    const dept = this.selectedDepartment();
    const subjectFilter = this.selectedSubjectFilter();
    const query = this.searchSubject().trim().toLowerCase();

    return this.facultyList().filter(f => {
      // College Match
      if (college !== 'ALL' && f.collegeName !== college) return false;

      // Department Match
      if (dept !== 'ALL' && f.department !== dept) return false;

      // Subject Filter Chip Match
      if (subjectFilter !== 'ALL') {
        const teachesSubject = f.subjectsTaught.some(s => s.code === subjectFilter);
        if (!teachesSubject) return false;
      }

      // Search Query (matches subject code, subject name, mentor name, or specialization)
      if (query) {
        const matchesName = f.name.toLowerCase().includes(query);
        const matchesDept = f.department.toLowerCase().includes(query);
        const matchesSubject = f.subjectsTaught.some(
          s => s.code.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
        );
        const matchesSpec = f.specializations.some(sp => sp.toLowerCase().includes(query));

        if (!matchesName && !matchesDept && !matchesSubject && !matchesSpec) return false;
      }

      return true;
    });
  });

  // Hierarchical Grouping: College -> Faculty -> Subjects
  readonly groupedByCollege = computed<CollegeWorkloadGroup[]>(() => {
    const faculty = this.filteredFaculty();
    const collegeMap = new Map<string, FacultyWorkloadItem[]>();

    for (const f of faculty) {
      if (!collegeMap.has(f.collegeName)) {
        collegeMap.set(f.collegeName, []);
      }
      collegeMap.get(f.collegeName)!.push(f);
    }

    const groups: CollegeWorkloadGroup[] = [];

    collegeMap.forEach((facList, collegeName) => {
      const collegeMeta = this.collegeList.find(c => c.name === collegeName) || {
        id: collegeName,
        name: collegeName,
        badge: '🏛️ Campus',
        city: 'University Network'
      };

      const totalVivas = facList.reduce((acc, f) => acc + f.activeVivasAssigned, 0);
      const overloadedCount = facList.filter(f => f.status === 'OVERLOADED').length;
      const nearCapacityCount = facList.filter(f => f.status === 'NEAR_CAPACITY').length;

      // Unique subjects in this college
      const subjectCodes = new Set<string>();
      facList.forEach(f => f.subjectsTaught.forEach(s => subjectCodes.add(s.code)));

      const campusScore = Math.max(68, Math.round(100 - (overloadedCount * 14) - (nearCapacityCount * 5)));

      groups.push({
        collegeId: collegeMeta.id,
        collegeName: collegeMeta.name,
        campusBadge: collegeMeta.badge,
        city: collegeMeta.city,
        totalFacultyCount: facList.length,
        totalVivasAssigned: totalVivas,
        totalSubjectsCount: subjectCodes.size,
        campusBalanceScore: campusScore,
        faculty: facList
      });
    });

    return groups;
  });

  // Global KPIs computed dynamically
  readonly overallStats = computed(() => {
    const list = this.facultyList();
    const totalFaculty = list.length;
    const overloadedCount = list.filter(f => f.status === 'OVERLOADED').length;
    const nearCapacityCount = list.filter(f => f.status === 'NEAR_CAPACITY').length;
    const balancedCount = list.filter(f => f.status === 'BALANCED').length;

    const totalVivas = list.reduce((acc, curr) => acc + curr.activeVivasAssigned, 0);
    const totalPendingVivas = list.reduce((acc, curr) => acc + curr.pendingVivas, 0);
    const avgHours = (list.reduce((acc, curr) => acc + curr.totalWeeklyHours, 0) / (totalFaculty || 1)).toFixed(1);

    // University balance health index
    const balanceScore = Math.max(70, Math.round(100 - (overloadedCount * 12) - (nearCapacityCount * 4)));

    // Total unique subjects across network
    const subjectSet = new Set<string>();
    list.forEach(f => f.subjectsTaught.forEach(s => subjectSet.add(s.code)));

    return {
      totalFaculty,
      overloadedCount,
      nearCapacityCount,
      balancedCount,
      totalVivas,
      totalPendingVivas,
      avgHours,
      balanceScore,
      totalSubjects: subjectSet.size,
      unallocatedCount: this.unassignedStudents().length
    };
  });

  // Department Summaries
  readonly departmentSummaries = computed<DepartmentWorkloadSummary[]>(() => {
    const depts = ['Computer Science & AI', 'Computer Networks', 'Software Engineering', 'Electrical & Robotics'];
    return depts.map(dept => {
      const facs = this.facultyList().filter(f => f.department === dept);
      const totalFaculty = facs.length;
      const totalVivas = facs.reduce((acc, c) => acc + c.activeVivasAssigned, 0);
      const avgWeeklyHours = totalFaculty ? Number((facs.reduce((acc, c) => acc + c.totalWeeklyHours, 0) / totalFaculty).toFixed(1)) : 0;
      const overloadedCount = facs.filter(f => f.status === 'OVERLOADED').length;
      const balanceHealthScore = Math.max(65, 100 - (overloadedCount * 20));

      return {
        department: dept,
        totalFaculty,
        avgWeeklyHours,
        totalVivas,
        overloadedCount,
        balanceHealthScore
      };
    });
  });

  // 1-Click AI Auto-Balancer Algorithm
  autoBalanceWorkload(): AutoBalanceResult {
    let reallocatedCount = 0;
    let overloadedResolvedCount = 0;

    const currentFaculty = [...this.facultyList()];
    const currentUnassigned = [...this.unassignedStudents()];

    // Step 1: Transfer excess vivas from OVERLOADED faculty to matching under-utilized faculty
    for (const overloaded of currentFaculty.filter(f => f.status === 'OVERLOADED')) {
      const excessCount = overloaded.activeVivasAssigned - overloaded.maxVivaCapacity;
      if (excessCount > 0) {
        const recipients = currentFaculty.filter(
          f => f.id !== overloaded.id && f.status === 'BALANCED' && f.activeVivasAssigned + 2 <= f.maxVivaCapacity
        );

        if (recipients.length > 0) {
          const recipient = recipients[0];
          const itemsToTransfer = overloaded.assignedVivasQueue.slice(0, Math.min(excessCount + 1, 2));

          overloaded.assignedVivasQueue = overloaded.assignedVivasQueue.filter(
            item => !itemsToTransfer.some(t => t.id === item.id)
          );

          recipient.assignedVivasQueue.push(...itemsToTransfer);

          overloaded.activeVivasAssigned -= itemsToTransfer.length;
          overloaded.pendingVivas -= itemsToTransfer.length;
          overloaded.weeklyVivaHours -= (itemsToTransfer.length * 0.4);
          overloaded.totalWeeklyHours = overloaded.weeklyTeachingHours + overloaded.weeklyVivaHours;

          recipient.activeVivasAssigned += itemsToTransfer.length;
          recipient.pendingVivas += itemsToTransfer.length;
          recipient.weeklyVivaHours += (itemsToTransfer.length * 0.4);
          recipient.totalWeeklyHours = recipient.weeklyTeachingHours + recipient.weeklyVivaHours;

          reallocatedCount += itemsToTransfer.length;
        }
      }
    }

    // Step 2: Allocate unassigned student candidates to optimal available mentors
    const remainingUnassigned: UnassignedStudentCandidate[] = [];
    for (const student of currentUnassigned) {
      const candidates = currentFaculty.filter(
        f => f.activeVivasAssigned < f.maxVivaCapacity &&
             (f.specializations.includes(student.requiredSpecialization) || f.subjectsTaught.some(s => s.code === student.subjectCode))
      );

      candidates.sort((a, b) => a.activeVivasAssigned - b.activeVivasAssigned);

      if (candidates.length > 0) {
        const bestMentor = candidates[0];
        const newViva: VivaStudentQueueItem = {
          id: `viva-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          studentName: student.studentName,
          rollNumber: student.rollNumber,
          subjectCode: student.subjectCode,
          subjectName: student.subjectName,
          scheduledTime: student.preferredTimeSlot.includes('Morning') ? 'Thu, 10:30 AM' : 'Thu, 02:30 PM',
          collegeName: student.collegeName,
          vivaType: 'MIDTERM',
          durationMinutes: 15
        };

        bestMentor.assignedVivasQueue.push(newViva);
        bestMentor.activeVivasAssigned += 1;
        bestMentor.pendingVivas += 1;
        bestMentor.weeklyVivaHours += 0.35;
        bestMentor.totalWeeklyHours = bestMentor.weeklyTeachingHours + bestMentor.weeklyVivaHours;

        reallocatedCount += 1;
      } else {
        remainingUnassigned.push(student);
      }
    }

    // Step 3: Recalculate status and burnout risk for all faculty
    for (const f of currentFaculty) {
      const loadRatio = f.activeVivasAssigned / f.maxVivaCapacity;
      const hourRatio = f.totalWeeklyHours / f.maxWeeklyHours;

      if (hourRatio > 1.0 || loadRatio > 1.0) {
        f.status = 'OVERLOADED';
        f.burnoutRiskPercent = Math.min(95, Math.round(Math.max(hourRatio, loadRatio) * 85));
      } else if (hourRatio > 0.8 || loadRatio > 0.8) {
        f.status = 'NEAR_CAPACITY';
        f.burnoutRiskPercent = Math.round(Math.max(hourRatio, loadRatio) * 75);
      } else {
        f.status = 'BALANCED';
        f.burnoutRiskPercent = Math.round(Math.max(hourRatio, loadRatio) * 55);
      }
    }

    overloadedResolvedCount = this.facultyList().filter(f => f.status === 'OVERLOADED').length -
                              currentFaculty.filter(f => f.status === 'OVERLOADED').length;

    this.facultyList.set([...currentFaculty]);
    this.unassignedStudents.set(remainingUnassigned);

    const newScore = Math.max(88, Math.round(100 - (currentFaculty.filter(f => f.status === 'OVERLOADED').length * 8)));

    return {
      reallocatedCount,
      overloadedResolvedCount: Math.max(1, overloadedResolvedCount),
      newUniversityBalanceScore: newScore,
      summaryMessage: `AI Auto-Balancer reallocated ${reallocatedCount} oral vivas across campus faculties. University Workload Health improved to ${newScore}%.`
    };
  }

  // Manual Transfer of a Viva from one faculty to another
  reassignViva(vivaId: string, fromFacultyId: string, toFacultyId: string): void {
    const list = [...this.facultyList()];
    const source = list.find(f => f.facultyId === fromFacultyId);
    const target = list.find(f => f.facultyId === toFacultyId);

    if (!source || !target) return;

    const itemIdx = source.assignedVivasQueue.findIndex(v => v.id === vivaId);
    if (itemIdx === -1) return;

    const [viva] = source.assignedVivasQueue.splice(itemIdx, 1);
    target.assignedVivasQueue.push(viva);

    source.activeVivasAssigned -= 1;
    source.pendingVivas -= 1;
    source.weeklyVivaHours = Math.max(0, source.weeklyVivaHours - 0.4);
    source.totalWeeklyHours = source.weeklyTeachingHours + source.weeklyVivaHours;

    target.activeVivasAssigned += 1;
    target.pendingVivas += 1;
    target.weeklyVivaHours += 0.4;
    target.totalWeeklyHours = target.weeklyTeachingHours + target.weeklyVivaHours;

    [source, target].forEach(f => {
      if (f.totalWeeklyHours > f.maxWeeklyHours || f.activeVivasAssigned > f.maxVivaCapacity) {
        f.status = 'OVERLOADED';
      } else if (f.totalWeeklyHours > f.maxWeeklyHours * 0.8) {
        f.status = 'NEAR_CAPACITY';
      } else {
        f.status = 'BALANCED';
      }
    });

    this.facultyList.set(list);
  }

  // Manually Assign Unassigned Student
  assignStudentToFaculty(studentId: string, targetFacultyId: string): void {
    const studentIdx = this.unassignedStudents().findIndex(s => s.id === studentId);
    if (studentIdx === -1) return;

    const student = this.unassignedStudents()[studentIdx];
    const list = [...this.facultyList()];
    const target = list.find(f => f.facultyId === targetFacultyId);

    if (!target) return;

    const newViva: VivaStudentQueueItem = {
      id: `viva-${Date.now()}`,
      studentName: student.studentName,
      rollNumber: student.rollNumber,
      subjectCode: student.subjectCode,
      subjectName: student.subjectName,
      scheduledTime: 'Fri, 11:30 AM',
      collegeName: student.collegeName,
      vivaType: 'MIDTERM',
      durationMinutes: 15
    };

    target.assignedVivasQueue.push(newViva);
    target.activeVivasAssigned += 1;
    target.pendingVivas += 1;
    target.weeklyVivaHours += 0.35;
    target.totalWeeklyHours = target.weeklyTeachingHours + target.weeklyVivaHours;

    this.unassignedStudents.update(prev => prev.filter(s => s.id !== studentId));
    this.facultyList.set(list);
  }
}
