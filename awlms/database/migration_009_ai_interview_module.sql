-- ---------------------------------------------------------------------------
-- Migration 009 — AI Interview Module
--
-- Adds the interview-specific columns to the Applicant table that are
-- required by the AI Interview Module (recruitmentPublic routes +
-- recruitmentInterview service).
--
-- Safe to run on any database created from schema.sql (migrations 001–008).
-- Each ALTER uses ADD COLUMN IF NOT EXISTS so re-running is harmless.
--
-- NOTE: If your database is named awlms_db instead of awlms, change the
-- USE statement below accordingly (or run against the correct DB in XAMPP).
-- ---------------------------------------------------------------------------

USE awlms;
-- USE awlms_db;  -- uncomment this line and comment the line above if your DB is named awlms_db

-- ── Interview token & status ─────────────────────────────────────────────────

ALTER TABLE `Applicant`
  ADD COLUMN IF NOT EXISTS `interview_token`  VARCHAR(96)  NULL
    COMMENT 'Unique token sent to applicant — authenticates the public interview session'
    AFTER `interview_transcript`,

  ADD COLUMN IF NOT EXISTS `interview_status` ENUM('pending_start','in_progress','completed','failed')
    NOT NULL DEFAULT 'pending_start'
    COMMENT 'Tracks where the applicant is in the AI interview flow'
    AFTER `interview_token`,

  ADD COLUMN IF NOT EXISTS `interview_messages` JSON NULL
    COMMENT 'Full chat message array (role, content, ts) for the interview session'
    AFTER `interview_status`,

  ADD COLUMN IF NOT EXISTS `ai_recommendation` ENUM('hire','no_hire') NULL
    COMMENT 'AI hiring recommendation generated at interview completion'
    AFTER `assessment_summary`;

-- ── Indexes ──────────────────────────────────────────────────────────────────

ALTER TABLE `Applicant`
  ADD UNIQUE INDEX IF NOT EXISTS `uk_applicant_interview_token`  (`interview_token`),
  ADD INDEX        IF NOT EXISTS `idx_applicant_interview_status` (`interview_status`);
