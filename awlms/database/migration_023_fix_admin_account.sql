-- ============================================================
-- Migration 023: Fix Admin Account
-- ============================================================
-- Comprehensive fix for admin login issues
-- - Deletes existing admin account if any
-- - Creates fresh admin account with known password
-- ============================================================

USE awlms;

-- Step 1: Ensure the role ENUM includes 'admin'
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('hr','manager','employee','admin') NOT NULL DEFAULT 'employee';

-- Step 2: Delete any existing admin account
DELETE FROM `users` WHERE `email` = 'admin@awlms.com';

-- Step 3: Insert fresh admin account with ALL required fields
-- Password: Admin123! (bcrypt hash with cost factor 10)
INSERT INTO `users` (
  `id`,
  `email`,
  `password_hash`,
  `full_name`,
  `role`,
  `department_id`,
  `is_active`,
  `is_verified`,
  `login_attempts`,
  `locked_until`,
  `verification_token`,
  `verification_token_expires_at`,
  `reset_token`,
  `reset_token_expires_at`,
  `last_login_at`
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@awlms.com',
  '$2a$10$zcDSLsJXm0xZCV6qA4jROOYPcFntTKL/48UfVC9a1cRlIttPXoH4G',
  'System Administrator',
  'admin',
  NULL,
  1,
  1,
  0,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
);

-- Step 4: Verify the account was created correctly
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  is_active, 
  is_verified,
  login_attempts,
  locked_until
FROM users 
WHERE email = 'admin@awlms.com';

-- Step 5: Also ensure applicant_accounts table exists
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
