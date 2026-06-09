# Requirements Document

## Introduction

This document defines the requirements for the **Public Job Application Flow** feature in AWLMS (AI-Powered Workforce Lifecycle Management System). The feature enables external job seekers to discover open positions and submit applications without requiring an account.

The scope covers three connected surfaces:

1. A "View Open Positions" hyperlink on the existing login page that navigates to `/careers`.
2. A public `/careers` page that lists all open job positions (title and department) with an "Apply Now" button per listing.
3. A public `/apply/[jobId]` page that shows the job title and department and presents a simple application form collecting full name, email address, and a short "about yourself" text.

### What Already Exists (Do Not Duplicate)

The following are already implemented and must be reused:

- **`JobPosition` table** — `id`, `title`, `description`, `department_id`, `status` (`draft`/`open`/`filled`/`closed`)
- **`departments` table** — `id`, `name`
- **`Applicant` table** — `id`, `job_position_id`, `full_name`, `email`, `phone`, `application_details`, `interview_token`, `interview_status`, `interview_messages`, `interview_transcript`, `assessment_summary`, `ai_recommendation`, `hiring_decision`
- **`GET /api/recruitment/jobs`** — public endpoint returning open job positions with `id`, `title`, `description`, `department_name`
- **`GET /api/recruitment/jobs/:id`** — public endpoint returning a single open job position
- **`POST /api/recruitment/apply`** — public endpoint that accepts an application; currently starts an AI interview immediately (behavior must be changed per Requirement 3)
- **Login page** — already contains a `<Link to="/careers">View Open Positions</Link>` element styled with `.login-careers-link`
- **`/careers` route** — already registered in `App.jsx` pointing to `CareersPage`
- **`/apply/:jobId` route** — already registered in `App.jsx` pointing to `ApplyPage`
- **`publicApiFetch` utility** — `src/lib/publicApi.js`, used by all public pages

### What Must Be Built or Changed

- **`CareersPage`** — update the "Contact HR" button label to "Apply Now" and ensure it navigates to `/apply/[jobId]`
- **`ApplyPage`** — add the `about_yourself` field to the form; display job title and department name; change submission behavior to show a success confirmation instead of redirecting to the AI interview
- **`POST /api/recruitment/apply`** — accept `about_yourself`; store it; set `hiring_decision = 'pending_review'` and `interview_status = 'pending_start'`; do **not** call `generateFirstQuestion`; respond with HTTP 201 and a confirmation message
- **Database migration** — add `about_yourself TEXT NULL` column to `Applicant`; extend `hiring_decision` ENUM to include `pending_review`

---

## Glossary

- **AWLMS**: AI-Powered Workforce Lifecycle Management System — the platform this feature extends.
- **Applicant**: An external person who has submitted a job application via the public apply form. Stored in the `Applicant` table.
- **Careers_Page**: The public frontend page at `/careers` that lists all open job positions. Requires no login.
- **Apply_Page**: The public frontend page at `/apply/[jobId]` that displays a specific job and the application form. Requires no login.
- **Login_Page**: The existing authenticated entry point at `/login`.
- **JobPosition**: A database record representing a role. Has `status` values: `draft`, `open`, `filled`, `closed`.
- **recruitmentPublic_Router**: The existing Express router at `src/routes/recruitmentPublic.js`, mounted at `/api/recruitment`.
- **hiring_decision**: A field on the `Applicant` table tracking the applicant's pipeline stage. Extended by this feature with the value `pending_review`.
- **about_yourself**: A short free-text field collected on the application form and stored in `Applicant.about_yourself`.

---

## Requirements

### Requirement 1: Login Page Entry Point

**User Story:** As a job seeker, I want to see a visible link on the AWLMS login page that takes me to open job listings, so that I can discover and apply for positions without needing an account.

#### Acceptance Criteria

1. THE Login_Page SHALL display a hyperlink labelled exactly "View Open Positions" that is visible in the viewport without scrolling on desktop (≥1024 px wide), tablet (768–1023 px wide), and mobile (320–767 px wide) breakpoints.
2. WHEN a visitor clicks the "View Open Positions" link on the Login_Page, THE Login_Page SHALL navigate the visitor to the Careers_Page at `/careers` within the same browser tab.
3. THE Login_Page SHALL render the hyperlink without requiring the visitor to be authenticated.
4. IF the client-side router fails to resolve `/careers`, THEN THE Login_Page SHALL fall back to a full-page navigation to `/careers`.

---

### Requirement 2: Public Careers Listing Page

**User Story:** As a job seeker, I want to browse all open job positions on a public page, so that I can find roles that match my skills without logging in.

#### Acceptance Criteria

