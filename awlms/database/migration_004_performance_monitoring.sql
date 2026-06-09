-- Performance monitoring: JobPosition thresholds + PerformanceStaffAlert
USE awlms;

ALTER TABLE `JobPosition`
  ADD COLUMN `performance_thresholds` JSON NOT NULL DEFAULT (JSON_OBJECT())
  AFTER `interview_criteria`;

CREATE TABLE IF NOT EXISTS `PerformanceStaffAlert` (
  `id`                      CHAR(36)     NOT NULL,
  `employee_id`             CHAR(36)     NOT NULL,
  `performance_record_id`   CHAR(36)     NULL,
  `severity`                ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  `title`                   VARCHAR(255) NOT NULL,
  `body`                    TEXT         NULL,
  `audience`                ENUM('hr', 'manager', 'both') NOT NULL DEFAULT 'both',
  `acknowledged_at`         DATETIME(3)  NULL,
  `acknowledged_by_user_id` CHAR(36)     NULL,
  `created_at`              DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (`id`),
  KEY `idx_perf_alert_employee` (`employee_id`),
  KEY `idx_perf_alert_open` (`acknowledged_at`, `created_at`),
  CONSTRAINT `fk_perf_alert_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `Employee` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_perf_alert_record`
    FOREIGN KEY (`performance_record_id`) REFERENCES `PerformanceRecord` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_perf_alert_ack_user`
    FOREIGN KEY (`acknowledged_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
