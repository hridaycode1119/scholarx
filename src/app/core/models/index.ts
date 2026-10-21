// Domain Models for ScholarX

export type StudentEnrollmentStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED';
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED' | 'TERMINATED' | 'EXPIRED';
export type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type ProctorAlertCode = 'TAB_SWITCH' | 'FACE_ABSENT' | 'MULTIPLE_FACES' | 'CAM_DISCONNECTED' | 'MIC_MUTED';
export type UserRole = 'STUDENT' | 'MENTOR' | 'FACULTY' | 'INSTITUTION_ADMIN' | 'SYSTEM_ADMIN';

export interface ClassSecurityPolicy {
  enabled: boolean;
  maxTabSwitches: number; // Configurable max tab switches (e.g. 1, 2, 3, 5)
  allowFullscreenExit: boolean;
  blurOnFocusLoss: boolean;
  strictDisqualification: boolean;
  requireFaceContinuity: boolean;
}

export interface TerminatedStudentIncident {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  studentAvatar?: string;
  classId: string;
  subjectCode: string;
  className: string;
  terminatedAt: string;
  reason: string;
  totalStrikes: number;
  strikesBreakdown: Array<{
    id?: number;
    type: string;
    description: string;
    timestamp: string;
    severity: 'WARNING' | 'CRITICAL';
  }>;
  status: 'TERMINATED' | 'RE_ADMITTED' | 'UNDER_REVIEW';
  reviewedByMentor?: string;
  reAdmittedAt?: string;
}

export interface ClassProctorAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  classId: string;
  subjectCode: string;
  className: string;
  incidentType: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  metadata?: any;
}

export interface LiveStudentVivaQuestion {
  questionNumber: number;
  questionText: string;
  targetCO?: string;
  bloomLevel?: string;
  maxMarks: number;
  awardedMarks?: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING';
  spokenAnswerText?: string;
  aiFeedbackCritique?: string;
  timeTakenSeconds?: number;
  confidenceScore?: number;
  wpm?: number;
  completedAt?: string;
  keyConceptsCovered?: string[];
}

export interface LiveClassStudentFeed {
  studentId: string;
  studentName: string;
  studentRoll: string;
  studentAvatar?: string;
  classId: string;
  subjectCode: string;
  className?: string;
  vivaSessionId?: string;
  status: 'TESTING' | 'IDLE' | 'WARNING' | 'TERMINATED' | 'COMPLETED';
  currentQuestionNumber: number;
  totalQuestions: number;
  currentQuestionText: string;
  currentQuestionTargetCO?: string;
  currentQuestionBloom?: string;
  currentQuestionMaxMarks?: number;
  questionsHistory?: LiveStudentVivaQuestion[];
  completedQuestionsCount?: number;
  totalAwardedScore?: number;
  totalMaxScore?: number;
  remainingTimeSeconds?: number;
  speechConfidence?: number;
  speechWpm?: number;
  lastFrameData?: string; // Base64 JPEG data URL
  lastFrameTimestamp: number;
  micVolumeDb: number; // 0 - 100
  audioFreqBands: number[]; // 12-band audio spectrum levels (0 - 100)
  isVoiceSpeaking: boolean;
  liveTranscript: string;
  integrityScore: number; // 0 - 100
  faceMatchScore: number; // 0 - 100
  eyeContactScore: number; // 0 - 100
  strikes: number;
  maxStrikes: number;
  lastIncidentReason?: string;
  infractionType?: 'TAB_SWITCH' | 'SLIDE_CHANGE' | 'WINDOW_UNFOCUSED' | 'GAZE_DEVIATION' | 'MULTI_FACE' | 'MANUAL_STRIKE';
  infractionDetails?: Array<{
    type: string;
    reason: string;
    timestamp: string;
    severity: 'WARNING' | 'CRITICAL';
  }>;
  disqualifiedReason?: string;
  terminatedAt?: string;
  isConnected: boolean;
  isAudioMuted: boolean;
  isSpeakerDisabled?: boolean;
  isListening?: boolean; // Locally toggled by mentor
}

export interface MentorClass {
  id: string;
  name: string;
  subjectCode: string;
  department: string;
  semester: number;
  academicYear: string;
  joinCode: string;
  enrolledCount: number;
  pendingRequestsCount: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  securityPolicy?: ClassSecurityPolicy;
  terminatedStudents?: TerminatedStudentIncident[];
  proctorAlerts?: ClassProctorAlert[];
}

export interface CreateClassDto {
  name: string;
  subject: string;
  subjectCode: string;
  department: string;
  semester: number;
  academicYear: string;
  description?: string;
}

export interface StudentRosterItem {
  id: string;
  studentId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  department: string;
  enrolledAt: string;
  status: StudentEnrollmentStatus;
  completedVivasCount: number;
}

export interface EnrollmentRequest {
  id: string;
  classId: string;
  className: string;
  classCode?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  requestedAt: string;
}

export interface AssignmentStudentAcceptance {
  studentId: string;
  studentName: string;
  studentRoll: string;
  email: string;
  avatarUrl?: string;
  status: 'ACCEPTED' | 'PENDING' | 'DENIED';
  respondedAt?: string;
  declineReason?: string;
}

export interface EvaluationRubric {
  criterion: string;
  maxMarks: number;
}

export interface AssessmentQuestion {
  id: string;
  questionIndex: number;
  prompt: string;
  marks: number;
  bloomLevel: BloomLevel;
  coTarget: string;
  poTarget: string;
  expectedRubric?: EvaluationRubric[];
  sampleAnswerSummary?: string;
}

export interface Assessment {
  id: string;
  classId: string;
  className: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  status: AssessmentStatus;
  questions: AssessmentQuestion[];
  publishedAt?: string;
  createdAt: string;
  paperContentMode?: 'WITH_SOLUTIONS' | 'QUESTIONS_ONLY';
  durationValue?: string;
  releaseTime?: string;
  endTime?: string;
  isTerminated?: boolean;
  motive?: string;
  practicePaperId?: string;
  topic?: string;
  placeLocation?: string;
  studentAcceptanceList?: AssignmentStudentAcceptance[];
  assessmentType?: 'ORAL_VIVA' | 'QUESTION_PAPER';
}

