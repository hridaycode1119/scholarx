# PRD — VIVA-AI Mentor & Admin Web Frontend

**Product:** VIVA-AI  
**Platform:** Angular 18 Web  
**Owner:** Member 3 — Mentor & Admin Frontend  
**Backend:** Not connected during this phase  
**Primary Goal:** Build the complete Mentor and System Admin frontend independently of the backend, using a clean mock API layer that can later be replaced by the real Platform API.

---

# 1. Product Objective

Member 3 owns the complete **faculty/mentor and administrator web experience**.

The frontend must provide a polished, production-quality interface for:

- Mentor authentication and workspace
- Mentor dashboard
- Classroom management
- Student enrollment approval
- Student roster management
- Assessment management
- AI assessment generation
- Assessment publishing
- CO/PO configuration
- Class analytics
- Accreditation/report views
- Live proctoring
- Mentor notifications
- Mentor communication
- System Admin dashboard
- User management
- Institution management
- System-level reports and administration

The current VIVA-AI audit identifies these mentor/admin-related capabilities across classes, enrollment, tests, outcomes, reports, AI generation, proctoring, analytics and communication. The frontend must present these capabilities while keeping authoritative business logic in the future backend.

---

# 2. Core Architecture

```text
┌─────────────────────────────────────┐
│       MENTOR / ADMIN UI             │
│       Angular Components            │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│       Feature Services              │
│                                     │
│ MentorService                       │
│ ClassService                        │
│ EnrollmentService                   │
│ AssessmentService                  │
│ AnalyticsService                    │
│ ProctoringService                   │
│ CommunicationService                │
│ NotificationService                 │
│ AdminService                        │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│          MOCK API LAYER             │
│          Temporary only             │
└──────────────────┬──────────────────┘
                   │
                   │ LATER
                   ▼
┌─────────────────────────────────────┐
│          PLATFORM API               │
│             FastAPI                 │
└─────────────────────────────────────┘
```

**Components must never directly depend on mock data.**

---

# 3. User Roles

Member 3 owns two frontend experiences.

## Mentor / Faculty

Possible roles:

```text
MENTOR
FACULTY
INSTITUTION_ADMIN
```

The exact role visibility should be driven by the authenticated role returned by the API.

## System Administrator

```text
SYSTEM_ADMIN
```

Admin receives system-level functionality rather than student/faculty classroom functionality.

---

# 4. Scope

## IN SCOPE

```text
Mentor
├── Authentication
├── Mentor Dashboard
├── Classes
├── Create Class
├── Class Details
├── Student Roster
├── Enrollment Requests
├── Approve / Reject
├── Suspend / Terminate Student
├── Assessments
├── AI Test Generator
├── Question Management
├── Publish Assessment
├── Assessment History
├── CO/PO Configuration
├── Class Analytics
├── Accreditation Reports
├── Live Proctoring
├── Notifications
└── Communication

Admin
├── Admin Dashboard
├── Users
├── Students
├── Mentors
├── Institutions
├── System Reports
├── System Monitoring
└── Administrative Settings
```

## OUT OF SCOPE

Do NOT implement:

- FastAPI
- MongoDB
- Supabase
- RLS
- JWT issuance
- AI model calls
- Gemini integration
- Server-side scoring
- Server-side authorization
- Database persistence
- Backend WebSockets/SSE
- Backend analytics calculations

These belong to the backend.

---

# 5. Recommended Folder Architecture

```text
apps/web/src/app/

├── core/
│   ├── auth/
│   ├── api/
│   ├── guards/
│   ├── interceptors/
│   ├── models/
│   └── services/
│
├── features/
│   ├── mentor/
│   │   ├── dashboard/
│   │   ├── classes/
│   │   ├── assessments/
│   │   ├── ai-generator/
│   │   ├── analytics/
│   │   ├── proctoring/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── communication/
│   │
│   └── admin/
│       ├── dashboard/
│       ├── users/
│       ├── students/
│       ├── mentors/
│       ├── institutions/
│       ├── reports/
│       └── settings/
│
├── shared/
│   ├── components/
│   ├── directives/
│   ├── pipes/
│   └── utilities/
│
└── app.routes.ts
```

---

# 6. Mentor Navigation

Recommended navigation:

