# ScholarX: Enterprise AI-Powered Academic Evaluation & Oral Viva Platform

> **ScholarX** is a next-generation academic governance and oral evaluation ecosystem engineered for Tier-1 universities, autonomous engineering colleges, and multi-campus institutions. It bridges the gap between written examinations and oral defense assessments through AI-assisted viva examination, real-time biometric proctoring, Outcome-Based Education (OBE) Course Outcome (CO) attainment analytics, and accreditation governance (NBA, NAAC, ABET).

---

## 1. Executive Summary

Traditional university examinations disproportionately measure rote memorization while neglecting oral articulation, authentic problem-solving, and deep conceptual clarity. ScholarX re-engineers university assessments with an end-to-end platform featuring:

1. **AI Oral Viva Defense & Voice Evaluation**: Real-time oral questioning, automated speech-to-text dictation, and Bloom's Taxonomy evaluation with contextual follow-up probing.
2. **Biometric Edge Proctoring**: WebRTC video stream monitoring, tab-switch interception, face-continuity detection, and strike attribution.
3. **OBE & Accreditation Compliance**: Automated computation of CO (Course Outcome) and PO (Program Outcome) attainment matrices mapped directly to NBA and NAAC guidelines.
4. **Tri-Portal Governance**: Isolated, role-governed environments for **Students**, **Faculty Mentors**, and **Campus Institutional Administrators**.
5. **Pristine Jade Glasshouse UI**: Ergonomically calibrated light/dark/contrast aesthetic featuring fixed stationary navigation, 3D radial telemetry, and glassmorphic micro-animations.

---

## 2. High-Level System Architecture

```
+-------------------------------------------------------------------------------------------------+
|                                     SCHOLARX WEB CLIENT                                        |
|                          (Angular 22 + Tailwind CSS v4 + Three.js)                              |
+--------------------------------+-------------------------------+--------------------------------+
|         STUDENT PORTAL         |         MENTOR PORTAL         |          ADMIN PORTAL          |
|  - Pristine Jade Dashboard     |  - Live Proctoring Console    |  - Multi-Campus Governance     |
|  - Live Viva Defense           |  - AI Viva Copilot & Probing  |  - User & Campus Directory     |
|  - Viva Simulator / Practice   |  - AI Assessment Generator    |  - Student Feedback Tickets    |
|  - OCR PYQ Question Miner      |  - Class Scheduler & Roster   |  - Broadcast Campaigns Engine  |
|  - Academic Profile & Settings |  - OBE CO-PO Attainment Hub   |  - System Health & Audit Logs  |
|  - Customer Support & Feedback |  - NBA/NAAC Reports Export    |  - AI Model & Token Controls   |
+--------------------------------+-------------------------------+--------------------------------+
                                                 |
         +---------------------------------------+---------------------------------------+
         | LocalStorage Reactive Signals         | Real-Time BroadcastChannel Bus        |
         | (Instant Multi-Tab Reactivity)        | (viva_enrollment, scholarx_feedback)  |
         +---------------------------------------+---------------------------------------+
                                                 |
         +---------------------------------------+---------------------------------------+
         | REST API (HTTP:5000)                  | WebSocket Real-Time Bus (WS:5000)     |
         +---------------------------------------+---------------------------------------+
                                                 |
+------------------------------------------------v------------------------------------------------+
|                                    BACKEND & CLOUD SERVICES                                    |
|                              (Express.js + TypeScript Engine)                                  |
+--------------------------------+-------------------------------+--------------------------------+
|  DATABASE & AUTHENTICATION     |  AI & MEDIA ENGINES           |  STORAGE & REAL-TIME           |
|  - Supabase PostgreSQL / Local |  - Google Gemini 2.5 Pro      |  - Cloudflare R2 Object Store  |
|  - JWT Role-Based Guards       |  - Tesseract.js OCR Pipeline  |  - Redis Cache & Session Store |
|  - Multi-Institution Schemas   |  - LiveKit WebRTC Audio/Video |  - WebSocket Event Dispatcher  |
+--------------------------------+-------------------------------+--------------------------------+
```

---

## 3. Portals & Feature Modules

### 3.1. Student Portal (`/student/*`)

