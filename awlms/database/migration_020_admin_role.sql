-- ============================================================
-- Migration 020: Add Administrator role support
-- ============================================================
-- Adds 'admin' as a valid role in the users table
-- and creates the default Administrator account
-- ============================================================

USE awlms;

-- Update the role ENUM to include 'admin'
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('hr','manager','employee','admin') NOT NULL DEFAULT 'employee'
  COMMENT 'Platform accounts: HR, Manager, Employee, Administrator';

-- Create the default Administrator account if it doesn't exist
-- Email: admin@awlms.com
-- Username: admin
-- Password: Admin123! (bcrypt hashed)
INSERT IGNORE INTO `users` (
  `id`,
  `email`,
  `password_hash`,
  `full_name`,
  `role`,
  `department_id`,
  `is_active`,
  `is_verified`
) VALUES (
  UUID(),
  'admin@awlms.com',
  -- bcrypt hash of 'Admin123!' with salt rounds = 10
  '$2a$10$zcDSLsJXm0xZCV6qA4jROOYPcFntTKL/48UfVC9a1cRlIttPXoH4G',
  'System Administrator',
  'admin',
  NULL,
  1,
  1
);