```text
┌─────────────────────────────────────────────────────┐
│ VIVA-AI                    🔔   Mentor Profile      │
├────────────────┬────────────────────────────────────┤
│                │                                    │
│ Dashboard      │                                    │
│ My Classes     │          PAGE CONTENT              │
│ Assessments    │                                    │
│ AI Generator   │                                    │
│ Analytics      │                                    │
│ Live Monitor   │                                    │
│ Reports        │                                    │
│ Communication  │                                    │
│ Notifications  │                                    │
│                │                                    │
│ Profile        │                                    │
└────────────────┴────────────────────────────────────┘
```

Mobile must use an appropriate responsive navigation pattern.

---

# 7. Mentor Authentication

Route:

```text
/auth/login
```

Member 3 should integrate with the shared authentication system.

Do not create a separate authentication implementation if one already exists.

After login:

```text
MENTOR / FACULTY
        ↓
/mentor/dashboard
```

Institution-level roles may route to their appropriate dashboard.

Admin:

```text
SYSTEM_ADMIN
        ↓
/admin/dashboard
```

Frontend guards are for navigation/UX only.

Backend will eventually enforce actual authorization.

---

# 8. Mentor Dashboard

Route:

```text
/mentor/dashboard
```

## Header

Display:

- Mentor name
- Department
- Institution
- Notification indicator
- Profile shortcut

## Summary cards

Example:

```text
Active Classes        5
Pending Requests      7
Upcoming Assessments  3
Students              186
```

## Dashboard sections

### Active Classes

Display:

- Class
- Subject
- Semester
- Student count
- Pending requests
- Next assessment
- Open button

### Pending Enrollment Requests

Display:

```text
Student
Class
Requested
Actions

[Approve] [Reject]
```

### Upcoming Assessments

Display:

- Assessment
- Class
- Date
- Status

### Recent Activity

Examples:

- Student joined class
- Assessment published
- Assessment completed
- New VIVA result
- New message

---

# 9. Classes

Route:

```text
/mentor/classes
```

Display all mentor classes.

Each class card/table should include:

- Class name
- Subject
- Subject code
- Semester
- Join code
- Student count
- Pending requests
- Status
- Last activity

Actions:

```text
Open
Edit
Manage Students
Assessments
Analytics
```

---

# 10. Create Class

Route:

```text
/mentor/classes/create
```

Form:

```text
Class Name
Subject
Subject Code
Department
Semester
Academic Year
Description
```

The frontend may display a generated join code returned by the mock provider.

Do NOT implement authoritative join-code generation in the frontend.

The audit specifically identifies join-code generation as duplicated business logic that should be centralized in the backend.

---

# 11. Class Details

Route:

```text
/mentor/classes/:classId
```

Use tabs:

```text
Overview
Students
Enrollment Requests
Assessments
Analytics
Communication
Settings
```

## Overview

Show:

- Class information
- Mentor
- Student count
- Pending requests
- Upcoming assessment
- Recent activity

---

# 12. Student Roster

Route:

```text
/mentor/classes/:classId/students
```

Display:

```text
Student ID
Student Name
Email
Department
Enrollment Date
Status
Actions
```

Statuses:

```text
ACTIVE
PENDING
SUSPENDED
TERMINATED
```

Actions may include:

```text
View
Suspend
Terminate
```

The backend will later decide whether the current mentor is authorized to perform each action.

---

# 13. Enrollment Request Queue

Route:

```text
/mentor/classes/:classId/enrollment
```

Display:

```text
Enrollment Requests

┌───────────────────────────────────────────────────┐
│ Student     ID          Requested       Actions   │
├───────────────────────────────────────────────────┤
│ Rahul       20230121    2h ago          ✓   ✕     │
│ Ananya      20230145    5h ago          ✓   ✕     │
└───────────────────────────────────────────────────┘
```

Actions:

```text
Approve
Reject
View Student
```

Approval dialog:

```text
Approve Student?

Student: Rahul Sharma
Class: Computer Networks

[Cancel] [Approve]
```

Rejection dialog:

```text
Reject Enrollment

Reason / Notes
[________________________]

[Cancel] [Reject]
```

The documented backend endpoint for this operation is:

```text
POST /api/v1/classes/approvals/{id}
```

The frontend should only prepare the request and render the result.

---

# 14. Student Suspension / Termination