| Route | Module | Description |
|---|---|---|
| `/student/dashboard` | **Flight Deck Dashboard** | 8-column layout with 3D radial Viva Index (`84.6%`), live upcoming exam countdown timer, 4 KPI glass tiles, and verified assessment ledger. |
| `/student/viva` | **Live Oral Viva Defense** | Live examination session with proctor video stream, voice dictation, question-by-question progress, dynamic marks breakdown, and anti-cheating policy enforcement. |
| `/student/practice` | **Viva Simulator** | Autonomous practice hub allowing scholars to take practice vivas on university question banks with instant AI critiquing and recommendations. |
| `/student/paper-upload` | **PYQ Miner & OCR Engine** | Upload university question papers (PDF/PNG) to extract questions via Tesseract.js OCR, analyze recurrent trends, and predict upcoming viva topics. |
| `/student/classes` | **Classrooms & Enrollment** | Join classrooms via unique alphanumeric join codes (`CSE401-26`), view mentor dossiers, and monitor admission approval requests. |
| `/student/progress` | **OBE Attainment & Analytics** | Visual radar charts, Course Outcome (CO1–CO5) attainment indicators, authenticity gap score, and Bloom's distribution breakdown. |
| `/student/communication` | **Classroom Chat** | Real-time messaging channel connecting students directly with their course professors and peers. |
| `/student/settings` | **Profile & Calibration** | Comprehensive 3-tab configuration: **1) Editable Student Profile** (legal credentials, university roll no, email, phone, section, mentor binding, and avatar photo upload), **2) Visual Theme Engine** (Light, Dark, Contrast), **3) Audiovisual Hardware Loopback** (webcam video frame test & microphone decibel meter). |
| `/student/support` | **Helpdesk & Admin Feedback** | 2-column center: **Column 1:** 24/7 Student Defense Hotline (`+91 1800-420-VIVA`), helpdesk email with `< 15 min SLA`, and edge latency ping test. **Column 2:** Direct Admin Feedback form with category, priority, star ratings, and student's personal ticket history ledger. |

---

### 3.2. Faculty & Mentor Portal (`/mentor/*`)

| Route | Module | Description |
|---|---|---|
| `/mentor/dashboard` | **Mentor Command Cockpit** | Live examination readiness KPIs, pending enrollment queues, course averages, and quick actions. |
| `/mentor/classes` | **Course & Classroom Manager** | Class creation, join code distribution, enrollment roster moderation (approve/reject), and syllabus alignment. |
| `/mentor/class-scheduler` | **Class & Exam Scheduler** | Interactive calendar and scheduler for viva slots, room allocation, and student batch distribution. |
| `/mentor/assessments` | **Assessment Hub** | Assessment publication, rubric pillar weightage definition (Technical Accuracy, Analytical Depth, Articulation, Integrity). |
| `/mentor/assessments/generate` | **AI Question Synthesizer** | Automated question generation mapped to Bloom's taxonomy levels (Remember to Create) and target Course Outcomes. |
| `/mentor/viva-copilot` | **Live Viva Copilot** | Assistant for examiners during oral defenses: displays suggested follow-up probe questions, detects student speech patterns, and estimates answer completeness. |
| `/mentor/proctoring` | **Live Proctoring Console** | Multi-student video grid, real-time proctor alert feed (tab switches, webcam loss, multiple faces), strike logging, and session termination/re-admission controls. |
| `/mentor/analytics/class-outcomes`| **OBE Outcomes Matrix** | Course Outcome attainment heatmaps and student readiness indexes. |
| `/mentor/reports` | **Accreditation Reports Hub** | One-click exportable PDF/Excel compliance audits compliant with NBA Tier-1 and NAAC Criterion 2 criteria. |
| `/mentor/ai-training` | **AI Model Calibration** | Fine-tuning domain-specific parameters and evaluation strictness for automated viva grading. |
| `/mentor/communication` | **Intercom & Announcements** | Broadcast messages and direct student mentorship dialogues. |

---

### 3.3. Institutional Administration Console (`/admin/*`)

| Route | Module | Description |
|---|---|---|
| `/admin/dashboard` | **Global Administration Hub** | Multi-institution KPI summary, campus directory preview, WebRTC proctor health, platform audit logs, and **Student Feedback & Support Tickets Management Card** (with filter tabs: All, New, Urgent, Resolved, and Reply & Resolution modal). |
| `/admin/users` | **User Directory** | Centralized directory of students, faculty mentors, and campus admins with privilege toggles and suspension controls. |
| `/admin/institutions` | **Campus & College Manager** | Multi-campus onboarding, domain whitelisting, autonomous college accreditation records, and campus tier assignment. |
| `/admin/broadcasting` | **Campus Broadcasting Engine** | Campus-wide banner and popup campaign deployment with optional student registration forms and mentor routing. |
| `/admin/ai-control` | **AI Inference & Quota Controls** | Real-time monitoring of Gemini token consumption, rate limits, latency percentiles, and fallback provider management. |
| `/admin/workload` | **Faculty Workload Balancer** | Analysis of faculty exam allocations, proctoring hours, and classroom evaluation loads. |
| `/admin/exam-scheduler` | **Institutional Exam Master** | University-wide examination timeline scheduling and clash-prevention engine. |
| `/admin/permissions` | **Role-Based Access Control** | Granular permission matrices for department heads, proctors, and registrar officers. |
| `/admin/settings` | **Platform Security Settings** | Proctored exam strike sensitivity (Strict, Standard, Relaxed), session timeouts, pass thresholds, and maintenance modes. |

