-- ---------------------------------------------------------------------------
-- Migration 010 — Add missing tables: interview_sessions, interview_messages,
--                 interview_assessments, ai_chat_logs
--
-- These four tables have no equivalent in the existing schema.
-- All other tables from the reference schema (users, departments, job_postings,
-- applicants, employee_performance, performance_alerts,
-- notifications) are already covered by existing tables and migrations.
--
-- Safe to run on any database created from schema.sql (migrations 001–009).
-- Uses CREATE TABLE IF NOT EXISTS so re-running is harmless.
-- ---------------------------------------------------------------------------

USE awlms;

-- ============================================================
-- interview_sessions
-- Tracks a single AI interview session
-- tied to an Applicant and a JobPosition.
-- ============================================================

CREATE TABLE IF NOT EXISTS `interview_sessions` (
  `id`               CHAR(36)     NOT NULL,
  `applicant_id`     CHAR(36)     NOT NULL,
  `job_position_id`  CHAR(36)     NOT NULL,
  `status`           ENUM('pending', 'live', 'completed', 'abandoned') NOT NULL DEFAULT 'pending',
  `current_question` SMALLINT     NOT NULL DEFAULT 1,
  `total_questions`  SMALLINT     NOT NULL DEFAULT 10,
  `score`            SMALLINT     NULL,
  `started_at`       DATETIME(3)  NULL,
  `completed_at`     DATETIME(3)  NULL,
  `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_isession_applicant`    (`applicant_id`),
  KEY `idx_isession_job_position` (`job_position_id`),
  KEY `idx_isession_status`       (`status`),
  CONSTRAINT `fk_isession_applicant`
    FOREIGN KEY (`applicant_id`)    REFERENCES `Applicant`    (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `fk_isession_job_position`
    FOREIGN KEY (`job_position_id`) REFERENCES `JobPosition`  (`id`) ON DELETE CASCADE  ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Tracks each AI interview session for an applicant';

-- ============================================================
-- interview_messages
-- Chat transcript — one row per message exchanged during a
-- session (AI questions and applicant answers).
-- ============================================================

CREATE TABLE IF NOT EXISTS `interview_messages` (
  `id`              CHAR(36)     NOT NULL,
  `session_id`      CHAR(36)     NOT NULL,
  `role`            ENUM('ai', 'applicant') NOT NULL,
  `message`         TEXT         NOT NULL,
  `question_number` SMALLINT     NULL,
  `created_at`      DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (`id`),
  KEY `idx_imsg_session_created` (`session_id`, `created_at`),
  CONSTRAINT `fk_imsg_session`
    FOREIGN KEY (`session_id`) REFERENCES `interview_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-message chat transcript for an interview session';

-- ============================================================
-- interview_assessments
-- AI-generated assessment produced after all questions are
-- answered; one row per completed session.
-- ============================================================

CREATE TABLE IF NOT EXISTS `interview_assessments` (
  `id`              CHAR(36)     NOT NULL,
  `session_id`      CHAR(36)     NOT NULL,
  `applicant_id`    CHAR(36)     NOT NULL,
  `job_position_id` CHAR(36)     NOT NULL,
  `summary`         TEXT         NULL,
  `strengths`       TEXT         NULL,
  `weaknesses`      TEXT         NULL,
  `score`           SMALLINT     NOT NULL DEFAULT 0,
  `recommendation`  ENUM('hire', 'consider', 'reject') NOT NULL DEFAULT 'consider',
  `reviewed_by`     CHAR(36)     NULL
    COMMENT 'HR user who reviewed this assessment',
  `hr_notes`        TEXT         NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_iassess_session`       (`session_id`),
  KEY        `idx_iassess_applicant`    (`applicant_id`),
  KEY        `idx_iassess_job_position` (`job_position_id`),
  KEY        `idx_iassess_reviewed_by`  (`reviewed_by`),
  CONSTRAINT `fk_iassess_session`
    FOREIGN KEY (`session_id`)      REFERENCES `interview_sessions` (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `fk_iassess_applicant`
    FOREIGN KEY (`applicant_id`)    REFERENCES `Applicant`           (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `fk_iassess_job_position`
    FOREIGN KEY (`job_position_id`) REFERENCES `JobPosition`         (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `fk_iassess_reviewed_by`
    FOREIGN KEY (`reviewed_by`)     REFERENCES `users`               (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='AI-generated assessment produced at interview completion';

-- ============================================================
-- ai_chat_logs
-- Stores the AI assistant conversation history per user
-- (HR / Manager dashboard chat widget).
-- ============================================================

CREATE TABLE IF NOT EXISTS `ai_chat_logs` (
  `id`         CHAR(36)                  NOT NULL,
  `user_id`    CHAR(36)                  NOT NULL,
  `role`       ENUM('user', 'ai')        NOT NULL,
  `message`    TEXT                      NOT NULL,
  `created_at` DATETIME(3)               NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (`id`),
  KEY `idx_ai_chat_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_ai_chat_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='AI assistant chat history per user (dashboard chat widget)';
