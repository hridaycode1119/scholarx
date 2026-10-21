import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AuthUser,
  UserRole,
  LoginCredentials,
  StudentRegistrationData,
  MentorRegistrationData,
  AuthResponse
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly backendUrl = 'http://localhost:5000/api/v1/auth';

  private readonly STORAGE_KEY_CURRENT_USER = 'scholarx_auth_current_user';
  private readonly STORAGE_KEY_TOKEN = 'scholarx_auth_token';

  // Reactive Signals
  readonly currentUser = signal<AuthUser | null>(this.loadStoredUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role || null);
  readonly isStudent = computed(() => this.userRole() === 'STUDENT');
  readonly isMentor = computed(() => this.userRole() === 'MENTOR');
  readonly isAdmin = computed(() => this.userRole() === 'ADMIN');

  // --- Session Persistence Helpers ---
  private loadStoredUser(): AuthUser | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const json = localStorage.getItem(this.STORAGE_KEY_CURRENT_USER);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  public getAuthToken(): string {
    if (typeof window === 'undefined' || !window.localStorage) return '';
    return localStorage.getItem(this.STORAGE_KEY_TOKEN) || '';
  }

  private setSession(user: AuthUser, token?: string): void {
    this.currentUser.set(user);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      if (token) {
        localStorage.setItem(this.STORAGE_KEY_TOKEN, token);
      }
    }
  }

  // --- Login Method (Delegated directly to Backend Single Source of Truth) ---
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const rawId = (credentials.loginId || '').trim();
    const rawPass = (credentials.password || '').trim();
    const targetRole = credentials.role;

    if (!rawId) {
      return { success: false, error: 'Please enter your Login ID, Email, or Roll/Faculty Number.' };
    }
    if (!rawPass) {
      return { success: false, error: 'Please enter your password.' };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.backendUrl}/login`, {
          loginId: rawId,
          password: rawPass,
          role: targetRole
        })
      );

      if (response && response.success && response.user) {
        this.setSession(response.user, response.token);
        const redirectUrl = this.getPortalDefaultRoute(response.user.role);
        return {
          ...response,
          redirectUrl
        };
      }
      return response;
    } catch (err: any) {
      const errRes = err.error as AuthResponse;
      return {
        success: false,
        error: errRes?.error || 'Unable to connect to ScholarX backend server. Please ensure the backend is running.'
      };
    }
  }

  // --- Student Registration (Delegated to Backend) ---
  async registerStudent(data: StudentRegistrationData): Promise<AuthResponse> {
    if (!data.fullName?.trim()) {
      return { success: false, error: 'Student full name is required.' };
    }
    if (!data.email?.trim() || !data.email.includes('@')) {
      return { success: false, error: 'A valid student email address is required.' };
    }
    if (!data.rollNumber?.trim()) {
      return { success: false, error: 'University Roll Number / Student UID is required.' };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (data.confirmPassword && data.password !== data.confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.backendUrl}/register/student`, data)
      );

      if (response && response.success && response.user) {
        this.setSession(response.user, response.token);
        return {
          ...response,
          redirectUrl: '/student/dashboard'
        };
      }
      return response;
    } catch (err: any) {
      const errRes = err.error as AuthResponse;
      return {
        success: false,
        error: errRes?.error || 'Student registration failed on backend.'
      };
    }
  }

  // --- Mentor / Faculty Registration (Delegated to Backend) ---
  async registerMentor(data: MentorRegistrationData): Promise<AuthResponse> {
    if (!data.fullName?.trim()) {
      return { success: false, error: 'Faculty full name is required.' };
    }
    if (!data.email?.trim() || !data.email.includes('@')) {
      return { success: false, error: 'A valid institutional faculty email address is required.' };
    }
    if (!data.facultyId?.trim()) {
      return { success: false, error: 'Faculty Employee Code / Teacher ID is required.' };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    if (data.confirmPassword && data.password !== data.confirmPassword) {
      return { success: false, error: 'Passwords do not match.' };
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.backendUrl}/register/mentor`, data)
      );

      if (response && response.success && response.user) {
        this.setSession(response.user, response.token);
        return {
          ...response,
          redirectUrl: '/mentor/dashboard'
        };
      }
      return response;
    } catch (err: any) {
      const errRes = err.error as AuthResponse;
      return {
        success: false,
        error: errRes?.error || 'Mentor registration failed on backend.'
      };
    }
  }

  // --- Logout Method ---
  logout(): void {
    const token = this.getAuthToken();
    if (token) {
      this.http
        .post(`${this.backendUrl}/logout`, {}, { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) })
        .subscribe({
          next: () => {},
          error: () => {}
        });
    }

    this.currentUser.set(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY_CURRENT_USER);
      localStorage.removeItem(this.STORAGE_KEY_TOKEN);
    }
    this.router.navigate(['/login']);
  }

  // --- Route Resolver Helper ---
  getPortalDefaultRoute(role: UserRole): string {
    switch (role) {
      case 'STUDENT':
        return '/student/dashboard';
      case 'MENTOR':
        return '/mentor/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/login';
    }
  }

  // --- Quick Demo Sample Credentials Provider ---
  getDemoCredentials(role: UserRole): { id: string; pass: string } | null {
    if (role === 'STUDENT') {
      return { id: 'student@apex.edu', pass: 'student123' };
    }
    if (role === 'MENTOR') {
      return { id: 'mentor@apex.edu', pass: 'mentor123' };
    }
    // Admin is deliberately private: no public quick fill returned to UI!
    return null;
  }
}