export interface GenerateQuestionsRequest {
  classId: string;
  subject: string;
  topic: string;
  difficulty: 'EASY' | 'INTERMEDIATE' | 'ADVANCED';
  questionCount: number;
  bloomLevels: BloomLevel[];
  coTarget: string;
  poTarget: string;
  customInstructions?: string;
}

export interface CourseOutcome {
  id: string;
  code: string;
  description: string;
  bloomTarget: string;
  weightagePercentage: number;
}

export interface CoAttainmentMetric {
  coCode: string;
  description: string;
  targetBenchmark: number;
  actualAttainment: number;
  directScore?: number;
  indirectScore?: number;
  attainmentLevel?: 1 | 2 | 3;
  status: 'EXCEEDED' | 'MET' | 'BELOW_TARGET';
}

export interface PoAttainmentDetail {
  poCode: string;
  title: string;
  description: string;
  targetBenchmark: number;
  directScore: number;
  indirectScore: number;
  calculatedAttainment: number;
  departmentBaseline: number;
  attainmentLevel: 1 | 2 | 3;
  mappedCos: string[];
}

export interface BloomDomainAttainment {
  level: string; // 'Remember (L1)', 'Understand (L2)', 'Apply (L3)', 'Analyze (L4)', 'Evaluate (L5)', 'Create (L6)'
  label: string;
  targetBenchmark: number;
  actualAttainment: number;
  departmentBaseline: number;
  questionCount: number;
}

export interface StudentAttainmentRecord {
  studentId: string;
  studentName: string;
  rollNumber: string;
  avatarUrl?: string;
  coScores: Record<string, number>; // e.g. { 'CO1': 85, 'CO2': 68, 'CO3': 74, 'CO4': 45, 'CO5': 62 }
  overallAttainment: number;
  status: 'HIGH_PERFORMER' | 'BENCHMARK_MET' | 'AT_RISK';
  remedialAssigned: boolean;
  remedialVivaId?: string;
}

export interface RemediationActionPlan {
  coCode: string;
  topic: string;
  rootCauseAnalysis: string;
  scaffoldingSteps: {
    stage: 'CONCEPT_PRIMING' | 'SIMULATION_LAB' | 'DIAGNOSTIC_DRILL' | 'ORAL_VIVA';
    title: string;
    description: string;
    targetBloom: string;
    estimatedMinutes: number;
  }[];
  sampleRemedialQuestions: {
    question: string;
    bloomLevel: string;
    scaffoldingHint: string;
  }[];
  sarActionTakenReport: string;
  affectedStudentsCount: number;
  generatedAt: string;
}

export interface DirectIndirectConfig {
  directWeightPercentage: number;   // e.g. 80
  indirectWeightPercentage: number; // e.g. 20
  benchmarkThreshold: number;       // e.g. 70
}

export interface ClassAnalyticsSummary {
  classId: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRatePercentage: number;
  completionRatePercentage: number;
  directIndirectConfig?: DirectIndirectConfig;
  coAttainments: CoAttainmentMetric[];
  poAttainments?: PoAttainmentDetail[];
  bloomAttainments?: BloomDomainAttainment[];
  studentRoster?: StudentAttainmentRecord[];
  hotspots: {
    topic: string;
    coCode: string;
    affectedStudentsCount: number;
    recommendation: string;
  }[];
}

export interface ProctorForensicEvidence {
  id: string;
  anomalyType: 'MULTI_FACE' | 'TAB_SWITCH' | 'GAZE_DEVIATION' | 'AUDIO_WHISPER' | 'SECONDARY_DEVICE' | 'VPN_ANOMALY';
  riskScorePercent: number;
  timestamp: string;
  evidenceSnapshotUrl?: string;
  description: string;
  verifiedStatus: 'PENDING_REVIEW' | 'CONFIRMED_FRAUD' | 'FALSE_POSITIVE' | 'DISMISSED';
}

export interface ProctorAlert {
  id: string;
  studentId: string;
  code: ProctorAlertCode;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
}

export interface ProctoringSession {
  studentId: string;
  studentName: string;
  rollNumber: string;
  avatarUrl?: string;
  classId?: string;
  className?: string;
  assessmentId: string;
  assessmentTitle: string;
  status: 'ACTIVE' | 'FLAGGED' | 'COMPLETED' | 'DISCONNECTED';
  connectionQuality: 'EXCELLENT' | 'FAIR' | 'POOR';
  videoActive: boolean;
  audioActive: boolean;
  alerts: ProctorAlert[];
  fraudRiskScore?: number;
  forensicEvidence?: ProctorForensicEvidence[];
  disciplinaryStatus?: 'NONE' | 'WARNED' | 'REAUTHENTICATION_REQUIRED' | 'DISQUALIFIED';
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  institutionId: string;
  institutionName: string;
  department?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  domain: string;
  studentCount: number;
  mentorCount: number;
  activeClassesCount: number;
  status: 'ACTIVE' | 'SETUP' | 'SUSPENDED';
  accreditationBody: string;
}

export interface MentorNotification {
  id: string;
  type: 'ENROLLMENT' | 'ASSESSMENT' | 'PROCTORING' | 'SYSTEM';
  title: string;
  message: string;
  read: boolean;
  linkUrl: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  channelId?: string;
  senderId?: string;
  senderName: string;
  senderRole: 'FACULTY' | 'STUDENT' | 'TA' | 'AI';
  senderAvatar?: string;
  content?: string;
  text?: string;
  timestamp: string;
  isMe?: boolean;
  isAiBot?: boolean;
}

