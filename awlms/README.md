# AI-Powered Workforce Lifecycle Management System (AWLMS)

Full-stack web application: React (Vite) frontend, Node.js + Express backend, MySQL database.

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
# Optional sample HR dashboard rows:
npm run seed:hr-demo
```

| Email | Role | Password |
|--------|------|----------|
| `hr@sunniesstudios.com` | HR | `Demo123!` |
| `manager@sunniesstudios.com` | Manager | `Demo123!` |
| `employee@sunniesstudios.com` | Employee | `Demo123!` |

Set `JWT_SECRET` (16+ characters) in `backend/.env` for production. For local dev, a default secret is used when `NODE_ENV` is not `production`.

**AI features:** set `OPENAI_API_KEY` (optional: `OPENAI_MODEL`, default `gpt-4o-mini`) in `backend/.env` for LLM interviews, lifecycle letters, and monitoring briefs. Without a key, template fallbacks are used where implemented.

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

