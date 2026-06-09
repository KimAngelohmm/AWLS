/**
 * Inserts sample JobPosition, Applicant, Employee, PerformanceRecord, HRDecision, LifecycleEvent
 * for HR dashboard demos (skips if marker job already exists).
 * Run from backend: node scripts/seed-hr-dashboard-demo.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const MARKER_TITLE = 'DEMO — Customer Success Lead';

const IDS = {
  jobOpen: 'd1000000-0000-4000-8000-000000000001',
  jobOpen2: 'd1000000-0000-4000-8000-000000000002',
  applicant: 'd2000000-0000-4000-8000-000000000001',
  employee: 'd3000000-0000-4000-8000-000000000001',
  perf: 'd4000000-0000-4000-8000-000000000001',
  hrDecision: 'd5000000-0000-4000-8000-000000000001',
  lifecycle: 'd6000000-0000-4000-8000-000000000001',
};

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'awlms',
  });

  const [[{ cnt }]] = await conn.query(
    'SELECT COUNT(*) AS cnt FROM JobPosition WHERE title = ?',
    [MARKER_TITLE]
  );
  if (cnt > 0) {
    console.log('Demo HR data already present (marker job found). Skipping.');
    await conn.end();
    return;
  }

  const [[dept]] = await conn.query('SELECT id FROM departments ORDER BY created_at ASC LIMIT 1');
  if (!dept) {
    console.error('No department row. Run npm run seed first.');
    process.exit(1);
  }
  const departmentId = dept.id;

  const [hrRows] = await conn.query(
    "SELECT id FROM users WHERE email = 'hr@sunniesstudios.com' LIMIT 1"
  );
  const [mgrRows] = await conn.query(
    "SELECT id FROM users WHERE email = 'manager@sunniesstudios.com' LIMIT 1"
  );
  const [empRows] = await conn.query(
    "SELECT id FROM users WHERE email = 'employee@sunniesstudios.com' LIMIT 1"
  );
  const hrId = hrRows[0]?.id;
  const managerId = mgrRows[0]?.id;
  const employeeUserId = empRows[0]?.id;
  if (!hrId || !managerId || !employeeUserId) {
    console.error('Missing demo users. Run: npm run seed');
    process.exit(1);
  }

  await conn.beginTransaction();

  await conn.query(
    `INSERT INTO JobPosition (id, title, competency_requirements, interview_criteria, status, department_id, created_by_user_id, description)
     VALUES (?, ?, JSON_OBJECT('communication', 'Strong written English'), JSON_OBJECT('rounds', 1), 'open', ?, ?, 'Demo posting for HR dashboard.')`,
    [IDS.jobOpen, MARKER_TITLE, departmentId, hrId]
  );

  await conn.query(
    `INSERT INTO JobPosition (id, title, competency_requirements, interview_criteria, status, department_id, created_by_user_id, description)
     VALUES (?, ?, JSON_OBJECT(), JSON_OBJECT(), 'open', ?, ?, 'Second open requisition (demo).')`,
    [IDS.jobOpen2, 'DEMO — Logistics Coordinator', departmentId, hrId]
  );

  await conn.query(
    `INSERT INTO Applicant (id, job_position_id, full_name, email, phone, application_details, interview_transcript, assessment_summary, hiring_decision)
     VALUES (?, ?, 'Alex Rivera', 'alex.rivera.demo@example.com', '+639170000000', JSON_OBJECT('source', 'careers_site'),
             'AI: Structured interview transcript (demo).',
             'AI summary (demo): Strong alignment with competency rubric; recommends panel review before offer.',
             'pending')`,
    [IDS.applicant, IDS.jobOpen]
  );

  await conn.query(
    `INSERT INTO Employee (id, user_id, job_position_id, applicant_id, department_id, employee_number, profile, hire_date, employment_status)
     VALUES (?, ?, ?, NULL, ?, 'EMP-DEMO-001', JSON_OBJECT('display_name', 'Demo Employee'), CURDATE(), 'active')`,
    [IDS.employee, employeeUserId, IDS.jobOpen2, departmentId]
  );

  const metrics = JSON.stringify({
    score: 52,
    alert: true,
    severity: 'high',
    window: '24h',
    label: 'Below team baseline (demo)',
  });

  await conn.query(
    `INSERT INTO PerformanceRecord (id, employee_id, recorded_at, metrics, source, notes)
     VALUES (?, ?, NOW(3), CAST(? AS JSON), 'realtime', 'Demo alert for HR monitoring.')`,
    [IDS.perf, IDS.employee, metrics]
  );

  await conn.query(
    `INSERT INTO HRDecision (id, employee_id, decision_type, from_job_position_id, to_job_position_id, authorized_by_user_id, authorization_reference, authorized_at, notification_sent_at, status)
     VALUES (?, ?, 'promotion', ?, ?, ?, 'MGR-REC-001', NOW(3), NULL, 'authorized')`,
    [IDS.hrDecision, IDS.employee, IDS.jobOpen2, IDS.jobOpen, managerId]
  );

  await conn.query(
    `INSERT INTO LifecycleEvent (id, employee_id, event_type, resignation_submitted_at, last_working_date, exit_acknowledged_at, auto_generated_job_position_id, related_hr_decision_id, details)
     VALUES (?, ?, 'resignation', NOW(3), DATE_ADD(CURDATE(), INTERVAL 14 DAY), NULL, NULL, NULL, JSON_OBJECT('channel', 'ai_portal', 'note', 'Demo resignation pending HR acknowledgment.'))`,
    [IDS.lifecycle, IDS.employee]
  );

  await conn.commit();
  await conn.end();
  console.log('Inserted demo HR dashboard rows.');
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