export interface ChatChannel {
  id: string;
  classId?: string;
  name: string;
  courseCode: string;
  unreadCount: number;
  mentorName?: string;
  mentorAvatar?: string;
  lastMessageSnippet?: string;
  lastMessageTime?: string;
}


export type TargetAudience = 'ALL' | 'STUDENTS_ONLY' | 'MENTORS_ONLY';

export interface AdRegistrationRecord {
  id: string;
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
  submittedAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface BroadcastItem {
  id: string;
  title: string;
  tagline: string;
  description: string;
  fullDetails?: string;
  imageUrl: string;
  targetAudience: TargetAudience;
  category: 'BANNER_AD' | 'CAMPUS_EVENT' | 'EXAM_ALERT';
  active: boolean;
  ctaText?: string;
  ctaLink?: string;
  createdAt: string;
  sponsorCollege?: string;
  assignedMentorId?: string;
  assignedMentorName?: string;
  requiresRegistration?: boolean;
  registrationCount?: number;
}

export interface GlobalNoticeBar {
  id: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  targetAudience: TargetAudience;
  active: boolean;
  updatedAt: string;
}

export interface AiEngineConfig {
  activeModel: string;
  modelFamily: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  topP: number;
  tokensPerSecond: number;
  gpuVramUsagePercent: number;
  kvCacheHitRatePercent: number;
  status: 'ONLINE' | 'UPDATING' | 'OFFLINE';
  lastUpdated: string;
}

export interface AiEngineLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'INFERENCE' | 'WARN' | 'OPTIMIZATION';
  component: string;
  message: string;
  durationMs?: number;
}

// -------------------------------------------------------------
// FACULTY WORKLOAD & ORAL VIVA BALANCER MODELS
// -------------------------------------------------------------

export interface VivaStudentQueueItem {
  id: string;
  studentName: string;
  rollNumber: string;
  subjectCode: string;
  subjectName: string;
  scheduledTime: string;
  collegeName: string;
  vivaType: 'MIDTERM' | 'FINAL' | 'OBE_DIAGNOSTIC';
  durationMinutes: number;
}

export interface SubjectTaughtInfo {
  code: string;
  name: string;
  department: string;
  weeklyHours: number;
  activeVivasCount: number;
  studentsEnrolled: number;
}

export interface ClassCurrentActivity {
  classId: string;
  className: string;
  subjectCode: string;
  subjectName: string;
  section: string;
  currentActivityStatus: 'LIVE_VIVA_IN_PROGRESS' | 'ACTIVE_CLASSROOM' | 'UPCOMING_VIVA_SESSION' | 'STANDBY_GRADING';
  currentTopic: string;
  studentsEnrolled: number;
  studentsAttending: number;
  evaluatedVivasCount: number;
  totalVivasScheduled: number;
  roomOrChannel: string;
  activeStudentName?: string;
  timeRemainingOrDuration?: string;
}

export interface FacultyWorkloadItem {
  id: string;
  facultyId: string;
  name: string;
  department: string;
  collegeName: string;
  email: string;
  specializations: string[];
  subjectsTaught: SubjectTaughtInfo[];
  activeClassesList: ClassCurrentActivity[];
  weeklyTeachingHours: number;
  weeklyVivaHours: number;
  totalWeeklyHours: number;
  maxWeeklyHours: number;
  activeVivasAssigned: number;
  maxVivaCapacity: number;
  evaluatedVivas: number;
  pendingVivas: number;
  status: 'BALANCED' | 'NEAR_CAPACITY' | 'OVERLOADED';
  burnoutRiskPercent: number;
  assignedVivasQueue: VivaStudentQueueItem[];
}

export interface CollegeWorkloadGroup {
  collegeId: string;
  collegeName: string;
  campusBadge: string;
  city: string;
  totalFacultyCount: number;
  totalVivasAssigned: number;
  totalSubjectsCount: number;
  campusBalanceScore: number;
  faculty: FacultyWorkloadItem[];
}

export interface UnassignedStudentCandidate {
  id: string;
  studentName: string;
  rollNumber: string;
  subjectCode: string;
  subjectName: string;
  requiredSpecialization: string;
  collegeName: string;
  preferredTimeSlot: string;
}

export interface DepartmentWorkloadSummary {
  department: string;
  totalFaculty: number;
  avgWeeklyHours: number;
  totalVivas: number;
  overloadedCount: number;
  balanceHealthScore: number;
}

export interface AutoBalanceResult {
  reallocatedCount: number;
  overloadedResolvedCount: number;
  newUniversityBalanceScore: number;
  summaryMessage: string;
}

// ==========================================
// PHASE 2: MASTER EXAM & ROOM SCHEDULER MODELS
// ==========================================

export type ExamType = 'ORAL_VIVA' | 'AI_PROCTORED_THEORY' | 'LAB_PRACTICAL' | 'END_SEM_FINAL';
export type ExamMode = 'PHYSICAL_HALL' | 'VIRTUAL_WEBRTC';
export type ExamSlotStatus = 'CONFIRMED' | 'CONFLICT_DETECTED' | 'RESCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ExamScheduleSlot {
  id: string;
  examTitle: string;
  courseCode: string;
  courseName: string;
  collegeId: string;
  collegeName: string;
  campusBadge: string;
  department: string;
  examType: ExamType;
  mode: ExamMode;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  assignedMentorId: string;
  assignedMentorName: string;
  secondaryInvigilatorName?: string;
  roomId: string;
  roomName: string;
  roomType: 'PHYSICAL_HALL' | 'SMART_LAB' | 'VIRTUAL_CHANNEL';
  totalEnrolled: number;
  roomCapacity: number;
  status: ExamSlotStatus;
  conflictDetails?: string;
  hasAiProctoringRig: boolean;
  academicTerm: string;
}

