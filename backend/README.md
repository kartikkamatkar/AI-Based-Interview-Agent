# ENIGMA Backend

Spring Boot backend for ENIGMA using **JDK 21** and **PostgreSQL** (with H2 fallback for local run).

## Tech Stack
- Spring Boot 3
- Spring Web
- Spring Data JPA
- PostgreSQL / H2
- Maven

## Prerequisites
- Java 21
- Maven 3.9+
- PostgreSQL 14+ (optional for local if using H2 fallback)

## Database Setup
If using PostgreSQL, create database:

```sql
CREATE DATABASE enigma_db;
```

Set env variables (PowerShell):

```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/enigma_db"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="postgresql"
$env:QUESTION_PDF_PATH="C:/Users/karti/Downloads/Collated Mock Question - SET 2.pdf"
$env:GROK_API_KEY="your_xai_or_grok_key"
$env:GROK_MODEL="grok-3-mini"
$env:OPENROUTER_API_KEY="your_openrouter_key"
$env:OPENROUTER_MODEL="openai/gpt-4o-mini"
```

Alternatively, create `backend/.env.local` (gitignored) with:

```properties
OPENROUTER_API_KEY=your_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

The backend loads this file via `spring.config.import` and uses it for `/api/ai/chatbot` and optimal-solution generation.

AI provider priority is:
1. `OPENROUTER_API_KEY`
2. `GROK_API_KEY` / `GROQ_API_KEY`
3. `ANTHROPIC_API_KEY`

If you are using an OpenRouter key like `sk-or-v1-...`, set it in `OPENROUTER_API_KEY`.

If DB env vars are not set, app uses in-memory H2 automatically.

Configuration file: `src/main/resources/application.properties`.

## Run
From `backend` folder:

```powershell
mvn spring-boot:run
```

## API
- `GET /api/health`
- `GET /api/questions?shuffle=true&limit=10`
- `POST /api/submissions`
- `GET /api/submissions`
- `GET /api/submissions/{id}`
- `POST /api/ai/analyze`
- `POST /api/ai/chatbot`
- `POST /api/ai/cv/analyze` (multipart: `resumeFile` optional, `resumeText` optional, `jobDescription` required)
- `POST /api/interview/session/start` (body: `{"durationMinutes":15}` or `30`)
- `GET /api/interview/session/{sessionId}`
- `POST /api/interview/session/{sessionId}/answer`
- `POST /api/interview/session/{sessionId}/end`

## HR Interview Module
- Uses fixed 20 HR questions, randomly ordered per session with no repetition.
- Supports 15/30 minute timed sessions.
- Uses AI API for answer evaluation, follow-up questioning, and final feedback generation.
- Returns structured final report including communication, confidence, eye contact, tone, body language, professionalism, strengths, and improvement plan.
