# Public Job Application Flow Fix — Bugfix Design

## Overview

The public job application flow is broken end-to-end. Candidates cannot discover open positions, the application form is missing a required field, submission immediately starts an AI interview instead of queuing for HR review, and the interview invitation system (token-based URL, HR invite action) does not exist. This design covers every change needed to restore the full flow:

**Discovery → Application → HR Review → Interview Invitation → AI Interview**

The fix is deliberately minimal: it adds the missing pieces without restructuring existing working code. The AI interview engine (`recruitmentInterview.js`, `POST /interview/:applicantId/message`) is untouched.

---

## Glossary

- **Bug_Condition (C)**: Any of the eight defect conditions listed in Requirements §1 — missing UI entry points, missing fields, wrong submission behaviour, missing HR actions, or broken token routing.
- **Property (P)**: The correct end-to-end behaviour described in Requirements §2 — the full discovery-to-interview flow works without errors.
- **Preservation**: All existing behaviour described in Requirements §3 must remain unchanged after the fix.
- **`pending_review`**: New `hiring_decision` enum value. Set on application submission; means "awaiting HR decision on whether to invite to interview".
- **`interview_invited`**: New `hiring_decision` enum value. Set when HR clicks "Invite to AI Interview"; means "invitation email sent, waiting for candidate to start".
- **`about_yourself`**: New `TEXT` column on `Applicant`. Free-text field collected at apply time.
- **`interview_token`**: Existing `VARCHAR(96)` column on `Applicant`. Currently populated at apply time (wrong). After fix: populated only when HR invites the candidate.
- **`emailService`**: New `src/services/emailService.js` wrapping nodemailer. Sends confirmation and invitation emails.
- **`CareersPage`**: New public React page at `/careers` listing open positions.
- **`recruitmentPublic.js`**: Existing Express router mounted at `/api/recruitment`. Modified for this fix.
- **`hrRecruitment.js`**: Existing Express router mounted at `/api/hr/recruitment`. Extended with two new endpoints.

---

## Bug Details

### Bug Condition

The bug manifests across eight distinct failure points in the public job application flow. Each represents a missing or incorrectly implemented piece of the pipeline.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { route, action, userType }
  OUTPUT: boolean

  RETURN (
    (input.route = '/login'           AND input.userType = 'visitor'
      AND NOT careersLinkVisible())
    OR
    (input.route = '/careers'         AND NOT careersPageExists())
    OR
    (input.route = '/apply/:jobId'    AND NOT aboutYourselfFieldPresent())
    OR
    (input.action = 'submitApplication'
      AND applicantStoredAs('in_progress') AND NOT confirmationEmailSent())
    OR
    (input.route = '/hr/recruitment'  AND NOT perJobApplicantListVisible())
    OR
    (input.route = '/hr/recruitment'  AND applicantStatus = 'pending_review'
      AND NOT inviteButtonVisible())
    OR
    (input.action = 'inviteToInterview'
      AND NOT statusUpdatedTo('interview_invited') AND NOT inviteEmailSent())
    OR
    (input.route = '/interview/:token'
      AND tokenLookupUsesApplicantId())
  )
