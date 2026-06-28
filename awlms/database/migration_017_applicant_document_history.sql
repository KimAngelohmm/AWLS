-- ============================================================
-- Migration 017: Applicant Document History Audit
-- ============================================================
-- Adds an audit/history table for applicant document versioning and verification changes.
-- ============================================================

USE awlms;

CREATE TABLE IF NOT EXISTS `ApplicantDocumentHistory` (
  `id` CHAR(36) NOT NULL COMMENT 'Unique history record ID (UUID)',
  `document_id` CHAR(36) NOT NULL COMMENT 'FK to ApplicantDocuments.id',
  `applicant_id` CHAR(36) NOT NULL COMMENT 'FK to Applicant.id',
  `document_type` VARCHAR(50) NOT NULL COMMENT 'Document type snapshot',
  `version_number` INT NOT NULL COMMENT 'Incremental history version number',
  `original_filename` VARCHAR(255) NOT NULL COMMENT 'Original filename at the time of update',
  `stored_filename` VARCHAR(255) NOT NULL COMMENT 'Stored filename on disk',
  `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME type',
  `file_size` BIGINT UNSIGNED NOT NULL COMMENT 'File size in bytes',
  `upload_timestamp` DATETIME NOT NULL COMMENT 'Upload timestamp for this version',
  `verification_status` ENUM('uploaded','verified','rejected') NOT NULL DEFAULT 'uploaded' COMMENT 'Verification state at the time of versioning',
  `verified_by_user_id` CHAR(36) NULL COMMENT 'HR user id who verified or rejected this version',
  `verified_at` DATETIME NULL COMMENT 'Timestamp when version was verified or rejected',
  `verification_comments` TEXT NULL COMMENT 'HR verification comments for this version',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'History record creation time',
  PRIMARY KEY (`id`),
  KEY `idx_doc_history_document_id` (`document_id`),
  KEY `idx_doc_history_applicant_id` (`applicant_id`),
  KEY `idx_doc_history_version_number` (`version_number`),
  CONSTRAINT `fk_document_history_document_id`
    FOREIGN KEY (`document_id`) REFERENCES `ApplicantDocuments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_document_history_applicant_id`
    FOREIGN KEY (`applicant_id`) REFERENCES `Applicant` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit history for applicant uploaded documents';

COMMIT;
