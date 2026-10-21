export type UserRole = 'STUDENT' | 'MENTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  institution?: string;
  // Student Specific Attributes
  rollNumber?: string;
  yearSemester?: string;
  degreeProgram?: string;
  // Mentor Specific Attributes
  academicTitle?: string; // 'Prof.' | 'Dr.' | 'Assoc. Prof.'
  facultyId?: string;
  designation?: string;
  teachingSpecialization?: string[];
  isVivaExaminerAuthorized?: boolean;
  // Account Metadata
  createdAt: string;
}

export interface LoginCredentials {
  loginId: string; // email, roll number, or faculty id
  password: string;
  role: UserRole;
}

export interface StudentRegistrationData {
  fullName: string;
  email: string;
  rollNumber: string;
  collegeName: string;
  degreeProgram: string;
  department: string;
  yearSemester: string;
  password: string;
  confirmPassword?: string;
}

export interface MentorRegistrationData {
  academicTitle: string;
  fullName: string;
  email: string;
  facultyId: string;
  collegeName: string;
  department: string;
  designation: string;
  teachingSpecialization: string;
  isVivaExaminerAuthorized?: boolean;
  password: string;
  confirmPassword?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
  redirectUrl?: string;
}
