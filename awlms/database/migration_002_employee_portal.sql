-- Add Employee portal tables (run once if you already applied an older schema.sql)
-- mysql -u root -p awlms < database/migration_002_employee_portal.sql

USE awlms;

CREATE TABLE IF NOT EXISTS `HRNotification` (
  `id`           CHAR(36)     NOT NULL,
  `employee_id`  CHAR(36)     NOT NULL,
  `title`        VARCHAR(255) NOT NULL,
  `body`         TEXT         NOT NULL,
  `category`     ENUM('general', 'decision', 'policy', 'other') NOT NULL DEFAULT 'general',
  `read_at`      DATETIME(3)  NULL,
  `created_at`   DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (`id`),
  KEY `idx_hrnotif_employee` (`employee_id`),
  KEY `idx_hrnotif_read` (`employee_id`, `read_at`),
  CONSTRAINT `fk_hrnotif_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `Employee` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ResignationChatMessage` (
  `id`           CHAR(36)     NOT NULL,
  `employee_id`  CHAR(36)     NOT NULL,
  `speaker`      ENUM('user', 'assistant') NOT NULL,
  `content`      TEXT         NOT NULL,
  `created_at`   DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (`id`),
  KEY `idx_resign_chat_employee_time` (`employee_id`, `created_at`),
  CONSTRAINT `fk_resign_chat_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `Employee` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
