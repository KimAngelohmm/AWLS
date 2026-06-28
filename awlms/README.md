# AI Recruitment & Interview Management System

An AI-powered Recruitment and Interview Management System.

## Project structure

- `frontend/` — React.js UI
- `backend/` — Express.js API
- `database/` — SQL schema and reference scripts for MySQL

## Prerequisites

- Node.js 18+
- MySQL 8+ (or compatible)

## Quick start

### 1. Database

Create a MySQL database and apply the schema:

```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and port
npm run dev
```

API defaults to `http://localhost:5000` (configurable in `.env`).

### 3. Frontend

```bash
cd frontend
npm run dev
```

App defaults to `http://localhost:5173` with API requests proxied to the backend in development.

## Demo accounts (after seed)

```bash
cd backend
npm install
npm run seed
```

| Email | Role | Password |
|--------|------|----------|
| `hr@sunniesstudios.com` | HR | `Demo123!` |
| `manager@sunniesstudios.com` | Manager | `Demo123!` |
| `employee@sunniesstudios.com` | Employee | `Demo123!` |

Set `JWT_SECRET` (16+ characters) in `backend/.env` for production. For local dev, a default secret is used when `NODE_ENV` is not `production`.

**AI features:** set `OPENAI_API_KEY` (optional: `OPENAI_MODEL`, default `gpt-4o-mini`) in `backend/.env` for LLM-powered interviews and AI scoring. Without a key, template fallbacks are used where implemented.

## Features

- AI-conducted interviews with role-specific questions
- Resume screening and applicant tracking
- Candidate evaluation and AI scoring
- Recruitment analytics and hiring workflow
- HR personnel and hiring manager dashboards

## Stack

- Backend: Express.js + MySQL
- Frontend: React 18 + Vite
- AI: OpenAI integration

## Tests

```bash
cd backend
npm test
```

## Recovering deleted source files

If `backend/src` or `frontend/src` is missing, Cursor agent transcripts may still contain full `Write` payloads. From `backend`:

```bash
npm run restore:transcript
```

Optional: pass explicit paths to `.jsonl` transcript files. Then re-apply any local fixes (e.g. `server.js` route mounting) if needed.