Provide a confirmation flow.

```text
Student Details
       ↓
Actions
       ↓
Suspend / Terminate
       ↓
Confirmation
       ↓
Mock API
       ↓
Updated Status
```

Never permanently mutate local mock state directly from the component.

---

# 15. Assessment Management

Route:

```text
/mentor/assessments
```

Display:

- Assessment title
- Class
- Subject
- Number of questions
- Total marks
- Duration
- Status
- Published date

Statuses:

```text
DRAFT
PUBLISHED
ACTIVE
CLOSED
ARCHIVED
```

Actions:

```text
View
Edit
Publish
Archive
View Results
```

---

# 16. Assessment Details

Route:

```text
/mentor/assessments/:id
```

Display:

- Assessment metadata
- Instructions
- Questions
- Marks
- CO mapping
- PO mapping
- Bloom level
- Rubrics
- Publication status

---

# 17. AI Assessment Generator

Route:

```text
/mentor/ai-generator
```

This is a major module.

Configuration:

```text
Subject
Topic
Difficulty
Question Count
Format
Target CO
Target PO
Bloom Level
```

The documented AI generator uses these types of inputs and maps questions to Bloom levels and CO/PO tags.

---

# 18. AI Generator UX

Flow:

```text
Configure
   ↓
Generate
   ↓
Generating state
   ↓
Question Review
   ↓
Edit / Regenerate
   ↓
Save Draft
   ↓
Publish
```

Display generated questions as cards.

Example:

```text
Question 1

Explain TCP congestion control.

Marks: 10
Bloom: Analyze
CO: CO3
PO: PO2

[Edit] [Regenerate]
```

---

# 19. Single Question Regeneration

Each question should have:

```text
[ Regenerate ]
```

Optional custom instruction:

```text
Regeneration Instruction

Make this question more application-oriented.

[Regenerate]
```

Preserve metadata where required:

- Marks
- CO
- PO
- Bloom level

The audit specifically describes single-question regeneration while preserving marks and CO tags.

---

# 20. Assessment Publishing

Before publishing:

```text
Publish Assessment

Class: Computer Networks
Questions: 20
Total Marks: 100
Duration: 60 minutes

Once published, students will be able to access this assessment.

[Cancel] [Publish]
```

After publishing:

```text
✓ Assessment published successfully
```

---

# 21. Assessment History

Display:

```text
Assessment
Class
Created
Published
Attempts
Average Score
Status
```

Actions:

```text
View
Results
Analytics
```

---

# 22. CO / PO Configuration

Route:

```text
/mentor/classes/:classId/outcomes
```

Create a polished configuration UI.

## Course Outcomes

```text
CO1
CO2
CO3
CO4
CO5
CO6
```

Each can have configurable weightage.

Ensure UI communicates that the configured values should sum correctly.

## Program Outcomes

```text
PO1
PO2
PO3
PO4
```

Show configurable weights.

Do not implement authoritative calculations in the frontend.

The documented default model uses six COs and four POs, with configurable weightages.

---

# 23. Class Analytics

Route:

```text
/mentor/classes/:classId/analytics
```

Dashboard sections:

### Performance Overview

```text
Average Score
Highest Score
Lowest Score
Pass Rate
Completion Rate
```

### CO Attainment

```text
CO1  ███████████████
CO2  ███████████
CO3  █████████████
CO4  ████████
CO5  ████████████
CO6  █████████
```

### Failure Hotspots

Display topics/COs requiring attention.

### Recommendations

Example:

```text
CO4 shows below-target attainment.

Recommendation:
Re-teach subnetting fundamentals and provide
additional application-based questions.
```

The backend will eventually calculate official attainment and recommendations.

Frontend only renders the returned analytics.

---

# 24. Analytics Filters

Support:

```text
Class
Assessment
Date Range
Semester
CO
PO
```

Use mock data for now.

---

# 25. Accreditation Reports

Route:

```text
/mentor/reports
```

Provide:

- Class report
- Assessment report
- CO attainment
- PO mapping
- Student performance
- Outcome summary

Actions:

```text
View
Export PDF
```

The existing API inventory includes a class PDF report endpoint.

Frontend should display download/progress/error states without implementing PDF generation itself.

---

# 26. Live Proctoring

Route:

```text
/mentor/proctoring
```

