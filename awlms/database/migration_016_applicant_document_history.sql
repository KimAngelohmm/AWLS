-- ============================================================
-- Migration 016: Applicant Document Upload System
-- ============================================================
-- Adds support for uploading and storing applicant documents
-- (Resume, Government ID, Photos, Certificates, etc.)
-- ============================================================

USE awlms;

-- ============================================================
-- Applicant document access token
-- Adds secure applicant document management tokens to Applicant
-- ============================================================
ALTER TABLE `Applicant`
  ADD COLUMN IF NOT EXISTS `document_access_token` VARCHAR(96) NULL
    COMMENT 'Unique secure token for applicant document management'
    AFTER `about_yourself`;

ALTER TABLE `Applicant`
  ADD UNIQUE INDEX IF NOT EXISTS `uk_applicant_document_access_token` (`document_access_token`);

-- ============================================================
-- ApplicantDocuments Table
-- Stores metadata for uploaded applicant files
-- Files are stored on disk; this table keeps references
-- ============================================================
CREATE TABLE IF NOT EXISTS `ApplicantDocuments` (
  `id`                 CHAR(36)      NOT NULL
    COMMENT 'Unique document ID (UUID)',
  `applicant_id`       CHAR(36)      NOT NULL
    COMMENT 'FK to Applicant; deleted when applicant is deleted',
  `document_type`      VARCHAR(50)   NOT NULL
    COMMENT 'Type: resume, government_id, photo, tor, diploma, nbi_clearance, certificate, portfolio, cover_letter, other',
  `original_filename`  VARCHAR(255)  NOT NULL
    COMMENT 'Original filename uploaded by applicant',
  `stored_filename`    VARCHAR(255)  NOT NULL
    COMMENT 'Filename on disk (sanitized, UUID-based)',
  `mime_type`          VARCHAR(100)  NOT NULL
    COMMENT 'MIME type: application/pdf, image/png, etc.',
  `file_size`          BIGINT UNSIGNED NOT NULL
    COMMENT 'File size in bytes',
  `upload_timestamp`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT 'When the file was uploaded',
  `verification_status` ENUM('uploaded','verified','rejected') NOT NULL DEFAULT 'uploaded'
    COMMENT 'Current verification status of the document',
  `verified_by_user_id` CHAR(36)      NULL
    COMMENT 'HR user who verified or rejected the document',
  `verified_at`        DATETIME      NULL
    COMMENT 'When the document was verified or rejected',
  `verification_comments` TEXT        NULL
    COMMENT 'Optional notes from HR verification',
  `created_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_documents_applicant_id`    (`applicant_id`),
  KEY `idx_documents_document_type`   (`document_type`),
  KEY `idx_documents_upload_time`     (`upload_timestamp`),
  KEY `idx_documents_verification_status` (`verification_status`),
  KEY `idx_documents_verified_by`     (`verified_by_user_id`),
  
  CONSTRAINT `fk_documents_applicant_id`
    FOREIGN KEY (`applicant_id`) REFERENCES `Applicant` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Applicant uploaded documents: resumes, IDs, photos, certificates, etc.';

ALTER TABLE `ApplicantDocuments`
  ADD COLUMN IF NOT EXISTS `verification_status` ENUM('uploaded','verified','rejected') NOT NULL DEFAULT 'uploaded' AFTER `upload_timestamp`,
  ADD COLUMN IF NOT EXISTS `verified_by_user_id` CHAR(36) NULL AFTER `verification_status`,
  ADD COLUMN IF NOT EXISTS `verified_at` DATETIME NULL AFTER `verified_by_user_id`,
  ADD COLUMN IF NOT EXISTS `verification_comments` TEXT NULL AFTER `verified_at`;

ALTER TABLE `ApplicantDocuments`
  ADD INDEX IF NOT EXISTS `idx_documents_verification_status` (`verification_status`),
  ADD INDEX IF NOT EXISTS `idx_documents_verified_by` (`verified_by_user_id`);

-- ============================================================
-- Create uploads directory marker (optional, for documentation)
-- In production, ensure backend/uploads/ exists and is writable
-- ============================================================
-- Note: The uploads directory should be created with proper permissions:
-- backend/uploads/
--   └── applicant-documents/
--       └── {applicant-id}/
--           ├── {stored-filename}
--           └── ...

COMMIT;