export interface ExamRoomAllocation {
  roomId: string;
  roomName: string;
  collegeId: string;
  collegeName: string;
  buildingOrBlock: string;
  type: 'PHYSICAL_AUDITORIUM' | 'STANDARD_CLASSROOM' | 'SMART_LAB' | 'VIRTUAL_CHANNEL';
  seatingCapacity: number;
  currentOccupancy: number;
  hasAiProctoringRig: boolean;
  cameraStatus: 'ONLINE_4K' | 'CALIBRATION_REQ' | 'OFFLINE' | 'N_A_VIRTUAL';
  webrtcBandwidthMbps?: number;
  assignedExamSlotIds: string[];
  status: 'AVAILABLE' | 'OCCUPIED' | 'OVER_CAPACITY' | 'MAINTENANCE';
}

export interface HallTicketData {
  ticketNumber: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  studentEmail: string;
  studentAvatar: string;
  collegeName: string;
  department: string;
  semester: string;
  examSlotId: string;
  examTitle: string;
  courseCode: string;
  courseName: string;
  date: string;
  timeSlot: string;
  assignedRoom: string;
  seatNumber: string;
  assignedMentorName: string;
  examMode: ExamMode;
  qrSecurityHash: string;
  reportingTime: string;
  instructions: string[];
  verifiedStatus: 'ISSUED' | 'CHECKED_IN' | 'FLAGGED';
}

export interface ExamConflictAlert {
  id: string;
  conflictType: 'FACULTY_DOUBLE_BOOKING' | 'ROOM_DOUBLE_BOOKING' | 'CAPACITY_OVERFLOW' | 'BATCH_TIME_OVERLAP';
  severity: 'CRITICAL' | 'WARNING';
  affectedSlotIds: string[];
  description: string;
  collegeName: string;
  timeSlot: string;
  recommendedResolution: string;
}

// ==========================================
// PHASE 3: RBAC & GLOBAL SECURITY PERMISSION MODELS
// ==========================================

export type RoleCategory = 'CENTRAL_GOVERNANCE' | 'CAMPUS_ADMIN' | 'FACULTY_ACADEMIC' | 'PROCTORING_EVALUATION' | 'STUDENT_LEVEL';
export type CapabilityRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PermissionCapabilityItem {
  key: string;
  name: string;
  description: string;
  riskLevel: CapabilityRiskLevel;
}

export interface PermissionCapabilityCategory {
  categoryKey: string;
  categoryName: string;
  icon: string;
  description: string;
  capabilities: PermissionCapabilityItem[];
}

export interface InstitutionalRoleDefinition {
  roleKey: string;
  roleName: string;
  category: RoleCategory;
  description: string;
  usersAssignedCount: number;
  isCustomOrSystem: 'SYSTEM_DEFAULT' | 'CAMPUS_CUSTOM';
  securityTier: number; // 1 (Highest / Chancellor) to 5 (Student)
  capabilities: Record<string, boolean>; // key -> granted
}

export interface UserPermissionAssignment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl: string;
  collegeId: string;
  collegeName: string;
  campusBadge: string;
  department: string;
  assignedRoleKey: string;
  assignedRoleName: string;
  customOverridesCount: number;
  delegationActive: boolean;
  delegationExpiresAt?: string;
  delegatedToName?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PROBATION';
  lastLoginIp: string;
  lastLoginTime: string;
  mfaEnabled: boolean;
}

export interface SecurityAuditLogEntry {
  id: string;
  timestamp: string;
  performedBy: string;
  targetUserOrRole: string;
  collegeName: string;
  actionType: 'ROLE_ASSIGNMENT' | 'PERMISSION_OVERRIDE' | 'MFA_RESET' | 'DELEGATION_ISSUED' | 'SECURITY_REVOCATION';
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  ipAddress: string;
}

