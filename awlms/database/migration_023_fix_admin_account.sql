-- ============================================================
-- Migration 023: Fix Admin Account
-- ============================================================
-- Ensures the admin account exists with correct role and password
-- Run this if admin login is failing
-- ============================================================

USE awlms;

-- Step 1: Ensure the role ENUM includes 'admin'
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('hr','manager','employee','admin') NOT NULL DEFAULT 'employee';

-- Step 2: Check if admin account exists
-- If not, create it
INSERT IGNORE INTO `users` (
  `id`,
  `email`,
  `password_hash`,
  `full_name`,
  `role`,
  `department_id`,
  `is_active`,
  `is_verified`,
  `login_attempts`,
  `locked_until`
) VALUES (
  UUID(),
  'admin@awlms.com',
  -- bcrypt hash of 'Admin123!' with 10 salt rounds
  '$2a$10$3o6YnzOD9JEopecYrCHTmujOOR/jL4laciabsCSRuhD5Mj08823y6',
  'System Administrator',
  'admin',
  NULL,
  1,
  1,
  0,
  NULL
);

-- Step 3: Ensure password hash is correct for existing admin
UPDATE `users` 
SET `password_hash` = '$2a$10$3o6YnzOD9JEopecYrCHTmujOOR/jL4laciabsCSRuhD5Mj08823y6',
    `role` = 'admin',
    `is_active` = 1,
    `is_verified` = 1
WHERE `email` = 'admin@awlms.com';

-- Step 4: Verify
SELECT id, email, full_name, role, is_active, is_verified 
FROM users 
WHERE email = 'admin@awlms.com';
