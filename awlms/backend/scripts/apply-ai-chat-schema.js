/**
 * MariaDB-compatible setup for AI chat (conversations + threaded logs).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function constraintExists(conn, table, name) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?
     LIMIT 1`,
    [table, name]
  );
  return rows.length > 0;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'awlms',
    multipleStatements: true,
  });

  try {
    if (!(await tableExists(conn, 'ai_chat_logs'))) {
      await conn.query(`
        CREATE TABLE \`ai_chat_logs\` (
          \`id\`         CHAR(36)                  NOT NULL,
          \`user_id\`    CHAR(36)                  NOT NULL,
          \`role\`       ENUM('user', 'ai')        NOT NULL,
          \`message\`    TEXT                      NOT NULL,
          \`created_at\` DATETIME(3)               NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
          PRIMARY KEY (\`id\`),
          KEY \`idx_ai_chat_user_created\` (\`user_id\`, \`created_at\`),
          CONSTRAINT \`fk_ai_chat_user\`
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Created ai_chat_logs');
    }

    if (!(await tableExists(conn, 'ai_conversations'))) {
      await conn.query(`
        CREATE TABLE \`ai_conversations\` (
          \`id\`         CHAR(36)     NOT NULL,
          \`user_id\`    CHAR(36)     NOT NULL,
          \`title\`      VARCHAR(200) NOT NULL DEFAULT 'New conversation',
          \`created_at\` DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
          \`updated_at\` DATETIME(3)  NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          KEY \`idx_ai_conv_user_updated\` (\`user_id\`, \`updated_at\`),
          CONSTRAINT \`fk_ai_conv_user\`
            FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('Created ai_conversations');
    }

    if (!(await columnExists(conn, 'ai_chat_logs', 'conversation_id'))) {
      await conn.query(`
        ALTER TABLE \`ai_chat_logs\`
          ADD COLUMN \`conversation_id\` CHAR(36) NULL
            COMMENT 'Groups messages into a named conversation thread'
            AFTER \`user_id\`
      `);
      console.log('Added conversation_id column');
    }

    const [orphans] = await conn.query(
      `SELECT COUNT(*) AS n FROM ai_chat_logs WHERE conversation_id IS NULL`
    );
    if (orphans[0].n > 0) {
      await conn.query(`
        INSERT INTO ai_conversations (id, user_id, title, created_at, updated_at)
        SELECT UUID(), user_id, 'Imported conversation', MIN(created_at), MAX(created_at)
        FROM ai_chat_logs
        WHERE conversation_id IS NULL
        GROUP BY user_id
      `);
      await conn.query(`
        UPDATE ai_chat_logs acl
        INNER JOIN ai_conversations ac
          ON ac.user_id = acl.user_id AND ac.title = 'Imported conversation'
        SET acl.conversation_id = ac.id
        WHERE acl.conversation_id IS NULL
      `);
      console.log('Migrated orphan chat logs');
    }

    const [col] = await conn.query(
      `SELECT IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_chat_logs' AND COLUMN_NAME = 'conversation_id'`
    );
    if (col[0]?.IS_NULLABLE === 'YES') {
      await conn.query(`
        ALTER TABLE ai_chat_logs
          MODIFY COLUMN conversation_id CHAR(36) NOT NULL
      `);
      console.log('Set conversation_id NOT NULL');
    }

    const [idx] = await conn.query(
      `SELECT 1 FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_chat_logs' AND INDEX_NAME = 'idx_ai_chat_conv_created'
       LIMIT 1`
    );
    if (!idx.length) {
      await conn.query(
        `ALTER TABLE ai_chat_logs ADD INDEX idx_ai_chat_conv_created (conversation_id, created_at)`
      );
      console.log('Added idx_ai_chat_conv_created');
    }

    if (!(await constraintExists(conn, 'ai_chat_logs', 'fk_ai_chat_conv'))) {
      await conn.query(`
        ALTER TABLE ai_chat_logs
          ADD CONSTRAINT fk_ai_chat_conv
            FOREIGN KEY (conversation_id) REFERENCES ai_conversations (id)
            ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('Added fk_ai_chat_conv');
    }

    console.log('AI chat schema is ready.');
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
