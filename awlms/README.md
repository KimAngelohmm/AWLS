# AWLMS - AI Recruitment & Interview Management System

An AI-powered Recruitment and Interview Management System for Sunnies Studios.

## Project Structure

```
awlms/
├── backend/                  # Express.js API server
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── middleware/      # Auth, role, upload middleware
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic (AI, email, documents)
│   │   └── server.js        # Main entry point
│   ├── scripts/             # Database and maintenance scripts
│   ├── test/                # Unit tests
│   ├── package.json
│   └── .env.example
├── frontend/                 # React.js application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context providers
│   │   ├── layouts/         # Role-specific layouts
│   │   ├── lib/             # API clients, utilities
│   │   └── pages/           # Page components by role
│   │       ├── employee/    # Employee dashboard pages
│   │       ├── hr/          # HR dashboard pages
│   │       ├── manager/     # Manager dashboard pages
│   │       └── public/      # Public pages (careers, apply, interview)
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── database/                 # MySQL schema and migrations
│   ├── schema.sql           # Complete database schema
│   └── migration_*.sql      # Incremental migrations (legacy)
└── README.md
```

## Prerequisites

- **Node.js** 18 or higher
- **MySQL** 8.0+ (or XAMPP with MySQL)
- **npm** 8+ (comes with Node.js)

## Installation

### 1. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials

# Frontend (optional - for custom API URL)
cd ../frontend
cp .env.example .env
```

### 3. Set Up Database

```bash
mysql -u root -p < database/schema.sql
```

### 4. Seed Demo Data

```bash
cd backend
npm run seed
node scripts/seed-sunnies-positions.js
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# API available at http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App available at http://localhost:5173
```

### Production Build

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

## Demo Accounts

| Email | Role | Password |
|-------|------|----------|
| `hr@sunniesstudios.com` | HR | `Demo123!` |
| `manager@sunniesstudios.com` | Manager | `Demo123!` |
| `employee@sunniesstudios.com` | Employee | `Demo123!` |

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=awlms

# Email (optional - for sending notifications)
EMAIL_PROVIDER=outlook
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=you@school.edu.ph
EMAIL_PASS=your_password
EMAIL_FROM=you@school.edu.ph
EMAIL_FROM_NAME=AWLMS Recruitment

# AI (optional - for LLM-powered interviews)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

## Features

- **AI-Conducted Interviews** - Role-specific questions with competency scoring
- **Applicant Tracking** - Resume screening and hiring workflow
- **HR Dashboard** - Full recruitment management
- **Manager Dashboard** - Team and hiring approvals
- **Employee Portal** - Profile and notifications
- **Email Notifications** - Application and interview alerts

## Available npm Scripts

### Backend
```bash
npm run dev              # Start development server (nodemon)
npm run start            # Start production server
npm run seed             # Seed demo user accounts
npm run db:ensure        # Ensure database exists
npm run db:ai-chat       # Apply AI chat schema
npm run db:recruitment   # Apply recruitment migrations
npm run test             # Run unit tests
npm run test:email       # Test email configuration
```

### Frontend
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
```

## Testing

```bash
cd backend
npm test
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | POST | User authentication |
| `/api/public/jobs` | GET | List job openings |
| `/api/public/apply` | POST | Submit application |
| `/api/recruitment/interview/:token` | GET/POST | AI interview |
| `/api/hr/recruitment/*` | Various | HR recruitment operations |
| `/api/manager/*` | Various | Manager operations |
| `/api/portal/*` | Various | Employee portal operations |
| `/api/ai/chat/*` | Various | AI chat functionality |

## Stack

- **Backend:** Express.js, MySQL (mysql2), JWT, Multer, Nodemailer
- **Frontend:** React 19, React Router 7, Vite
- **AI:** OpenAI GPT integration (optional)
- **Database:** MySQL 8.0+

## License

Private - Sunnies Studios Capstone Project
