import { Routes } from '@angular/router';
import { authGuard, roleGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Authentication Routes (Public, with redirect if already logged in)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent),
    canActivate: [publicGuard]
  },

  // Public Homepage Landing Page
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },


  // ==========================================
  // MENTOR PORTAL ROUTES (Role: MENTOR or ADMIN)
  // ==========================================
  {
    path: 'mentor/dashboard',
    loadComponent: () => import('./features/mentor/dashboard/mentor-dashboard').then(m => m.MentorDashboardComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/classes',
    loadComponent: () => import('./features/mentor/classes/classes-list/classes-list').then(m => m.ClassesListComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/class-scheduler',
    loadComponent: () => import('./features/mentor/class-scheduler/class-scheduler').then(m => m.ClassSchedulerComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/ai-training',
    loadComponent: () => import('./features/mentor/ai-training/ai-training').then(m => m.AiTrainingComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/viva-copilot',
    loadComponent: () => import('./features/mentor/viva-copilot/viva-copilot').then(m => m.VivaCopilotComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/classes/:classId',
    loadComponent: () => import('./features/mentor/classes/class-details/class-details').then(m => m.ClassDetailsComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/assessments',
    loadComponent: () => import('./features/mentor/assessments/assessments-list/assessments-list').then(m => m.AssessmentsListComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/assessments/generate',
    loadComponent: () => import('./features/mentor/assessments/ai-generator/ai-generator').then(m => m.AiGeneratorComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/classes/:classId/outcomes',
    loadComponent: () => import('./features/mentor/analytics/class-outcomes/class-outcomes').then(m => m.ClassOutcomesComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/classes/:classId/analytics',
    loadComponent: () => import('./features/mentor/analytics/class-analytics/class-analytics').then(m => m.ClassAnalyticsComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/reports',
    loadComponent: () => import('./features/mentor/reports/reports-hub/reports-hub').then(m => m.ReportsHubComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/proctoring',
    loadComponent: () => import('./features/mentor/proctoring/proctoring-console/proctoring-console').then(m => m.ProctoringConsoleComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/notifications',
    loadComponent: () => import('./features/mentor/notifications/notifications-center/notifications-center').then(m => m.NotificationsCenterComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },
  {
    path: 'mentor/communication',
    loadComponent: () => import('./features/mentor/communication/classroom-chat/classroom-chat').then(m => m.ClassroomChatComponent),
    canActivate: [authGuard, roleGuard(['MENTOR', 'ADMIN'])]
  },

  // ==========================================
  // ADMIN PORTAL ROUTES (Role: ADMIN only)
  // ==========================================
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./features/admin/dashboard/admin-dashboard').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./features/admin/users/user-directory/user-directory').then(m => m.UserDirectoryComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/institutions',
    loadComponent: () => import('./features/admin/institutions/institutions-list/institutions-list').then(m => m.InstitutionsListComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/settings',
    loadComponent: () => import('./features/admin/settings/admin-settings/admin-settings').then(m => m.AdminSettingsComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/broadcasting',
    loadComponent: () => import('./features/admin/broadcasting/admin-broadcasting').then(m => m.AdminBroadcastingComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/ai-control',
    loadComponent: () => import('./features/admin/ai-control/admin-ai-control').then(m => m.AdminAiControlComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/workload',
    loadComponent: () => import('./features/admin/workload/admin-workload').then(m => m.AdminWorkloadComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/exam-scheduler',
    loadComponent: () => import('./features/admin/exam-scheduler/admin-exam-scheduler').then(m => m.AdminExamSchedulerComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },
  {
    path: 'admin/permissions',
    loadComponent: () => import('./features/admin/permissions/admin-permissions').then(m => m.AdminPermissionsComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])]
  },

  // ==========================================
  // STUDENT PORTAL ROUTES (Role: STUDENT or ADMIN)
  // ==========================================
  {
    path: 'student/dashboard',
    loadComponent: () => import('./features/student/dashboard/student-dashboard').then(m => m.StudentDashboardComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/classes',
    loadComponent: () => import('./features/student/classes/student-classes').then(m => m.StudentClassesComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/viva',
    loadComponent: () => import('./features/student/viva/student-viva').then(m => m.StudentVivaComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/practice',
    loadComponent: () => import('./features/student/practice/student-practice').then(m => m.StudentPracticeComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/paper-upload',
    loadComponent: () => import('./features/student/paper-upload/student-paper-upload').then(m => m.StudentPaperUploadComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/progress',
    loadComponent: () => import('./features/student/progress/student-progress').then(m => m.StudentProgressComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/profile',
    loadComponent: () => import('./features/student/profile/student-profile').then(m => m.StudentProfileComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/settings',
    loadComponent: () => import('./features/student/settings/student-settings').then(m => m.StudentSettingsComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/support',
    loadComponent: () => import('./features/student/support/student-support').then(m => m.StudentSupportComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },
  {
    path: 'student/communication',
    loadComponent: () => import('./features/student/communication/student-communication').then(m => m.StudentCommunicationComponent),
    canActivate: [authGuard, roleGuard(['STUDENT', 'ADMIN'])]
  },

  // Fallback route
  { path: '**', redirectTo: 'login' }
];
