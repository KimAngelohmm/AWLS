-- ============================================================
-- AWLMS — AI-Powered Recruitment & Interview Management System
-- Authoritative MySQL Schema (MySQL 8.0+ / XAMPP)
-- Database: awlms
-- Charset:  utf8mb4 / utf8mb4_unicode_ci
--
-- FEATURES:
--   JobPosition (open) → Applicant applies → AI Interview
--   → HR reviews AI assessment → approved → Employee created
--   HR Dashboard: Recruitment module, Applicant interviews, Hiring decisions
-- ============================================================

CREATE DATABASE IF NOT EXISTS awlms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE awlms;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `ai_chat_logs`;
DROP TABLE IF EXISTS `ai_conversations`;
DROP TABLE IF EXISTS `Employee`;
DROP TABLE IF EXISTS `Applicant`;
DROP TABLE IF EXISTS `JobPosition`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `departments`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. DEPARTMENTS
-- ============================================================
CREATE TABLE `departments` (
  `id`         CHAR(36)     NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_departments_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Organisational departments; referenced by users, Employee, JobPosition';

-- ============================================================
-- 2. USERS  (HR personnel, Managers, Employees)
-- ============================================================
CREATE TABLE `users` (
  `id`                            CHAR(36)     NOT NULL,
  `email`                         VARCHAR(255) NOT NULL,
  `password_hash`                 VARCHAR(255) NOT NULL
    COMMENT 'bcrypt hash — never store plain text',
  `full_name`                     VARCHAR(255) NOT NULL
    COMMENT 'Display name; kept in sync with first_name + last_name by the app',
  `first_name`                    VARCHAR(128) NULL,
  `last_name`                     VARCHAR(128) NULL,
  `role`                          ENUM('hr','manager','employee') NOT NULL DEFAULT 'employee',
  `department_id`                 CHAR(36)     NULL,
  `is_active`                     TINYINT(1)   NOT NULL DEFAULT 1
    COMMENT '0 = soft-disabled account',
  `is_verified`                   TINYINT(1)   NOT NULL DEFAULT 0
    COMMENT '1 after email confirmation',
  `verification_token`            VARCHAR(255) NULL,
  `verification_token_expires_at` DATETIME     NULL,
  `reset_token`                   VARCHAR(255) NULL,
  `reset_token_expires_at`        DATETIME     NULL,
  `last_login_at`                 DATETIME     NULL,
  `login_attempts`                SMALLINT     NOT NULL DEFAULT 0,
  `locked_until`                  DATETIME     NULL,
  `created_at`                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email`                  (`email`),
  KEY        `idx_users_role`                  (`role`),
  KEY        `idx_users_department`            (`department_id`),
  KEY        `idx_users_is_active`             (`is_active`),
  KEY        `idx_users_verification_token`    (`verification_token`),
  KEY        `idx_users_reset_token`           (`reset_token`),
  KEY        `idx_users_locked_until`          (`locked_until`),
  CONSTRAINT `fk_users_department`
    FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform accounts: HR, Manager, Employee';

-- ============================================================
-- 3. JOB POSITIONS
--    HR creates open roles. AI interview rubric and competency
--    requirements live here. Roles may be reposted automatically as needed.
-- ============================================================
CREATE TABLE `JobPosition` (
  `id`                       CHAR(36)     NOT NULL,
  `title`                    VARCHAR(255) NOT NULL,
  `description`              TEXT         NULL,
  `department_id`            CHAR(36)     NULL,
  `employment_type`          ENUM('full_time','part_time','contract') NULL
    COMMENT 'Full-time, part-time, or contract',
  `location`                 ENUM('on_site','remote','hybrid') NULL
    COMMENT 'On-site, remote, or hybrid work arrangement',
  `number_of_openings`       INT UNSIGNED NOT NULL DEFAULT 1
    COMMENT 'Headcount slots for this posting; minimum 1',
  `created_by_user_id`       CHAR(36)     NULL,
  -- AI interview rubric: skills, experience, behavioural criteria
  `competency_requirements`  JSON         NOT NULL DEFAULT (JSON_OBJECT())
    COMMENT 'Skills, experience levels, behavioural criteria used by the AI interviewer',
  -- Scoring rubric passed to the AI interviewer at runtime
  `interview_criteria`       JSON         NOT NULL DEFAULT (JSON_OBJECT())
    COMMENT 'Scoring rubric and question themes for the AI interview',
  `status`                   ENUM('draft','open','filled','closed') NOT NULL DEFAULT 'draft',
  `filled_at`                DATETIME     NULL,
  `created_at`               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jobposition_status`     (`status`),
  KEY `idx_jobposition_department` (`department_id`),
  KEY `idx_jobposition_created_by` (`created_by_user_id`),
  CONSTRAINT `fk_jobposition_department`
    FOREIGN KEY (`department_id`)       REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_jobposition_created_by`
    FOREIGN KEY (`created_by_user_id`)  REFERENCES `users`       (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Open roles; drives AI interview rubric and reposting as needed';

-- ============================================================
-- 4. APPLICANTS
--    Created when someone submits an application via the public
--    portal. The AI interview is conducted entirely here:
--    interview_messages holds the live chat, interview_transcript
--    is the plain-text log, assessment_summary + ai_recommendation
--    are written when the AI concludes the interview.
--    HR then sets hiring_decision = approved | rejected.
-- ============================================================
CREATE TABLE `Applicant` (
  `id`                  CHAR(36)     NOT NULL,
  `job_position_id`     CHAR(36)     NOT NULL,
  `full_name`           VARCHAR(255) NOT NULL,
  `email`               VARCHAR(255) NOT NULL,
  `phone`               VARCHAR(64)  NULL,
  `application_details` JSON         NULL
    COMMENT 'Cover letter, resume URL, custom fields submitted at apply time',
  `about_yourself`      TEXT         NULL
    COMMENT 'Short self-introduction from public apply form',
  `document_access_token` VARCHAR(96)  NULL
    COMMENT 'Unique token for applicant document management and secure post-apply access',
  -- AI interview state
  `interview_token`     VARCHAR(96)  NULL
    COMMENT 'Unique token sent to applicant — authenticates the public interview session',
  `interview_status`    ENUM('pending_start','in_progress','completed','failed')
                          NOT NULL DEFAULT 'pending_start',
  `interview_messages`  JSON         NULL
    COMMENT 'Live chat array [{role, content, ts}] used by the AI interviewer',
  `interview_transcript` LONGTEXT    NULL
    COMMENT 'Plain-text running transcript for HR reading',
  -- AI output (written when interview_status = completed)
  `assessment_summary`  TEXT         NULL
    COMMENT 'Multi-paragraph AI assessment written for HR review',
  `ai_recommendation`   ENUM('hire','no_hire') NULL
    COMMENT 'AI hiring recommendation; HR makes the final call',
  -- HR decision
  `hiring_decision`     ENUM('pending','pending_review','interview_invited','under_review','approved','rejected','withdrawn')
                          NOT NULL DEFAULT 'pending_review',
  `reviewed_by_user_id` CHAR(36)     NULL,
  `decided_at`          DATETIME     NULL,
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_applicant_position_email`    (`job_position_id`, `email`),
  UNIQUE KEY `uk_applicant_document_access_token` (`document_access_token`),
  UNIQUE KEY `uk_applicant_interview_token`   (`interview_token`),
  KEY        `idx_applicant_hiring_decision`  (`hiring_decision`),
  KEY        `idx_applicant_interview_status` (`interview_status`),
  KEY        `idx_applicant_reviewed_by`      (`reviewed_by_user_id`),
  CONSTRAINT `fk_applicant_job_position`
    FOREIGN KEY (`job_position_id`)     REFERENCES `JobPosition` (`id`) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT `fk_applicant_reviewed_by`
    FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`       (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per application; holds full AI interview state and HR decision';

-- ============================================================
-- 6. APPLICANT DOCUMENTS
--    Uploaded applicant file metadata stored separately from binary files
-- ============================================================
CREATE TABLE `ApplicantDocuments` (
  `id`                 CHAR(36)      NOT NULL COMMENT 'Unique document ID (UUID)',
  `applicant_id`       CHAR(36)      NOT NULL COMMENT 'FK to Applicant; deleted when applicant is deleted',
  `document_type`      VARCHAR(50)   NOT NULL COMMENT 'Type: resume, government_id, photo, tor, diploma, nbi_clearance, certificate, portfolio, cover_letter, other',
  `original_filename`  VARCHAR(255)  NOT NULL COMMENT 'Original filename uploaded by applicant',
  `stored_filename`    VARCHAR(255)  NOT NULL COMMENT 'Filename on disk (sanitized, UUID-based)',
  `mime_type`          VARCHAR(100)  NOT NULL COMMENT 'MIME type: application/pdf, image/png, etc.',
  `file_size`          BIGINT UNSIGNED NOT NULL COMMENT 'File size in bytes',
  `upload_timestamp`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the file was uploaded',
  `verification_status` ENUM('uploaded','verified','rejected') NOT NULL DEFAULT 'uploaded' COMMENT 'Current verification status of the document',
  `verified_by_user_id` CHAR(36)      NULL COMMENT 'HR user who verified or rejected the document',
  `verified_at`        DATETIME      NULL COMMENT 'When the document was verified or rejected',
  `verification_comments` TEXT        NULL COMMENT 'Optional notes from HR verification',
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
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_documents_verified_by`
    FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Applicant uploaded documents: resumes, IDs, photos, certificates, etc.';

-- ============================================================
-- 7. EMPLOYEES
--    Created by HR after Applicant.hiring_decision = approved.
--    Linked to a users row (login account) and the Applicant
--    row it originated from. Represents hired employee data for the
--    recruitment pipeline.
-- ============================================================
CREATE TABLE `Employee` (
  `id`                CHAR(36)    NOT NULL,
  `user_id`           CHAR(36)    NULL
    COMMENT 'Login account; NULL until HR creates the account',
  `job_position_id`   CHAR(36)    NOT NULL
    COMMENT 'Current role; updated on promotion',
  `applicant_id`      CHAR(36)    NULL
    COMMENT 'Source application; NULL for manually-created employees',
  `department_id`     CHAR(36)    NULL,
  `employee_number`   VARCHAR(64) NULL,
  `profile`           JSON        NULL
    COMMENT 'Arbitrary HR-managed profile fields (display_name, photo_url, etc.)',
  `hire_date`         DATE        NULL,
  `employment_status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_user`      (`user_id`),
  UNIQUE KEY `uk_employee_number`    (`employee_number`),
  UNIQUE KEY `uk_employee_applicant` (`applicant_id`),
  KEY        `idx_employee_job`      (`job_position_id`),
  KEY        `idx_employee_dept`     (`department_id`),
  KEY        `idx_employee_status`   (`employment_status`),
  CONSTRAINT `fk_employee_user`
    FOREIGN KEY (`user_id`)         REFERENCES `users`       (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_job`
    FOREIGN KEY (`job_position_id`) REFERENCES `JobPosition` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_applicant`
    FOREIGN KEY (`applicant_id`)    REFERENCES `Applicant`   (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employee_dept`
    FOREIGN KEY (`department_id`)   REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Hired employees; one row per created employee record';

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Departments
INSERT INTO `departments` (`id`, `name`) VALUES
  ('dept-eng-0001-0000-000000000001', 'Engineering'),
  ('dept-ana-0001-0000-000000000002', 'Analytics'),
  ('dept-prd-0001-0000-000000000003', 'Product'),
  ('dept-hr--0001-0000-000000000004', 'Human Resources'),
  ('dept-fin-0001-0000-000000000005', 'Finance');

-- Users  (passwords are placeholder hashes — replace with real bcrypt hashes)
INSERT INTO `users`
  (`id`, `email`, `password_hash`, `full_name`, `first_name`, `last_name`,
   `role`, `department_id`, `is_active`, `is_verified`)
VALUES
  ('user-hr01-0000-0000-000000000001',
   'ana.reyes@company.com',   '$2b$12$placeholder_hash_hr01',
   'Reyes, Ana',        'Ana',     'Reyes',
   'hr',       'dept-hr--0001-0000-000000000004', 1, 1),

  ('user-mgr1-0000-0000-000000000002',
   'jose.dela.cruz@company.com', '$2b$12$placeholder_hash_mgr1',
   'Dela Cruz, Jose',   'Jose',    'Dela Cruz',
   'manager',  'dept-eng-0001-0000-000000000001', 1, 1),

  ('user-emp1-0000-0000-000000000003',
   'francis.santos@company.com', '$2b$12$placeholder_hash_emp1',
   'Santos, Francis',   'Francis', 'Santos',
   'employee', 'dept-eng-0001-0000-000000000001', 1, 1),

  ('user-emp2-0000-0000-000000000004',
   'anya.mansilla@company.com',  '$2b$12$placeholder_hash_emp2',
   'Mansilla, Anya',    'Anya',    'Mansilla',
   'employee', 'dept-ana-0001-0000-000000000002', 1, 1),

  ('user-emp3-0000-0000-000000000005',
   'kim.badic@company.com',      '$2b$12$placeholder_hash_emp3',
   'Badic, Kim',        'Kim',    'Badic',
   'employee', 'dept-ana-0001-0000-000000000002', 1, 1),

  ('user-emp4-0000-0000-000000000006',
   'lena.garcia@company.com',    '$2b$12$placeholder_hash_emp4',
   'Garcia, Lena',      'Lena',   'Garcia',
   'employee', 'dept-prd-0001-0000-000000000003', 1, 1);

-- Job Positions
INSERT INTO `JobPosition`
  (`id`, `title`, `description`, `department_id`, `created_by_user_id`,
   `competency_requirements`, `interview_criteria`, `status`)
VALUES
  ('job-sdev-0001-0000-000000000001',
   'Senior Developer', 'Lead backend and frontend development initiatives.',
   'dept-eng-0001-0000-000000000001', 'user-hr01-0000-0000-000000000001',
   '{"skills":["Node.js","React","MySQL"],"experience_years":3}',
   '{"themes":["technical depth","system design","teamwork"],"min_turns":5}',
   'open'),

  ('job-dana-0001-0000-000000000002',
   'Data Analyst', 'Analyse business and product data to support decisions.',
   'dept-ana-0001-0000-000000000002', 'user-hr01-0000-0000-000000000001',
   '{"skills":["SQL","Python","Tableau"],"experience_years":2}',
   '{"themes":["analytical thinking","data storytelling","attention to detail"],"min_turns":5}',
   'open'),

  ('job-uxds-0001-0000-000000000003',
   'UX Designer', 'Design user-centred interfaces for AWLMS products.',
   'dept-prd-0001-0000-000000000003', 'user-hr01-0000-0000-000000000001',
   '{"skills":["Figma","user research","prototyping"],"experience_years":2}',
   '{"themes":["design process","empathy","portfolio review"],"min_turns":5}',
   'open');

-- Employees  (linked to the users above)
INSERT INTO `Employee`
  (`id`, `user_id`, `job_position_id`, `department_id`,
   `employee_number`, `hire_date`, `employment_status`)
VALUES
  ('emp-0001-0000-0000-000000000001',
   'user-emp1-0000-0000-000000000003',
   'job-sdev-0001-0000-000000000001',
   'dept-eng-0001-0000-000000000001',
   'EMP-0001', '2023-03-15', 'active'),

  ('emp-0002-0000-0000-000000000002',
   'user-emp2-0000-0000-000000000004',
   'job-dana-0001-0000-000000000002',
   'dept-ana-0001-0000-000000000002',
   'EMP-0002', '2022-07-01', 'active'),

  ('emp-0003-0000-0000-000000000003',
   'user-emp3-0000-0000-000000000005',
   'job-dana-0001-0000-000000000002',
   'dept-ana-0001-0000-000000000002',
   'EMP-0003', '2023-01-10', 'active'),

  ('emp-0004-0000-0000-000000000004',
   'user-emp4-0000-0000-000000000006',
   'job-uxds-0001-0000-000000000003',
   'dept-prd-0001-0000-000000000003',
   'EMP-0004', '2023-06-20', 'active');

-- Sample legacy demo data removed.
-- The schema now focuses on recruitment, applicant interviews, and hiring decisions.