This is another major module.

Display live student cards:

```text
┌────────────────────┐
│ Student: Rahul     │
│                    │
│     CAMERA         │
│                    │
│ Status: Active     │
│ ⚠ Tab Switch       │
└────────────────────┘
```

Grid features:

- Student camera
- Student name
- Student ID
- Exam
- Connection status
- Alert count
- Current status

---

# 27. Proctoring Alerts

Alert types:

```text
TAB_SWITCH
FACE_ABSENT
CAMERA_DISCONNECTED
MICROPHONE_DISCONNECTED
CONNECTION_LOST
SUSPICIOUS_ACTIVITY
```

Severity:

```text
INFO
WARNING
CRITICAL
```

Frontend should only render events supplied by the mock/real service.

Do NOT create rules such as:

```text
3 tab switches = automatic failure
```

That belongs to the backend/business layer.

The existing architecture contains browser-side proctoring events such as tab switches and face absence that ultimately need centralized handling.

---

# 28. Live Monitor UX

Include:

- Grid/list view
- Student search
- Filter by status
- Filter by severity
- Alert panel
- Student details
- Connection indicator
- Fullscreen student view
- Intercom control

Example:

```text
[All] [Warnings] [Critical]

Search students...

12 Active
2 Warnings
1 Critical
```

---

# 29. Mentor Intercom

Provide a UI to send a message to a student during an active VIVA.

```text
Student: Rahul Sharma

Message:
[Please adjust your microphone.]

[Send]
```

The frontend sends the request/event through the service layer.

The backend/realtime layer will handle actual delivery later.

---

# 30. Mentor Notifications

Route:

```text
/mentor/notifications
```

Notification examples:

```text
NEW_ENROLLMENT_REQUEST
ASSESSMENT_COMPLETED
VIVA_COMPLETED
NEW_MESSAGE
PROCTOR_ALERT
SYSTEM_NOTIFICATION
```

Features:

- Read/unread
- Mark all read
- Filter
- Timestamp
- Deep link

---

# 31. Mentor Communication

Routes:

```text
/mentor/communication
/mentor/classes/:classId/chat
```

Features:

- Class channels
- Message list
- Send message
- Unread messages
- Timestamps
- Connection state
- Empty state

Use the same shared communication components where practical.

---

# 32. Admin Dashboard

Route:

```text
/admin/dashboard
```

Admin should see system-level metrics.

Example:

```text
Total Students
Total Mentors
Institutions
Active Classes
Assessments
VIVA Sessions
System Alerts
```

Dashboard sections:

- User growth
- Active institutions
- Active classrooms
- Assessment activity
- VIVA activity
- System alerts
- Recent administrative activity

Use mock data.

---

# 33. Admin Users

Route:

```text
/admin/users
```

Tabs:

```text
All
Students
Mentors
Admins
```

Columns:

```text
Name
Email
Role
Institution
Status
Created
Actions
```

Actions:

```text
View
Edit
Deactivate
```

The UI must not assume it has authority to perform these actions. The backend will enforce permissions later.

---

# 34. Admin Student Management

Route:

```text
/admin/students
```

Features:

- Search
- Filter
- Sort
- View profile
- View institution
- View classes
- Account status
- Administrative actions

---

# 35. Admin Mentor Management

Route:

```text
/admin/mentors
```

Display:

- Mentor
- Employee ID
- Department
- Institution
- Classes
- Status

Actions:

- View
- Edit
- Deactivate

---

# 36. Institution Management

Route:

```text
/admin/institutions
```

Display:

- Institution
- Code
- Number of students
- Number of mentors
- Active classes
- Status

Actions:

```text
View
Edit
Manage
```

---

# 37. Admin Reports

Route:

```text
/admin/reports
```

Provide system-level reporting UI.

Possible reports:

- Institution performance
- Student activity
- Mentor activity
- Assessment activity
- VIVA activity
- System usage

Do not implement backend analytics calculations.

---

# 38. Mock API Architecture

Create:

```text
core/mock-api/

├── mock-auth.service.ts
├── mock-mentor.service.ts
├── mock-class.service.ts
├── mock-enrollment.service.ts
├── mock-assessment.service.ts
├── mock-generator.service.ts
├── mock-analytics.service.ts
├── mock-proctoring.service.ts
├── mock-report.service.ts
├── mock-notification.service.ts
├── mock-communication.service.ts
└── mock-admin.service.ts
```

