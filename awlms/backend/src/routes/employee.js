const express = require('express');
const crypto = require('crypto');
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticateToken, requireRole('employee'));

async function getEmployeeForUser(pool, userId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.user_id, e.job_position_id, e.department_id, e.employee_number, e.profile,
            e.hire_date, e.employment_status, e.created_at,
            jp.title AS job_title,
            d.name AS department_name
     FROM Employee e
     LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.user_id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

// GET /directory — list HR personnel and Manager accounts visible to employees
router.get('/directory', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [users] = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.first_name,
         u.last_name,
         u.email,
         u.role,
         u.created_at,
         d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.role IN ('hr', 'manager')
         AND u.is_active = 1
       ORDER BY u.role ASC, u.full_name ASC`
    );
    return res.json({ users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load directory' });
  }
});

router.get('/dashboard', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const employee = await getEmployeeForUser(pool, req.user.id);
    if (!employee) {
      return res.json({
        employee: null,
        message:
          'Your login is not yet linked to an employee profile. Ask HR to connect your account before using this workspace.',
        performanceRecords: [],
        notifications: [],
        unreadNotificationCount: 0,
        resignationMessages: [],
        pendingResignation: null,
      });
    }

    const [performanceRecords] = await pool.query(
      `SELECT id, recorded_at, metrics, source, notes
       FROM PerformanceRecord
       WHERE employee_id = ?
       ORDER BY recorded_at DESC
       LIMIT 12`,
      [employee.id]
    );

    const [notifications] = await pool.query(
      `SELECT id, title, body, category, read_at, created_at
       FROM HRNotification
       WHERE employee_id = ?
       ORDER BY created_at DESC
       LIMIT 15`,
      [employee.id]
    );

    const [[{ unread }]] = await pool.query(
      `SELECT COUNT(*) AS unread FROM HRNotification WHERE employee_id = ? AND read_at IS NULL`,
      [employee.id]
    );

    const [resignationMessages] = await pool.query(
      `SELECT id, speaker, content, created_at
       FROM ResignationChatMessage
       WHERE employee_id = ?
       ORDER BY created_at ASC
       LIMIT 80`,
      [employee.id]
    );

    const [pendingRows] = await pool.query(
      `SELECT id, event_type, resignation_submitted_at, last_working_date, exit_acknowledged_at, created_at
       FROM LifecycleEvent
       WHERE employee_id = ?
         AND event_type = 'resignation'
         AND exit_acknowledged_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [employee.id]
    );

    return res.json({
      employee: {
        id: employee.id,
        job_title: employee.job_title,
        department_name: employee.department_name,
        employee_number: employee.employee_number,
        hire_date: employee.hire_date,
        employment_status: employee.employment_status,
      },
      performanceRecords,
      notifications,
      unreadNotificationCount: Number(unread) || 0,
      resignationMessages,
      pendingResignation: pendingRows[0] || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load employee dashboard' });
  }
});

router.get('/performance-records', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  const limit = Math.min(Number(req.query.limit) || 40, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  try {
    const employee = await getEmployeeForUser(pool, req.user.id);
    if (!employee) {
      return res.json({ records: [], employee: null });
    }

    const [records] = await pool.query(
      `SELECT id, recorded_at, metrics, source, notes
       FROM PerformanceRecord
       WHERE employee_id = ?
       ORDER BY recorded_at DESC
       LIMIT ? OFFSET ?`,
      [employee.id, limit, offset]
    );

    return res.json({ records, employee: { id: employee.id } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load performance history' });
  }
});

router.get('/notifications', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const employee = await getEmployeeForUser(pool, req.user.id);
    if (!employee) {
      return res.json({ notifications: [], employee: null });
    }

    const [notifications] = await pool.query(
      `SELECT id, title, body, category, read_at, created_at
       FROM HRNotification
       WHERE employee_id = ?
       ORDER BY created_at DESC`,
      [employee.id]
    );

    return res.json({ notifications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load notifications' });
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const employee = await getEmployeeForUser(pool, req.user.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const [result] = await pool.query(
      `UPDATE HRNotification
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3))
       WHERE id = ? AND employee_id = ?`,
      [req.params.id, employee.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not update notification' });
  }
});

router.get('/resignation/messages', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const employee = await getEmployeeForUser(pool, req.user.id);
    if (!employee) {
      return res.json({ messages: [], employee: null });
    }

    const [messages] = await pool.query(
      `SELECT id, speaker, content, created_at
       FROM ResignationChatMessage
       WHERE employee_id = ?
       ORDER BY created_at ASC`,
      [employee.id]
    );

    return res.json({ messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load chat' });
  }
});

router.post('/resignation/messages', async (req, res) => {
  const content = String(req.body?.content || '').trim();
  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const employee = await getEmployeeForUser(pool, req.user.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const userMsgId = crypto.randomUUID();
    const asstMsgId = crypto.randomUUID();
    const reply = 'Lifecycle management has been removed. Please contact HR directly.';

    await pool.query(
      `INSERT INTO ResignationChatMessage (id, employee_id, speaker, content) VALUES (?, ?, 'user', ?)`,
      [userMsgId, employee.id, content]
    );
    await pool.query(
      `INSERT INTO ResignationChatMessage (id, employee_id, speaker, content) VALUES (?, ?, 'assistant', ?)`,
      [asstMsgId, employee.id, reply]
    );

    return res.json({
      messages: [
        { id: userMsgId, speaker: 'user', content, created_at: new Date().toISOString() },
        { id: asstMsgId, speaker: 'assistant', content: reply, created_at: new Date().toISOString() },
      ],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not send message' });
  }
});

router.post('/resignation/submit', async (req, res) => {
  const lastWorkingDate = String(req.body?.lastWorkingDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastWorkingDate)) {
    return res.status(400).json({ error: 'lastWorkingDate must be YYYY-MM-DD' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const employee = await getEmployeeForUser(pool, req.user.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const [existing] = await pool.query(
      `SELECT id FROM LifecycleEvent
       WHERE employee_id = ?
         AND event_type = 'resignation'
         AND exit_acknowledged_at IS NULL
       LIMIT 1`,
      [employee.id]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'A resignation request is already pending HR processing.' });
    }

    const eventId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO LifecycleEvent (id, employee_id, event_type, resignation_submitted_at, last_working_date, details)
       VALUES (?, ?, 'resignation', CURRENT_TIMESTAMP(3), ?, JSON_OBJECT('channel', 'employee_portal', 'source', 'ai_chat'))`,
      [eventId, employee.id, lastWorkingDate]
    );

    const ackId = crypto.randomUUID();
    const ack =
      'Your resignation request has been **submitted to HR** with the last working day you provided. ' +
      'You will receive formal updates through HR notifications. Thank you for the notice.';

    await pool.query(
      `INSERT INTO ResignationChatMessage (id, employee_id, speaker, content) VALUES (?, ?, 'assistant', ?)`,
      [ackId, employee.id, ack]
    );

    return res.json({
      ok: true,
      lifecycleEventId: eventId,
      assistantMessage: { id: ackId, speaker: 'assistant', content: ack },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not submit resignation' });
  }
});

module.exports = router;