export interface TemporaryDelegationPass {
  id: string;
  passCode: string;
  granteeName: string;
  granteeEmail: string;
  collegeId: string;
  collegeName: string;
  department: string;
  scopeDescription: string;
  targetRoleKey: string;
  targetRoleName: string;
  issuedBy: string;
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

// ==========================================
// MENTOR PHASE 1: CLASS EXAM & VIVA SCHEDULER MODELS
// ==========================================

export type ClassExamType = 'ORAL_VIVA_1ON1' | 'THEORY_MIDTERM' | 'LAB_PRACTICAL' | 'QUIZ_CHECKPOINT';
export type VivaSlotStatus = 'SCHEDULED' | 'VIVA_IN_PROGRESS' | 'EVALUATED' | 'MISSED' | 'RESCHEDULED';

export interface ClassStudentVivaSlot {
  slotId: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  studentAvatar: string;
  timeSlot: string; // e.g. "09:00 - 09:15"
  startTime: string; // "09:00"
  endTime: string; // "09:15"
  durationMinutes: number;
  status: VivaSlotStatus;
  assignedTopic: string;
  bloomLevel: BloomLevel;
  maxScore: number;
  awardedScore?: number;
  rubricFeedbackSummary?: string;
  meetingLinkOrRoom: string;
  aiCoPilotReady: boolean;
}

export interface ClassExamSession {
  sessionId: string;
  classId: string;
  className: string;
  courseCode: string;
  section: string;
  academicYear: string;
  semester: number;
  title: string;
  examType: ClassExamType;
  mode: 'PHYSICAL_ROOM' | 'VIRTUAL_WEBRTC';
  venueOrChannel: string;
  date: string; // YYYY-MM-DD
  overallStartTime: string; // "09:00"
  overallEndTime: string; // "12:00"
  totalStudentsEnrolled: number;
  evaluatedCount: number;
  status: 'UPCOMING' | 'LIVE_TODAY' | 'COMPLETED' | 'DRAFT';
  syllabusUnitFocus: string;
  targetCourseOutcomes: string[]; // e.g. ["CO1", "CO2", "CO4"]
  studentSlots: ClassStudentVivaSlot[];
  hasAiCoPilotEnabled: boolean;
}

export interface ClassScheduleKpis {
  totalScheduledSessions: number;
  totalClassStudents: number;
  vivasCompleted: number;
  vivasPending: number;
  completionRatePercent: number;
  nextSessionTime: string;
}

// ==========================================
// MENTOR PHASE 2: AI KNOWLEDGE & SYLLABUS INGESTION MODELS
// ==========================================

export type KnowledgeDocType = 'SYLLABUS_PDF' | 'TEXTBOOK_CHAPTER' | 'PAST_EXAM_PAPER' | 'CO_RUBRIC_SPEC';
export type IngestionIndexStatus = 'INDEXED' | 'PARSING' | 'VECTORIZING' | 'ERROR';

export interface CourseKnowledgeDocument {
  id: string;
  courseCode: string;
  courseName: string;
  classId: string;
  fileName: string;
  fileSizeMb: number;
  docType: KnowledgeDocType;
  uploadedAt: string;
  totalChunksExtracted: number;
  embeddingDimensions: number;
  indexingStatus: IngestionIndexStatus;
  coveredUnits: string[];
  mappedCourseOutcomes: string[];
  summarySnippet: string;
}

export interface TrainingLossPoint {
  step: number;
  epoch: number;
  loss: number;
  learningRate: number;
  vramGb: number;
}

export interface LoraTrainingMetrics {
  trainingJobId: string;
  courseCode: string;
  baseModelName: string;
  adapterName: string;
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  currentLoss: number;
  initialLoss: number;
  currentPerplexity: number;
  basePerplexity: number;
  gpuDevice: string;
  vramUsedGb: number;
  vramMaxGb: number;
  learningRate: number;
  status: 'TRAINING' | 'COMPLETED' | 'STANDBY' | 'FAILED';
  lossHistory: TrainingLossPoint[];
}

export interface ModelComparisonResult {
  prompt: string;
  courseContext: string;
  targetBloomLevel: BloomLevel;
  baseModelName: string;
  baseModelOutput: string;
  baseRubricScore: number; // out of 100
  fineTunedModelName: string;
  fineTunedModelOutput: string;
  fineTunedRubricScore: number; // out of 100
  latencyMs: number;
  highlightedRubricKeywords: string[];
}

export interface CourseAiCheckpoint {
  checkpointId: string;
  courseCode: string;
  checkpointName: string;
  version: string;
  baseModel: string;
  loraRank: number;
  loraAlpha: number;
  trainedAt: string;
  finalLoss: number;
  perplexity: number;
  isActiveForVivas: boolean;
  deployedToClassId: string;
}

// ---------------------------------------------------------------------------
// MENTOR PHASE 3: LIVE ORAL VIVA AI CO-PILOT & REAL-TIME RUBRICS
// ---------------------------------------------------------------------------

export type VivaSpeakerRole = 'EXAMINER' | 'STUDENT' | 'AI_COPILOT';
export type VivaProbeType = 'DEPTH_PROBE' | 'EDGE_CASE_PROBE' | 'REMEDIAL_PROBE';

export interface VivaTranscriptTurn {
  id: string;
  speaker: VivaSpeakerRole;
  speakerName: string;
  timestamp: string;
  text: string;
  audioConfidencePercent?: number;
  isKeyConceptFound?: boolean;
  detectedKeywords?: string[];
  bloomTaxonomyLevel?: BloomLevel;
}

export interface VivaAiProbeSuggestion {
  id: string;
  probeType: VivaProbeType;
  title: string;
  questionText: string;
  targetBloomLevel: BloomLevel;
  expectedInsight: string;
  syllabusConceptSource: string;
  isAsked?: boolean;
}

export interface VivaRubricDimension {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  assignedScore: number;
  aiSuggestedScore: number;
  aiFeedbackCritique: string;
}

export interface LiveVivaSessionState {
  sessionId: string;
  slotId: string;
  classId: string;
  courseCode: string;
  courseName: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  studentAvatar: string;
  assignedTopic: string;
  bloomTarget: BloomLevel;
  targetCo: string;
  slotStartTime: string;
  slotEndTime: string;
  remainingSeconds: number;
  isLiveRecording: boolean;
  webrtcStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  latencyMs: number;
  bitrateMbps: number;
  micLevelPercent: number;
  proctorHealth: {
    faceDetected: boolean;
    multipleFaces: boolean;
    tabFocused: boolean;
    micActive: boolean;
  };
  totalMaxScore: number;
  totalAwardedScore: number;
  status: VivaSlotStatus;
}

// ==========================================
// STUDENT PORTAL MASTER MODELS (v2.0.0)
// ==========================================

export type StudentThemePreference = 'dark' | 'slate' | 'light' | 'contrast';

export type StudentNotificationType = 'TEST_RELEASE' | 'DIRECT_MESSAGE' | 'GRADE_POSTED' | 'ANNOUNCEMENT';

export interface StudentNotificationItem {
  id: string;
  title: string;
  message: string;
  type: StudentNotificationType;
  timestamp: string;
  isNew: boolean;
  actionUrl: string;
  senderName?: string;
  courseCode?: string;
}

export interface StudentJoinedClass {
  id: string;
  name: string;
  subjectCode: string;
  department: string;
  semester: number;
  academicYear: string;
  joinCode: string;
  mentorName: string;
  mentorId: string;
  mentorAvatar?: string;
  mentorEmail?: string;
  status: 'ENROLLED' | 'PENDING' | 'SUSPENDED' | 'TERMINATED';
  suspensionReason?: string;
  enrolledAt: string;
  coverGradient?: string;
  testsCount: number;
  vivasCompleted: number;
  targetCOs: string[];
  securityPolicy?: ClassSecurityPolicy;
  terminatedIncident?: TerminatedStudentIncident;
}

export interface StudentAssignedTest {
  id: string;
  classId: string;
  className: string;
  subjectCode: string;
  title: string;
  type: 'ORAL_VIVA' | 'MCQ_DIAGNOSTIC' | 'SPEAKING_DEFENSE' | 'LAB_PRACTICAL' | 'THEORY_CIE' | 'ASSIGNMENT';
  totalMarks: number;
  durationMinutes: number;
  dueCountdown: string;
  dueDate: string;
  targetCOs: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  awardedScore?: number;
  integrityScore?: number;
  gradePill?: string;
  completedAt?: string;
  feedbackSummary?: string;
  canResume?: boolean;
  coAttainmentScores?: Array<{
    coCode: string;
    label: string;
    score: number;
    maxScore: number;
    status: 'MASTERED' | 'DEVELOPING' | 'NEEDS_FOCUS';
    bloomLevel: string;
  }>;
  rubricBreakdown?: Array<{
    criterion: string;
    maxMarks: number;
    awardedMarks: number;
    feedback: string;
  }>;
  questionBreakdown?: Array<{
    questionNumber: number;
    questionText: string;
    studentAnswer: string;
    modelAnswer: string;
    maxMarks: number;
    awardedMarks: number;
    examinerFeedback: string;
    coTarget: string;
    bloomLevel: string;
  }>;
  mcqQuestions?: Array<{
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    selectedOptionIndex?: number;
    explanation: string;
    coTarget: string;
    bloomLevel: string;
  }>;
  aiAnalysis?: {
    executiveSummary: string;
    strengths: string[];
    weaknesses: string[];
    remediationPath: string[];
    examReadinessScore: number;
    recommendedDrillTopic: string;
    aiModelUsed: string;
    generatedAt: string;
  };
}

export interface EditableCourseOutcome {
  id: string; // 'CO1' ... 'CO6'
  code: string;
  title: string;
  description: string;
  bloomLevel: BloomLevel;
  targetScorePercent: number;
}

export interface UniversityQuestionPaper {
  id: string;
  universityId: string;
  universityName: string;
  campusLocation?: string;
  paperTitle: string;
  paperCode: string;
  subjectCode: string;
  subjectName: string;
  examinationType: 'END_SEM' | 'MID_SEM' | 'SUPPLEMENTARY' | 'SPECIAL_VIVA' | 'NATIONAL_ENTRANCE';
  academicYear: string;
  semester: string;
  examDate: string;
  publishedDate: string;
  durationMinutes: number;
  totalMarks: number;
  controllerOfExamsVerified: boolean;
  questionCount: number;
  pdfDownloadUrl?: string;
  programName?: string;
  departmentName?: string;
  questions: MinedPYQ[];
}

export interface UniversityProgramDetail {
  name: string;
  shortCode: string;
  level: 'UG' | 'PG' | 'DIPLOMA' | 'DOCTORAL' | 'ENTRANCE';
  schoolName: string;
  departmentName: string;
  coreSubjects: string[];
  electiveSubjects: string[];
  alliedSubjects: string[];
}

export interface UniversitySpecializationDetail {
  name: string;
  code: string;
  icon?: string;
  coreSubjects: string[];
  electiveSubjects: string[];
  alliedSubjects: string[];
}

export interface UniversityCourseProgram {
  name: string;
  shortCode: string;
  level: 'UG' | 'PG' | 'DIPLOMA' | 'DOCTORAL';
  durationYears: number;
  departmentName?: string;
  degreeType?: string;
  specializations: UniversitySpecializationDetail[];
}

export interface UniversityDepartmentDetail {
  name: string;
  code: string;
  icon?: string;
  hodName?: string;
  description?: string;
  programs: UniversityCourseProgram[];
}

export interface UniversitySchoolFaculty {
  name: string;
  shortName: string;
  code: string;
  icon: string;
  description: string;
  departments: string[];
  departmentsList?: UniversityDepartmentDetail[];
  programs: UniversityCourseProgram[];
}

export interface MarksComponentBreakdown {
  component: string;
  marks: number;
  description: string;
}

export interface ExamMarkingScheme {
  totalMarks: number;
  breakdown: MarksComponentBreakdown[];
  overallView: string;
  detailedTopicExplanation: string;
  examinerKeyPoints: string[];
  architectureDiagram?: string;
  mathematicalDerivation?: string;
  modelAnswerRubric?: string[];
}


export interface PracticeCollege {
  id: string;
  name: string;
  shortCode: string;
  campusLocation?: string;
  city: string;
  country?: string;
  state: string;
  tier: string;
  logoIcon: string;
  pyqCount: number;
  highlight: string;
  paperCount?: number;
  establishedYear?: number;
  isGlobal?: boolean;
  category?: 'UNIVERSITY' | 'AUTONOMOUS_COLLEGE' | 'NATIONAL_ENTRANCE_EXAM';
  institutionType?: 'CENTRAL_GOVT_UNIVERSITY' | 'STATE_GOVT_UNIVERSITY' | 'GOVT_AUTONOMOUS_COLLEGE' | 'PRIVATE_DEEMED_UNIVERSITY' | 'PRIVATE_STATE_UNIVERSITY' | 'PRIVATE_INSTITUTE' | 'NATIONAL_ENTRANCE_BOARD' | 'INTERNATIONAL_UNIVERSITY';
  examAgency?: string;
  websiteUrl?: string;
  accreditation?: string;
  officialSiteVerified?: boolean;
  departments?: string[];
  programs?: string[];
  programsCatalog?: UniversityProgramDetail[];
  schoolsCatalog?: UniversitySchoolFaculty[];
  availableYears?: string[];
}

export interface PracticeSubject {
  code: string;
  name: string;
  semester: number;
  department: string;
  credits: number;
  topics: string[];
  category?: 'CORE' | 'ELECTIVE' | 'ALLIED';
}

export interface PracticeQuestionSolution {
  simpleExplanation: string;
  simpleAnalogy?: string;
  mathematicalDerivation?: string;
  architectureDiagram?: string;
  systemDiagram?: string;
  examinerKeywords: string[];
  keyPoints?: string[];
  commonPitfalls?: string;
}

export interface MentorPracticePaper {
  id: string;
  paperTitle: string;
  title?: string;
  classId: string;
  className: string;
  subjectCode: string;
  motive: string;
  targetCO: string;
  sourceFormat: 'PDF' | 'PAPER_OCR' | 'TEXT';
  uploadedFormat?: 'PDF' | 'PAPER_OCR' | 'TEXT';
  languageMode: 'ORIGINAL' | 'PARAPHRASED_SIMPLIFIED' | 'TECHNICAL_FORMAL';
  aiLanguageAdapted?: boolean;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  linkedVivaTitle?: string;
  linkedVivaTestId?: string;
  uploadedBy: string;
  uploadedAt: string;
  publishedAt?: string;
  questionsCount?: number;
  resultState: 'NOT_ATTEMPTED' | 'PRACTICED' | 'MASTERED';
  questions: MinedPYQ[];
  paperContentMode?: 'WITH_SOLUTIONS' | 'QUESTIONS_ONLY';
  durationValue?: string;
  releaseTime?: string;
  endTime?: string;
  isTerminated?: boolean;
  status?: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DRAFT';
  ticketReason?: string;
  topic?: string;
  placeLocation?: string;
  studentAcceptanceList?: AssignmentStudentAcceptance[];
}

export interface MinedPYQ {
  id: string;
  subjectCode: string;
  subjectName: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  format: 'MCQ' | 'DESCRIPTIVE' | 'VIVA';
  frequencyBadge: string;
  recurrenceRate: number;
  questionText: string;
  question?: string;
  marks?: number;
  frequency?: number;
  targetCO: string;
  bloomLevel: BloomLevel;
  bloomsLevel?: BloomLevel;
  universityTags: string[];
  collegeId?: string;
  collegeName?: string;
  yearAsked?: string;
  isHighYield?: boolean;
  isImportant?: boolean;
  importanceScore?: number;
  subjectCategory?: 'CORE' | 'ELECTIVE' | 'ALLIED';
  aiThinkerSolution?: PracticeQuestionSolution;
  youtubeReference?: {
    title: string;
    channelName: string;
    duration: string;
    youtubeUrl: string;
    url?: string;
    timestampNote?: string;
  };
  isFromMentorPaper?: boolean;
  mentorPaperMetadata?: {
    paperTitle: string;
    motive: string;
    targetCO: string;
    resultState: 'NOT_ATTEMPTED' | 'PRACTICED' | 'MASTERED';
    linkedVivaTitle?: string;
    uploadedBy: string;
  };
  examSolution?: {
    definition: string;
    workingPrinciple: string;
    stepByStepDerivation: string;
    realWorldApplications: string[];
    examinerKeywords: string[];
  };
  structuredExamMarking?: ExamMarkingScheme;
  evaluationRubric?: Array<{
    criterion: string;
    marks: number;
    description: string;
  }>;
  videoTutorials?: Array<{
    title: string;
    channelName: string;
    duration: string;
    youtubeUrl: string;
    timestampNote: string;
  }>;
  // Paper Scan OCR & Improper Question Attributes
  isImproper?: boolean;
  improperReason?: string;
  rawExtractedSnippet?: string;
  detectedCO?: string;
  detailedIndianSolution?: DetailedIndianSolution;
  extractedDiagram?: {
    id: string;
    figureNumber: string;
    title: string;
    caption: string;
    associatedQuestion: string;
    svgType: string;
    labels: string[];
    lineTrigger?: number;
  };
  paperMatrixTable?: {
    id: string;
    tableNumber: string;
    title: string;
    associatedQuestion: string;
    headers: string[];
    rows: string[][];
    lineTrigger?: number;
  };
  // Section & OR-Choice Hierarchy Metadata
  sectionName?: string;
  sectionMarksFormula?: string;
  isOrChoice?: boolean;
  orChoiceGroup?: string;
  orPartLabel?: 'a' | 'b' | 'c' | string;
  hasOrAlternative?: boolean;
  orAlternativeId?: string;
  orAlternativePartLabel?: string;
  paperReference?: string;
  serialNumber?: number;
}

export interface DetailedIndianSolution {
  keyFactors: string[];
  mainPoints: string[];
  highlightPoints: string[];
  observations: string[];
  conclusion: string;
  mathematicalThings?: string;
  properFigure?: string;
  examinerRubric?: string;
  examinerRubricCriteria?: Array<{
    criterion: string;
    marks: number;
    description?: string;
  }>;
  realWorldApplications?: string[];
  rubricBreakdown?: Array<{
    component: string;
    marks: number;
  }>;
  languageMode?: 'ENGLISH' | 'HINGLISH' | 'HINDI';
}

export interface OCRQuestionItem {
  id: string;
  section: string;
  questionNumber: string;
  marks: number;
  targetCO: string;
  bloomLevel: BloomLevel;
  prompt: string;
  codeSnippet?: string;
  diagramDescription?: string;
  customAnswer?: {
    complexity: 'EASY' | 'MEDIUM' | 'HARD';
    lengthFormat: 'BRIEF' | 'DETAILED';
    style: 'ACADEMIC' | 'SIMPLIFIED';
    generatedText: string;
  };
  recommendedLectures?: Array<{
    topic: string;
    videoTitle: string;
    timestamp: string;
    url: string;
  }>;
}

export interface OCRQuestionPaper {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  institution: string;
  examSession: string;
  totalMarks: number;
  uploadDate: string;
  fileName: string;
  fileSize: string;
  previewUrl: string;
  status: 'PROCESSING' | 'EXTRACTED' | 'FAILED';
  extractedQuestions: OCRQuestionItem[];
}

export interface StudentAcademicProfile {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  collegeName: string;
  department: string;
  program: string;
  semester: string;
  batch: string;
  section: string;
  primaryMentorName: string;
  primaryMentorCode: string;
  primaryMentorEmail: string;
  overallReadinessIndex: number;
  integrityScore: number;
  averageCOAttainment: number;
  completedVivasCount: number;
}

export interface StudentFeedbackItem {
  id: string;
  ticketId: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  email: string;
  college: string;
  department: string;
  category: 'TECHNICAL_ISSUE' | 'PROCTORING_ISSUE' | 'ACADEMIC_EVALUATION' | 'FEATURE_REQUEST' | 'CAMPUS_INFRASTRUCTURE' | 'OTHER';
  subject: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  rating: number; // 1-5
  status: 'NEW' | 'IN_REVIEW' | 'RESOLVED';
  isAnonymous?: boolean;
  createdAt: string;
  resolvedAt?: string;
  adminReply?: string;
}


export interface StudentRubricPillar {
  name: string;
  weightPercent: number;
  maxScore: number;
  awardedScore: number;
  feedback: string;
}

export interface VivaQuestionEvaluationItem {
  questionIndex: number;
  questionText: string;
  maxMarks: number;
  awardedScore: number;
  isCorrect: boolean;
  verdict: 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | 'NOT_ATTEMPTED';
  studentAnswer: string;
  whatWasWrong: string;
  correctAnswerSolution: string;
  keyConceptsIdentified: string[];
  missingConcepts: string[];
  examinerNotes: string;
}

export interface VivaQuestionSubmissionItem {
  questionIndex: number;
  prompt: string;
  marks: number;
  targetCO?: string;
  bloom?: string;
  studentAnswer: string;
}

export interface StudentVivaEvaluationResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  gradeBadge: string;
  verdictSummary?: string;
  pillars: StudentRubricPillar[];
  diagnosticAdvice: string;
  cqiActionItem: string;
  transcriptSummary: string;
  integrityVerified: boolean;
  questionEvaluations?: VivaQuestionEvaluationItem[];
  generatedWithAi?: boolean;
}

