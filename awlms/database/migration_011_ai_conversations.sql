-- ---------------------------------------------------------------------------
-- Migration 011 — AI Conversations table + conversation_id on ai_chat_logs
--
-- Adds persistent conversation threading to the AI chat feature.
-- Deleting a conversation from the UI now also deletes all its messages
-- from the database via ON DELETE CASCADE.
--
-- Safe to run on any database created from schema.sql (migrations 001–010).
-- ---------------------------------------------------------------------------

USE awlms;

-- 1. Create the conversations table (groups messages into named threads)
CREATE TABLE IF NOT EXISTS `ai_conversations` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `title`      VARCHAR(200) NOT NULL DEFAULT 'New conversation',
  `created_at` DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
  `updated_at` DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_ai_conv_user_updated` (`user_id`, `updated_at`),
  CONSTRAINT `fk_ai_conv_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Named AI chat conversation threads per user';

-- 2. Add conversation_id column to ai_chat_logs (if it doesn't exist yet)
ALTER TABLE `ai_chat_logs`
  ADD COLUMN IF NOT EXISTS `conversation_id` CHAR(36) NULL
    COMMENT 'Groups messages into a named conversation thread'
    AFTER `user_id`;

-- 3. Migrate any existing orphan messages into a single "Imported" conversation per user
--    so no data is lost. Rows with no conversation_id get one created for them.
INSERT INTO `ai_conversations` (`id`, `user_id`, `title`, `created_at`, `updated_at`)
SELECT
  UUID()                          AS id,
  user_id,
  'Imported conversation'         AS title,
  MIN(created_at)                 AS created_at,
  MAX(created_at)                 AS updated_at
FROM `ai_chat_logs`
WHERE `conversation_id` IS NULL
GROUP BY `user_id`;

-- Point the orphan rows at their new conversation
UPDATE `ai_chat_logs` acl
INNER JOIN `ai_conversations` ac
  ON ac.user_id = acl.user_id
  AND ac.title  = 'Imported conversation'
SET acl.conversation_id = ac.id
WHERE acl.conversation_id IS NULL;

-- 4. Now that all rows have a conversation_id, make the column NOT NULL
--    and add the FK + index.
ALTER TABLE `ai_chat_logs`
  MODIFY COLUMN `conversation_id` CHAR(36) NOT NULL
    COMMENT 'Groups messages into a named conversation thread';

-- Index + FK (MariaDB does not support IF NOT EXISTS on constraints; run apply-ai-chat-schema.js if unsure)
ALTER TABLE `ai_chat_logs`
  ADD INDEX `idx_ai_chat_conv_created` (`conversation_id`, `created_at`);

ALTER TABLE `ai_chat_logs`
  ADD CONSTRAINT `fk_ai_chat_conv`
    FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
