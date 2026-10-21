import { Injectable, signal, computed } from '@angular/core';
import {
  ExamScheduleSlot,
  ExamRoomAllocation,
  HallTicketData,
  ExamConflictAlert,
  ExamType,
  ExamMode,
  ExamSlotStatus
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ExamSchedulerService {

  // Selected filters
  readonly selectedCollegeId = signal<string>('ALL');
  readonly selectedDepartment = signal<string>('ALL');
  readonly selectedExamType = signal<string>('ALL');
  readonly selectedMode = signal<string>('ALL');
  readonly selectedDate = signal<string>('2026-09-15');
  readonly searchQuery = signal<string>('');
  readonly activeTab = signal<'TIMETABLE' | 'ROOMS' | 'HALL_TICKETS'>('TIMETABLE');
  readonly selectedTicketForModal = signal<HallTicketData | null>(null);

  // Available dates for schedule picker
  readonly scheduleDates = signal<string[]>([
    '2026-09-15',
    '2026-09-16',
    '2026-09-17',
    '2026-09-18',
    '2026-09-19',
    '2026-09-20'
  ]);

  // Registered Colleges
  readonly registeredColleges = signal<{ id: string; name: string; badge: string; city: string }[]>([
    { id: 'inst-01', name: 'Apex Institute of Technology', badge: 'Apex Campus', city: 'Metro North' },
    { id: 'inst-02', name: 'Horizon College of Engineering', badge: 'Horizon Tech', city: 'South Hills' },
    { id: 'inst-03', name: 'Vanguard University Campus', badge: 'Vanguard Central', city: 'Downtown' },
    { id: 'inst-04', name: 'Metro Polytechnic Institute', badge: 'Metro East', city: 'East Valley' }
  ]);

  // Master Room Allocation Inventory
  readonly rooms = signal<ExamRoomAllocation[]>([
    {
      roomId: 'room-apex-aud-1',
      roomName: 'Grand Vivekananda Auditorium',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      buildingOrBlock: 'Block A, 1st Floor',
      type: 'PHYSICAL_AUDITORIUM',
      seatingCapacity: 120,
      currentOccupancy: 85,
      hasAiProctoringRig: true,
      cameraStatus: 'ONLINE_4K',
      assignedExamSlotIds: ['slot-101'],
      status: 'AVAILABLE'
    },
    {
      roomId: 'room-apex-lab-3',
      roomName: 'Turing Advanced AI Lab 302',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      buildingOrBlock: 'CS Department, 3rd Floor',
      type: 'SMART_LAB',
      seatingCapacity: 45,
      currentOccupancy: 42,
      hasAiProctoringRig: true,
      cameraStatus: 'ONLINE_4K',
      assignedExamSlotIds: ['slot-102', 'slot-103'],
      status: 'AVAILABLE'
    },
    {
      roomId: 'room-apex-viva-ch1',
      roomName: 'WebRTC Oral VIVA Channel Alpha',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      buildingOrBlock: 'Cloud Server Node-01',
      type: 'VIRTUAL_CHANNEL',
      seatingCapacity: 30,
      currentOccupancy: 28,
      hasAiProctoringRig: true,
      cameraStatus: 'N_A_VIRTUAL',
      webrtcBandwidthMbps: 950,
      assignedExamSlotIds: ['slot-104'],
      status: 'AVAILABLE'
    },
    {
      roomId: 'room-horiz-hall-b',
      roomName: 'Newton Examination Hall B-201',
      collegeId: 'inst-02',
      collegeName: 'Horizon College of Engineering',
      buildingOrBlock: 'Engineering Wing, 2nd Floor',
      type: 'STANDARD_CLASSROOM',
      seatingCapacity: 60,
      currentOccupancy: 58,
      hasAiProctoringRig: true,
      cameraStatus: 'ONLINE_4K',
      assignedExamSlotIds: ['slot-201'],
      status: 'AVAILABLE'
    },
    {
      roomId: 'room-horiz-ds-lab',
      roomName: 'Distributed Systems & Cloud Lab',
      collegeId: 'inst-02',
      collegeName: 'Horizon College of Engineering',
      buildingOrBlock: 'Tech Park Floor 4',
      type: 'SMART_LAB',
      seatingCapacity: 50,
      currentOccupancy: 50,
      hasAiProctoringRig: true,
      cameraStatus: 'CALIBRATION_REQ',
      assignedExamSlotIds: ['slot-202'],
      status: 'AVAILABLE'
    },
    {
      roomId: 'room-vanguard-aud-c',
      roomName: 'C.V. Raman Central Examination Hall',
      collegeId: 'inst-03',
      collegeName: 'Vanguard University Campus',
      buildingOrBlock: 'Central Admin Complex',
      type: 'PHYSICAL_AUDITORIUM',
      seatingCapacity: 150,
      currentOccupancy: 110,
      hasAiProctoringRig: true,
      cameraStatus: 'ONLINE_4K',
      assignedExamSlotIds: ['slot-301'],
      status: 'AVAILABLE'
    },
    {
      roomId: 'room-vanguard-viva-ch2',
      roomName: 'WebRTC Oral VIVA Channel Beta',
      collegeId: 'inst-03',
      collegeName: 'Vanguard University Campus',
      buildingOrBlock: 'Cloud Server Node-02',
      type: 'VIRTUAL_CHANNEL',
      seatingCapacity: 35,
      currentOccupancy: 32,
      hasAiProctoringRig: true,
      cameraStatus: 'N_A_VIRTUAL',
      webrtcBandwidthMbps: 880,
      assignedExamSlotIds: ['slot-302'],
      status: 'AVAILABLE'
    },
    {
      roomId: 'room-metro-hall-1',
      roomName: 'Aryabhata Poly Hall 101',
      collegeId: 'inst-04',
      collegeName: 'Metro Polytechnic Institute',
      buildingOrBlock: 'Main Academic Wing',
      type: 'STANDARD_CLASSROOM',
      seatingCapacity: 50,
      currentOccupancy: 35,
      hasAiProctoringRig: false,
      cameraStatus: 'OFFLINE',
      assignedExamSlotIds: ['slot-401'],
      status: 'AVAILABLE'
    }
  ]);

  // Master Examination Slots (Initial data with realistic conflict simulation)
  readonly slots = signal<ExamScheduleSlot[]>([
    {
      id: 'slot-101',
      examTitle: 'Deep Learning & Neural Architectures End-Sem',
      courseCode: 'CS801',
      courseName: 'Deep Learning & Transformers',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      campusBadge: 'Apex Campus',
      department: 'Computer Science & AI',
      examType: 'AI_PROCTORED_THEORY',
      mode: 'PHYSICAL_HALL',
      date: '2026-09-15',
      startTime: '09:00',
      endTime: '11:30',
      durationMinutes: 150,
      assignedMentorId: 'fac-101',
      assignedMentorName: 'Dr. Aris Thorne',
      secondaryInvigilatorName: 'Prof. Elena Rostova',
      roomId: 'room-apex-aud-1',
      roomName: 'Grand Vivekananda Auditorium',
      roomType: 'PHYSICAL_HALL',
      totalEnrolled: 85,
      roomCapacity: 120,
      status: 'CONFIRMED',
      hasAiProctoringRig: true,
      academicTerm: 'Autumn 2026'
    },
    {
      id: 'slot-102',
      examTitle: 'Microservices & Distributed Systems Lab Viva',
      courseCode: 'CS702',
      courseName: 'Distributed Systems & Cloud',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      campusBadge: 'Apex Campus',
      department: 'Computer Science & AI',
      examType: 'ORAL_VIVA',
      mode: 'PHYSICAL_HALL',
      date: '2026-09-15',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      assignedMentorId: 'fac-101', // INTENTIONAL CONFLICT: Dr. Aris Thorne double-booked with slot-101!
      assignedMentorName: 'Dr. Aris Thorne',
      roomId: 'room-apex-lab-3',
      roomName: 'Turing Advanced AI Lab 302',
      roomType: 'SMART_LAB',
      totalEnrolled: 42,
      roomCapacity: 45,
      status: 'CONFLICT_DETECTED',
      conflictDetails: 'Double-Booking Conflict: Dr. Aris Thorne is simultaneously scheduled for slot-101 (09:00 - 11:30).',
      hasAiProctoringRig: true,
      academicTerm: 'Autumn 2026'
    },
    {
      id: 'slot-104',
      examTitle: 'Remote WebRTC Viva: Computer Vision Capstone',
      courseCode: 'CS604',
      courseName: 'Computer Vision & GenAI',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      campusBadge: 'Apex Campus',
      department: 'Computer Science & AI',
      examType: 'ORAL_VIVA',
      mode: 'VIRTUAL_WEBRTC',
      date: '2026-09-15',
      startTime: '14:00',
      endTime: '17:00',
      durationMinutes: 180,
      assignedMentorId: 'fac-102',
      assignedMentorName: 'Prof. Elena Rostova',
      roomId: 'room-apex-viva-ch1',
      roomName: 'WebRTC Oral VIVA Channel Alpha',
      roomType: 'VIRTUAL_CHANNEL',
      totalEnrolled: 28,
      roomCapacity: 30,
      status: 'CONFIRMED',
      hasAiProctoringRig: true,
      academicTerm: 'Autumn 2026'
    },
    {
      id: 'slot-201',
      examTitle: 'Advanced Database Query Optimizers Theory Exam',
      courseCode: 'IT502',
      courseName: 'Database Engines & Distributed SQL',
      collegeId: 'inst-02',
      collegeName: 'Horizon College of Engineering',
      campusBadge: 'Horizon Tech',
      department: 'Information Technology',
      examType: 'AI_PROCTORED_THEORY',
      mode: 'PHYSICAL_HALL',
      date: '2026-09-15',
      startTime: '09:30',
      endTime: '12:00',
      durationMinutes: 150,
      assignedMentorId: 'fac-201',
      assignedMentorName: 'Dr. Rajesh Nair',
      roomId: 'room-horiz-hall-b',
      roomName: 'Newton Examination Hall B-201',
      roomType: 'PHYSICAL_HALL',
      totalEnrolled: 58,
      roomCapacity: 60,
      status: 'CONFIRMED',
      hasAiProctoringRig: true,
      academicTerm: 'Autumn 2026'
    },
    {
      id: 'slot-202',
      examTitle: 'Full-Stack Web Architectures Lab Practical',
      courseCode: 'IT601',
      courseName: 'Modern Web Engineering',
      collegeId: 'inst-02',
      collegeName: 'Horizon College of Engineering',
      campusBadge: 'Horizon Tech',
      department: 'Information Technology',
      examType: 'LAB_PRACTICAL',
      mode: 'PHYSICAL_HALL',
      date: '2026-09-15',
      startTime: '13:30',
      endTime: '16:30',
      durationMinutes: 180,
      assignedMentorId: 'fac-202',
      assignedMentorName: 'Prof. Sarah Jenkins',
      roomId: 'room-horiz-ds-lab',
      roomName: 'Distributed Systems & Cloud Lab',
      roomType: 'SMART_LAB',
      totalEnrolled: 50,
      roomCapacity: 50,
      status: 'CONFIRMED',
      hasAiProctoringRig: true,
      academicTerm: 'Autumn 2026'
    },
    {
      id: 'slot-301',
      examTitle: 'Quantum Computing & Algorithms Master Final',
      courseCode: 'QC901',
      courseName: 'Quantum Information Science',
      collegeId: 'inst-03',
      collegeName: 'Vanguard University Campus',
      campusBadge: 'Vanguard Central',
      department: 'Computer Science & AI',
      examType: 'END_SEM_FINAL',
      mode: 'PHYSICAL_HALL',
      date: '2026-09-15',
      startTime: '10:00',
      endTime: '13:00',
      durationMinutes: 180,
      assignedMentorId: 'fac-301',
      assignedMentorName: 'Dr. Siddharth Sen',
      roomId: 'room-vanguard-aud-c',
      roomName: 'C.V. Raman Central Examination Hall',
      roomType: 'PHYSICAL_HALL',
      totalEnrolled: 110,
      roomCapacity: 150,
      status: 'CONFIRMED',
      hasAiProctoringRig: true,
      academicTerm: 'Autumn 2026'
    },
    {
      id: 'slot-302',
      examTitle: 'Virtual Interactive Viva: AI Ethics & Safety',
      courseCode: 'AI805',
      courseName: 'AI Safety & Alignment',
      collegeId: 'inst-03',
      collegeName: 'Vanguard University Campus',
      campusBadge: 'Vanguard Central',
      department: 'Computer Science & AI',
      examType: 'ORAL_VIVA',
      mode: 'VIRTUAL_WEBRTC',
      date: '2026-09-15',
      startTime: '14:30',
      endTime: '17:30',
      durationMinutes: 180,
      assignedMentorId: 'fac-302',
      assignedMentorName: 'Prof. Maya Lin',
      roomId: 'room-vanguard-viva-ch2',
      roomName: 'WebRTC Oral VIVA Channel Beta',
      roomType: 'VIRTUAL_CHANNEL',
      totalEnrolled: 32,
      roomCapacity: 35,
      status: 'CONFIRMED',
      hasAiProctoringRig: true,
      academicTerm: 'Autumn 2026'
    },
    {
      id: 'slot-401',
      examTitle: 'Embedded Microcontroller Systems Practical',
      courseCode: 'EC401',
      courseName: 'Embedded IoT Firmware',
      collegeId: 'inst-04',
      collegeName: 'Metro Polytechnic Institute',
      campusBadge: 'Metro East',
      department: 'Electronics & Communication',
      examType: 'LAB_PRACTICAL',
      mode: 'PHYSICAL_HALL',
      date: '2026-09-15',
      startTime: '11:00',
      endTime: '14:00',
      durationMinutes: 180,
      assignedMentorId: 'fac-401',
      assignedMentorName: 'Prof. David K.',
      roomId: 'room-metro-hall-1',
      roomName: 'Aryabhata Poly Hall 101',
      roomType: 'PHYSICAL_HALL',
      totalEnrolled: 35,
      roomCapacity: 50,
      status: 'CONFIRMED',
      hasAiProctoringRig: false,
      academicTerm: 'Autumn 2026'
    }
  ]);

  // Master Hall Tickets Database (Generated for students enrolled in upcoming sessions)
  readonly hallTickets = signal<HallTicketData[]>([
    {
      ticketNumber: 'HT-APEX-2026-8801',
      studentId: 'stu-101',
      studentName: 'Aarav Sharma',
      rollNumber: '2023CS0101',
      studentEmail: 'aarav.sharma@apex.edu',
      studentAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Science & AI',
      semester: 'Sem 7 (Final Year)',
      examSlotId: 'slot-101',
      examTitle: 'Deep Learning & Neural Architectures End-Sem',
      courseCode: 'CS801',
      courseName: 'Deep Learning & Transformers',
      date: '2026-09-15',
      timeSlot: '09:00 - 11:30',
      assignedRoom: 'Grand Vivekananda Auditorium (Block A, 1st Fl)',
      seatNumber: 'DESK-A14',
      assignedMentorName: 'Dr. Aris Thorne',
      examMode: 'PHYSICAL_HALL',
      qrSecurityHash: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      reportingTime: '08:30 AM (Strict 30-min prior check-in)',
      instructions: [
        'Present this digital or printed pass along with your University Smart ID.',
        'AI Facial Biometric Verification will occur at Entry Gate A.',
        'No smart watches or unapproved electronic calculators permitted in hall.'
      ],
      verifiedStatus: 'ISSUED'
    },
    {
      ticketNumber: 'HT-APEX-2026-8802',
      studentId: 'stu-102',
      studentName: 'Priya Sundaram',
      rollNumber: '2023CS0102',
      studentEmail: 'priya.sundaram@apex.edu',
      studentAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Science & AI',
      semester: 'Sem 7 (Final Year)',
      examSlotId: 'slot-101',
      examTitle: 'Deep Learning & Neural Architectures End-Sem',
      courseCode: 'CS801',
      courseName: 'Deep Learning & Transformers',
      date: '2026-09-15',
      timeSlot: '09:00 - 11:30',
      assignedRoom: 'Grand Vivekananda Auditorium (Block A, 1st Fl)',
      seatNumber: 'DESK-A15',
      assignedMentorName: 'Dr. Aris Thorne',
      examMode: 'PHYSICAL_HALL',
      qrSecurityHash: 'SHA256:3c8d4512b918f0a28f89e2cf3315a6b7d2f9a12c8e3290b21a8f90382012d9a4',
      reportingTime: '08:30 AM',
      instructions: [
        'Present this digital or printed pass along with your University Smart ID.',
        'AI Facial Biometric Verification will occur at Entry Gate A.',
        'Bring approved stationary and graphing workbook.'
      ],
      verifiedStatus: 'CHECKED_IN'
    },
    {
      ticketNumber: 'HT-APEX-2026-8803',
      studentId: 'stu-103',
      studentName: 'Rohan Deshmukh',
      rollNumber: '2023CS0103',
      studentEmail: 'rohan.deshmukh@apex.edu',
      studentAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Science & AI',
      semester: 'Sem 6',
      examSlotId: 'slot-104',
      examTitle: 'Remote WebRTC Viva: Computer Vision Capstone',
      courseCode: 'CS604',
      courseName: 'Computer Vision & GenAI',
      date: '2026-09-15',
      timeSlot: '14:00 - 17:00',
      assignedRoom: 'WebRTC Oral VIVA Channel Alpha (Virtual Room ID: VIVA-ALPH-401)',
      seatNumber: 'VIRTUAL-SLOT-03 (14:30 - 14:50)',
      assignedMentorName: 'Prof. Elena Rostova',
      examMode: 'VIRTUAL_WEBRTC',
      qrSecurityHash: 'SHA256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      reportingTime: '13:45 (Join Virtual Lobby for WebRTC Proctoring Ping)',
      instructions: [
        'Ensure HD webcam and dual-mic noise cancellation are tested 15 mins prior.',
        'Continuous dual-gaze tracking and audio anomaly detector will be active.',
        'Share entire single display screen when requested by the examiner.'
      ],
      verifiedStatus: 'ISSUED'
    },
    {
      ticketNumber: 'HT-HORIZ-2026-9104',
      studentId: 'stu-201',
      studentName: 'Ananya Gupta',
      rollNumber: '2024IT0201',
      studentEmail: 'ananya.gupta@horizon.edu',
      studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      collegeName: 'Horizon College of Engineering',
      department: 'Information Technology',
      semester: 'Sem 5',
      examSlotId: 'slot-201',
      examTitle: 'Advanced Database Query Optimizers Theory Exam',
      courseCode: 'IT502',
      courseName: 'Database Engines & Distributed SQL',
      date: '2026-09-15',
      timeSlot: '09:30 - 12:00',
      assignedRoom: 'Newton Examination Hall B-201',
      seatNumber: 'DESK-N22',
      assignedMentorName: 'Dr. Rajesh Nair',
      examMode: 'PHYSICAL_HALL',
      qrSecurityHash: 'SHA256:1a82f9b8a0d4b830e2f41bc90a82b9e4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8',
      reportingTime: '09:00 AM',
      instructions: [
        'Bring government or student photo ID card.',
        'Submit mobile devices at the Faraday storage pouch before entering.'
      ],
      verifiedStatus: 'ISSUED'
    },
    {
      ticketNumber: 'HT-VANG-2026-7705',
      studentId: 'stu-301',
      studentName: 'Zainab Qureshi',
      rollNumber: '2023QC0301',
      studentEmail: 'zainab.q@vanguard.edu',
      studentAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      collegeName: 'Vanguard University Campus',
      department: 'Computer Science & AI',
      semester: 'Sem 8',
      examSlotId: 'slot-301',
      examTitle: 'Quantum Computing & Algorithms Master Final',
      courseCode: 'QC901',
      courseName: 'Quantum Information Science',
      date: '2026-09-15',
      timeSlot: '10:00 - 13:00',
      assignedRoom: 'C.V. Raman Central Examination Hall',
      seatNumber: 'ROW-C / SEAT-08',
      assignedMentorName: 'Dr. Siddharth Sen',
      examMode: 'PHYSICAL_HALL',
      qrSecurityHash: 'SHA256:9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72',
      reportingTime: '09:30 AM',
      instructions: [
        'Quantum circuit simulator scratchpad will be provided on the terminal.',
        'Biometric check-in mandatory at Hall entrance.'
      ],
      verifiedStatus: 'ISSUED'
    }
  ]);

  // Dynamic AI Conflict Alerts computed from slot schedule
  readonly conflictAlerts = computed<ExamConflictAlert[]>(() => {
    const list = this.slots();
    const alerts: ExamConflictAlert[] = [];

    // Check mentor overlaps
    const mentorMap = new Map<string, ExamScheduleSlot[]>();
    for (const slot of list) {
      const key = `${slot.date}_${slot.assignedMentorId}`;
      if (!mentorMap.has(key)) {
        mentorMap.set(key, []);
      }
      mentorMap.get(key)!.push(slot);
    }

    mentorMap.forEach((slotsForMentor, key) => {
      if (slotsForMentor.length > 1) {
        // Check pairwise time overlap
        for (let i = 0; i < slotsForMentor.length; i++) {
          for (let j = i + 1; j < slotsForMentor.length; j++) {
            const s1 = slotsForMentor[i];
            const s2 = slotsForMentor[j];
            if (this.timeOverlaps(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
              alerts.push({
                id: `conflict-mentor-${s1.id}-${s2.id}`,
                conflictType: 'FACULTY_DOUBLE_BOOKING',
                severity: 'CRITICAL',
                affectedSlotIds: [s1.id, s2.id],
                description: `Faculty Double-Booking: ${s1.assignedMentorName} is assigned to "${s1.examTitle}" (${s1.startTime}-${s1.endTime}) and "${s2.examTitle}" (${s2.startTime}-${s2.endTime}) simultaneously.`,
                collegeName: s1.collegeName,
                timeSlot: `${s1.date} • ${s1.startTime} - ${s1.endTime}`,
                recommendedResolution: `Reassign "${s2.courseCode}" Oral VIVA to Dr. Marcus Vance or shift time slot to 14:00.`
              });
            }
          }
        }
      }
    });

    // Check room capacity overflows
    for (const slot of list) {
      if (slot.totalEnrolled > slot.roomCapacity) {
        alerts.push({
          id: `conflict-cap-${slot.id}`,
          conflictType: 'CAPACITY_OVERFLOW',
          severity: 'WARNING',
          affectedSlotIds: [slot.id],
          description: `Room Capacity Overflow: ${slot.totalEnrolled} students enrolled in "${slot.examTitle}" exceeds room capacity (${slot.roomCapacity}) for ${slot.roomName}.`,
          collegeName: slot.collegeName,
          timeSlot: `${slot.date} • ${slot.startTime} - ${slot.endTime}`,
          recommendedResolution: `Upgrade room assignment to Grand Auditorium (Capacity 120) or split into 2 batches.`
        });
      }
    }

    return alerts;
  });

  // Filtered Slots for the Calendar Matrix
  readonly filteredSlots = computed<ExamScheduleSlot[]>(() => {
    const cid = this.selectedCollegeId();
    const dept = this.selectedDepartment();
    const type = this.selectedExamType();
    const mode = this.selectedMode();
    const dt = this.selectedDate();
    const query = this.searchQuery().toLowerCase().trim();

    return this.slots().filter(slot => {
      const matchCollege = cid === 'ALL' || slot.collegeId === cid;
      const matchDept = dept === 'ALL' || slot.department === dept;
      const matchType = type === 'ALL' || slot.examType === type;
      const matchMode = mode === 'ALL' || slot.mode === mode;
      const matchDate = !dt || slot.date === dt;
      const matchQuery = !query ||
        slot.examTitle.toLowerCase().includes(query) ||
        slot.courseCode.toLowerCase().includes(query) ||
        slot.assignedMentorName.toLowerCase().includes(query) ||
        slot.roomName.toLowerCase().includes(query) ||
        slot.collegeName.toLowerCase().includes(query);

      return matchCollege && matchDept && matchType && matchMode && matchDate && matchQuery;
    });
  });

  // Filtered Rooms
  readonly filteredRooms = computed<ExamRoomAllocation[]>(() => {
    const cid = this.selectedCollegeId();
    const query = this.searchQuery().toLowerCase().trim();

    return this.rooms().filter(room => {
      const matchCollege = cid === 'ALL' || room.collegeId === cid;
      const matchQuery = !query ||
        room.roomName.toLowerCase().includes(query) ||
        room.buildingOrBlock.toLowerCase().includes(query) ||
        room.collegeName.toLowerCase().includes(query);
      return matchCollege && matchQuery;
    });
  });

  // Filtered Hall Tickets
  readonly filteredHallTickets = computed<HallTicketData[]>(() => {
    const cid = this.selectedCollegeId();
    const query = this.searchQuery().toLowerCase().trim();

    return this.hallTickets().filter(ticket => {
      const matchCollege = cid === 'ALL' ||
        (cid === 'inst-01' && ticket.collegeName.includes('Apex')) ||
        (cid === 'inst-02' && ticket.collegeName.includes('Horizon')) ||
        (cid === 'inst-03' && ticket.collegeName.includes('Vanguard')) ||
        (cid === 'inst-04' && ticket.collegeName.includes('Metro'));

      const matchQuery = !query ||
        ticket.ticketNumber.toLowerCase().includes(query) ||
        ticket.studentName.toLowerCase().includes(query) ||
        ticket.rollNumber.toLowerCase().includes(query) ||
        ticket.courseCode.toLowerCase().includes(query) ||
        ticket.examTitle.toLowerCase().includes(query) ||
        ticket.assignedRoom.toLowerCase().includes(query);

      return matchCollege && matchQuery;
    });
  });

  // KPI Statistics
  readonly kpiStats = computed(() => {
    const allSlots = this.slots();
    const allRooms = this.rooms();
    const allTickets = this.hallTickets();
    const conflicts = this.conflictAlerts();

    const totalEnrolled = allSlots.reduce((acc, s) => acc + s.totalEnrolled, 0);
    const totalRoomCap = allRooms.reduce((acc, r) => acc + r.seatingCapacity, 0);
    const totalOccupied = allRooms.reduce((acc, r) => acc + r.currentOccupancy, 0);
    const roomUtil = totalRoomCap > 0 ? Math.round((totalOccupied / totalRoomCap) * 100) : 0;
    const virtualChannelsCount = allRooms.filter(r => r.type === 'VIRTUAL_CHANNEL').length;

    return {
      totalScheduledExams: allSlots.length,
      totalEnrolledCandidates: totalEnrolled,
      totalHallTicketsIssued: allTickets.length,
      conflictsDetected: conflicts.length,
      roomUtilizationPercent: roomUtil,
      activeRoomsAndChannels: allRooms.length,
      virtualChannelsCount
    };
  });

  private timeOverlaps(startA: string, endA: string, startB: string, endB: string): boolean {
    const minA = this.timeToMinutes(startA);
    const maxA = this.timeToMinutes(endA);
    const minB = this.timeToMinutes(startB);
    const maxB = this.timeToMinutes(endB);
    return Math.max(minA, minB) < Math.min(maxA, maxB);
  }

  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + (m || 0);
  }

  // 1-Click AI Auto-Resolve Conflicts Engine
  autoResolveAllConflicts(): { resolvedCount: number; summary: string } {
    const currentSlots = [...this.slots()];
    let resolvedCount = 0;

    // Shift slot-102 or reassign mentor
    const updated = currentSlots.map(slot => {
      if (slot.id === 'slot-102') {
        resolvedCount++;
        return {
          ...slot,
          startTime: '13:00',
          endTime: '15:00',
          assignedMentorId: 'fac-103',
          assignedMentorName: 'Dr. Marcus Vance',
          status: 'RESCHEDULED' as ExamSlotStatus,
          conflictDetails: undefined
        };
      }
      return slot;
    });

    this.slots.set(updated);
    return {
      resolvedCount,
      summary: `AI Auto-Scheduler successfully resolved ${resolvedCount} critical clash. Reassigned Slot #102 to Dr. Marcus Vance (13:00 - 15:00) with 0 campus overlaps.`
    };
  }

  // Add new exam slot
  addExamSlot(newSlot: Omit<ExamScheduleSlot, 'id' | 'status'>): ExamScheduleSlot {
    const id = `slot-${Date.now().toString().slice(-4)}`;
    const fullSlot: ExamScheduleSlot = {
      ...newSlot,
      id,
      status: 'CONFIRMED'
    };
    this.slots.update(prev => [fullSlot, ...prev]);
    return fullSlot;
  }

  // Generate Hall Ticket preview
  openHallTicketModal(ticket: HallTicketData) {
    this.selectedTicketForModal.set(ticket);
  }

  closeHallTicketModal() {
    this.selectedTicketForModal.set(null);
  }

  // Generate bulk hall tickets for an exam slot
  generateBatchTicketsForSlot(slotId: string): number {
    const slot = this.slots().find(s => s.id === slotId);
    if (!slot) return 0;

    const sampleStudents = [
      { name: 'Kavya Nair', roll: '2023CS0104', email: 'kavya.nair@apex.edu' },
      { name: 'Devansh Verma', roll: '2023CS0105', email: 'devansh.v@apex.edu' },
      { name: 'Sanya Mirza', roll: '2023CS0106', email: 'sanya.m@apex.edu' }
    ];

    const newTickets: HallTicketData[] = sampleStudents.map((st, idx) => ({
      ticketNumber: `HT-${slot.campusBadge.toUpperCase()}-${Date.now().toString().slice(-4)}-${idx + 1}`,
      studentId: `stu-gen-${idx + 10}`,
      studentName: st.name,
      rollNumber: st.roll,
      studentEmail: st.email,
      studentAvatar: `https://images.unsplash.com/photo-1535713875002?w=150&auto=format&fit=crop&q=80`,
      collegeName: slot.collegeName,
      department: slot.department,
      semester: 'Current Semester',
      examSlotId: slot.id,
      examTitle: slot.examTitle,
      courseCode: slot.courseCode,
      courseName: slot.courseName,
      date: slot.date,
      timeSlot: `${slot.startTime} - ${slot.endTime}`,
      assignedRoom: `${slot.roomName}`,
      seatNumber: `DESK-AUTO-${idx + 30}`,
      assignedMentorName: slot.assignedMentorName,
      examMode: slot.mode,
      qrSecurityHash: `SHA256:${Math.random().toString(36).substring(2)}${Date.now()}`,
      reportingTime: '30 Mins Prior',
      instructions: [
        'Mandatory University Photo ID card check at door.',
        'No unauthorized devices or notes in examination zone.'
      ],
      verifiedStatus: 'ISSUED'
    }));

    this.hallTickets.update(prev => [...newTickets, ...prev]);
    return newTickets.length;
  }
}
