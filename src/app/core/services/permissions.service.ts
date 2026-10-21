import { Injectable, signal, computed } from '@angular/core';
import {
  InstitutionalRoleDefinition,
  PermissionCapabilityCategory,
  UserPermissionAssignment,
  SecurityAuditLogEntry,
  TemporaryDelegationPass,
  RoleCategory,
  CapabilityRiskLevel
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {

  // Filter Signals
  readonly selectedCollegeId = signal<string>('ALL');
  readonly selectedDepartment = signal<string>('ALL');
  readonly selectedRoleKey = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly activeTab = signal<'MATRIX' | 'USERS' | 'DELEGATIONS' | 'AUDIT_LOG'>('MATRIX');
  readonly selectedUserForModal = signal<UserPermissionAssignment | null>(null);

  // Registered Colleges
  readonly registeredColleges = signal<{ id: string; name: string; badge: string; city: string }[]>([
    { id: 'inst-01', name: 'Apex Institute of Technology', badge: 'Apex Campus', city: 'Metro North' },
    { id: 'inst-02', name: 'Horizon College of Engineering', badge: 'Horizon Tech', city: 'South Hills' },
    { id: 'inst-03', name: 'Vanguard University Campus', badge: 'Vanguard Central', city: 'Downtown' },
    { id: 'inst-04', name: 'Metro Polytechnic Institute', badge: 'Metro East', city: 'East Valley' }
  ]);

  // Capability Categories Hierarchy
  readonly capabilityCategories = signal<PermissionCapabilityCategory[]>([
    {
      categoryKey: 'AI_CURRICULUM',
      categoryName: 'AI Engine & Institutional Knowledge Ingestion',
      icon: '🧠',
      description: 'Fine-tuning weights, custom syllabus ingestion, and Viva AI Co-Pilot prompt engineering',
      capabilities: [
        { key: 'ai.model.deploy', name: 'Deploy Model Checkpoints & LoRA Weights', description: 'Authorize switching live models between Llama-3.3, Mistral, and ScholarX fine-tuned checkpoints', riskLevel: 'HIGH' },
        { key: 'ai.syllabus.upload', name: 'Ingest Custom Syllabus & Textbooks', description: 'Upload university curriculum PDFs, question banks, and Course Outcome (CO) mapping files', riskLevel: 'MEDIUM' },
        { key: 'ai.prompt.override', name: 'Override Viva Co-Pilot System Prompts', description: 'Modify oral viva evaluation scoring rubrics, difficulty adjusters, and follow-up prompts', riskLevel: 'HIGH' }
      ]
    },
    {
      categoryKey: 'EXAM_GOVERNANCE',
      categoryName: 'Multi-Campus Examination & Room Scheduler',
      icon: '📅',
      description: 'Master timetable matrix, hall/channel allocation, clash resolution, and hall tickets',
      capabilities: [
        { key: 'exam.timetable.publish', name: 'Publish & Reschedule Master Exam Timetable', description: 'Create, modify, and publish examination slots across all campus faculties', riskLevel: 'CRITICAL' },
        { key: 'exam.room.allocate', name: 'Allocate Physical Halls & WebRTC Rigs', description: 'Assign auditoriums, computing labs, and virtual proctored breakout rooms', riskLevel: 'MEDIUM' },
        { key: 'exam.autoresolve.execute', name: 'Execute 1-Click AI Clash Auto-Resolver', description: 'Authorize algorithmic shifting of overlapping examiner and room double-bookings', riskLevel: 'HIGH' },
        { key: 'exam.hallticket.issue', name: 'Issue Cryptographic QR Hall Passes', description: 'Generate and sign official digital student exam entry passes with SHA256 hashes', riskLevel: 'MEDIUM' }
      ]
    },
    {
      categoryKey: 'PROCTORING_FORENSICS',
      categoryName: 'Central Proctoring & Anti-Cheating Forensics',
      icon: '🛡️',
      description: 'Live 4K CCTV feeds, WebRTC gaze tracking, anomaly detection, and academic penalty enforcement',
      capabilities: [
        { key: 'proctor.cctv.stream', name: 'Access Live 4K AI CCTV & Student Webcams', description: 'Real-time multi-angle streaming of exam halls and remote candidate browser feeds', riskLevel: 'HIGH' },
        { key: 'proctor.biometric.override', name: 'Facial Biometrics Check-in Override', description: 'Authorize manual candidate check-in if AI facial recognition score is below threshold', riskLevel: 'MEDIUM' },
        { key: 'proctor.incident.penalize', name: 'Submit Cheating Violation & Disqualify Exam', description: 'Issue formal academic malpractice flags and terminate active exam sessions', riskLevel: 'CRITICAL' }
      ]
    },
    {
      categoryKey: 'OBE_GRADING',
      categoryName: 'Outcome-Based Education (OBE) & Grade Book',
      icon: '📊',
      description: 'Oral Viva score submission, CO/PO attainment matrices, and grade freeze locks',
      capabilities: [
        { key: 'grade.viva.submit', name: 'Submit Oral Viva & Assessment Marks', description: 'Record student oral viva evaluations, rubric breakdowns, and formative scores', riskLevel: 'MEDIUM' },
        { key: 'grade.matrix.recalculate', name: 'Recalculate Course Outcome (CO/PO) Matrix', description: 'Trigger statistical attainment recalculations across Bloom\'s taxonomy levels', riskLevel: 'MEDIUM' },
        { key: 'grade.freeze.lock', name: 'Lock & Finalize University Exam Ledger', description: 'Immutable freeze of final term grades for Registrar transcript publication', riskLevel: 'CRITICAL' }
      ]
    },
    {
      categoryKey: 'BROADCAST_ADS',
      categoryName: 'Global Broadcasting, Ads & Notice Distribution',
      icon: '📢',
      description: 'Emergency ticker notices, campus spotlight ads, and student application routing',
      capabilities: [
        { key: 'broadcast.notice.post', name: 'Publish Urgent Global Notice Bar', description: 'Broadcast high-priority ticker alerts directly across all active student & mentor headers', riskLevel: 'HIGH' },
        { key: 'broadcast.ad.create', name: 'Create Spotlight Banner Ads & Forms', description: 'Design and deploy campus promotional banners with direct mentor application forms', riskLevel: 'MEDIUM' }
      ]
    }
  ]);

  // Master Institutional Role Definitions
  readonly roles = signal<InstitutionalRoleDefinition[]>([
    {
      roleKey: 'SUPER_ADMIN',
      roleName: 'System Super Administrator & Chancellor IT',
      category: 'CENTRAL_GOVERNANCE',
      description: 'Full unconstrained platform governance across all institutions, AI infrastructure, and ledger locks.',
      usersAssignedCount: 3,
      isCustomOrSystem: 'SYSTEM_DEFAULT',
      securityTier: 1,
      capabilities: {
        'ai.model.deploy': true,
        'ai.syllabus.upload': true,
        'ai.prompt.override': true,
        'exam.timetable.publish': true,
        'exam.room.allocate': true,
        'exam.autoresolve.execute': true,
        'exam.hallticket.issue': true,
        'proctor.cctv.stream': true,
        'proctor.biometric.override': true,
        'proctor.incident.penalize': true,
        'grade.viva.submit': true,
        'grade.matrix.recalculate': true,
        'grade.freeze.lock': true,
        'broadcast.notice.post': true,
        'broadcast.ad.create': true
      }
    },
    {
      roleKey: 'CAMPUS_DEAN',
      roleName: 'Campus Dean & Academic Controller',
      category: 'CAMPUS_ADMIN',
      description: 'Institutional lead with exam publishing, room authority, and grade freeze verification for their campus.',
      usersAssignedCount: 8,
      isCustomOrSystem: 'SYSTEM_DEFAULT',
      securityTier: 2,
      capabilities: {
        'ai.model.deploy': false,
        'ai.syllabus.upload': true,
        'ai.prompt.override': true,
        'exam.timetable.publish': true,
        'exam.room.allocate': true,
        'exam.autoresolve.execute': true,
        'exam.hallticket.issue': true,
        'proctor.cctv.stream': true,
        'proctor.biometric.override': true,
        'proctor.incident.penalize': true,
        'grade.viva.submit': true,
        'grade.matrix.recalculate': true,
        'grade.freeze.lock': true,
        'broadcast.notice.post': true,
        'broadcast.ad.create': true
      }
    },
    {
      roleKey: 'HEAD_OF_DEPARTMENT',
      roleName: 'Head of Department (HOD)',
      category: 'FACULTY_ACADEMIC',
      description: 'Departmental curriculum director with syllabus upload, workload balancing, and grading oversight.',
      usersAssignedCount: 16,
      isCustomOrSystem: 'SYSTEM_DEFAULT',
      securityTier: 2,
      capabilities: {
        'ai.model.deploy': false,
        'ai.syllabus.upload': true,
        'ai.prompt.override': true,
        'exam.timetable.publish': false,
        'exam.room.allocate': true,
        'exam.autoresolve.execute': false,
        'exam.hallticket.issue': true,
        'proctor.cctv.stream': true,
        'proctor.biometric.override': true,
        'proctor.incident.penalize': true,
        'grade.viva.submit': true,
        'grade.matrix.recalculate': true,
        'grade.freeze.lock': false,
        'broadcast.notice.post': false,
        'broadcast.ad.create': true
      }
    },
    {
      roleKey: 'SENIOR_MENTOR',
      roleName: 'Senior Professor & Viva Mentor',
      category: 'FACULTY_ACADEMIC',
      description: 'Evaluates oral vivas with AI Co-Pilot, assesses labs, and maps Course Outcome rubric marks.',
      usersAssignedCount: 64,
      isCustomOrSystem: 'SYSTEM_DEFAULT',
      securityTier: 3,
      capabilities: {
        'ai.model.deploy': false,
        'ai.syllabus.upload': true,
        'ai.prompt.override': false,
        'exam.timetable.publish': false,
        'exam.room.allocate': false,
        'exam.autoresolve.execute': false,
        'exam.hallticket.issue': false,
        'proctor.cctv.stream': true,
        'proctor.biometric.override': false,
        'proctor.incident.penalize': false,
        'grade.viva.submit': true,
        'grade.matrix.recalculate': true,
        'grade.freeze.lock': false,
        'broadcast.notice.post': false,
        'broadcast.ad.create': false
      }
    },
    {
      roleKey: 'PROCTOR_INVIGILATOR',
      roleName: 'Central Proctor & Invigilation Officer',
      category: 'PROCTORING_EVALUATION',
      description: 'Oversees exam halls, validates facial biometrics, flags anomalies, and logs cheating incidents.',
      usersAssignedCount: 28,
      isCustomOrSystem: 'SYSTEM_DEFAULT',
      securityTier: 3,
      capabilities: {
        'ai.model.deploy': false,
        'ai.syllabus.upload': false,
        'ai.prompt.override': false,
        'exam.timetable.publish': false,
        'exam.room.allocate': false,
        'exam.autoresolve.execute': false,
        'exam.hallticket.issue': false,
        'proctor.cctv.stream': true,
        'proctor.biometric.override': true,
        'proctor.incident.penalize': true,
        'grade.viva.submit': false,
        'grade.matrix.recalculate': false,
        'grade.freeze.lock': false,
        'broadcast.notice.post': false,
        'broadcast.ad.create': false
      }
    },
    {
      roleKey: 'EXTERNAL_EXAMINER',
      roleName: 'Guest External Viva Examiner (Delegated)',
      category: 'PROCTORING_EVALUATION',
      description: 'Temporary external evaluator invited for specific Viva panels with limited-time assessment rights.',
      usersAssignedCount: 12,
      isCustomOrSystem: 'CAMPUS_CUSTOM',
      securityTier: 4,
      capabilities: {
        'ai.model.deploy': false,
        'ai.syllabus.upload': false,
        'ai.prompt.override': false,
        'exam.timetable.publish': false,
        'exam.room.allocate': false,
        'exam.autoresolve.execute': false,
        'exam.hallticket.issue': false,
        'proctor.cctv.stream': true,
        'proctor.biometric.override': false,
        'proctor.incident.penalize': false,
        'grade.viva.submit': true,
        'grade.matrix.recalculate': false,
        'grade.freeze.lock': false,
        'broadcast.notice.post': false,
        'broadcast.ad.create': false
      }
    },
    {
      roleKey: 'STUDENT_CANDIDATE',
      roleName: 'Enrolled Student Candidate',
      category: 'STUDENT_LEVEL',
      description: 'Takes assessments, participates in AI Viva sessions, downloads hall tickets, and submits applications.',
      usersAssignedCount: 1240,
      isCustomOrSystem: 'SYSTEM_DEFAULT',
      securityTier: 5,
      capabilities: {
        'ai.model.deploy': false,
        'ai.syllabus.upload': false,
        'ai.prompt.override': false,
        'exam.timetable.publish': false,
        'exam.room.allocate': false,
        'exam.autoresolve.execute': false,
        'exam.hallticket.issue': false,
        'proctor.cctv.stream': false,
        'proctor.biometric.override': false,
        'proctor.incident.penalize': false,
        'grade.viva.submit': false,
        'grade.matrix.recalculate': false,
        'grade.freeze.lock': false,
        'broadcast.notice.post': false,
        'broadcast.ad.create': false
      }
    }
  ]);

  // Master User Permission Directory across Campuses
  readonly users = signal<UserPermissionAssignment[]>([
    {
      id: 'usr-001',
      userId: 'FAC-APEX-01',
      userName: 'Dr. Aris Thorne',
      userEmail: 'aris.thorne@apex.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      campusBadge: 'Apex Campus',
      department: 'Computer Science & AI',
      assignedRoleKey: 'HEAD_OF_DEPARTMENT',
      assignedRoleName: 'Head of Department (HOD)',
      customOverridesCount: 1,
      delegationActive: false,
      status: 'ACTIVE',
      lastLoginIp: '192.168.10.45 (Campus VPN)',
      lastLoginTime: 'Today at 09:14 AM',
      mfaEnabled: true
    },
    {
      id: 'usr-002',
      userId: 'FAC-APEX-02',
      userName: 'Prof. Elena Rostova',
      userEmail: 'elena.rostova@apex.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      campusBadge: 'Apex Campus',
      department: 'Computer Science & AI',
      assignedRoleKey: 'SENIOR_MENTOR',
      assignedRoleName: 'Senior Professor & Viva Mentor',
      customOverridesCount: 0,
      delegationActive: true,
      delegationExpiresAt: '2026-09-18 18:00',
      delegatedToName: 'Dr. Marcus Vance (Guest Co-Chair)',
      status: 'ACTIVE',
      lastLoginIp: '192.168.10.78 (Campus Wi-Fi)',
      lastLoginTime: 'Today at 10:22 AM',
      mfaEnabled: true
    },
    {
      id: 'usr-003',
      userId: 'FAC-HORIZ-01',
      userName: 'Dr. Rajesh Nair',
      userEmail: 'rajesh.nair@horizon.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      collegeId: 'inst-02',
      collegeName: 'Horizon College of Engineering',
      campusBadge: 'Horizon Tech',
      department: 'Information Technology',
      assignedRoleKey: 'CAMPUS_DEAN',
      assignedRoleName: 'Campus Dean & Academic Controller',
      customOverridesCount: 0,
      delegationActive: false,
      status: 'ACTIVE',
      lastLoginIp: '172.16.4.12 (Institutional Fiber)',
      lastLoginTime: 'Today at 08:45 AM',
      mfaEnabled: true
    },
    {
      id: 'usr-004',
      userId: 'FAC-VANG-01',
      userName: 'Dr. Siddharth Sen',
      userEmail: 'siddharth.sen@vanguard.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      collegeId: 'inst-03',
      collegeName: 'Vanguard University Campus',
      campusBadge: 'Vanguard Central',
      department: 'Computer Science & AI',
      assignedRoleKey: 'HEAD_OF_DEPARTMENT',
      assignedRoleName: 'Head of Department (HOD)',
      customOverridesCount: 2,
      delegationActive: false,
      status: 'ACTIVE',
      lastLoginIp: '10.200.1.55 (Quantum Lab Net)',
      lastLoginTime: 'Yesterday at 17:30',
      mfaEnabled: true
    },
    {
      id: 'usr-005',
      userId: 'PROCTOR-001',
      userName: 'Vikram Mehta',
      userEmail: 'vikram.proctor@apex.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      campusBadge: 'Apex Campus',
      department: 'Central Examination Syndicate',
      assignedRoleKey: 'PROCTOR_INVIGILATOR',
      assignedRoleName: 'Central Proctor & Invigilation Officer',
      customOverridesCount: 0,
      delegationActive: false,
      status: 'ACTIVE',
      lastLoginIp: '192.168.99.10 (Proctor Command Console)',
      lastLoginTime: 'Today at 07:50 AM',
      mfaEnabled: true
    },
    {
      id: 'usr-006',
      userId: 'EXT-VIVA-01',
      userName: 'Dr. Evelyn Carter',
      userEmail: 'evelyn.carter@mit.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      campusBadge: 'Apex Campus',
      department: 'Computer Science & AI',
      assignedRoleKey: 'EXTERNAL_EXAMINER',
      assignedRoleName: 'Guest External Viva Examiner (Delegated)',
      customOverridesCount: 0,
      delegationActive: true,
      delegationExpiresAt: '2026-09-17 23:59',
      delegatedToName: 'Self (Temporary Access Pass #DP-9901)',
      status: 'ACTIVE',
      lastLoginIp: '18.9.22.101 (External WebRTC Node)',
      lastLoginTime: 'Today at 11:05 AM',
      mfaEnabled: false
    }
  ]);

  // Temporary Delegation Passes
  readonly delegationPasses = signal<TemporaryDelegationPass[]>([
    {
      id: 'del-101',
      passCode: 'DP-APEX-2026-9901',
      granteeName: 'Dr. Evelyn Carter',
      granteeEmail: 'evelyn.carter@mit.edu',
      collegeId: 'inst-01',
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Science & AI',
      scopeDescription: 'Capstone Oral Viva Evaluation Panel for CS801 & CS604',
      targetRoleKey: 'EXTERNAL_EXAMINER',
      targetRoleName: 'Guest External Viva Examiner',
      issuedBy: 'Dr. Aris Thorne (HOD)',
      validFrom: '2026-09-15 08:00',
      validUntil: '2026-09-17 23:59',
      status: 'ACTIVE'
    },
    {
      id: 'del-102',
      passCode: 'DP-HORIZ-2026-4402',
      granteeName: 'Prof. Ramesh Kulkarni',
      granteeEmail: 'ramesh.k@iitb.ac.in',
      collegeId: 'inst-02',
      collegeName: 'Horizon College of Engineering',
      department: 'Information Technology',
      scopeDescription: 'Database Engines Theory Paper Moderation & Rubric Review',
      targetRoleKey: 'EXTERNAL_EXAMINER',
      targetRoleName: 'Guest External Viva Examiner',
      issuedBy: 'Dr. Rajesh Nair (Dean)',
      validFrom: '2026-09-14 09:00',
      validUntil: '2026-09-16 18:00',
      status: 'ACTIVE'
    }
  ]);

  // Real-time Security Audit Log Stream
  readonly auditLogs = signal<SecurityAuditLogEntry[]>([
    {
      id: 'log-01',
      timestamp: '2026-09-15 11:15:32',
      performedBy: 'System Super Admin (Chancellor)',
      targetUserOrRole: 'Role: CAMPUS_DEAN',
      collegeName: 'Apex Institute of Technology',
      actionType: 'PERMISSION_OVERRIDE',
      details: 'Enabled "grade.freeze.lock" privilege for Campus Dean tier under Autumn 2026 policy.',
      severity: 'INFO',
      ipAddress: '10.0.0.1 (Syndicate Master Node)'
    },
    {
      id: 'log-02',
      timestamp: '2026-09-15 10:45:10',
      performedBy: 'Dr. Aris Thorne (HOD)',
      targetUserOrRole: 'Dr. Evelyn Carter',
      collegeName: 'Apex Institute of Technology',
      actionType: 'DELEGATION_ISSUED',
      details: 'Issued 48-hour temporary guest evaluation pass (DP-APEX-2026-9901) for Capstone Oral Viva.',
      severity: 'WARNING',
      ipAddress: '192.168.10.45'
    },
    {
      id: 'log-03',
      timestamp: '2026-09-15 09:02:44',
      performedBy: 'Vikram Mehta (Proctor Officer)',
      targetUserOrRole: 'Student 2023CS0109',
      collegeName: 'Apex Institute of Technology',
      actionType: 'SECURITY_REVOCATION',
      details: 'Flagged secondary audio channel anomaly during WebRTC pre-check. Candidate warned.',
      severity: 'CRITICAL',
      ipAddress: '192.168.99.10'
    },
    {
      id: 'log-04',
      timestamp: '2026-09-14 16:20:18',
      performedBy: 'Dr. Rajesh Nair (Dean)',
      targetUserOrRole: 'Prof. Sarah Jenkins',
      collegeName: 'Horizon College of Engineering',
      actionType: 'ROLE_ASSIGNMENT',
      details: 'Assigned Senior Professor & Viva Mentor role with Web Engineering lab authority.',
      severity: 'INFO',
      ipAddress: '172.16.4.12'
    }
  ]);

  // Computed Filtered Users
  readonly filteredUsers = computed<UserPermissionAssignment[]>(() => {
    const cid = this.selectedCollegeId();
    const dept = this.selectedDepartment();
    const roleKey = this.selectedRoleKey();
    const query = this.searchQuery().toLowerCase().trim();

    return this.users().filter(u => {
      const matchCollege = cid === 'ALL' || u.collegeId === cid;
      const matchDept = dept === 'ALL' || u.department === dept;
      const matchRole = roleKey === 'ALL' || u.assignedRoleKey === roleKey;
      const matchQuery = !query ||
        u.userName.toLowerCase().includes(query) ||
        u.userEmail.toLowerCase().includes(query) ||
        u.userId.toLowerCase().includes(query) ||
        u.assignedRoleName.toLowerCase().includes(query) ||
        u.collegeName.toLowerCase().includes(query);

      return matchCollege && matchDept && matchRole && matchQuery;
    });
  });

  // Computed Filtered Audit Logs
  readonly filteredAuditLogs = computed<SecurityAuditLogEntry[]>(() => {
    const cid = this.selectedCollegeId();
    const query = this.searchQuery().toLowerCase().trim();

    return this.auditLogs().filter(log => {
      const matchCollege = cid === 'ALL' ||
        (cid === 'inst-01' && log.collegeName.includes('Apex')) ||
        (cid === 'inst-02' && log.collegeName.includes('Horizon')) ||
        (cid === 'inst-03' && log.collegeName.includes('Vanguard')) ||
        (cid === 'inst-04' && log.collegeName.includes('Metro'));

      const matchQuery = !query ||
        log.performedBy.toLowerCase().includes(query) ||
        log.targetUserOrRole.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.actionType.toLowerCase().includes(query);

      return matchCollege && matchQuery;
    });
  });

  // Security KPI Metrics
  readonly securityKpis = computed(() => {
    const allUsers = this.users();
    const allRoles = this.roles();
    const allDelegations = this.delegationPasses();
    const allLogs = this.auditLogs();

    const mfaCount = allUsers.filter(u => u.mfaEnabled).length;
    const mfaCompliance = allUsers.length > 0 ? Math.round((mfaCount / allUsers.length) * 100) : 100;
    const criticalLogsCount = allLogs.filter(l => l.severity === 'CRITICAL').length;
    const activeDelegationsCount = allDelegations.filter(d => d.status === 'ACTIVE').length;

    return {
      totalDefinedRoles: allRoles.length,
      totalUsersProtected: allUsers.length,
      mfaCompliancePercent: mfaCompliance,
      activeDelegationsCount,
      criticalSecurityIncidents: criticalLogsCount
    };
  });

  // Toggle Capability in Role
  toggleRoleCapability(roleKey: string, capabilityKey: string): void {
    const currentRoles = [...this.roles()];
    const roleIdx = currentRoles.findIndex(r => r.roleKey === roleKey);
    if (roleIdx === -1) return;

    const role = currentRoles[roleIdx];
    const updatedCaps = { ...role.capabilities };
    updatedCaps[capabilityKey] = !updatedCaps[capabilityKey];

    currentRoles[roleIdx] = {
      ...role,
      capabilities: updatedCaps
    };
    this.roles.set(currentRoles);

    // Add audit log
    this.auditLogs.update(prev => [
      {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        performedBy: 'System Administrator (Live Matrix)',
        targetUserOrRole: `Role: ${role.roleName}`,
        collegeName: 'Global Academic Syndicate',
        actionType: 'PERMISSION_OVERRIDE',
        details: `${updatedCaps[capabilityKey] ? 'Granted' : 'Revoked'} privilege "${capabilityKey}" for tier ${role.roleName}.`,
        severity: 'INFO',
        ipAddress: '127.0.0.1 (Admin Console)'
      },
      ...prev
    ]);
  }

  // Assign New Role to User
  assignUserRole(userId: string, newRoleKey: string): void {
    const roleDef = this.roles().find(r => r.roleKey === newRoleKey);
    if (!roleDef) return;

    const currentUsers = [...this.users()];
    const userIdx = currentUsers.findIndex(u => u.userId === userId || u.id === userId);
    if (userIdx === -1) return;

    const u = currentUsers[userIdx];
    currentUsers[userIdx] = {
      ...u,
      assignedRoleKey: roleDef.roleKey,
      assignedRoleName: roleDef.roleName,
      customOverridesCount: 0
    };
    this.users.set(currentUsers);

    this.auditLogs.update(prev => [
      {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        performedBy: 'System Super Administrator',
        targetUserOrRole: `${u.userName} (${u.userId})`,
        collegeName: u.collegeName,
        actionType: 'ROLE_ASSIGNMENT',
        details: `Reassigned institutional role to "${roleDef.roleName}". Reset custom capability overrides.`,
        severity: 'INFO',
        ipAddress: '127.0.0.1 (Admin Console)'
      },
      ...prev
    ]);
  }

  // Issue Break-Glass Temporary Delegation Pass
  issueDelegationPass(data: Omit<TemporaryDelegationPass, 'id' | 'passCode' | 'status'>): TemporaryDelegationPass {
    const passCode = `DP-${data.collegeName.slice(0, 4).toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPass: TemporaryDelegationPass = {
      ...data,
      id: `del-${Date.now().toString().slice(-4)}`,
      passCode,
      status: 'ACTIVE'
    };

    this.delegationPasses.update(prev => [newPass, ...prev]);

    this.auditLogs.update(prev => [
      {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        performedBy: data.issuedBy,
        targetUserOrRole: `${data.granteeName} (${data.granteeEmail})`,
        collegeName: data.collegeName,
        actionType: 'DELEGATION_ISSUED',
        details: `Issued temporary pass ${passCode} with scope "${data.scopeDescription}" valid until ${data.validUntil}.`,
        severity: 'WARNING',
        ipAddress: '127.0.0.1 (Admin Console)'
      },
      ...prev
    ]);

    return newPass;
  }

  // Revoke Delegation Pass
  revokeDelegationPass(passId: string): void {
    const pass = this.delegationPasses().find(p => p.id === passId);
    if (!pass) return;

    this.delegationPasses.update(prev =>
      prev.map(p => p.id === passId ? { ...p, status: 'REVOKED' as const } : p)
    );

    this.auditLogs.update(prev => [
      {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        performedBy: 'System Administrator (Emergency Revoke)',
        targetUserOrRole: `Pass: ${pass.passCode} (${pass.granteeName})`,
        collegeName: pass.collegeName,
        actionType: 'SECURITY_REVOCATION',
        details: `Immediately revoked temporary delegation credentials for ${pass.granteeName}.`,
        severity: 'CRITICAL',
        ipAddress: '127.0.0.1 (Admin Console)'
      },
      ...prev
    ]);
  }

  // Emergency Policy Reset to University Standard
  resetAllToCampusStandard(): string {
    // Reset any rogue override
    this.auditLogs.update(prev => [
      {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        performedBy: 'System Super Administrator',
        targetUserOrRole: 'All Campus Roles & Overrides',
        collegeName: 'All Global Campuses',
        actionType: 'PERMISSION_OVERRIDE',
        details: 'Enforced university security baseline. Synchronized 14 capability vectors across 7 role tiers.',
        severity: 'INFO',
        ipAddress: '127.0.0.1 (Admin Console)'
      },
      ...prev
    ]);
    return 'Security Baseline Enforcement Applied: Synchronized 14 permission vectors across all 4 campuses with zero compliance drift.';
  }
}
