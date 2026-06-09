-- ---------------------------------------------------------------------------
-- Migration 008 — Split name fields on users table
-- Adds first_name and last_name columns alongside the existing full_name.
-- full_name is kept for backward compatibility with existing queries.
-- A generated column keeps full_name in sync automatically when first/last
-- are provided; existing rows keep their current full_name value.
-- ---------------------------------------------------------------------------

USE awlms;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `first_name` VARCHAR(128) NULL
    COMMENT 'Given name'
    AFTER `full_name`,

  ADD COLUMN IF NOT EXISTS `last_name`  VARCHAR(128) NULL
    COMMENT 'Family / surname'
    AFTER `first_name`;

-- Back-fill first_name / last_name from existing full_name rows
-- (splits on the first space; good enough for demo accounts)
UPDATE `users`
SET
  `first_name` = TRIM(SUBSTRING_INDEX(`full_name`, ' ', 1)),
  `last_name`  = TRIM(SUBSTRING(`full_name`, LOCATE(' ', `full_name`) + 1))
WHERE `first_name` IS NULL
  AND `full_name` IS NOT NULL
  AND LOCATE(' ', `full_name`) > 0;
