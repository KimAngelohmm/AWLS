-- AI recruitment interview columns on Applicant (for DBs created before this feature)
USE awlms;

ALTER TABLE `Applicant`
  ADD COLUMN `interview_token` VARCHAR(96) NULL AFTER `interview_transcript`,
  ADD COLUMN `interview_status` ENUM('pending_start', 'in_progress', 'completed', 'failed')
    NOT NULL DEFAULT 'pending_start' AFTER `interview_token`,
  ADD COLUMN `interview_messages` JSON NULL AFTER `interview_status`,
  ADD COLUMN `ai_recommendation` ENUM('hire', 'no_hire') NULL AFTER `assessment_summary`,
  ADD UNIQUE KEY `uk_applicant_interview_token` (`interview_token`),
  ADD KEY `idx_applicant_interview_status` (`interview_status`);