END FUNCTION
```

### Examples

- Visitor goes to `/login` — no link to `/careers` is shown. Expected: "View Open Positions" link visible.
- Visitor goes to `/careers` — browser shows 404. Expected: list of open jobs with title, department, "Apply Now".
- Visitor on `/apply/[jobId]` — form has name, email, phone only. Expected: "About yourself" textarea present.
- Visitor submits application — `interview_status` set to `in_progress`, AI interview starts immediately. Expected: `hiring_decision = 'pending_review'`, confirmation email sent, success message shown.
- HR opens Recruitment module — no applicant list per job. Expected: each job shows its applicants.
- HR views applicant with `pending_review` — no "Invite to AI Interview" button. Expected: button present.
- HR clicks invite — nothing happens. Expected: `hiring_decision = 'interview_invited'`, token generated, email sent.
- Candidate opens `/interview/[token]` — 404 or wrong session. Expected: session resolved by `interview_token` column lookup.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `GET /api/recruitment/jobs/:id` — single job detail endpoint continues to work as-is.
- `GET /api/recruitment/interview/:applicantId` and `POST /api/recruitment/interview/:applicantId/message` — the AI interview engine is untouched; only the route parameter name changes in App.jsx (`:applicantId` → `:token`), but the backend lookup switches to token-based.
- `POST /api/hr/recruitment/applicants/:id/review` — approve/reject after interview review continues to work.
- `GET /api/hr/recruitment/assessments-pending` — existing HR assessment queue continues to work.
- All job position CRUD endpoints (`GET`, `POST`, `PATCH /api/hr/recruitment/job-positions`) continue unchanged.
- Duplicate application rejection (unique key on `job_position_id + email`) continues to work.
- Authentication and role guards on all `/api/hr/*` routes remain unchanged.

**Scope:**
All inputs that do NOT involve the eight bug conditions above are completely unaffected. This includes: existing employee portal, manager module, lifecycle module, performance monitoring, AI chat, and auth flows.

---

## Hypothesized Root Cause

1. **Missing UI entry points**: `LoginPage.jsx` was built for internal staff only; no one added a public-facing link to `/careers`. `CareersPage.jsx` and its route were never created.

2. **Incomplete application form**: `ApplyPage.jsx` was scaffolded with only the fields needed to start an AI interview (name, email, phone). The `about_yourself` field and the corresponding DB column were never added.

3. **Wrong submission behaviour in `POST /api/recruitment/apply`**: The endpoint was designed to start the AI interview immediately on submission (calls `generateFirstQuestion`, sets `interview_status = 'in_progress'`). The two-stage flow (apply → HR review → invite → interview) was never implemented. No confirmation email was wired up.

4. **Missing HR applicant management**: `hrRecruitment.js` has no endpoint to list applicants per job, and no endpoint to invite an applicant to interview. `HrRecruitmentModule.jsx` has no UI for either action.

5. **Wrong interview route parameter**: `App.jsx` routes `/interview/:applicantId` to `InterviewPage.jsx`, which reads `applicantId` from params and looks up the session by applicant ID + token header. The new flow requires a standalone token URL (`/interview/:token`) where the backend resolves the applicant by the `interview_token` column alone — no applicant ID needed.

6. **No email service**: The project has no nodemailer wrapper. Confirmation and invitation emails were never implemented.

7. **Missing DB columns and enum values**: `Applicant` table lacks `about_yourself TEXT` column. `hiring_decision` enum lacks `pending_review` and `interview_invited` values. `interview_token` is currently populated at apply time but must be NULL until HR invites.

---

## Correctness Properties

Property 1: Bug Condition — Full Application Flow Executes Without Errors

_For any_ visitor or HR user traversing the complete flow (discover → apply → HR review → invite → interview), the fixed system SHALL complete each step without a 404, missing field, wrong status, or missing email, satisfying all eight expected-behaviour clauses (Requirements 2.1–2.8).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

Property 2: Preservation — Existing Recruitment and Platform Behaviour Unchanged

_For any_ input that does NOT involve the eight bug conditions (isBugCondition returns false), the fixed system SHALL produce exactly the same result as the original system, preserving all existing job CRUD, AI interview engine, HR review, authentication, and all other platform modules.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

---

## Fix Implementation

### Change 1 — DB Migration: `migration_012_application_flow_fix.sql`

**File**: `awlms/database/migration_012_application_flow_fix.sql`

```sql
USE awlms;

-- 1. Add about_yourself column
ALTER TABLE `Applicant`
  ADD COLUMN IF NOT EXISTS `about_yourself` TEXT NULL
    COMMENT 'Free-text "about yourself" field collected at application time'
    AFTER `application_details`;

-- 2. Extend hiring_decision enum to include new statuses
--    MySQL requires re-specifying the full ENUM definition.
ALTER TABLE `Applicant`
  MODIFY COLUMN `hiring_decision`
    ENUM('pending','pending_review','interview_invited','under_review','approved','rejected','withdrawn')
    NOT NULL DEFAULT 'pending_review'
    COMMENT 'pending_review = awaiting HR invite decision; interview_invited = token sent';

-- 3. Ensure interview_token has its UNIQUE index (migration_009 adds it, but guard here)
ALTER TABLE `Applicant`
  ADD UNIQUE INDEX IF NOT EXISTS `uk_applicant_interview_token` (`interview_token`);

-- 4. Index for fast token lookup on the interview page
ALTER TABLE `Applicant`
  ADD INDEX IF NOT EXISTS `idx_applicant_hiring_decision` (`hiring_decision`);
```

**Key decisions:**
- Default for `hiring_decision` changes from `'pending'` to `'pending_review'` for new rows. Existing rows keep their current value.
- `interview_token` stays NULL at apply time; it is generated only when HR invites.
- The `pending` value is kept in the enum for backward compatibility with any existing rows.

---

### Change 2 — New Service: `emailService.js`

**File**: `awlms/backend/src/services/emailService.js`

nodemailer is not in `package.json`. It must be added: `npm install nodemailer@6.9.14`.

Environment variables required (add to `.env.example`):
```
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@example.com
EMAIL_PASS=secret
EMAIL_FROM="AWLMS Recruitment <noreply@example.com>"
FRONTEND_ORIGIN=http://localhost:5173
```

**Implementation:**
```javascript
// src/services/emailService.js
const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendApplicationConfirmation({ to, fullName, jobTitle }) {
  if (!process.env.EMAIL_HOST) return; // email not configured — skip silently
  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject: `Application received — ${jobTitle}`,
    text: [
      `Hi ${fullName},`,
      '',
      `Thank you for applying for the ${jobTitle} position.`,
      'Your application is under review. We will contact you if you are selected for an interview.',
      '',
      'AWLMS Recruitment Team',
    ].join('\n'),
  });
}

async function sendInterviewInvitation({ to, fullName, jobTitle, interviewToken }) {
  if (!process.env.EMAIL_HOST) return; // email not configured — skip silently
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const link = `${origin}/interview/${interviewToken}`;
  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject: `Interview invitation — ${jobTitle}`,
    text: [
      `Hi ${fullName},`,
      '',
      `We are pleased to invite you to an AI-conducted interview for the ${jobTitle} position.`,
      '',
      `Start your interview here: ${link}`,
      '',
      'The link is unique to you. Do not share it.',
      '',
      'AWLMS Recruitment Team',
    ].join('\n'),
  });
}

module.exports = { sendApplicationConfirmation, sendInterviewInvitation };
```

---

### Change 3 — Backend: `GET /api/recruitment/jobs` (new public endpoint)

**File**: `awlms/backend/src/routes/recruitmentPublic.js`

Add before the existing `router.get('/jobs/:id', ...)` handler:

```javascript
// GET /api/recruitment/jobs — public list of open positions
router.get('/jobs', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT jp.id, jp.title, jp.status, d.name AS department_name
       FROM JobPosition jp
       LEFT JOIN departments d ON d.id = jp.department_id
       WHERE jp.status = 'open'
       ORDER BY jp.created_at DESC`
    );
    return res.json({ jobs: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load jobs' });
  }
});
```

**Notes:**
- No auth required — this is a public endpoint.
- Returns only `id`, `title`, `status`, `department_name`. No sensitive fields.
- Ordered newest-first.

---

### Change 4 — Backend: Modify `POST /api/recruitment/apply`

**File**: `awlms/backend/src/routes/recruitmentPublic.js`

Replace the entire `router.post('/apply', ...)` handler. Key changes:
- Accept `about_yourself` from request body.
- Remove all `generateFirstQuestion` / AI interview startup logic.
- Store `hiring_decision = 'pending_review'`, `interview_status = 'pending_start'`, `interview_token = NULL`.
- Send confirmation email via `emailService.sendApplicationConfirmation` (non-blocking — failure is logged, not surfaced to applicant).
- Return `{ applicantId, message: 'Application received. ...' }` instead of interview session data.

```javascript
const { sendApplicationConfirmation } = require('../services/emailService');

router.post('/apply', async (req, res) => {
  const jobPositionId   = String(req.body?.job_position_id || '').trim();
  const fullName        = String(req.body?.full_name || '').trim();
  const email           = String(req.body?.email || '').trim().toLowerCase();
  const phone           = req.body?.phone ? String(req.body.phone).trim() : null;
  const aboutYourself   = req.body?.about_yourself
                            ? String(req.body.about_yourself).trim() : null;
  const applicationDetails = req.body?.application_details ?? null;

  if (!jobPositionId || !fullName || !email) {
    return res.status(400).json({ error: 'job_position_id, full_name, and email are required' });
  }

  let pool;
  try { pool = getPool(); } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [jobs] = await pool.query(
      `SELECT id, title, status FROM JobPosition WHERE id = ? LIMIT 1`,
      [jobPositionId]
    );
    if (!jobs.length || jobs[0].status !== 'open') {
      return res.status(404).json({ error: 'Job is not open for applications' });
    }
    const job = jobs[0];
    const applicantId = crypto.randomUUID();

    try {
      await pool.query(
        `INSERT INTO Applicant (
           id, job_position_id, full_name, email, phone,
           about_yourself, application_details,
           interview_token, interview_status, hiring_decision
         ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'pending_start', 'pending_review')`,
        [
          applicantId, jobPositionId, fullName, email, phone,
          aboutYourself,
          applicationDetails ? JSON.stringify(applicationDetails) : null,
        ]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'You have already applied to this position with this email.',
        });
      }
      throw err;
    }

    // Send confirmation email — non-blocking
    sendApplicationConfirmation({ to: email, fullName, jobTitle: job.title })
      .catch((e) => console.error('Confirmation email failed:', e));

    return res.status(201).json({
      applicantId,
      message: 'Application received. You will be contacted by email if selected for an interview.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Application failed' });
  }
});
```

---

### Change 5 — Backend: Modify `GET /api/recruitment/interview/:token` and `POST /api/recruitment/interview/:token/message`

**File**: `awlms/backend/src/routes/recruitmentPublic.js`

Both existing interview routes use `:applicantId` as the URL parameter and look up by `a.id = ?` with a separate token header check. Change them to use `:token` as the URL parameter and look up by `a.interview_token = ?` directly. The `X-Interview-Token` header is no longer needed.

**`GET /api/recruitment/interview/:token`** — change:
```javascript
// OLD: router.get('/interview/:applicantId', ...)
// NEW:
router.get('/interview/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Interview token is required' });
  // ...
  const [rows] = await pool.query(
    `SELECT a.id, a.full_name, a.interview_status, a.interview_messages,
            a.assessment_summary, a.ai_recommendation, a.hiring_decision, a.interview_token
     FROM Applicant a
     WHERE a.interview_token = ? LIMIT 1`,
    [token]
  );
  if (!rows.length) return res.status(404).json({ error: 'Interview session not found' });
  // ... rest of response unchanged
});
```

**`POST /api/recruitment/interview/:token/message`** — same pattern: change `:applicantId` to `:token`, look up by `a.interview_token = ?`, remove the header token check. The `applicantId` needed for subsequent UPDATE queries is read from `rows[0].id`.

---

### Change 6 — Backend: `GET /api/hr/recruitment/job-positions/:id/applicants`

**File**: `awlms/backend/src/routes/hrRecruitment.js`

Add after the existing `router.patch('/job-positions/:id', ...)` handler:

```javascript
// GET /api/hr/recruitment/job-positions/:id/applicants
router.get('/job-positions/:id/applicants', async (req, res) => {
  let pool;
  try { pool = getPool(); } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.full_name, a.email, a.phone, a.about_yourself,
              a.hiring_decision, a.interview_status,
              a.assessment_summary, a.ai_recommendation,
              a.created_at, a.updated_at
       FROM Applicant a
       WHERE a.job_position_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    return res.json({ applicants: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load applicants' });
  }
});
```

---

### Change 7 — Backend: `POST /api/hr/recruitment/applicants/:id/invite-interview`

**File**: `awlms/backend/src/routes/hrRecruitment.js`

Add after the new applicants endpoint:

```javascript
const { sendInterviewInvitation } = require('../services/emailService');

// POST /api/hr/recruitment/applicants/:id/invite-interview
router.post('/applicants/:id/invite-interview', async (req, res) => {
  let pool;
  try { pool = getPool(); } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.full_name, a.email, a.hiring_decision, jp.title AS job_title
       FROM Applicant a
       INNER JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Applicant not found' });
    const a = rows[0];

    if (a.hiring_decision !== 'pending_review') {
      return res.status(409).json({
        error: `Cannot invite: applicant status is '${a.hiring_decision}', expected 'pending_review'`,
      });
    }

    const interviewToken = crypto.randomBytes(32).toString('hex'); // 64-char hex

    await pool.query(
      `UPDATE Applicant
       SET hiring_decision = 'interview_invited',
           interview_token = ?,
           interview_status = 'pending_start',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND hiring_decision = 'pending_review'`,
      [interviewToken, req.params.id]
    );

    // Send invitation email — non-blocking
    sendInterviewInvitation({
      to: a.email,
      fullName: a.full_name,
      jobTitle: a.job_title,
      interviewToken,
    }).catch((e) => console.error('Invitation email failed:', e));

    return res.json({ ok: true, hiring_decision: 'interview_invited' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not send interview invitation' });
  }
});
```

**Notes:**
- Uses `crypto.randomBytes(32).toString('hex')` — 256 bits of entropy, same pattern as the existing codebase.
- The UPDATE uses an optimistic `AND hiring_decision = 'pending_review'` guard to prevent double-invites under concurrent requests.
- Token is stored in `interview_token` column (already has UNIQUE index from migration_009).

---

### Change 8 — Frontend: `LoginPage.jsx` — Add "View Open Positions" link

**File**: `awlms/frontend/src/pages/LoginPage.jsx`

In the right panel, below the `<form>` closing tag and before the closing `</div>` of `login-form-wrap`, add:

```jsx
<p className="login-form-sub" style={{ marginTop: '1rem', textAlign: 'center' }}>
  Looking for a job?{' '}
  <Link to="/careers" className="login-forgot">
    View Open Positions
  </Link>
</p>
```

`Link` is already imported from `react-router-dom` in this file. No new imports needed.

---

### Change 9 — Frontend: New `CareersPage.jsx`

**File**: `awlms/frontend/src/pages/public/CareersPage.jsx`

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApiFetch } from '../../lib/publicApi.js';

export default function CareersPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await publicApiFetch('/api/recruitment/jobs');
        if (!cancelled) setJobs(data.jobs || []);
      } catch (e) {
        if (!cancelled) setError(e.body?.error || e.message || 'Could not load positions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="apply-page">
      <div className="apply-card" style={{ maxWidth: '640px' }}>
        <p className="apply-kicker">AWLMS · Careers</p>
        <h1>Open Positions</h1>

        {error && <div className="auth-alert" role="alert">{error}</div>}
        {loading && <p className="muted">Loading positions…</p>}

        {!loading && !error && jobs.length === 0 && (
          <p className="muted">No open positions at this time. Check back soon.</p>
        )}

        {jobs.map((job) => (
          <div key={job.id} className="apply-card" style={{ marginTop: '1rem', padding: '1rem' }}>
            <h2 className="apply-job-title" style={{ marginBottom: '0.25rem' }}>{job.title}</h2>
            {job.department_name && (
              <p className="muted" style={{ marginBottom: '0.75rem' }}>{job.department_name}</p>
            )}
            <Link to={`/apply/${job.id}`} className="btn-primary" style={{ display: 'inline-block' }}>
              Apply Now
            </Link>
          </div>
        ))}

        <p className="apply-foot muted" style={{ marginTop: '1.5rem' }}>
          <Link to="/login">HR sign in</Link>
        </p>
      </div>
    </div>
  );
}
```

---

### Change 10 — Frontend: Modify `ApplyPage.jsx`

**File**: `awlms/frontend/src/pages/public/ApplyPage.jsx`

Three changes:

**a) Add `about_yourself` to form state:**
```javascript
const [form, setForm] = useState({ full_name: '', email: '', phone: '', about_yourself: '' });
```

**b) Add `about_yourself` to the POST body and remove interview navigation:**
```javascript
async function handleSubmit(e) {
  e.preventDefault();
  setSubmitting(true);
  setError('');
  try {
    await publicApiFetch('/api/recruitment/apply', {
      method: 'POST',
      body: JSON.stringify({
        job_position_id: jobId,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        about_yourself: form.about_yourself.trim() || null,
      }),
    });
    setSubmitted(true); // show success message
  } catch (err) {
    setError(err.body?.error || err.message || 'Apply failed');
  } finally {
    setSubmitting(false);
  }
}
```

**c) Add `submitted` state and success message; add `about_yourself` textarea; update submit button label:**
```jsx
const [submitted, setSubmitted] = useState(false);
// ...
{submitted ? (
  <div className="auth-alert" role="status" style={{ background: 'var(--color-success, #d1fae5)', color: '#065f46' }}>
    <strong>Application received!</strong> We will contact you by email if you are selected for an interview.
  </div>
) : (
  <form className="apply-form" onSubmit={handleSubmit}>
    {/* existing name, email, phone fields */}
    <label className="field">
      <span className="field-label">About yourself</span>
      <textarea
        className="field-input"
        rows={4}
        value={form.about_yourself}
        onChange={(e) => setForm((f) => ({ ...f, about_yourself: e.target.value }))}
        placeholder="Tell us about your background, experience, and why you're interested in this role."
      />
    </label>
    <button type="submit" className="btn-primary" disabled={submitting}>
      {submitting ? 'Submitting…' : 'Submit Application'}
    </button>
  </form>
)}
```

Also remove the `useNavigate` import and usage since we no longer navigate to the interview page on submit.

---

### Change 11 — Frontend: Modify `InterviewPage.jsx`

**File**: `awlms/frontend/src/pages/public/InterviewPage.jsx`

Change the route param from `applicantId` to `token`:

```javascript
// OLD:
const { applicantId } = useParams();
const token = useMemo(() => sessionStorage.getItem(`awlms_iv_${applicantId}`) || '', [applicantId]);