export interface StudentVivaFaultIncident {
  type: string;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: string;
  description: string;
}

export interface ClassVivaTest {
  id: string;
  classId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  description: string;
  releasedAt: string;
  durationMinutes: number;
  totalMarks: number;
  status: 'RELEASED' | 'SCHEDULED' | 'CLOSED' | 'COMPLETED';
  targetCOs: string[];
  questionsCount: number;
  attemptedCount: number;
  totalEnrolled: number;
  classAverageScore: number;
  linkedAssignmentId?: string;
  linkedAssignmentName?: string;
  weightagePercent?: number;
  questions: Array<{
    id: string;
    index: number;
    prompt: string;
    marks: number;
    targetCO: string;
    bloom: string;
  }>;
}

export interface ClassStudentVivaResult {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  email: string;
  avatarUrl?: string;
  testId: string;
  testTitle: string;
  submittedAt: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'DISQUALIFIED' | 'ABSENT';
  totalScore: number;
  maxScore: number;
  percentage: number;
  gradeBadge: 'DISTINCTION' | 'EXCELLENT' | 'PROFICIENT' | 'COMPETENT' | 'NEEDS_PRACTICE';
  overallVerdict: string;
  integrityScore: number;
  faultsCount: number;
  faults: StudentVivaFaultIncident[];
  pillars: StudentRubricPillar[];
  questionResults: VivaQuestionEvaluationItem[];
  diagnosticAdvice: string;
  cqiActionItem: string;
}

