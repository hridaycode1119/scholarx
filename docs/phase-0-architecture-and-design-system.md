# ScholarX — Phase 0: Foundation, Architecture & Design System

**Target Scope:** Workspace Setup, Angular 18 Architectural Blueprint, Enterprise Design System Tokens, UI Component Library, and Pluggable Mock Service Layer.  
**Deliverable:** Solid foundational shell and UI library ready for feature module development.  
**Backend Coupling:** 0% (Fully abstracted behind `DataProviderInterface`).  

---

## 1. Architectural Architecture & Folder Layout

ScholarX Mentor & Admin Portal is architected in **Angular 18** using **Standalone Components**, **Signals**, and **OnPush change detection** throughout.

### 1.1 Recommended Directory Tree

```text
src/
├── app/
│   ├── core/                           # Singleton services, interceptors, auth, & API provider
│   │   ├── auth/
│   │   │   ├── auth.guard.ts           # Route navigation guards (Mentors vs Admins)
│   │   │   ├── auth.service.ts         # User session & identity state (Signals)
│   │   │   └── auth.tokens.ts          # Dependency injection tokens
│   │   ├── api/
│   │   │   ├── api-provider.token.ts   # DATA_PROVIDER injection token
│   │   │   ├── data-provider.interface.ts # Universal contract for all backend calls
│   │   │   ├── mock-data-provider.ts   # In-memory mock engine with synthetic delays
│   │   │   └── platform-api-provider.ts# Future FastAPI HttpClient implementation
│   │   ├── layout/
│   │   │   ├── mentor-shell/           # Mentor sidebar, header, breadcrumbs, user dropdown
│   │   │   ├── admin-shell/            # System admin sidebar & navigation shell
│   │   │   └── auth-shell/             # Clean login/recovery wrapper
│   │   └── models/                     # Shared TypeScript domain interfaces & DTOs
│   │
│   ├── features/                       # Lazy-loaded feature domains
│   │   ├── mentor/
│   │   │   ├── dashboard/              # Mentor home, KPIs, pending queues
│   │   │   ├── classes/                # Classroom CRUD, roster, enrollment queue
│   │   │   ├── assessments/            # Assessment list, details, manual builder
│   │   │   ├── ai-generator/           # ScholarX AI test generator wizard & review
│   │   │   ├── analytics/              # OBE analytics, CO/PO attainment, recommendations
│   │   │   ├── proctoring/             # Live candidate video grid, alerts, intercom
│   │   │   ├── reports/                # NBA/NAAC outcome reports & PDF export UI
│   │   │   ├── communication/          # Class chat channels & direct messaging
│   │   │   └── notifications/          # Mentor alert center & deep links
│   │   │
│   │   └── admin/
│   │       ├── dashboard/              # Global system overview & institution metrics
│   │       ├── users/                  # User directory (Students, Mentors, Admins)
│   │       ├── institutions/           # Campus & institution management
│   │       ├── reports/                # System audit reports & activity monitors
│   │       └── settings/               # Administrative platform configurations
│   │
│   ├── shared/                         # Reusable design system primitives & utilities
│   │   ├── components/
│   │   │   ├── button/                 # Button (primary, secondary, danger, ghost, icon)
│   │   │   ├── card/                   # Card container & header/body slots
│   │   │   ├── badge/                  # Status & severity badges (pill variants)
│   │   │   ├── modal/                  # Accessible dialog overlay with focus trap
│   │   │   ├── table/                  # Responsive data table with sorting/pagination
│   │   │   ├── skeleton/               # Shimmer loaders for cards, tables, text
│   │   │   ├── empty-state/            # Standard illustration, text, and CTA button
│   │   │   ├── error-state/            # Non-fatal error card with retry handler
│   │   │   └── toast/                  # Non-blocking notification toasts
│   │   ├── directives/                 # ClickOutside, Tooltip, FocusTrap
│   │   └── pipes/                      # FormatDate, RelativeTime, Truncate, BloomBadgePipe
│   │
│   ├── app.config.ts                   # Application providers & dependency injection setup
│   ├── app.routes.ts                   # High-level root routes & lazy-loaded child modules
│   └── styles.scss                     # Global CSS tokens, typography, resets
```

---

## 2. ScholarX Design System & Color Palette

The ScholarX visual identity balances **modern enterprise intelligence** with **clean academic authority**.

### 2.1 Color Tokens Specification

