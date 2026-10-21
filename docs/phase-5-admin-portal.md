# ScholarX — Phase 5: System Administration Portal

**Target Scope:** System Administrator Dashboard, Global User Directory (Students, Mentors, Admins), Multi-Institution Governance, System Audit Logs, and Platform Configuration.  
**Deliverable:** Complete administrative portal with campus governance tools operating against mock data.  
**Primary Routes:** `/admin/dashboard`, `/admin/users`, `/admin/institutions`, `/admin/reports`, `/admin/settings`  

---

## 1. Feature Specifications

### 1.1 System Admin Dashboard (`/admin/dashboard`)

The bird's-eye monitoring center for university chancellors, department heads, and system administrators.

#### Global KPI Metrics & System Status

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ScholarX Global Administration Console                       ● System Healthy   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│ │ TOTAL STUDENTS  │ │ TOTAL FACULTY   │ │  INSTITUTIONS   │ │  ACTIVE VIVAS   │  │
│ │      1,420      │ │       84        │ │       06        │ │       18        │  │
│ │ +12% this month │ │ Across 6 depts  │ │ 2 pending setup │ │ 42 stream feeds │  │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘  │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│ INSTITUTION STATUS OVERVIEW            │ CRITICAL SYSTEM ALERTS                  │
│ • Apex Institute of Technology (Active)│ • [INFO] Scheduled backup at 02:00 UTC  │
│ • Horizon Engineering College (Active) │ • [WARN] Higher latency on Node-3 EU    │
│ • Metro Polytechnic (Onboarding)       │                                         │
├────────────────────────────────────────┴─────────────────────────────────────────┤
│ RECENT PLATFORM AUDIT LOG                                                        │
│ • 15:30 — Admin Sarah onboarded new institution "Metro Polytechnic"               │
│ • 14:15 — Faculty Dr. Thorne published assessment "CS401 Midterm"               │
│ • 11:00 — System security: 2 inactive faculty accounts deactivated               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Unified User Directory (`/admin/users`)

A central user management table with role-based filtering tabs:

#### Filter Tabs & Table Structure
- **Tabs**: `All Users (1,504)` • `Students (1,420)` • `Faculty / Mentors (84)` • `Administrators (8)`
- **Columns**:
  1. User Avatar, Name & Institutional Email
  2. Role Badge: `STUDENT` (Blue), `MENTOR` (Purple), `SYSTEM_ADMIN` (Amber)
  3. Assigned Institution & Department
  4. Account Status: `ACTIVE` (Green), `INACTIVE` (Grey), `SUSPENDED` (Red)
  5. Created Date & Last Login
  6. Actions: `[View Profile]`, `[Edit Details]`, `[Deactivate / Activate]`

#### User Details Drawer
Clicking a user slides out a profile inspection panel:
- Personal Details & Institutional Identification (Roll No / Employee ID).
- Enrolled Classrooms or Taught Classrooms list.
- Security actions: `[Reset Password Link]`, `[Suspend Account]`, `[Elevate to Admin]`.

---

### 1.3 Institution Management (`/admin/institutions`)

Allows administrators to configure multiple colleges, campuses, and academic faculties:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Institutions Directory                                     [+ Onboard Campus]    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Institution Name        Code     Students  Faculty  Classes  Status    Actions   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Apex Institute of Tech  AIT-01   840       46       34       ACTIVE    [Manage]  │
│ Horizon Engineering     HEC-02   420       28       18       ACTIVE    [Manage]  │
│ Metro Polytechnic       MET-03   160       10       08       SETUP     [Configure│
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **Onboarding Wizard**: Step-by-step form capturing Campus Name, Institution Code, Primary Domain (e.g., `@ait.edu`), Accreditation Body (NBA/NAAC), and Primary Admin Contact.

---

### 1.4 System Reports & Platform Settings (`/admin/reports`, `/admin/settings`)

- **Reports**: Aggregate metrics on platform adoption, viva completion rates, average faculty assessment velocity, and proctoring infraction trends.
- **Settings**: Global configuration toggles including Default Pass Threshold (50%), Session Timeout, Maintenance Mode Banner, and Email Notification Gateways.

---

## 2. TypeScript Domain Models

```typescript
// src/app/core/models/admin.model.ts
export type UserRole = 'STUDENT' | 'MENTOR' | 'FACULTY' | 'INSTITUTION_ADMIN' | 'SYSTEM_ADMIN';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  institutionId: string;
  institutionName: string;
  department?: string;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt?: string;
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

export interface SystemAuditLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetResource: string;
  timestamp: string;
}
```

---

## 3. Phase 5 Acceptance Criteria

- [ ] System Admin Dashboard renders global KPI cards and system health indicators.
- [ ] User directory tab filtering works smoothly across Students, Mentors, and Admins.
- [ ] Search input enables instant filtering by user name, email, or institution.
- [ ] User status toggle (Activate/Deactivate) executes via service and updates local UI state.
- [ ] Institution directory renders campus details with functional Onboarding modal form.
- [ ] Audit log displays chronological administrative actions with actor role tags.