export interface ClassAssignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  type: 'CODING_ASSIGNMENT' | 'WRITTEN_ANALYSIS' | 'LAB_SUBMISSION';
  totalMarks: number;
  dueDate: string;
  targetCOs: string[];
  bloomLevel: string;
  weightagePercent?: number;
  linkedVivaId?: string;
  linkedVivaName?: string;
}

export interface StudentAssignmentSubmission {
  assignmentId: string;
  assignmentTitle: string;
  type: 'CODING_ASSIGNMENT' | 'WRITTEN_ANALYSIS' | 'LAB_SUBMISSION';
  maxMarks: number;
  obtainedMarks: number;
  percentage: number;
  targetCOs: string[];
  bloomLevel: string;
  submittedAt: string;
  status: 'GRADED' | 'LATE' | 'PENDING';
  feedbackNotes?: string;
  codeRepoUrl?: string;
}

export interface StudentCoAttainment {
  coCode: string;
  title: string;
  targetPercentage: number;
  achievedPercentage: number;
  status: 'ATTAINED' | 'BORDERLINE' | 'CRITICAL';
  sources: Array<{
    name: string;
    type: 'ASSIGNMENT' | 'ORAL_VIVA';
    contributionScore: number;
  }>;
}

export interface StudentCompositeResult {
  studentId: string;
  studentName: string;
  rollNo: string;
  email: string;
  avatarUrl?: string;
  
  // Assignment Modality
  assignments: StudentAssignmentSubmission[];
  totalAssignmentMarksObtained: number;
  totalAssignmentMaxMarks: number;
  assignmentAveragePercentage: number;
  
  // Oral Viva Modality
  vivaTestId: string;
  vivaTitle: string;
  vivaMarksObtained: number;
  vivaMaxMarks: number;
  vivaPercentage: number;
  vivaIntegrityScore: number;
  vivaFaultsCount: number;
  vivaStatus: string;
  
  // Cumulative Overall Calculations
  overallCompositePercentage: number;
  totalPointsPercentage: number;
  finalGradeBadge: 'DISTINCTION' | 'EXCELLENT' | 'PROFICIENT' | 'COMPETENT' | 'NEEDS_PRACTICE';
  authenticityGap: number; // |assignmentAveragePercentage - vivaPercentage|
  authenticityStatus: 'HIGH_INTEGRITY' | 'ACCEPTABLE' | 'VERIFICATION_FLAG';
  
  // Alignments (COs & Bloom)
  coAttainments: StudentCoAttainment[];
  bloomDistribution: Array<{
    level: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
}

export * from './auth.model';
