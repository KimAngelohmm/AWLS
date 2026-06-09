/**
 * Links every user with role='employee' to an Employee record.
 *
 * Run from the backend folder:
 *   node scripts/seed-employee-profiles.js
 *
 * What it does:
 *   1. Finds (or creates) a default JobPosition to satisfy the NOT NULL FK.
 *   2. For every user with role='employee' that has no Employee row yet,
 *      inserts an Employee record with employment_status='active'.
 *
 * Safe to re-run — skips users that already have an Employee record.
 */

require('dotenv').config();
const crypto = require('crypto');
const mysql  = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host:               process.env.DB_HOST     || '127.0.0.1',
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD ?? '',
    database:           process.env.DB_NAME     || 'awlms',
    multipleStatements: false,
  });

  console.log('Connected to MySQL.\n');

  // ── 1. Ensure a default JobPosition exists ──────────────────────────────
  let defaultJobPositionId;
  const [existingJobs] = await conn.query(
    `SELECT id FROM JobPosition LIMIT 1`
  );

  if (existingJobs.length) {
    defaultJobPositionId = existingJobs[0].id;
    console.log(`Using existing JobPosition: ${defaultJobPositionId}`);
  } else {
    // Need a department first
    let departmentId;
    const [existingDept] = await conn.query(
      `SELECT id FROM departments LIMIT 1`
    );
    if (existingDept.length) {
      departmentId = existingDept[0].id;
    } else {
      departmentId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO departments (id, name) VALUES (?, ?)`,
        [departmentId, 'General Operations']
      );
      console.log(`Created department: General Operations (${departmentId})`);
    }

    defaultJobPositionId = crypto.randomUUID();
    await conn.query(
      `INSERT INTO JobPosition (id, title, status, department_id)
       VALUES (?, ?, 'open', ?)`,
      [defaultJobPositionId, 'General Employee', departmentId]
    );
    console.log(`Created default JobPosition: General Employee (${defaultJobPositionId})`);
  }

  // ── 2. Find all employee-role users without an Employee record ───────────
  const [unlinkedUsers] = await conn.query(
    `SELECT u.id, u.full_name, u.email, u.department_id
     FROM users u
     LEFT JOIN Employee e ON e.user_id = u.id
     WHERE u.role = 'employee'
       AND e.id IS NULL`
  );

  if (!unlinkedUsers.length) {
    console.log('\nAll employee-role users already have an Employee record. Nothing to do.');
    await conn.end();
    return;
  }

  console.log(`\nFound ${unlinkedUsers.length} unlinked employee user(s):\n`);

  for (const u of unlinkedUsers) {
    const employeeId = crypto.randomUUID();
    const employeeNumber = `EMP-${u.id.slice(0, 8).toUpperCase()}`;

    await conn.query(
      `INSERT INTO Employee
         (id, user_id, job_position_id, department_id, employee_number, employment_status, hire_date)
       VALUES
         (?, ?, ?, ?, ?, 'active', CURDATE())`,
      [
        employeeId,
        u.id,
        defaultJobPositionId,
        u.department_id || null,
        employeeNumber,
      ]
    );

    console.log(`✓  Linked — ${u.full_name} (${u.email})`);
    console.log(`   user_id     : ${u.id}`);
    console.log(`   employee_id : ${employeeId}`);
    console.log(`   emp_number  : ${employeeNumber}`);
    console.log('');
  }

  await conn.end();
  console.log('─'.repeat(52));
  console.log('Done. Employee users can now load their dashboard.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