Components must never import these directly.

Correct:

```text
Component
   ↓
Feature Service
   ↓
Data Provider
   ↓
Mock API
```

Later:

```text
Component
   ↓
Feature Service
   ↓
Data Provider
   ↓
Platform API
```

---

# 39. Mock Data

Create realistic data.

Minimum:

```text
3 mentors
3 classes per mentor
20+ students
10+ enrollment requests
10 assessments
50+ questions
Multiple CO/PO configurations
Analytics datasets
15+ proctoring events
20 notifications
30 chat messages
5 institutions
20 admin users/students/mentors
```

Use realistic academic data.

Avoid:

```text
Test User
Test Class
Lorem ipsum
123
```

---

# 40. State Management

Suggested stores:

```text
MentorSessionStore
MentorClassesStore
EnrollmentStore
AssessmentStore
GeneratorStore
AnalyticsStore
ProctoringStore
NotificationStore
CommunicationStore
AdminStore
```

For live proctoring:

```text
ProctoringStore
├── activeSessions
├── selectedStudent
├── alerts
├── filters
├── connectionStatus
└── viewMode
```

---

# 41. UI State Requirements

Every API-driven screen must implement:

## Loading

Skeleton/spinner/progress.

## Empty

Example:

```text
No classes created yet.

[Create Class]
```

## Error

```text
Something went wrong.

[Try Again]
```

## Success

```text
Operation completed successfully.
```

## Network

```text
Connection unavailable.

[Retry]
```

---

# 42. Responsive Requirements

Test:

```text
1920 × 1080
1440 × 900
1280 × 720
1024 × 768
768 × 1024
390 × 844
```

Especially test:

- Analytics dashboards
- Tables
- AI generator
- Proctoring grid
- Enrollment queue
- Modals
- Charts
- Reports

On mobile:

- Tables may become cards
- Proctoring may become a single-student focused view
- Navigation must remain usable
- Critical alerts must remain visible

---

# 43. Design System

Use the same VIVA-AI design language as the rest of the application.

Shared components:

```text
Button
Card
Badge
Input
Select
Modal
Dropdown
Tabs
Toast
Tooltip
Avatar
Skeleton
Empty State
Error State
Progress
Table
Pagination
Chart
Status Indicator
```

Maintain:

- Typography consistency
- Spacing consistency
- Radius consistency
- Shadow consistency
- Interaction consistency
- Animation consistency

Do not create a separate visual language from the Student frontend.

---

# 44. Accessibility

Minimum:

- Keyboard navigation
- Visible focus states
- Semantic HTML
- Form labels
- Accessible dialogs
- Screen-reader status updates
- Sufficient contrast
- Accessible charts/tables where practical

---

# 45. Error Handling

Centralize handling for:

```text
401 → Session expired
403 → Permission denied
404 → Resource not found
409 → Conflict
422 → Invalid input
429 → Rate limited
500 → Server error
Network failure → Connection unavailable
```

Mock all important error states.

---

# 46. Security Rules

Frontend authorization is not security.

Frontend may hide unavailable features for UX.

Backend will eventually enforce:

- Role
- Ownership
- Institution access
- Class ownership
- Student permissions
- Administrative permissions

Never implement sensitive authorization solely in Angular.

---

# 47. Absolutely Forbidden

Do NOT introduce:

```text
❌ MongoDB client
❌ Supabase database queries
❌ API keys
❌ Production credentials
❌ Fake JWT generation
❌ Client-side authoritative scoring
❌ Client-side CO/PO attainment
❌ Client-side enrollment authorization
❌ Permanent localStorage database
❌ Business logic duplicated from backend
❌ Random mock data inside components
❌ Direct WebSocket backend implementation
```

Mock data must remain behind the provider/service abstraction.

---

# 48. Development Order

## Sprint 1 — Foundation

```text
Mentor/Admin routing
Authentication integration
Role guards
API abstraction
Models
Mock API
Shared design system
Mentor layout
Admin layout
```

## Sprint 2 — Mentor Core

```text
Mentor Dashboard
Classes
Create Class
Class Details
Roster
Enrollment Requests
Approve / Reject
Suspend / Terminate
```