---

## 4. Key Technical Capabilities

### 4.1. AI-Driven Oral Viva Defense Pipeline
1. **Dynamic Prompt Synthesis**: AI examiner formulates questions calibrated to specific Course Outcomes (CO1 to CO5) and Bloom's cognitive taxonomy levels.
2. **Continuous Speech Recognition**: Student spoken answers are captured via Web Audio API, visualized via live decibel amplitude meters, and transcribed into structured answers.
3. **Multi-Pillar Rubric Scoring**: Each response is scored across 4 distinct pillars:
   - *Technical Precision & Mathematical Rigor* (35%)
   - *Conceptual Understanding & Bloom Depth* (30%)
   - *Communication & Articulation Clarity* (20%)
   - *Academic Integrity & Authenticity* (15%)
4. **Follow-Up Probing**: If an answer is incomplete or superficial, the engine prompts the student with targeted follow-up questions before calculating final marks.

### 4.2. Biometric Proctoring & Anti-Cheat Engine
- **Tab Switch Interception**: Listens to `visibilitychange` and window `blur` events. Triggers warning modals and records strikes with timestamps.
- **Biometric Presence Loopback**: WebRTC video capture verifying continuous single-candidate face presence.
- **Strike Breakdown & Incident Log**: Records proctor alert severity (`INFO`, `WARNING`, `CRITICAL`) with automatic session termination after configured strike thresholds (default: 3 strikes).

### 4.3. Outcome-Based Education (OBE) & Authenticity Verification
- **Course Outcome (CO) Attainment**: Tracks student performance across specific learning outcomes, flagging borderline or critical attainments.
- **Authenticity Gap Score**: Computes the variance between written assignment averages and live oral viva performance:
  $$\text{Authenticity Gap} = |\text{Assignment Percentage} - \text{Oral Viva Percentage}|$$
  High divergence flags potential proxy submissions or unverified written work for mentor review.

### 4.4. Student Support & Direct Admin Feedback Flow
- **Direct Real-Time Dispatch**: Feedback submitted by students in `/student/support` utilizes a shared `SupportFeedbackService` with `BroadcastChannel` synchronization.
- **Instant Admin Governance**: Incoming feedback tickets (`TKT-xxxx`) immediately appear on `/admin/dashboard` without page reloads.
- **Closed-Loop Resolution**: Administrators can review ticket details, change status (`NEW`, `IN_REVIEW`, `RESOLVED`), and attach official resolution notes that reflect back on the student's dashboard.

---

## 5. Pristine Jade Glasshouse Design System

The application features a unified **Pristine Jade Glasshouse** visual theme:

- **Stationary Canvas Architecture**: Pinned sidebar (`sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto`) with independent scrolling main viewport (`h-screen overflow-y-auto`).
- **Surface Elevation**: Frosted glass (`backdrop-blur-md bg-white/70 border border-white/60 shadow-sm`), refined jade glass buttons (`.btn-jade-primary`), and subtle border styling.
- **Typography**: Display typography in **Outfit** paired with body copy in **Plus Jakarta Sans** and monospace values in **JetBrains Mono**.
- **Ergonomic Visual Theme Modes**:
  1. **Archival Paper (Light Mode)**: Warm porcelain `#F7F8F5`, pine ink `#155E54`, and jade badges.
  2. **Midnight Basalt (Dark Mode)**: Restful dark basalt `#0E1217`, slate cards `#151B23`, and calm emerald accents.
  3. **Technical Blueprint (High Contrast Mode)**: Pure black `#000000` with high-visibility signal amber `#FBBF24` for WCAG AAA compliance.

---

## 6. Technology Stack

