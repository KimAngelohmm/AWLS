-- ---------------------------------------------------------------------------
-- Migration 007 — User account security fields
-- Adds email verification, password reset, brute-force lockout, and
-- account status columns to the existing `users` table.
--
-- Safe to run on any database created from schema.sql (migrations 001–006).
-- Each statement uses ADD COLUMN IF NOT EXISTS so re-running is harmless.
-- ---------------------------------------------------------------------------

USE awlms;

-- ── Account status ───────────────────────────────────────────────────────────

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `is_active`     TINYINT(1)   NOT NULL DEFAULT 1
    COMMENT 'Soft-disable an account without deleting it'
    AFTER `role`,

  ADD COLUMN IF NOT EXISTS `is_verified`   TINYINT(1)   NOT NULL DEFAULT 0
    COMMENT 'Set to 1 after the user confirms their email address'
    AFTER `is_active`;

-- ── Email verification ───────────────────────────────────────────────────────

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `verification_token`            VARCHAR(255) NULL
    COMMENT 'One-time token sent to the user email for address verification'
    AFTER `is_verified`,

  ADD COLUMN IF NOT EXISTS `verification_token_expires_at` DATETIME     NULL
    COMMENT 'Token becomes invalid after this timestamp'
    AFTER `verification_token`;

-- ── Password reset ───────────────────────────────────────────────────────────

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `reset_token`            VARCHAR(255) NULL
    COMMENT 'One-time token for the forgot-password flow'
    AFTER `verification_token_expires_at`,

  ADD COLUMN IF NOT EXISTS `reset_token_expires_at` DATETIME     NULL
    COMMENT 'Reset token becomes invalid after this timestamp'
    AFTER `reset_token`;

-- ── Login tracking & brute-force protection ──────────────────────────────────

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `last_login_at`   DATETIME     NULL
    COMMENT 'Timestamp of the most recent successful login'
    AFTER `reset_token_expires_at`,

  ADD COLUMN IF NOT EXISTS `login_attempts`  SMALLINT     NOT NULL DEFAULT 0
    COMMENT 'Consecutive failed login attempts since last success or unlock'
    AFTER `last_login_at`,

  ADD COLUMN IF NOT EXISTS `locked_until`    DATETIME     NULL
    COMMENT 'Account is temporarily locked until this timestamp (NULL = not locked)'
    AFTER `login_attempts`;

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- Only add indexes that do not already exist.

-- Partial index on verification_token (only rows where token is set)
-- MySQL does not support partial indexes, so we index the full column.
-- The column is NULL for verified users so the index stays small.

ALTER TABLE `users`
  ADD INDEX IF NOT EXISTS `idx_users_verification_token` (`verification_token`),
  ADD INDEX IF NOT EXISTS `idx_users_reset_token`        (`reset_token`),
  ADD INDEX IF NOT EXISTS `idx_users_is_active`          (`is_active`),
  ADD INDEX IF NOT EXISTS `idx_users_locked_until`       (`locked_until`);
