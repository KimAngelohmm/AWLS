-- User inbox for HR and Manager roles (upgrade path)
USE awlms;

CREATE TABLE IF NOT EXISTS `UserNotification` (
  `id`          CHAR(36)     NOT NULL,
  `user_id`     CHAR(36)     NOT NULL,
  `category`    ENUM(
    'hr_assessment_pending',
    'hr_performance_issue',
    'hr_lifecycle',
    'mgr_team_performance',
    'mgr_recommendation_status'
  ) NOT NULL,
  `title`       VARCHAR(255) NOT NULL,
  `body`        TEXT         NOT NULL,
  `entity_type` VARCHAR(64)  NULL,
  `entity_id`   CHAR(36)     NULL,
  `read_at`     DATETIME(3)  NULL,
  `metadata`    JSON         NULL,
  `created_at`  DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (`id`),
  KEY `idx_user_notif_user_read` (`user_id`, `read_at`),
  KEY `idx_user_notif_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_user_notif_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