### Frontend Application
- **Framework**: Angular 22 (Standalone Components, Signals, Computed, Effects, New Control Flow `@if` / `@for`)
- **Styling**: Tailwind CSS v4 + SASS custom glassmorphic utilities (`src/styles.scss`)
- **3D Graphics**: Three.js (`three` + `@types/three`) for interactive 3D viva environments
- **Charts & Data Visualization**: Chart.js + `ng2-charts`
- **OCR Pipeline**: `tesseract.js` + `pdfjs-dist`
- **Icons**: `lucide-angular` + inline optimized SVG iconography

### Backend Core Service
- **Runtime**: Node.js with TypeScript (`ts-node`)
- **Framework**: Express.js REST API (`/api/v1/*`)
- **Real-Time Layer**: WebSocket server (`ws://localhost:5000/ws`)
- **State & Storage Adapters**: Dual-mode engine supporting Local Mock Store, PostgreSQL (Supabase), Redis cache, and Cloudflare R2 object storage.

---

## 7. Project Directory Structure

```
ScholarX/
├── PROJECT_OVERVIEW.md                  # Comprehensive Project Documentation
├── package.json                         # Dependencies and build scripts
├── tsconfig.json                        # TypeScript configuration
├── angular.json                         # Angular CLI workspace configuration
├── src/
│   ├── index.html                       # HTML root with fonts & meta tags
│   ├── main.ts                          # Angular bootstrap file
│   ├── styles.scss                      # Global styles & Pristine Jade design system
│   └── app/
│       ├── app.ts                       # Root application component
│       ├── app.html                     # Fixed stationary sidebar & main router outlet
│       ├── app.routes.ts                # Application route table & role guards
│       ├── core/
│       │   ├── api/                     # Mock data providers & API tokens
│       │   ├── guards/                  # authGuard, roleGuard, publicGuard
│       │   ├── models/                  # Domain models (Profile, Feedback, Tests, OBE)
│       │   └── services/                # StudentService, AuthService, SupportFeedbackService, GeminiAiService
│       ├── features/
│       │   ├── auth/                    # Login and Registration flows
│       │   ├── student/                 # Student portal modules
│       │   │   ├── dashboard/           # Flight Deck dashboard
│       │   │   ├── viva/                # Live oral exam defense
│       │   │   ├── practice/            # Viva simulator
│       │   │   ├── paper-upload/        # PYQ question OCR miner
│       │   │   ├── classes/             # Classroom joining and rosters
│       │   │   ├── progress/            # OBE attainment analytics
│       │   │   ├── settings/            # Editable profile, themes, diagnostics
│       │   │   ├── support/             # Helpdesk, hotline, admin feedback
│       │   │   └── communication/       # Real-time classroom messaging
│       │   ├── mentor/                  # Faculty portal modules
│       │   │   ├── dashboard/           # Mentor cockpit
│       │   │   ├── classes/             # Class creation and student rosters
│       │   │   ├── assessments/         # Assessment lists and AI generator
│       │   │   ├── proctoring/          # Multi-feed proctoring console
│       │   │   ├── viva-copilot/        # Real-time viva assistant
│       │   │   ├── analytics/           # CO attainment & student analytics
│       │   │   └── reports/             # NBA/NAAC compliance reports
│       │   └── admin/                   # Institutional administration portal
│       │       ├── dashboard/           # Multi-campus console & ticket hub
│       │       ├── users/               # User directory & privilege management
│       │       ├── institutions/        # Multi-campus onboarding
│       │       ├── broadcasting/        # Campus campaign announcements
│       │       └── settings/            # Platform-wide security policies
│       └── shared/                      # Reusable components & 3D widgets
└── backend/                             # Core Express + WebSocket Service
    ├── package.json
    ├── src/
    │   └── server.ts                    # Backend REST API and WebSocket bus
    └── dist/                            # Compiled backend assets
```

---

## 8. Getting Started & Running Locally

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

### 1. Start Frontend Development Server
From the project root:
```bash
# Install dependencies
npm install

# Start development server
npx ng serve --host 0.0.0.0 --port 4200
```
The frontend will be available at **`http://localhost:4200/`**.

### 2. Start Backend API Service
From the backend directory:
```bash
# Start backend server in development mode
npm run dev
```
The backend HTTP REST API will be active at **`http://localhost:5000/api/v1`** and the health check at **`http://localhost:5000/api/v1/health`**.

---

## 9. Verification & Quality Standards

- **Angular Build Compilation**: Verified with zero compilation errors (`npx ng build --configuration=development`).
- **Reactive State Integrity**: Signals and computed properties update predictably across component trees.
- **Cross-Tab Real-Time Sync**: Synchronized via HTML5 `BroadcastChannel` for instant updates across concurrent browser sessions.
