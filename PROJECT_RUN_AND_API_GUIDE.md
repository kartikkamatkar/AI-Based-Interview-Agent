# ENIGMA 2.0 – Project Guide (Run + API + File Map)

## 1) What the project contains

This project includes 3 major modules:

1. DSA Solver (code editor + run/submit + AI hint/chatbot)
2. HR Interview Module (voice + camera proctoring + report)
3. CV Checker (currently external Streamlit redirect)

Root folders:

- `backend` → Spring Boot APIs
- `frontend` → React + Vite UI
- `cv_checker` → Python-based module (current CV checker flow redirects to an external URL)

---

## 2) Frontend route flow

Defined in [frontend/src/App.jsx](frontend/src/App.jsx):

- `/` → Home screen
- `/problem/:id` → DSA coding window
- `/interview` → Live HR interview section

Main files:

- Home page: [frontend/src/Home.jsx](frontend/src/Home.jsx)
- DSA page: [frontend/src/codewindow.jsx](frontend/src/codewindow.jsx)
- Interview page: [frontend/src/InterviewSection.jsx](frontend/src/InterviewSection.jsx)

---

## 3) Backend API summary

### Health

- `GET /api/health`
- Controller: [backend/src/main/java/com/enigma/backend/health/HealthController.java](backend/src/main/java/com/enigma/backend/health/HealthController.java)

### Questions (PDF-based)

- `GET /api/questions?shuffle=true&limit=20`
- `GET /api/questions/random?excludeNumber=...`
- `GET /api/questions/next?excludeNumber=...`
- `GET /api/questions/start?count=3&excludeNumber=...`
- Controller: [backend/src/main/java/com/enigma/backend/question/QuestionController.java](backend/src/main/java/com/enigma/backend/question/QuestionController.java)

### AI (DSA + CV)

- `POST /api/ai/analyze`
- `POST /api/ai/chatbot`
- `POST /api/ai/cv/analyze` (multipart)
- Controller: [backend/src/main/java/com/enigma/backend/ai/AiAnalysisController.java](backend/src/main/java/com/enigma/backend/ai/AiAnalysisController.java)

### Interview APIs

- `POST /api/interview/session/start`
- `GET /api/interview/session/{sessionId}`
- `POST /api/interview/session/{sessionId}/answer`
- `POST /api/interview/session/{sessionId}/end`
- `POST /api/interview/session/{sessionId}/proctor-event`
- `POST /api/interview/transcribe` (audio transcription fallback)
- Controller: [backend/src/main/java/com/enigma/backend/interview/InterviewController.java](backend/src/main/java/com/enigma/backend/interview/InterviewController.java)

### Submissions

- `POST /api/submissions`
- `GET /api/submissions`
- `GET /api/submissions/{id}`
- Controller: [backend/src/main/java/com/enigma/backend/submission/SubmissionController.java](backend/src/main/java/com/enigma/backend/submission/SubmissionController.java)

---

## 4) Frontend service responsibilities

- Questions API client: [frontend/src/services/questionsApi.js](frontend/src/services/questionsApi.js)
- AI API client: [frontend/src/services/aiApi.js](frontend/src/services/aiApi.js)
- Judge0 run/submit client: [frontend/src/services/judge0.js](frontend/src/services/judge0.js)
- Interview API client: [frontend/src/services/interviewApi.js](frontend/src/services/interviewApi.js)

---

## 5) Interview module architecture (backend)

Core architecture classes:

- [InterviewController](backend/src/main/java/com/enigma/backend/interview/InterviewController.java)
- [InterviewService](backend/src/main/java/com/enigma/backend/interview/InterviewService.java)
- [QuestionManager](backend/src/main/java/com/enigma/backend/interview/QuestionManager.java)
- [SessionTimer](backend/src/main/java/com/enigma/backend/interview/SessionTimer.java)
- [FeedbackGenerator](backend/src/main/java/com/enigma/backend/interview/FeedbackGenerator.java)

Interview behavior:

- Supports 15/30 minute modes
- 20-question bank (AI auto-generation + fallback)
- No-repeat protection for asked questions
- Voice answer support (audio transcription fallback)
- Camera proctoring (multi-face warnings and lock logic)
- End report with structured scoring

