# AI Interview Agent (Enigma)

End-to-end interview preparation platform with:
- **Frontend (React + Vite)** for DSA solver, HR interview, technical interview, CV checker
- **Backend (Spring Boot + PostgreSQL)** for APIs, AI analysis, interview flow, proctor events
- **CV Checker service (Python/Flask)** for resume-related processing (optional based on flow)

## Project Structure

- `frontend/` → React app (UI + API clients)
- `backend/` → Spring Boot API server
- `cv_checker/` → Python microservice
- `PROJECT_RUN_AND_API_GUIDE.md` → detailed run/API reference

## Prerequisites

- **Node.js** 18+
- **Java** 21 (JDK)
- **Maven** 3.9+
- **PostgreSQL** running locally
- **Python** 3.10+ (for `cv_checker`, optional)

## Quick Start

### 1) Backend

```bash
cd backend
mvn spring-boot:run
```

Default URL: `http://localhost:8080`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Default URL: `http://localhost:5173`

### 3) CV Checker Service (optional)

```bash
cd cv_checker
pip install -r requirements.txt
python application.py
```

## Environment Variables

Use local env files for secrets (already ignored by git):

- `backend/.env.local`
- `frontend/.env.local`
- `cv_checker/.env` (if used)

Typical backend variables:
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OLLAMA_API_KEY`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `GROQ_API_KEY`

## Security / Credentials

- Never commit API keys or DB passwords into tracked files.
- Keep secrets only in local env files.
- `.gitignore` is configured to ignore common secret files and key material.

## Notes

- Backend currently reads optional local config from `.env.local` paths as configured in `backend/src/main/resources/application.properties`.
- If camera/mic behavior depends on browser permissions, use latest Chrome/Edge on `localhost`.
