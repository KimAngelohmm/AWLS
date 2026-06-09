/**
 * Inserts demo users (HR, Manager, Employee) if missing. Run from backend folder:
 *   node scripts/seed-demo-users.js
 * Requires MySQL and database/schema.sql applied. Default password: Demo123!
 */
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const DEMO_PASSWORD = 'Demo123!';

const users = [
  {
    email: 'hr@sunniesstudios.com',
    full_name: 'Demo HR Personnel',
    role: 'hr',
  },
  {
    email: 'manager@sunniesstudios.com',
    full_name: 'Demo Department Manager',
    role: 'manager',
  },
  {
    email: 'employee@sunniesstudios.com',
    full_name: 'Demo Employee',
    role: 'employee',
  },
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'awlms',
    multipleStatements: true,
  });

  const deptId = crypto.randomUUID();
  const [existingDept] = await conn.query(
    'SELECT id FROM departments ORDER BY created_at ASC LIMIT 1'
  );
  let departmentId = existingDept[0]?.id;
  if (!departmentId) {
    await conn.query('INSERT INTO departments (id, name) VALUES (?, ?)', [
      deptId,
      'General Operations',
    ]);
    departmentId = deptId;
    console.log('Created department', departmentId);
  }

  // Ensure a default JobPosition exists for linking employee users
  let defaultJobPositionId;
  const [existingJobs] = await conn.query(`SELECT id FROM JobPosition LIMIT 1`);
  if (existingJobs.length) {
    defaultJobPositionId = existingJobs[0].id;
  } else {
    defaultJobPositionId = crypto.randomUUID();
    await conn.query(
      `INSERT INTO JobPosition (id, title, status, department_id) VALUES (?, 'General Employee', 'open', ?)`,
      [defaultJobPositionId, departmentId]
    );
    console.log('Created default JobPosition', defaultJobPositionId);
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const u of users) {
    const [rows] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [u.email]);
    if (rows.length) {
      console.log('Skip existing user', u.email);
      continue;
    }
    const id = crypto.randomUUID();
    await conn.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, department_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, u.email, hash, u.full_name, u.role, departmentId]
    );
    console.log('Created user', u.email, `(${u.role})`);

    // Link employee-role users to an Employee record immediately
    if (u.role === 'employee') {
      const employeeId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO Employee (id, user_id, job_position_id, department_id, employee_number, employment_status, hire_date)
         VALUES (?, ?, ?, ?, ?, 'active', CURDATE())`,
        [employeeId, id, defaultJobPositionId, departmentId, `EMP-${id.slice(0, 8).toUpperCase()}`]
      );
      console.log('  → Created Employee record', employeeId);
    }
  }

  await conn.end();
  console.log('\nDone. Sign in with any demo email and password:', DEMO_PASSWORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
