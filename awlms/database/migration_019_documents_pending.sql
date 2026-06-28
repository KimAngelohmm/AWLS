-- ============================================================
-- Migration 019: Add documents_pending fields to Applicant
-- ============================================================
-- Allows applicants to submit applications without all documents
-- Documents can be submitted later via the applicant document portal
-- ============================================================

USE awlms;

-- Add documents_pending flag to track incomplete submissions
ALTER TABLE `Applicant`
  ADD COLUMN IF NOT EXISTS `documents_pending` BOOLEAN NOT NULL DEFAULT TRUE
    COMMENT 'TRUE if applicant has not yet uploaded required documents';

-- Add document_deadline for optional deadline tracking
ALTER TABLE `Applicant`
  ADD COLUMN IF NOT EXISTS `document_deadline` DATE NULL
    COMMENT 'Optional deadline for applicant to submit missing documents';

-- Update hiring_decision ENUM to include 'pending_documents' status
-- Note: This requires recreating the column due to MySQL ENUM limitations
ALTER TABLE `Applicant`
  MODIFY COLUMN `hiring_decision` ENUM('pending','pending_documents','pending_review','interview_invited','under_review','approved','rejected','withdrawn')
    NOT NULL DEFAULT 'pending_review'
    COMMENT 'Application status including pending_documents for incomplete submissions';