-- ---------------------------------------------------------------------------
-- Migration 013 — Job position listing details
-- employment_type, location, number_of_openings
-- ---------------------------------------------------------------------------

USE awlms;

ALTER TABLE `JobPosition`
  ADD COLUMN IF NOT EXISTS `employment_type` ENUM('full_time','part_time','contract') NULL
    COMMENT 'Full-time, part-time, or contract'
    AFTER `department_id`,

  ADD COLUMN IF NOT EXISTS `location` ENUM('on_site','remote','hybrid') NULL
    COMMENT 'On-site, remote, or hybrid work arrangement'
    AFTER `employment_type`,

  ADD COLUMN IF NOT EXISTS `number_of_openings` INT UNSIGNED NOT NULL DEFAULT 1
    COMMENT 'Headcount slots for this posting; minimum 1'
    AFTER `location`;