// NEW:
const { token } = useParams();
```

Update all API calls to use the new token-based routes:
```javascript
// GET session:
publicApiFetch(`/api/recruitment/interview/${token}`)
// No X-Interview-Token header needed

// POST message:
publicApiFetch(`/api/recruitment/interview/${token}/message`, {
  method: 'POST',
  body: JSON.stringify({ message: text }),
})
// No X-Interview-Token header needed
```

Remove the `sessionStorage` read — the token is now in the URL itself. Remove the early-return guard that checks `if (!token)` based on sessionStorage (the token is always present if the URL is valid; a 404 from the API handles invalid tokens).

Update the "session not found" error message to: `"Interview session not found. Please use the link from your invitation email."`

---

### Change 12 — Frontend: Modify `App.jsx`

**File**: `awlms/frontend/src/App.jsx`

Two changes:

**a) Add `/careers` route and import:**
```jsx
import CareersPage from './pages/public/CareersPage.jsx';
// ...
<Route path="/careers" element={<CareersPage />} />
```

**b) Change interview route parameter:**
```jsx
// OLD:
<Route path="/interview/:applicantId" element={<InterviewPage />} />
// NEW:
<Route path="/interview/:token" element={<InterviewPage />} />
```

---

### Change 13 — Frontend: Modify `HrRecruitmentModule.jsx` — Per-job applicant list and invite button

**File**: `awlms/frontend/src/pages/hr/HrRecruitmentModule.jsx`

**a) Add state for expanded job applicants:**
```javascript
const [applicantsByJob, setApplicantsByJob] = useState({}); // { [jobId]: applicant[] }
const [loadingApplicants, setLoadingApplicants] = useState({});
```

**b) Add `loadApplicants(jobId)` function:**
```javascript
async function loadApplicants(jobId) {
  setLoadingApplicants((s) => ({ ...s, [jobId]: true }));
  try {
    const res = await apiFetch(`/api/hr/recruitment/job-positions/${jobId}/applicants`);
    setApplicantsByJob((s) => ({ ...s, [jobId]: res.applicants || [] }));
  } catch (err) {
    setLoadError(err.body?.error || err.message || 'Could not load applicants');
  } finally {
    setLoadingApplicants((s) => ({ ...s, [jobId]: false }));
  }
}
```

**c) Add `inviteToInterview(applicantId, jobId)` function:**
```javascript
async function inviteToInterview(applicantId, jobId) {
  setSaving(true);
  setLoadError('');
  try {
    await apiFetch(`/api/hr/recruitment/applicants/${applicantId}/invite-interview`, {
      method: 'POST',
    });
    await loadApplicants(jobId); // refresh the applicant list for this job
  } catch (err) {
    setLoadError(err.body?.error || err.message || 'Invite failed');
  } finally {
    setSaving(false);
  }
}
```

**d) In the "All job positions" table, add a "View Applicants" button per row and an expandable applicant sub-table:**

Each job row gets a "View Applicants" button that calls `loadApplicants(j.id)`. Below the row (or in a new section), render the applicant list for that job showing: name, email, `hiring_decision` status badge, and — when `hiring_decision === 'pending_review'` — an "Invite to AI Interview" button.

The `about_yourself` field is shown in the applicant row or in the existing `TranscriptModal` (add it to the transcript modal's data display).

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behaviour.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that hit each of the eight defect conditions against the unfixed codebase and assert the correct behaviour. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Careers page 404 test**: `GET /careers` on the unfixed frontend — expect 404/not-found. (will fail on unfixed code — page doesn't exist)
2. **Apply stores wrong status**: `POST /api/recruitment/apply` on unfixed backend — assert `hiring_decision = 'pending_review'` in DB. (will fail — unfixed code sets `in_progress`)
3. **Apply starts AI interview**: `POST /api/recruitment/apply` on unfixed backend — assert no `generateFirstQuestion` call. (will fail — unfixed code calls it)
4. **Interview route by token**: `GET /api/recruitment/interview/:token` on unfixed backend — assert 200 with correct session. (will fail — unfixed route uses `:applicantId`)
5. **HR applicants endpoint missing**: `GET /api/hr/recruitment/job-positions/:id/applicants` on unfixed backend — expect 404. (will fail — endpoint doesn't exist)
6. **HR invite endpoint missing**: `POST /api/hr/recruitment/applicants/:id/invite-interview` on unfixed backend — expect 404. (will fail — endpoint doesn't exist)

**Expected Counterexamples**:
- `POST /apply` returns `{ applicantId, interviewToken, interviewStatus: 'in_progress', messages: [...] }` instead of `{ applicantId, message: '...' }`
- `GET /api/recruitment/interview/:token` returns 404 (route doesn't match)
- HR endpoints return 404

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed system produces the expected behaviour.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSystem(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Specific assertions after fix:**
- `GET /api/recruitment/jobs` → 200, array of `{ id, title, department_name }` for open jobs only
- `POST /api/recruitment/apply` with valid body → 201, `{ applicantId, message }`, DB row has `hiring_decision='pending_review'`, `interview_token=NULL`, `about_yourself` stored
- `POST /api/hr/recruitment/applicants/:id/invite-interview` → 200, DB row has `hiring_decision='interview_invited'`, `interview_token` is 64-char hex
- `GET /api/recruitment/interview/:token` → 200, correct session data
- `GET /api/hr/recruitment/job-positions/:id/applicants` → 200, array of applicants for that job

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalSystem(input) = fixedSystem(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because it generates many test cases automatically and catches edge cases that manual tests miss.

**Test Cases**:
1. **Job CRUD preservation**: Create, patch, and list job positions — assert same response shape and DB state as before.
2. **AI interview engine preservation**: For an applicant with `interview_invited` status and a valid token, `POST /interview/:token/message` should process messages and generate AI responses exactly as before (same service, same logic).
3. **HR review preservation**: `POST /api/hr/recruitment/applicants/:id/review` with `approved`/`rejected` — assert same behaviour as before.
4. **Duplicate application rejection**: Submit two applications with the same email + job — assert 409 on second attempt.
5. **Auth guard preservation**: All `/api/hr/recruitment/*` endpoints without a valid HR token → 401/403.

### Unit Tests

- `emailService.js`: mock nodemailer transport; assert `sendApplicationConfirmation` and `sendInterviewInvitation` call `sendMail` with correct `to`, `subject`, and body containing the token link.
- `POST /api/recruitment/apply`: assert `about_yourself` is stored; assert `interview_token` is NULL; assert `hiring_decision = 'pending_review'`; assert `generateFirstQuestion` is NOT called.
- `POST /api/hr/recruitment/applicants/:id/invite-interview`: assert token is 64-char hex; assert status guard rejects non-`pending_review` applicants with 409.
- `GET /api/recruitment/interview/:token`: assert lookup by `interview_token` column, not by `id`.

### Property-Based Tests

- Generate random valid application payloads (varying `about_yourself` length 0–5000 chars, optional phone) — assert all result in `pending_review` status and no AI interview started.
- Generate random token strings (valid hex, invalid hex, empty, SQL injection attempts) for `GET /interview/:token` — assert only exact 64-char hex tokens matching a DB row return 200; all others return 404.
- Generate random applicant states (`pending_review`, `interview_invited`, `under_review`, `approved`, `rejected`) for the invite endpoint — assert only `pending_review` succeeds; all others return 409.

### Integration Tests

- Full flow: create job → submit application → verify `pending_review` → HR invites → verify `interview_invited` + token → candidate opens `/interview/:token` → session loads → send message → AI responds.
- Duplicate application: submit same email twice for same job → second returns 409.
- Email not configured: set `EMAIL_HOST=''` → apply and invite succeed (200/201) even though email is skipped; no unhandled error thrown.
- Auth: unauthenticated request to `/api/hr/recruitment/job-positions/:id/applicants` → 401.
