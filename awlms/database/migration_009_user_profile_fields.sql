-- ---------------------------------------------------------------------------
-- Migration 009 — Extended user profile fields
-- Adds phone number and birthdate to the users table so all roles
-- (HR, Manager, Employee) can maintain personal profile information.
-- ---------------------------------------------------------------------------

USE awlms;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `phone`     VARCHAR(32)  NULL
    COMMENT 'Contact phone number'
    AFTER `last_name`,

  ADD COLUMN IF NOT EXISTS `birthdate` DATE         NULL
    COMMENT 'Date of birth — used to derive age'
    AFTER `phone`;