1. THE Careers_Page SHALL be accessible at the URL path `/careers` without authentication.
2. WHEN the Careers_Page loads, THE Careers_Page SHALL fetch `GET /api/recruitment/jobs` and THE recruitmentPublic_Router SHALL respond with a list of all `JobPosition` records where `status = 'open'`.
3. THE recruitmentPublic_Router SHALL include `id`, `title`, `description`, and `department_name` for each open `JobPosition` in the `GET /api/recruitment/jobs` response.
4. THE Careers_Page SHALL display each open job position's title and department name.
5. WHILE the Careers_Page is fetching job listings, THE Careers_Page SHALL display a loading indicator.
6. WHILE open job positions are displayed, THE Careers_Page SHALL display an "Apply Now" button for each listed job position.
7. WHEN a visitor clicks "Apply Now" for a job position on the Careers_Page, THE Careers_Page SHALL navigate the visitor to the Apply_Page at `/apply/[jobId]` for that position.
8. IF the `GET /api/recruitment/jobs` request fails with a network or server error, THEN THE Careers_Page SHALL display an error message and offer a retry option.
9. IF no `JobPosition` records with `status = 'open'` exist, THEN THE Careers_Page SHALL display a message indicating that no positions are currently available.
10. THE recruitmentPublic_Router SHALL return an empty array (HTTP 200, not an error) from `GET /api/recruitment/jobs` when no open positions exist.

---

### Requirement 3: Public Job Application Form

**User Story:** As a job seeker, I want to view a specific job's details and submit my application on a dedicated page, so that I can apply for a role I am interested in.

#### Acceptance Criteria

1. THE Apply_Page SHALL be accessible at the URL path `/apply/[jobId]` without authentication.
2. WHEN the Apply_Page loads for a given `jobId`, THE recruitmentPublic_Router SHALL respond to `GET /api/recruitment/jobs/:id` with the `JobPosition` record's `id`, `title`, `description`, and `department_name` (resolved via JOIN with the `departments` table) when `status = 'open'`.
3. THE Apply_Page SHALL display the job position's title and department name.
4. THE Apply_Page SHALL present a form collecting the applicant's full name (required, max 255 characters), email address (required), and an "about yourself" free-text field (required, max 5000 characters).
5. WHEN a visitor submits the application form with valid inputs, THE recruitmentPublic_Router SHALL accept `POST /api/recruitment/apply` with fields `job_position_id`, `full_name`, `email`, and `about_yourself`.
6. WHEN a valid application is submitted, THE recruitmentPublic_Router SHALL insert a new `Applicant` row with `hiring_decision = 'pending_review'`, `interview_status = 'pending_start'`, and `interview_token = NULL`.
7. WHEN a valid application is submitted, THE recruitmentPublic_Router SHALL store the `about_yourself` value in the `Applicant.about_yourself` column.
8. WHEN a valid application is submitted, THE recruitmentPublic_Router SHALL respond with HTTP 201 and a body containing `applicantId` and a `message` field confirming the application was received.
9. WHEN a valid application is submitted, THE recruitmentPublic_Router SHALL NOT start the AI interview through any mechanism (no call to `generateFirstQuestion`, no `interview_token` generation, no `interview_messages` population).
10. WHEN the Apply_Page receives a 201 response, THE Apply_Page SHALL display a success confirmation message and hide the form.
11. IF any of the `job_position_id`, `full_name`, `email`, or `about_yourself` fields are absent or contain only whitespace in the request body, THEN THE recruitmentPublic_Router SHALL respond with HTTP 400 and a JSON body containing a `field` key identifying the offending field and an `error` key with a human-readable message.
12. IF the submitted `email` does not conform to a valid email address format (RFC 5322 local-part@domain), THEN THE recruitmentPublic_Router SHALL respond with HTTP 400 and an error message indicating the email is invalid.
13. IF the referenced `JobPosition` does not exist or has `status ≠ 'open'`, THEN THE recruitmentPublic_Router SHALL respond with HTTP 404 and an error message.
14. IF an `Applicant` row already exists with the same `(job_position_id, email)` combination, THEN THE recruitmentPublic_Router SHALL respond with HTTP 409 and an error message indicating the applicant has already applied.
15. IF the `GET /api/recruitment/jobs/:id` request returns HTTP 404, THEN THE Apply_Page SHALL display a message indicating the position is no longer available and SHALL NOT render the application form.
16. IF the `POST /api/recruitment/apply` request returns HTTP 400, 409, or 5xx, THEN THE Apply_Page SHALL display the error message from the response body and SHALL keep the form visible and populated so the visitor can correct and resubmit.

---

### Requirement 4: Database Schema Extension

**User Story:** As a developer, I want the database schema to support the new application flow fields, so that the `about_yourself` text and the `pending_review` hiring decision are stored correctly.

#### Acceptance Criteria

1. THE database migration SHALL add an `about_yourself` column of type `TEXT NULL` to the `Applicant` table using `ADD COLUMN IF NOT EXISTS` (or equivalent guard) so the statement is a no-op when the column already exists.
2. THE database migration SHALL extend the `hiring_decision` ENUM on the `Applicant` table so that the complete ordered set of permitted values after migration is: `('pending', 'under_review', 'approved', 'rejected', 'withdrawn', 'pending_review')`.
3. THE database migration SHALL be idempotent: re-running the migration script SHALL produce no errors and SHALL NOT change the schema if the `about_yourself` column already exists and the `hiring_decision` ENUM already includes `pending_review`.
4. THE database migration SHALL NOT unintentionally drop or alter any existing columns, indexes, or constraints on the `Applicant` table; the only permitted schema changes are the addition of `about_yourself` and the ENUM extension described in criteria 1 and 2.
