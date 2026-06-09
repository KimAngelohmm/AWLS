# Bugfix Requirements Document

## Introduction

The public job application flow in AWLMS is incomplete and non-discoverable. Candidates have no way to find open positions without being given a direct link, the login page provides no entry point for applicants, the application form is missing an "about yourself" field, and the HR Recruitment module lacks a per-job applicant list with the ability to invite candidates to an AI interview. This bugfix restores the full end-to-end flow: discovery → application → HR review → interview invitation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a visitor navigates to `/login` THEN the system does not display any link to view open positions or apply for a job

1.2 WHEN a visitor navigates to `/careers` THEN the system returns a 404 / not-found page instead of a list of open job positions

1.3 WHEN a visitor lands on `/apply/[jobId]` THEN the system does not provide an "about yourself" free-text field in the application form

1.4 WHEN a visitor submits an application via `/apply/[jobId]` THEN the system stores the applicant record with `interview_status = 'in_progress'` immediately (bypassing a `pending_review` stage) and does not send a confirmation email

1.5 WHEN an HR user views the Recruitment module THEN the system does not display a per-job list of applicants who have submitted applications

1.6 WHEN an HR user views an applicant in the Recruitment module THEN the system does not provide an "Invite to AI Interview" button for applicants in `pending_review` status

1.7 WHEN an HR user clicks "Invite to AI Interview" for an applicant THEN the system does not update the applicant status to `interview_invited` and does not send an invitation email containing a unique token link

1.8 WHEN a candidate navigates to `/interview/[token]` using a token-based URL received by email THEN the system does not resolve the token to an applicant session (the route uses `applicantId`, not a standalone token)

### Expected Behavior (Correct)

2.1 WHEN a visitor navigates to `/login` THEN the system SHALL display a prominent "View Open Positions" or "Apply for a Job" hyperlink that navigates to `/careers`

2.2 WHEN a visitor navigates to `/careers` THEN the system SHALL display a public page listing all job positions with `status = 'open'`, showing at minimum the job title and department, each with an "Apply Now" button linking to `/apply/[jobId]`

2.3 WHEN a visitor lands on `/apply/[jobId]` THEN the system SHALL display an application form that includes full name, email, and an "About yourself" free-text field

2.4 WHEN a visitor submits a valid application via `/apply/[jobId]` THEN the system SHALL store the applicant record with `status = 'pending_review'`, and SHALL send a confirmation email to the applicant's provided email address

2.5 WHEN an HR user views the Recruitment module THEN the system SHALL display a per-job section listing all applicants associated with each job position

2.6 WHEN an HR user views an applicant with `status = 'pending_review'` in the Recruitment module THEN the system SHALL display an "Invite to AI Interview" button for that applicant

2.7 WHEN an HR user clicks "Invite to AI Interview" for an applicant THEN the system SHALL update the applicant's status to `interview_invited`, generate a unique token, and send an invitation email to the applicant containing a link to `/interview/[token]`

2.8 WHEN a candidate navigates to `/interview/[token]` using the token from their invitation email THEN the system SHALL resolve the token to the correct applicant session and allow the candidate to begin the AI interview without requiring a login

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a visitor navigates to `/apply/[jobId]` for a job with `status = 'open'` THEN the system SHALL CONTINUE TO display the job title and description

3.2 WHEN a visitor submits a valid application THEN the system SHALL CONTINUE TO reject duplicate applications (same email + job) with an appropriate error

3.3 WHEN a candidate is in an active AI interview session THEN the system SHALL CONTINUE TO process interview messages and generate AI responses correctly

3.4 WHEN an AI interview is completed THEN the system SHALL CONTINUE TO store the assessment summary and AI recommendation and surface them in the HR Recruitment module for review

3.5 WHEN an HR user approves or rejects an applicant after interview review THEN the system SHALL CONTINUE TO record the hiring decision and mark the applicant as reviewed

3.6 WHEN an HR user creates, opens, or closes a job position THEN the system SHALL CONTINUE TO persist those changes and reflect them in the job positions table

3.7 WHEN an authenticated HR user accesses `/hr/recruitment` THEN the system SHALL CONTINUE TO require valid authentication and the `hr` role
