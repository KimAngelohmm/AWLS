/**
 * One-time cleanup: remove "Unassigned role" job and move employees to General Employee.
 * Usage: node scripts/remove-unassigned-role.js
 */
require('dotenv').config();
const crypto = require('crypto');
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'awlms',
  });

  const [unassigned] = await conn.query(
    `SELECT id FROM JobPosition WHERE title = 'Unassigned role'`
  );
  if (!unassigned.length) {
    console.log('No "Unassigned role" job found — nothing to do.');
    await conn.end();
    return;
  }

  const unassignedId = unassigned[0].id;
  let [general] = await conn.query(
    `SELECT id FROM JobPosition WHERE title = 'General Employee' LIMIT 1`
  );

  if (!general.length) {
    const generalId = crypto.randomUUID();
    const [[hr]] = await conn.query(`SELECT id FROM users WHERE role = 'hr' LIMIT 1`);
    await conn.query(
      `INSERT INTO JobPosition (
         id, title, competency_requirements, interview_criteria, status,
         number_of_openings, created_by_user_id
       ) VALUES (?, 'General Employee', '{}', '{}', 'closed', 1, ?)`,
      [generalId, hr?.id || null]
    );
    general = [{ id: generalId }];
    console.log('Created closed "General Employee" job for employee reassignment.');
  }

  const [moved] = await conn.query(
    `UPDATE Employee SET job_position_id = ? WHERE job_position_id = ?`,
    [general[0].id, unassignedId]
  );
  await conn.query(`DELETE FROM JobPosition WHERE id = ?`, [unassignedId]);

  console.log(
    `Removed "Unassigned role". ${moved.affectedRows} employee(s) now on General Employee (closed, hidden from careers).`
  );
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
