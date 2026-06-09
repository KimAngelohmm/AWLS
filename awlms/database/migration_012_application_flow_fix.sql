-- ---------------------------------------------------------------------------
-- Migration 012 — Public job application flow
-- Adds about_yourself and hiring_decision values pending_review, interview_invited
-- ---------------------------------------------------------------------------

USE awlms;

ALTER TABLE `Applicant`
  ADD COLUMN IF NOT EXISTS `about_yourself` TEXT NULL
    COMMENT 'Short self-introduction from public apply form'
    AFTER `application_details`;

ALTER TABLE `Applicant`
  MODIFY COLUMN `hiring_decision` ENUM(
    'pending',
    'pending_review',
    'interview_invited',
    'under_review',
    'approved',
    'rejected',
    'withdrawn'
  ) NOT NULL DEFAULT 'pending_review';
