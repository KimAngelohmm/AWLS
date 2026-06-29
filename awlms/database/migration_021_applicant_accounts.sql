-- ============================================================
-- Migration 021: Create Applicant Accounts Table
-- ============================================================
-- Adds a separate table for applicant authentication with
-- email verification support
-- ============================================================

USE awlms;

-- Create applicant_accounts table for authentication
CREATE TABLE IF NOT EXISTS `applicant_accounts` (
  `id`                            CHAR(36)     NOT NULL,
  `email`                         VARCHAR(255) NOT NULL,
  `password_hash`                 VARCHAR(255) NOT NULL,
  `full_name`                     VARCHAR(255) NOT NULL,
  `is_verified`                   TINYINT(1)  NOT NULL DEFAULT 0,
  `verification_code`             VARCHAR(6)   NULL,
  `verification_code_expires_at`  DATETIME     NULL,
  `verification_attempts`         SMALLINT     NOT NULL DEFAULT 0,
  `locked_until`                  DATETIME     NULL,
  `created_at`                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_applicant_email` (`email`),
  KEY `idx_applicant_verified`    (`is_verified`),
  KEY `idx_applicant_code_expires` (`verification_code_expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Applicant authentication accounts with email verification';
