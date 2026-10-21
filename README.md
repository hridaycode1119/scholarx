# ScholarX — Enterprise AI Academic Evaluation Platform

ScholarX is a comprehensive AI-powered academic evaluation, oral viva defense, and Outcome-Based Education (OBE) accreditation governance platform designed for universities and autonomous institutions.

For complete, in-depth architectural specifications and portal breakdowns, please refer to:
👉 **[`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)**

---

## Quick Start

### 1. Frontend Client
```bash
npm install
npx ng serve --host 0.0.0.0 --port 4200
```
- **Local Application**: http://localhost:4200/

### 2. Backend Service
```bash
cd backend
npm install
npm run dev
```
- **HTTP REST API**: http://localhost:5000/api/v1
- **API Health Check**: http://localhost:5000/api/v1/health
- **WebSocket Bus**: ws://localhost:5000/ws

---

## Portals Summary

1. **Student Portal (`/student/*`)**: Pristine Jade Flight Deck Dashboard, Live Oral Viva Defense, Practice Simulator, PYQ OCR Question Miner, Classrooms, OBE Progress, Editable Academic Profile & Diagnostics, 24/7 Customer Helpdesk & Direct Admin Feedback.
2. **Mentor Portal (`/mentor/*`)**: Live Proctoring Console, AI Viva Copilot, AI Assessment Synthesizer, Classroom Roster Management, NBA/NAAC Outcome Attainment Matrices.
3. **Admin Portal (`/admin/*`)**: Multi-Campus Governance, User Directory, Student Feedback & Ticket Management Hub, Campus Broadcast Engine, AI Inference Control, System Health Logs.
