const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getPool } = require('../config/db');

const router = express.Router();

router.use(authenticateToken);

router.get(
  '/hr',
  requireRole('hr'),
  (req, res) => {
    res.json({
      role: 'hr',
      title: 'HR Personnel workspace',
      modules: [
        { id: 'recruitment', name: 'Recruitment & AI screening', description: 'Open positions, applicant insights, hiring decisions' },
        { id: 'employees', name: 'Employees', description: 'Applicant and staff directory with contact details' },
        { id: 'history', name: 'History', description: 'Recruitment activity and interview records' },
      ],
    });
  }
);

router.get(
  '/manager',
  requireRole('manager'),
  (req, res) => {
    res.json({
      role: 'manager',
      title: 'Department Manager workspace',
      modules: [
        { id: 'employees', name: 'Team directory', description: 'View your department staff and applicant progress' },
        { id: 'ai-chat', name: 'AI assistant', description: 'Ask questions about recruitment and interview outcomes' },
        { id: 'settings', name: 'Settings', description: 'Configure your account and notifications' },
      ],
    });
  }
);

router.get(
  '/employee',
  requireRole('employee'),
  (req, res) => {
    res.json({
      role: 'employee',
      title: 'Employee workspace',
      modules: [
        { id: 'notifications', name: 'HR notifications', description: 'Formal notices from HR' },
        { id: 'directory', name: 'Personnel directory', description: 'Search employees and applicants' },
        { id: 'settings', name: 'Settings', description: 'Manage profile and account preferences' },
        { id: 'ai-chat', name: 'AI assistant', description: 'Ask about applications, interviews, and hiring' },
      ],
    });
  }
);

// GET /notifications — list UserNotification records for the authenticated user
router.get('/notifications', async (req, res) => {
  let pool;
  try { pool = getPool(); } catch { return res.status(503).json({ error: 'Database is not available' }); }
  try {
    const [notifications] = await pool.query(
      `SELECT id, title, body, category, read_at, created_at
       FROM UserNotification
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    return res.json({ notifications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load notifications' });
  }
});

// GET /notifications/unread-count — count of unread notifications for the authenticated user
router.get('/notifications/unread-count', async (req, res) => {
  let pool;
  try { pool = getPool(); } catch { return res.status(503).json({ error: 'Database is not available' }); }
  try {
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) AS count FROM UserNotification WHERE user_id = ? AND read_at IS NULL`,
      [req.user.id]
    );
    return res.json({ count: Number(count) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load count' });
  }
});

// POST /notifications/:id/read — mark a notification as read
router.post('/notifications/:id/read', async (req, res) => {
  let pool;
  try { pool = getPool(); } catch { return res.status(503).json({ error: 'Database is not available' }); }
  try {
    const [result] = await pool.query(
      `UPDATE UserNotification SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3)) WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not update notification' });
  }
});

module.exports = router;
