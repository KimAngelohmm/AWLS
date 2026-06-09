-- Lifecycle recommendations + audit log (run if upgrading from schema without these tables)
USE awlms;

CREATE TABLE IF NOT EXISTS `LifecycleRecommendation` (
  `id`                     CHAR(36)     NOT NULL,
  `employee_id`            CHAR(36)     NOT NULL,
  `manager_user_id`      CHAR(36)     NOT NULL,
  `recommendation_type`   ENUM('promotion', 'termination') NOT NULL,
  `rationale`             TEXT         NULL,
  `to_job_position_id`    CHAR(36)     NULL,
  `status`                ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `hr_decision_id`        CHAR(36)     NULL,
  `reviewed_by_user_id`   CHAR(36)     NULL,
  `reviewed_at`           DATETIME(3)  NULL,
  `created_at`            DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  `updated_at`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lifecycle_rec_employee` (`employee_id`),
  KEY `idx_lifecycle_rec_manager` (`manager_user_id`),
  KEY `idx_lifecycle_rec_status` (`status`),
  CONSTRAINT `fk_lifecycle_rec_employee`
    FOREIGN KEY (`employee_id`) REFERENCES `Employee` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_lifecycle_rec_manager`
    FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lifecycle_rec_to_job`
    FOREIGN KEY (`to_job_position_id`) REFERENCES `JobPosition` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_lifecycle_rec_hr_decision`
    FOREIGN KEY (`hr_decision_id`) REFERENCES `HRDecision` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_lifecycle_rec_reviewed_by`
    FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `LifecycleAuditLog` (
  `id`             CHAR(36)     NOT NULL,
  `action`         VARCHAR(128) NOT NULL,
  `entity_type`    VARCHAR(64)  NOT NULL,
  `entity_id`      CHAR(36)     NOT NULL,
  `actor_user_id`  CHAR(36)     NULL,
  `metadata`       JSON         NULL,
  `created_at`     DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  PRIMARY KEY (`id`),
  KEY `idx_lifecycle_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_lifecycle_audit_created` (`created_at`),
  CONSTRAINT `fk_lifecycle_audit_actor`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