---

## 6) File quick map

### Frontend

- [frontend/src/codewindow.jsx](frontend/src/codewindow.jsx)
  - DSA editor, run/submit, hint, chatbot, AI voice output for hints
- [frontend/src/components/DsaChatbotPanel.jsx](frontend/src/components/DsaChatbotPanel.jsx)
  - Chat UI + Hint/Find Error/Optimal quick actions
- [frontend/src/components/ResultsPanel.jsx](frontend/src/components/ResultsPanel.jsx)
  - Test result tabs + hint/analysis sections
- [frontend/src/InterviewSection.jsx](frontend/src/InterviewSection.jsx)
  - Full interview UI, mic/camera control, anti-cheat behavior, live feed, report
- [frontend/src/services/interviewApi.js](frontend/src/services/interviewApi.js)
  - Interview REST calls + transcription upload

### Backend

- [backend/src/main/java/com/enigma/backend/ai/AiAnalysisService.java](backend/src/main/java/com/enigma/backend/ai/AiAnalysisService.java)
  - AI provider integration (OpenRouter/Grok/Anthropic), DSA analysis, chatbot, transcription
- [backend/src/main/java/com/enigma/backend/interview/InterviewService.java](backend/src/main/java/com/enigma/backend/interview/InterviewService.java)
  - Interview session flow, answer evaluation, no-repeat routing
- [backend/src/main/java/com/enigma/backend/interview/QuestionManager.java](backend/src/main/java/com/enigma/backend/interview/QuestionManager.java)
  - Fixed/AI-generated question bank and shuffle
- [backend/src/main/resources/application.properties](backend/src/main/resources/application.properties)
  - Runtime configuration and environment placeholders

---

## 7) How to run locally

### Backend

1. Open folder: `backend`
2. Ensure Java 21 + Maven are installed
3. Optionally set env vars (PowerShell example):

- `$env:OPENROUTER_API_KEY="your_key"`
- `$env:OPENROUTER_MODEL="openai/gpt-4o-mini"`
- `$env:GROK_API_KEY="your_key"`
- `$env:ANTHROPIC_API_KEY="your_key"`

4. Run:

- `mvn spring-boot:run`

Backend default port: `8080`

### Frontend

1. Open folder: `frontend`
2. Install dependencies:

- `npm install`

3. Env (optional but recommended):

- `VITE_BACKEND_URL=http://localhost:8080`
- `VITE_JUDGE0_KEY=your_rapidapi_judge0_key`

4. Run:

- `npm run dev`

Frontend default port: `5173`

---

## 8) Important environment variables

Backend (`application.properties` driven):

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL`
- `GROK_API_KEY` / `GROQ_API_KEY`
- `ANTHROPIC_API_KEY`
- `INTERVIEW_QUESTIONS_AI_AUTO_ENABLED`
- `GROQ_TRANSCRIPTION_MODEL`
- `QUESTION_PDF_PATH`

Frontend:

- `VITE_BACKEND_URL`
- `VITE_JUDGE0_KEY`

---

## 9) End-to-end flow (simple)

### DSA flow

- UI input → [frontend/src/services/judge0.js](frontend/src/services/judge0.js)
- Result + code context → [frontend/src/services/aiApi.js](frontend/src/services/aiApi.js)
- Backend AI → [backend/src/main/java/com/enigma/backend/ai/AiAnalysisService.java](backend/src/main/java/com/enigma/backend/ai/AiAnalysisService.java)
- Response → hint/feedback text + optional voice

### Interview flow

- Start session → `POST /api/interview/session/start`
- User answer (voice/text) → `POST /api/interview/session/{sessionId}/answer`
- Speech fallback upload → `POST /api/interview/transcribe`
- End session → `POST /api/interview/session/{sessionId}/end` → structured report

---

## 10) Known setup issues (quick)

- If `npm` is blocked by PowerShell policy, use Command Prompt or adjust execution policy.
- If Java compile fails with `JAVA_HOME`, set Java 21 path correctly.
- If voice/camera is unavailable, use latest Chrome/Edge and run on localhost or HTTPS.

---

If needed, a short 1-page Team Onboarding Checklist can be added next.
