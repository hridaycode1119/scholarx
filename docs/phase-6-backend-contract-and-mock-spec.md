# ScholarX — Phase 6: Backend Integration Contract & Mock Data Specification

**Target Audience:** ScholarX Frontend Developers & Teammates developing the FastAPI Backend.  
**Purpose:** Defines the exact REST API contract, request/response JSON schemas, realistic mock data requirements, and the zero-rework cutover mechanism to connect the real backend.  

---

## 1. REST Endpoint Contract Specification

All endpoints follow standard REST semantics under the prefix `/api/v1`. Authentication uses Bearer JWT tokens in the `Authorization: Bearer <token>` header.

### 1.1 Authentication & Session

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate mentor/admin | `{ email, password }` | `{ accessToken, user: AdminUser }` |
| `GET` | `/api/v1/auth/me` | Fetch active profile | *None* | `AdminUser` |

---

### 1.2 Classrooms & Enrollment Operations

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/classes` | List faculty's classes | *Query: status* | `MentorClass[]` |
| `POST` | `/api/v1/classes` | Create new classroom | `CreateClassDto` | `MentorClass` (includes generated `joinCode`) |
| `GET` | `/api/v1/classes/{id}` | Get class details | *None* | `MentorClass` |
| `GET` | `/api/v1/classes/{id}/students` | Get enrolled roster | *None* | `StudentRosterItem[]` |
| `PATCH`| `/api/v1/classes/{id}/students/{studentId}/status` | Suspend/terminate | `{ status, reason }` | `{ success: boolean, newStatus: string }` |
| `GET` | `/api/v1/classes/{id}/approvals`| List pending queue | *None* | `EnrollmentRequest[]` |
| `POST` | `/api/v1/classes/approvals/{id}`| Approve or reject | `{ action: 'APPROVE' \| 'REJECT', reason?: string }` | `{ success: boolean, status: string }` |

---

### 1.3 Assessment Management & ScholarX AI Generator

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/assessments` | List assessments | *Query: classId, status*| `Assessment[]` |
| `GET` | `/api/v1/assessments/{id}` | Get assessment details | *None* | `Assessment` (includes full questions) |
| `POST` | `/api/v1/assessments` | Create draft test | `Partial<Assessment>` | `Assessment` |
| `POST` | `/api/v1/assessments/{id}/publish` | Publish to students | *None* | `{ success: boolean, publishedAt: string }` |
| `POST` | `/api/v1/ai/generate-questions` | Trigger AI generation | `GenerateQuestionsRequest` | `{ questions: AssessmentQuestion[] }` |
| `POST` | `/api/v1/ai/regenerate-question`| Refine single question | `{ questionId, promptOverride, metadata }` | `AssessmentQuestion` |

---

### 1.4 Outcome-Based Education (OBE) & Analytics

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/classes/{id}/outcomes` | Fetch CO/PO matrix | *None* | `{ cos: CourseOutcome[], poMapping: Matrix }` |
| `PUT` | `/api/v1/classes/{id}/outcomes` | Save CO/PO matrix | `{ cos: CourseOutcome[], poMapping: Matrix }` | `{ success: boolean }` |
| `GET` | `/api/v1/classes/{id}/analytics`| Get attainment stats | *None* | `ClassAnalyticsSummary` |
| `GET` | `/api/v1/classes/{id}/report/pdf`| Download official PDF | *None* | `application/pdf` binary stream |

---

### 1.5 Live Proctoring & Realtime Intercom

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/proctoring/sessions/{assessmentId}` | Get live candidates | *None* | `ProctoringSession[]` |
| `POST` | `/api/v1/proctoring/intercom` | Send message to student | `{ studentId, assessmentId, message }` | `{ delivered: boolean, timestamp: string }` |

---

### 1.6 System Administration

