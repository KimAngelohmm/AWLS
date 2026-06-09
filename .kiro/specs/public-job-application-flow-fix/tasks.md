# Implementation Plan

## Overview

This task list implements the fix for the broken public job application flow in AWLMS. The fix restores the full end-to-end pipeline: **Discovery → Application → HR Review → Interview Invitation → AI Interview**. Tasks follow the exploratory bugfix workflow: write tests first to confirm the bugs exist, then implement the fix, then verify the fix works and preserves all existing behaviour.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3"] },
    { "wave": 3, "tasks": ["4"] },
    { "wave": 4, "tasks": ["5", "6", "7", "8", "9", "10"] },
    { "wave": 5, "tasks": ["11", "12", "13"] },
    { "wave": 6, "tasks": ["14", "15"] },
    { "wave": 7, "tasks": ["16"] },
    { "wave": 8, "tasks": ["17"] }
  ]
}
```

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Public Application Flow Eight Defect Conditions
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each of the eight defect conditions
  - **Scoped PBT Approach**: For deterministic defects, scope each property to the concrete failing case to ensure reproducibility
  - Test 1 — Careers page 404: `GET /api/recruitment/jobs` on unfixed backend — assert 200 with array of open jobs (will fail — endpoint missing)
  - Test 2 — Apply stores wrong status: `POST /api/recruitment/apply` with valid body — assert DB row has `hiring_decision = 'pending_review'` and `interview_token = NULL` (will fail — unfixed code sets `interview_status = 'in_progress'` and generates a token immediately)
  - Test 3 — Apply starts AI interview: `POST /api/recruitment/apply` — assert `generateFirstQuestion` is NOT called and response is `{ applicantId, message }` not `{ applicantId, interviewToken, messages }` (will fail — unfixed code calls AI on submit)
  - Test 4 — Interview route by token: `GET /api/recruitment/interview/:token` using a 64-char hex token — assert 200 with correct session (will fail — unfixed route uses `:applicantId` param and header-based token check)
  - Test 5 — HR applicants endpoint missing: `GET /api/hr/recruitment/job-positions/:id/applicants` — assert 200 (will fail — endpoint returns 404)
  - Test 6 — HR invite endpoint missing: `POST /api/hr/recruitment/applicants/:id/invite-interview` — assert 200 (will fail — endpoint returns 404)
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., `POST /apply` returns `{ interviewToken, messages }` instead of `{ message }`; `GET /interview/:token` returns 404; HR endpoints return 404)
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Recruitment and Platform Behaviour Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `GET /api/hr/recruitment/job-positions` returns `{ jobPositions: [...] }` on unfixed code
  - Observe: `POST /api/hr/recruitment/job-positions` creates a job and returns `{ jobPosition: {...} }` on unfixed code
  - Observe: `PATCH /api/hr/recruitment/job-positions/:id` updates a job and returns `{ jobPosition: {...} }` on unfixed code
  - Observe: `POST /api/hr/recruitment/applicants/:id/review` with `approved`/`rejected` records the decision on unfixed code
  - Observe: `GET /api/hr/recruitment/assessments-pending` returns `{ assessments: [...] }` on unfixed code
  - Observe: Submitting two applications with the same email + job returns 409 on the second attempt on unfixed code
  - Observe: Unauthenticated requests to `/api/hr/recruitment/*` return 401/403 on unfixed code
  - Write property-based test: for all valid job payloads (varying title length, optional description, optional department_id), job CRUD endpoints return the same response shape and DB state as before the fix
  - Write property-based test: for all applicant states other than `pending_review` (`under_review`, `approved`, `rejected`, `withdrawn`), the invite endpoint (once added) returns 409 — confirming the guard is correct
  - Write property-based test: for all random token strings (valid hex, invalid hex, empty, SQL injection attempts), only an exact 64-char hex token matching a DB row returns 200; all others return 404
  - Write property-based test: for all valid application payloads (varying `about_yourself` length 0–5000 chars, optional phone), duplicate email+job submissions return 409
  - Verify all tests PASS on UNFIXED code (baseline behaviour confirmed)
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. DB migration — `migration_012_application_flow_fix.sql`

  - [ ] 3.1 Create `awlms/database/migration_012_application_flow_fix.sql`
    - Add `about_yourself TEXT NULL` column to `Applicant` table after `application_details`
    - Extend `hiring_decision` ENUM to include `pending_review` and `interview_invited` values; set default to `'pending_review'`
    - Keep `pending` value in enum for backward compatibility with existing rows
    - Add `UNIQUE INDEX IF NOT EXISTS uk_applicant_interview_token` on `interview_token` (guard — migration_009 adds it, but ensure it exists)
    - Add `INDEX IF NOT EXISTS idx_applicant_hiring_decision` on `hiring_decision` for fast status-based queries
    - _Bug_Condition: isBugCondition(input) where input.action = 'submitApplication' AND applicantStoredAs('in_progress')_
    - _Expected_Behavior: hiring_decision defaults to 'pending_review'; interview_token is NULL at apply time_
    - _Preservation: existing rows keep their current hiring_decision value; 'pending' enum value retained_
    - _Requirements: 1.4, 2.4, 2.7_

- [ ] 4. New backend service — `emailService.js`

  - [ ] 4.1 Install nodemailer dependency
    - Run `npm install nodemailer@6.9.14` in `awlms/backend`
    - Verify nodemailer appears in `package.json` dependencies

  - [ ] 4.2 Create `awlms/backend/src/services/emailService.js`
    - Implement `createTransport()` using `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS` env vars
    - Implement `sendApplicationConfirmation({ to, fullName, jobTitle })` — sends confirmation email; returns silently if `EMAIL_HOST` is not set
    - Implement `sendInterviewInvitation({ to, fullName, jobTitle, interviewToken })` — sends invitation email with link `${FRONTEND_ORIGIN}/interview/${interviewToken}`; returns silently if `EMAIL_HOST` is not set
    - Export both functions via `module.exports`
    - _Bug_Condition: isBugCondition(input) where input.action = 'submitApplication' AND NOT confirmationEmailSent()_
    - _Expected_Behavior: confirmation email sent on apply; invitation email sent on HR invite_
    - _Preservation: email failures are non-blocking — logged but not surfaced to caller_
    - _Requirements: 1.4, 1.7, 2.4, 2.7_

  - [ ] 4.3 Add email env vars to `.env.example`
    - Add `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `FRONTEND_ORIGIN` entries with example values

- [ ] 5. Backend: `GET /api/recruitment/jobs` — new public endpoint

  - [ ] 5.1 Add `GET /jobs` handler to `awlms/backend/src/routes/recruitmentPublic.js`
    - Insert handler before the existing `router.get('/jobs/:id', ...)` handler to avoid route shadowing
    - Query `JobPosition` joined with `departments` where `status = 'open'`, ordered by `created_at DESC`
    - Return only `id`, `title`, `status`, `department_name` — no sensitive fields
    - No authentication required — public endpoint
    - _Bug_Condition: isBugCondition(input) where input.route = '/careers' AND NOT careersPageExists()_
    - _Expected_Behavior: 200 with `{ jobs: [{ id, title, status, department_name }] }` for all open positions_
    - _Preservation: existing `GET /jobs/:id` handler is unchanged_
    - _Requirements: 1.2, 2.2_

- [ ] 6. Backend: Modify `POST /api/recruitment/apply`

  - [ ] 6.1 Replace `POST /apply` handler in `awlms/backend/src/routes/recruitmentPublic.js`
    - Accept `about_yourself` from request body (optional string)
    - Remove all `generateFirstQuestion` / AI interview startup logic and its import usage
    - Add `sendApplicationConfirmation` import from `../services/emailService`
    - Insert applicant with `about_yourself`, `interview_token = NULL`, `interview_status = 'pending_start'`, `hiring_decision = 'pending_review'`
    - Call `sendApplicationConfirmation` non-blocking (`.catch` logs error, does not reject response)
    - Return `{ applicantId, message: 'Application received. You will be contacted by email if selected for an interview.' }` with status 201
    - Preserve duplicate-application rejection: `ER_DUP_ENTRY` → 409
    - _Bug_Condition: isBugCondition(input) where input.action = 'submitApplication' AND applicantStoredAs('in_progress') AND NOT confirmationEmailSent()_
    - _Expected_Behavior: hiring_decision='pending_review', interview_token=NULL, about_yourself stored, confirmation email sent, response is { applicantId, message }_
    - _Preservation: duplicate email+job still returns 409; job-not-open still returns 404_
    - _Requirements: 1.3, 1.4, 2.3, 2.4, 3.2_

- [ ] 7. Backend: Modify `GET` and `POST /api/recruitment/interview/:token`

  - [ ] 7.1 Rename route parameter from `:applicantId` to `:token` in `GET /interview/:applicantId`
    - Change handler signature to `router.get('/interview/:token', ...)`
    - Read token from `req.params.token` instead of `req.params.applicantId`
    - Remove `X-Interview-Token` header check
    - Look up applicant by `WHERE a.interview_token = ?` instead of `WHERE a.id = ?`
    - Return 404 with message `'Interview session not found'` if no row matches
    - _Bug_Condition: isBugCondition(input) where input.route = '/interview/:token' AND tokenLookupUsesApplicantId()_
    - _Expected_Behavior: session resolved by interview_token column lookup; no header required_
    - _Preservation: response shape (interviewStatus, messages, assessmentSummary, aiRecommendation, hiringDecision) unchanged_
    - _Requirements: 1.8, 2.8_

  - [ ] 7.2 Rename route parameter from `:applicantId` to `:token` in `POST /interview/:applicantId/message`
    - Change handler signature to `router.post('/interview/:token/message', ...)`
    - Read token from `req.params.token`
    - Remove `X-Interview-Token` header check
    - Look up applicant by `WHERE a.interview_token = ?`; read `applicantId` from `rows[0].id` for subsequent UPDATE queries
    - All AI interview logic (`generateNextTurn`, `transcriptAppend`, assessment storage) remains completely unchanged
    - _Bug_Condition: isBugCondition(input) where input.route = '/interview/:token' AND tokenLookupUsesApplicantId()_
    - _Expected_Behavior: message processing and AI response generation work identically; only lookup mechanism changes_
    - _Preservation: AI interview engine (recruitmentInterview.js) is untouched; response shape unchanged_
    - _Requirements: 1.8, 2.8, 3.3, 3.4_

- [ ] 8. Backend: `GET /api/hr/recruitment/job-positions/:id/applicants` — new HR endpoint

  - [ ] 8.1 Add `GET /job-positions/:id/applicants` handler to `awlms/backend/src/routes/hrRecruitment.js`
    - Insert handler after the existing `router.patch('/job-positions/:id', ...)` handler
    - Query `Applicant` where `job_position_id = req.params.id`, ordered by `created_at DESC`
    - Return `id`, `full_name`, `email`, `phone`, `about_yourself`, `hiring_decision`, `interview_status`, `assessment_summary`, `ai_recommendation`, `created_at`, `updated_at`
    - Protected by existing `authenticateToken` + `requireRole('hr')` middleware in `server.js`
    - _Bug_Condition: isBugCondition(input) where input.route = '/hr/recruitment' AND NOT perJobApplicantListVisible()_
    - _Expected_Behavior: 200 with `{ applicants: [...] }` for the given job position_
    - _Preservation: existing job-positions CRUD endpoints unchanged; auth guard unchanged_
    - _Requirements: 1.5, 2.5_

- [ ] 9. Backend: `POST /api/hr/recruitment/applicants/:id/invite-interview` — new HR endpoint

  - [ ] 9.1 Add `POST /applicants/:id/invite-interview` handler to `awlms/backend/src/routes/hrRecruitment.js`
    - Add `sendInterviewInvitation` import from `../services/emailService` at top of file
    - Add `crypto` require (already present in file — verify before adding)
    - Insert handler after the new applicants endpoint from task 8.1
    - Look up applicant joined with `JobPosition` to get `job_title`
    - Return 404 if applicant not found
    - Return 409 if `hiring_decision !== 'pending_review'` with message `"Cannot invite: applicant status is '${a.hiring_decision}', expected 'pending_review'"`
    - Generate `interviewToken = crypto.randomBytes(32).toString('hex')` (64-char hex, 256-bit entropy)
    - UPDATE with optimistic guard: `WHERE id = ? AND hiring_decision = 'pending_review'` to prevent double-invites under concurrency
    - Set `hiring_decision = 'interview_invited'`, `interview_token = interviewToken`, `interview_status = 'pending_start'`
    - Call `sendInterviewInvitation` non-blocking (`.catch` logs error)
    - Return `{ ok: true, hiring_decision: 'interview_invited' }`
    - _Bug_Condition: isBugCondition(input) where input.action = 'inviteToInterview' AND NOT statusUpdatedTo('interview_invited') AND NOT inviteEmailSent()_
    - _Expected_Behavior: hiring_decision='interview_invited', interview_token is 64-char hex, invitation email sent_
    - _Preservation: existing /applicants/:id/review endpoint unchanged; auth guard unchanged_
    - _Requirements: 1.6, 1.7, 2.6, 2.7_

- [ ] 10. Frontend: `LoginPage.jsx` — add "View Open Positions" link

  - [ ] 10.1 Add careers link to `awlms/frontend/src/pages/LoginPage.jsx`
    - In the right panel, after the closing `</form>` tag and before the closing `</div>` of `login-form-wrap`, add a paragraph with a `Link` to `/careers`
    - Use text "Looking for a job? View Open Positions"
    - `Link` is already imported from `react-router-dom` — no new imports needed
    - Apply `className="login-forgot"` to the link for consistent styling
    - _Bug_Condition: isBugCondition(input) where input.route = '/login' AND input.userType = 'visitor' AND NOT careersLinkVisible()_
    - _Expected_Behavior: "View Open Positions" link visible on login page, navigates to /careers_
    - _Preservation: existing login form, role tabs, remember-me, and forgot-password link unchanged_
    - _Requirements: 1.1, 2.1_

- [ ] 11. Frontend: New `CareersPage.jsx`

  - [ ] 11.1 Create `awlms/frontend/src/pages/public/CareersPage.jsx`
    - Import `useEffect`, `useState` from react; `Link` from react-router-dom; `publicApiFetch` from `../../lib/publicApi.js`
    - On mount, fetch `GET /api/recruitment/jobs` and store results in `jobs` state
    - Show loading state while fetching; show error alert on failure
    - Show "No open positions at this time" message when jobs array is empty
    - Render each job as a card with `job.title`, optional `job.department_name`, and an "Apply Now" `Link` to `/apply/${job.id}`
    - Include a footer link back to `/login` for HR sign-in
    - Use existing CSS classes (`apply-page`, `apply-card`, `btn-primary`, `muted`, `auth-alert`) for visual consistency
    - _Bug_Condition: isBugCondition(input) where input.route = '/careers' AND NOT careersPageExists()_
    - _Expected_Behavior: public page lists all open positions with title, department, and Apply Now button_
    - _Preservation: no existing pages modified_
    - _Requirements: 1.2, 2.2_

- [ ] 12. Frontend: Modify `ApplyPage.jsx`

  - [ ] 12.1 Add `about_yourself` field and `submitted` state to `awlms/frontend/src/pages/public/ApplyPage.jsx`
    - Add `about_yourself: ''` to the initial `form` state object
    - Add `const [submitted, setSubmitted] = useState(false)` state
    - Add `about_yourself` textarea field in the form between the phone field and the submit button
    - Use `rows={4}` and placeholder text describing the field purpose

  - [ ] 12.2 Update `handleSubmit` in `ApplyPage.jsx` — remove AI interview navigation, add success state
    - Include `about_yourself: form.about_yourself.trim() || null` in the POST body
    - Remove `sessionStorage.setItem(...)` call
    - Remove `navigate(...)` call — no longer redirect to interview on submit
    - On success, call `setSubmitted(true)` to show success message
    - Remove `useNavigate` import and the `navigate` variable

  - [ ] 12.3 Add success message and update submit button label in `ApplyPage.jsx`
    - When `submitted === true`, render a success `<div>` with role="status" instead of the form
    - Update submit button label from "Apply & start AI interview" to "Submit Application"
    - Update loading label from "Starting interview…" to "Submitting…"
    - Remove the "After you submit, an AI-conducted interview starts immediately" note paragraph
    - _Bug_Condition: isBugCondition(input) where input.route = '/apply/:jobId' AND NOT aboutYourselfFieldPresent()_
    - _Expected_Behavior: form includes about_yourself textarea; on submit shows success message instead of navigating to interview_
    - _Preservation: job title/description display, error handling, duplicate-application error display, and phone field unchanged_
    - _Requirements: 1.3, 1.4, 2.3, 2.4, 3.1, 3.2_

- [ ] 13. Frontend: Modify `InterviewPage.jsx` — use token from URL params

  - [ ] 13.1 Update `awlms/frontend/src/pages/public/InterviewPage.jsx` to use token-based routing
    - Replace `const { applicantId } = useParams()` with `const { token } = useParams()`
    - Remove the `useMemo` block that reads from `sessionStorage` — token is now in the URL
    - Remove `sessionStorage` dependency entirely
    - Update `useEffect` dependency array: replace `[applicantId, token]` with `[token]`
    - Update early-return guard: check `if (!token)` (token comes from URL, not storage)
    - Update `GET` fetch URL from `/api/recruitment/interview/${applicantId}` to `/api/recruitment/interview/${token}`
    - Remove `headers: { 'X-Interview-Token': token }` from GET fetch options
    - Update `POST` fetch URL from `/api/recruitment/interview/${applicantId}/message` to `/api/recruitment/interview/${token}/message`
    - Remove `headers: { 'X-Interview-Token': token }` from POST fetch options
    - Update error message for session-not-found to: `"Interview session not found. Please use the link from your invitation email."`
    - Update the early-return error card message to match the new flow (token in URL, not sessionStorage)
    - Remove `location.state?.messages` shortcut — candidates arriving via email link will always need to fetch
    - _Bug_Condition: isBugCondition(input) where input.route = '/interview/:token' AND tokenLookupUsesApplicantId()_
    - _Expected_Behavior: token read from URL params; API calls use /interview/:token routes; no header required_
    - _Preservation: chat UI, message rendering, send form, completion banner, and assessment summary display unchanged_
    - _Requirements: 1.8, 2.8, 3.3_

- [ ] 14. Frontend: Modify `App.jsx` — add `/careers` route, update interview route

  - [ ] 14.1 Update `awlms/frontend/src/App.jsx`
    - Add `import CareersPage from './pages/public/CareersPage.jsx'`
    - Add `<Route path="/careers" element={<CareersPage />} />` alongside the other public routes (near `/apply/:jobId`)
    - Change `<Route path="/interview/:applicantId" element={<InterviewPage />} />` to `<Route path="/interview/:token" element={<InterviewPage />} />`
    - _Bug_Condition: isBugCondition(input) where input.route = '/careers' AND NOT careersPageExists()_
    - _Expected_Behavior: /careers route renders CareersPage; /interview/:token route renders InterviewPage with token param_
    - _Preservation: all other routes (HR, employee, manager, login, apply) unchanged_
    - _Requirements: 1.2, 1.8, 2.2, 2.8_

- [ ] 15. Frontend: Modify `HrRecruitmentModule.jsx` — per-job applicant list and invite button

  - [ ] 15.1 Add applicant state and load function to `awlms/frontend/src/pages/hr/HrRecruitmentModule.jsx`
    - Add `const [applicantsByJob, setApplicantsByJob] = useState({})` state (keyed by job id)
    - Add `const [loadingApplicants, setLoadingApplicants] = useState({})` state
    - Implement `async function loadApplicants(jobId)` that fetches `GET /api/hr/recruitment/job-positions/${jobId}/applicants` and stores result in `applicantsByJob[jobId]`

  - [ ] 15.2 Add `inviteToInterview` function to `HrRecruitmentModule.jsx`
    - Implement `async function inviteToInterview(applicantId, jobId)` that calls `POST /api/hr/recruitment/applicants/${applicantId}/invite-interview`
    - On success, call `loadApplicants(jobId)` to refresh the applicant list for that job
    - Use existing `setSaving` and `setLoadError` state for loading/error feedback

  - [ ] 15.3 Add "View Applicants" button and expandable applicant sub-table to the job positions table in `HrRecruitmentModule.jsx`
    - In each job row's Actions cell, add a "View Applicants" button that calls `loadApplicants(j.id)`
    - After each job row, render an applicant sub-section when `applicantsByJob[j.id]` is populated
    - Show loading indicator while `loadingApplicants[j.id]` is true
    - Applicant sub-table columns: Name/Email, Status badge (`hiring_decision`), Interview status, About yourself (truncated), Actions
    - For applicants with `hiring_decision === 'pending_review'`, show an "Invite to AI Interview" button that calls `inviteToInterview(a.id, j.id)`
    - Show `about_yourself` in the applicant row or add it to the existing `TranscriptModal` data display
    - _Bug_Condition: isBugCondition(input) where input.route = '/hr/recruitment' AND NOT perJobApplicantListVisible() AND applicantStatus = 'pending_review' AND NOT inviteButtonVisible()_
    - _Expected_Behavior: each job shows its applicants; pending_review applicants have Invite button; clicking invite updates status and sends email_
    - _Preservation: existing job positions table, create-job form, assessment-pending section, TranscriptModal, approve/reject actions all unchanged_
    - _Requirements: 1.5, 1.6, 1.7, 2.5, 2.6, 2.7, 3.5, 3.6, 3.7_

- [ ] 16. Fix verification — re-run bug condition exploration test

  - [ ] 16.1 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Public Application Flow Eight Defect Conditions
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied for all eight defect conditions
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: All six test cases PASS (confirms all eight bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ] 16.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Recruitment and Platform Behaviour Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests from step 2
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Confirm job CRUD, AI interview engine, HR review, duplicate rejection, and auth guard all behave identically to pre-fix baseline
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 17. Checkpoint — Ensure all tests pass
  - Run the full test suite (`npm test` in `awlms/backend`)
  - Confirm existing unit tests pass: `recruitmentInterview.test.js`, `jobVacancyClone.test.js`, `lifecycleAudit.test.js`, `performanceMetrics.test.js`, `centralAiAgent.normalize.test.js`, `lifecycleAi.fallback.test.js`
  - Confirm existing integration test passes: `lifecycleRecruitmentLoop.test.js`
  - Confirm new unit tests pass: `emailService` mock tests, `POST /apply` assertion tests, `POST /invite-interview` assertion tests, `GET /interview/:token` lookup tests
  - Confirm new property-based tests pass: job CRUD preservation, token lookup, applicant state guard, duplicate application
  - Confirm new integration test passes: full flow (create job → apply → HR invite → candidate opens /interview/:token → AI interview)
  - Ensure all tests pass; ask the user if questions arise

## Notes

- Run the DB migration (`migration_012_application_flow_fix.sql`) against the `awlms` database before starting any backend changes.
- `nodemailer` must be installed (`npm install nodemailer@6.9.14` in `awlms/backend`) before `emailService.js` can be used.
- Email sending is non-blocking throughout — a missing or misconfigured `EMAIL_HOST` silently skips sending without failing the request. This means the apply and invite endpoints work correctly even in development environments without SMTP configured.
- The AI interview engine (`recruitmentInterview.js` and `POST /interview/:token/message`) is intentionally untouched. Only the route parameter name and lookup mechanism change.
- Tasks 10–15 (frontend) can be worked in parallel once the backend tasks (3–9) are complete.
- The `crypto` module is already required in `hrRecruitment.js` — no new import needed for task 9.
