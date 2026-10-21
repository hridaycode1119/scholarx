# ScholarX — Phase 4: Live Proctoring & Realtime Communication

**Target Scope:** Live Examination Candidate Grid, Real-Time Proctoring Alerts Engine, Candidate Focus Inspector, Mentor Intercom Messaging, Notification Center, and Classroom Discussion Channels.  
**Deliverable:** High-concurrency proctoring console and communication system with mock streaming feeds and simulated alert events.  
**Primary Routes:** `/mentor/proctoring`, `/mentor/notifications`, `/mentor/communication`, `/mentor/classes/:classId/chat`  

---

## 1. Feature Specifications

### 1.1 Live Proctoring Console (`/mentor/proctoring`)

Provides mentors with real-time visual surveillance and integrity monitoring during active oral vivas and automated assessments.

#### Visual Layout Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Live Viva Monitor: CS401 Midterm Examination (Oct 2026)      ● LIVE (42 Active)        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Quick Filters: [All (42)]  [Normal (38)]  [⚠️ Warnings (3)]  [🚨 Critical (1)]          │
│ Search: [Filter by student name or roll number...            ]  View: [🔲 Grid] [📄 List]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ Rahul Sharma         │ │ Ananya Sen           │ │ Vikram Malhotra      │             │
│ │ ID: 20230121         │ │ ID: 20230145         │ │ ID: 20230188         │             │
│ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │ │ ┌──────────────────┐ │             │
│ │ │ [LIVE VIDEO FEED]│ │ │ │ [LIVE VIDEO FEED]│ │ │ │ [⚠️ FEED OFFLINE]│ │             │
│ │ │ ● Audio Active   │ │ │ │ ● Audio Active   │ │ │ │ ✕ Cam Lost       │ │             │
│ │ └──────────────────┘ │ │ └──────────────────┘ │ │ └──────────────────┘ │             │
│ │ Status: In Progress  │ │ Status: In Progress  │ │ Status: Flagged      │             │
│ │ Alerts: 0            │ │ ⚠️ 1 Tab Switch      │ │ 🚨 Cam Disconnected │             │
│ │ [Inspect] [Intercom] │ │ [Inspect] [Intercom] │ │ [Inspect] [Intercom] │             │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Proctoring Alert Taxonomy & Severity

Alert events are streamed into the frontend state store. The frontend renders visual badges and audio cues according to severity:

| Alert Code | Description | Severity | Visual Indicator |
| :--- | :--- | :--- | :--- |
| `TAB_SWITCH` | Examinee navigated away from active browser window | `WARNING` | Amber badge with counter (e.g. `⚠️ 2 Tab Switches`) |
| `FACE_ABSENT` | AI facial detector lost track of examinee | `WARNING` | Amber flashing border around card |
| `MULTIPLE_FACES` | More than one person detected in camera frame | `CRITICAL` | Red pulse with exclamation marker |
| `CAM_DISCONNECTED` | Video feed terminated or permissions revoked | `CRITICAL` | Black screen overlay with alert prompt |
| `MIC_MUTED` | Microphone input silent or disabled during viva | `WARNING` | Muted microphone badge |
| `CONNECTION_LOST` | Network heartbeat lost for $> 10$ seconds | `CRITICAL` | Disconnected status indicator |

> [!IMPORTANT]
> **Zero Authoritative Disqualification**: The frontend **never automatically terminates** or fails a student based on tab count (e.g., "3 strikes = auto-fail"). Such authority strictly resides in backend institutional policy rules. The frontend simply alerts the mentor and logs events.

---

### 1.3 Candidate Focus Inspector & Mentor Intercom

Clicking `[Inspect]` on any student opens an inspection drawer:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ Candidate Inspector: Ananya Sen (ID: 20230145)               [Close ✕]    │
├───────────────────────────────────────────────────────────────────────────┤
│ [ LARGE EXPANDED VIDEO STREAM ]                                           │
│ Stream Quality: HD (1080p) • Latency: 42ms • Audio Level: ▇▇▇▇▇ 82%       │
├───────────────────────────────────────────────────────────────────────────┤
│ Integrity Event Timeline:                                                 │
│ • 14:02:10 — Assessment commenced                                         │
│ • 14:12:45 — ⚠️ Tab switch detected (Duration: 3.4 seconds)               │
│ • 14:18:22 — ⚠️ Face absent from frame (Duration: 2.1 seconds)            │
├───────────────────────────────────────────────────────────────────────────┤
│ Mentor Live Intercom:                                                     │
│ Send a direct real-time prompt or warning to the examinee's screen:       │
│                                                                           │
│ [ Please ensure your face remains centered in the camera frame.        ]  │
│                                                                           │
│ [ 📢 Broadcast Intercom Message ]                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### 1.4 Mentor Notification Center (`/mentor/notifications`)

Chronological notification stream with read/unread tracking and deep links:
- **Notification Types**:
  - `NEW_ENROLLMENT_REQUEST` ➔ Deep links directly to `/mentor/classes/:id?tab=enrollment`
  - `VIVA_COMPLETED` ➔ Deep links to `/mentor/assessments/:id/results`
  - `PROCTOR_ALERT` ➔ Deep links to `/mentor/proctoring` with candidate highlighted
  - `SYSTEM_NOTIFICATION` ➔ Platform maintenance and scheduled updates
- **UX Controls**: `[Mark All as Read]`, `[Filter by Category]`, `[Clear Read Alerts]`.

---

### 1.5 Classroom Discussion Channels (`/mentor/communication`)

In-app messaging channels connecting faculty and enrolled students for each classroom:
- **Features**:
  - Left pane: Classroom channel list with unread counter badges.
  - Center pane: Message history with sender avatars, timestamps, and role badges (`Faculty`, `Student`).
  - Bottom pane: Message input with Markdown support, code formatting, and simulated send.
  - Connection indicator (`Connected (WebSocket Mock)`).

---

## 2. TypeScript Domain Models & Store

```typescript
// src/app/core/models/proctoring.model.ts
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type ProctorAlertCode = 'TAB_SWITCH' | 'FACE_ABSENT' | 'MULTIPLE_FACES' | 'CAM_DISCONNECTED' | 'MIC_MUTED';

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
  assessmentId: string;
  assessmentTitle: string;
  status: 'ACTIVE' | 'FLAGGED' | 'COMPLETED' | 'DISCONNECTED';
  connectionQuality: 'EXCELLENT' | 'FAIR' | 'POOR';
  videoActive: boolean;
  audioActive: boolean;
  alerts: ProctorAlert[];
}
```

---

## 3. Phase 4 Acceptance Criteria

- [ ] Proctoring grid displays live candidate cards with simulated video/avatar placeholders and connection badges.
- [ ] Severity filter buttons immediately filter candidate cards without full-page reloads.
- [ ] Candidate Inspector displays high-resolution stream view and chronological alert timeline.
- [ ] Mentor Intercom successfully dispatches messages and presents visual confirmation.
- [ ] Notifications page allows filtering, marking individual/all notifications as read, and navigating via deep links.
- [ ] Classroom chat renders message streams with correct faculty vs student formatting and responsive mobile view.
