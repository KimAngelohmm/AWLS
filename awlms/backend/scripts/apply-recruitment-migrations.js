/**
 * Applies recruitment-related migrations (012, 013) when columns are missing.
 * Safe to re-run.
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

async function apply012(conn) {
  if (await columnExists(conn, 'Applicant', 'about_yourself')) {
    console.log('migration_012 already applied');
    return;
  }
  console.log('Applying migration_012 …');
  await conn.query(
    `ALTER TABLE Applicant
     ADD COLUMN about_yourself TEXT NULL
     COMMENT 'Short self-introduction from public apply form'
     AFTER application_details`
  );
  await conn.query(
    `ALTER TABLE Applicant
     MODIFY COLUMN hiring_decision ENUM(
       'pending',
       'pending_review',
       'interview_invited',
       'under_review',
       'approved',
       'rejected',
       'withdrawn'
     ) NOT NULL DEFAULT 'pending_review'`
  );
  console.log('  migration_012 done');
}

async function apply013(conn) {
  if (await columnExists(conn, 'JobPosition', 'employment_type')) {
    console.log('migration_013 already applied');
    return;
  }
  console.log('Applying migration_013 …');
  await conn.query(
    `ALTER TABLE JobPosition
     ADD COLUMN employment_type ENUM('full_time','part_time','contract') NULL
     AFTER department_id`
  );
  await conn.query(
    `ALTER TABLE JobPosition
     ADD COLUMN location ENUM('on_site','remote','hybrid') NULL
     AFTER employment_type`
  );
  await conn.query(
    `ALTER TABLE JobPosition
     ADD COLUMN number_of_openings INT UNSIGNED NOT NULL DEFAULT 1
     AFTER location`
  );
  console.log('  migration_013 done');
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'awlms',
  });

  try {
    await apply012(conn);
    await apply013(conn);
    const [jobs] = await conn.query(`SELECT COUNT(*) AS cnt FROM JobPosition`);
    console.log(`JobPosition rows: ${jobs[0].cnt}`);
    console.log('Recruitment migrations OK.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