```css
:root {
  /* Brand Primary: Deep Indigo (Academic Authority & Intelligence) */
  --sx-primary-50:  #eef2ff;
  --sx-primary-100: #e0e7ff;
  --sx-primary-200: #c7d2fe;
  --sx-primary-500: #6366f1;
  --sx-primary-600: #4f46e5;  /* Main Brand Action */
  --sx-primary-700: #4338ca;
  --sx-primary-900: #312e81;

  /* Brand Secondary: Electric Sky (Interactive accents & Live statuses) */
  --sx-secondary-50:  #f0f9ff;
  --sx-secondary-100: #e0f2fe;
  --sx-secondary-500: #0ea5e9;
  --sx-secondary-600: #0284c7;

  /* AI Core Accent: Nebula Purple (AI Generator & Bloom's Taxonomy) */
  --sx-ai-50:  #faf5ff;
  --sx-ai-100: #f3e8ff;
  --sx-ai-500: #a855f7;
  --sx-ai-600: #8b5cf6;
  --sx-ai-700: #7e22ce;

  /* Neutrals: Clean Slate (Crisp contrast, glare-free SaaS) */
  --sx-neutral-0:   #ffffff;  /* Card surface */
  --sx-neutral-50:  #f8fafc;  /* App canvas background */
  --sx-neutral-100: #f1f5f9;  /* Muted backgrounds & hovers */
  --sx-neutral-200: #e2e8f0;  /* Borders & dividing lines */
  --sx-neutral-300: #cbd5e1;  /* Inactive states */
  --sx-neutral-400: #94a3b8;  /* Placeholder text */
  --sx-neutral-500: #64748b;  /* Subtitle text */
  --sx-neutral-700: #334155;  /* Secondary text */
  --sx-neutral-900: #0f172a;  /* Main headings */

  /* Semantic Alerts */
  --sx-success-50:  #ecfdf5;
  --sx-success-500: #10b981;  /* Active, Approved, 100% Attainment */
  --sx-warning-50:  #fffbeb;
  --sx-warning-500: #f59e0b;  /* Pending, Tab switch, Moderate risk */
  --sx-danger-50:   #fef2f2;
  --sx-danger-500:  #ef4444;  /* Rejected, Suspended, Critical alert */

  /* Elevation & Shadows */
  --sx-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --sx-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --sx-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Border Radii */
  --sx-radius-sm: 6px;
  --sx-radius-md: 10px;
  --sx-radius-lg: 16px;
  --sx-radius-full: 9999px;
}
```

---

## 3. The Data Provider Abstraction (Zero-Backend Coupler)

To guarantee that the frontend code never couples directly to mock data:

```typescript
// src/app/core/api/data-provider.interface.ts
import { Observable } from 'rxjs';
import { 
  MentorClass, 
  CreateClassDto, 
  EnrollmentRequest, 
  Assessment, 
  GenerateQuestionsRequest, 
  GeneratedQuestion,
  ProctoringSession 
} from '../models';

export interface DataProviderInterface {
  // Classrooms & Enrollment
  getMentorClasses(): Observable<MentorClass[]>;
  getClassById(classId: string): Observable<MentorClass>;
  createClass(dto: CreateClassDto): Observable<MentorClass>;
  getEnrollmentRequests(classId: string): Observable<EnrollmentRequest[]>;
  approveEnrollment(requestId: string): Observable<{ success: boolean; studentId: string }>;
  rejectEnrollment(requestId: string, reason: string): Observable<{ success: boolean }>;
  
  // Assessments & AI Generator
  getAssessments(classId?: string): Observable<Assessment[]>;
  getAssessmentById(id: string): Observable<Assessment>;
  generateAiQuestions(params: GenerateQuestionsRequest): Observable<GeneratedQuestion[]>;
  regenerateSingleQuestion(questionId: string, instruction?: string): Observable<GeneratedQuestion>;
  publishAssessment(assessmentId: string): Observable<{ success: boolean; publishedAt: string }>;
  
  // Proctoring
  getActiveProctoringSessions(assessmentId: string): Observable<ProctoringSession[]>;
  sendIntercomMessage(studentId: string, message: string): Observable<{ delivered: boolean }>;
}
```

### 3.1 Feature Service Consumption Pattern

```typescript
// src/app/features/mentor/classes/services/class.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { MentorClass, CreateClassDto } from '../../../../core/models';

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly provider = inject(DATA_PROVIDER);
  
  // Reactive Signals for UI consumption
  readonly classes = signal<MentorClass[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  loadClasses(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.provider.getMentorClasses().subscribe({
      next: (data) => {
        this.classes.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to fetch classrooms');
        this.isLoading.set(false);
      }
    });
  }

  createClass(dto: CreateClassDto): Observable<MentorClass> {
    return this.provider.createClass(dto);
  }
}
```

---

## 4. Phase 0 Acceptance Criteria

- [ ] Angular 18 standalone workspace boots cleanly without errors.
- [ ] ScholarX design tokens defined in SCSS and available globally.
- [ ] Reusable UI components (`sx-button`, `sx-card`, `sx-badge`, `sx-modal`, `sx-table`, `sx-skeleton`) implemented with storybook or demo showcase page.
- [ ] Mentor shell and Admin shell layout frames built with responsive drawer sidebars and topbars.
- [ ] `DATA_PROVIDER` token successfully configured with `MockDataProvider` providing simulated HTTP latency (300ms–800ms) and simulated error toggling.
