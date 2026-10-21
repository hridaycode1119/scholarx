import { Observable } from 'rxjs';
import { 
  MentorClass, 
  CreateClassDto, 
  StudentRosterItem, 
  EnrollmentRequest, 
  Assessment, 
  GenerateQuestionsRequest, 
  AssessmentQuestion,
  ClassAnalyticsSummary,
  CourseOutcome,
  ProctoringSession,
  AdminUser,
  Institution,
  MentorNotification,
  ChatMessage,
  ChatChannel,
  ClassSecurityPolicy,
  TerminatedStudentIncident,
  ClassProctorAlert
} from '../models';

export interface DataProviderInterface {
  // Classrooms & Enrollment
  getMentorClasses(): Observable<MentorClass[]>;
  getClassById(classId: string): Observable<MentorClass>;
  createClass(dto: CreateClassDto): Observable<MentorClass>;
  getClassStudents(classId: string): Observable<StudentRosterItem[]>;
  getEnrollmentRequests(classId?: string): Observable<EnrollmentRequest[]>;
  approveEnrollment(requestId: string): Observable<{ success: boolean; status: string }>;
  rejectEnrollment(requestId: string, reason?: string): Observable<{ success: boolean }>;
  updateStudentStatus(classId: string, studentId: string, status: string, reason?: string): Observable<{ success: boolean; newStatus: string }>;

  // Class Security Policy & Proctoring Controls
  updateClassSecurityPolicy(classId: string, policy: ClassSecurityPolicy): Observable<{ success: boolean; policy: ClassSecurityPolicy }>;
  getTerminatedStudents(classId: string): Observable<TerminatedStudentIncident[]>;
  readmitTerminatedStudent(classId: string, studentId: string): Observable<{ success: boolean }>;
  logClassProctorIncident(incident: ClassProctorAlert): Observable<{ success: boolean }>;
  getClassProctorAlerts(classId: string): Observable<ClassProctorAlert[]>;

  // Assessments & AI Generator
  getAssessments(classId?: string): Observable<Assessment[]>;
  getAssessmentById(id: string): Observable<Assessment>;
  createAssessment(assessment: Assessment): Observable<Assessment>;
  generateAiQuestions(params: GenerateQuestionsRequest): Observable<AssessmentQuestion[]>;
  regenerateSingleQuestion(questionId: string, instruction?: string): Observable<AssessmentQuestion>;
  publishAssessment(assessmentId: string): Observable<{ success: boolean; publishedAt: string }>;

  // OBE Analytics & Reports
  getClassAnalytics(classId: string): Observable<ClassAnalyticsSummary>;
  getClassOutcomes(classId: string): Observable<{ cos: CourseOutcome[]; poMapping: Record<string, number> }>;
  saveClassOutcomes(classId: string, payload: { cos: CourseOutcome[]; poMapping: Record<string, number> }): Observable<{ success: boolean }>;
  downloadClassPdfReport(classId: string): Observable<Blob>;

  // Proctoring
  getActiveProctoringSessions(assessmentId: string): Observable<ProctoringSession[]>;
  sendIntercomMessage(studentId: string, assessmentId: string, message: string): Observable<{ delivered: boolean; timestamp: string }>;

  // Notifications
  getNotifications(): Observable<MentorNotification[]>;
  markNotificationAsRead(id: string): Observable<{ success: boolean }>;
  markAllNotificationsAsRead(): Observable<{ success: boolean }>;

  // Chat & Communication
  getChatChannels(): Observable<ChatChannel[]>;
  getChannelMessages(channelId: string): Observable<ChatMessage[]>;
  sendChatMessage(channelId: string, content: string): Observable<ChatMessage>;

  // Admin
  getAdminKpis(): Observable<{ totalStudents: number; totalFaculty: number; activeInstitutions: number; activeVivas: number }>;
  getAdminUsers(role?: string): Observable<AdminUser[]>;
  toggleUserStatus(userId: string, status: string): Observable<{ success: boolean }>;
  getInstitutions(): Observable<Institution[]>;
  onboardInstitution(dto: Partial<Institution>): Observable<Institution>;
}