## Sprint 3 — Assessments

```text
Assessment List
Assessment Details
Question Management
AI Generator
Question Regeneration
Save Draft
Publish
Assessment History
```

## Sprint 4 — Analytics

```text
CO/PO Configuration
Class Analytics
Performance
CO Attainment
Failure Hotspots
Recommendations
Reports
PDF Export UI
```

## Sprint 5 — Proctoring

```text
Live Monitor
Student Cards
Alerts
Filters
Student Focus
Intercom
Connection States
```

## Sprint 6 — Communication

```text
Notifications
Class Chat
Realtime UX
```

## Sprint 7 — Admin

```text
Admin Dashboard
Users
Students
Mentors
Institutions
Reports
Settings
```

## Sprint 8 — Polish

```text
Responsive
Accessibility
Animations
Loading
Errors
Empty states
Performance
Testing
Production build
```

---

# 49. Definition of Done

Member 3 is NOT finished when screens exist.

## Functional

- [ ] Mentor authentication works
- [ ] Admin authentication works
- [ ] Mentor dashboard works
- [ ] Class CRUD UI works against mock API
- [ ] Enrollment queue works
- [ ] Approval/rejection flows work
- [ ] Student roster works
- [ ] Assessment management works
- [ ] AI generator UI works
- [ ] Question regeneration works
- [ ] Publishing flow works
- [ ] CO/PO configuration works
- [ ] Analytics works
- [ ] Reports work
- [ ] Proctoring dashboard works
- [ ] Notifications work
- [ ] Communication works
- [ ] Admin dashboard works
- [ ] User management works
- [ ] Institution management works

## Architecture

- [ ] Components do not directly use mock data
- [ ] API models are typed
- [ ] Services are separated
- [ ] Mock provider is replaceable
- [ ] No database access
- [ ] No backend business logic
- [ ] No fake authorization logic
- [ ] Real API can replace mock provider

## UX

- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Success states
- [ ] Responsive layouts
- [ ] Accessible interactions
- [ ] Consistent visual language

## Code Quality

- [ ] No dead code
- [ ] No duplicated components
- [ ] No hardcoded credentials
- [ ] No console spam
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Production build passes

---

# 50. Backend Integration Contract

When the backend is ready, Member 3 should not need to redesign the frontend.

Current:

```text
Component
    ↓
Feature Service
    ↓
Mock Provider
    ↓
Mock Response
```

Later:

```text
Component
    ↓
Feature Service
    ↓
Real API Provider
    ↓
Platform API
```

For example:

```typescript
classService.getClasses()
```

must remain the same regardless of whether the implementation uses mock data or FastAPI.

This is a mandatory architectural requirement.

---

# 51. Final Mentor Workflow

Member 3 should be able to demonstrate:

```text
LOGIN
  ↓
MENTOR DASHBOARD
  ↓
MY CLASSES
  ↓
CLASS DETAILS
  ├── STUDENTS
  │     └── APPROVE / REJECT
  │
  ├── ASSESSMENTS
  │     └── AI GENERATOR
  │            └── REVIEW
  │                   └── PUBLISH
  │
  ├── ANALYTICS
  │     └── CO / PO
  │
  ├── REPORTS
  │
  └── COMMUNICATION


MENTOR DASHBOARD
  ↓
LIVE PROCTORING
  ↓
STUDENT MONITOR
  ↓
ALERTS
  ↓
INTERCOM
```

---

# 52. Final Admin Workflow

```text
LOGIN
  ↓
ADMIN DASHBOARD
  ├── USERS
  │    ├── Students
  │    ├── Mentors
  │    └── Admins
  │
  ├── INSTITUTIONS
  │
  ├── REPORTS
  │
  └── SYSTEM SETTINGS
```

---

# 53. Mission Statement for Member 3

> **Build the complete Mentor, Faculty and Admin Web application as a polished, production-quality Angular frontend. Every backend interaction must be abstracted behind feature services and mock providers so the real Platform API can be connected later without redesigning the frontend.**

The backend remains the authoritative source for authentication, authorization, persistence, AI processing, assessment scoring, CO/PO calculations, proctoring decisions and system-level business rules.

The goal of this phase is to make the Mentor/Admin frontend fully functional against realistic mock data while keeping the architecture ready for direct Platform API integration.