| Method | Endpoint | Description | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/kpis` | Platform-wide KPIs | *None* | `{ totalStudents, totalFaculty, activeVivas, ... }` |
| `GET` | `/api/v1/admin/users` | List all users | *Query: role, search, page* | `{ users: AdminUser[], total: number }` |
| `PATCH`| `/api/v1/admin/users/{id}/status` | Toggle account status | `{ status: AccountStatus }` | `{ success: boolean }` |
| `GET` | `/api/v1/admin/institutions` | List campuses | *None* | `Institution[]` |
| `POST` | `/api/v1/admin/institutions` | Onboard campus | `CreateInstitutionDto` | `Institution` |

---

## 2. Realistic Mock Data Fixtures Requirements

The `MockDataProvider` must provide realistic, professionally crafted academic seed data. Generic placeholders like *"Test 1"*, *"Foo Bar"*, or *"Lorem Ipsum"* are strictly prohibited.

### Minimum Required Mock Corpus:
- **Faculty / Mentors**: 3 realistic profiles:
  - *Prof. Aris Thorne* (Department of Computer Science)
  - *Dr. Elena Vance* (Department of Artificial Intelligence & Robotics)
  - *Prof. Marcus Chen* (Department of Electronics & Communication)
- **Classrooms**: Minimum 3 classes per mentor:
  - `CS401 - Distributed Systems` (Join Code: `DIST-4912`)
  - `CS302 - Computer Networks` (Join Code: `NET-8924`)
  - `AI501 - Neural Networks & Deep Learning` (Join Code: `DEEP-3105`)
- **Students**: 25+ distinct student items across departments with realistic roll numbers (e.g., `20230121`), Indian and international names, and varied attendance metrics.
- **Enrollment Queue**: 8+ pending requests awaiting approval with realistic timestamps (e.g., "15 minutes ago", "2 hours ago").
- **Assessments**: 10 assessments spread across statuses (`DRAFT`, `PUBLISHED`, `ACTIVE`, `CLOSED`).
- **AI Questions Corpus**: 50+ pre-generated questions covering Bloom levels L1 to L6 with realistic evaluation rubrics and CO tags.
- **Proctoring Sessions**: 12 active candidates with varying health statuses (1 flagged with Tab Switch, 1 with Camera Disconnected, 10 active).
- **Notifications**: 20 chronological notification entries with deep-link targets.

---

## 3. Zero-Rework Cutover Strategy

When the backend team deploys the FastAPI server, the switch is made in **one single file** (`src/app/app.config.ts`) without touching a single component or template:

```typescript
// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DATA_PROVIDER } from './core/api/api-provider.token';
import { MockDataProvider } from './core/api/mock-data-provider';
import { PlatformApiDataProvider } from './core/api/platform-api-provider';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),

    // =========================================================================
    // THE ZERO-REWORK SWITCH:
    // Simply toggle useClass based on environment.production or mock flag!
    // =========================================================================
    {
      provide: DATA_PROVIDER,
      useClass: environment.useMockApi ? MockDataProvider : PlatformApiDataProvider
    }
  ]
};
```

---

## 4. Standardized HTTP Error Mapping

The `PlatformApiDataProvider` maps standard backend HTTP response codes into clean user-facing states:

| HTTP Code | Platform Meaning | Frontend UI Response |
| :--- | :--- | :--- |
| **401 Unauthorized** | Token expired or invalid | Automatically redirects to `/auth/login` with session expiry toast |
| **403 Forbidden** | Role or class ownership mismatch | Displays "Access Denied: You do not have faculty permissions for this class" |
| **404 Not Found** | Resource missing | Renders Empty State with "Return to Dashboard" action button |
| **409 Conflict** | Duplicate join code or enrollment | Highlights form input with descriptive conflict error message |
| **422 Unprocessable**| Validation schema failed | Displays form validation pills directly beneath offending fields |
| **500 Server Error** | FastAPI unhandled exception | Shows non-fatal error banner with "Try Again" action button |
| **Offline / 0** | Internet connection lost | Displays top banner: "Network disconnected. Working in offline mode." |
