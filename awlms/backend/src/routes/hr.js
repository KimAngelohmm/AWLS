const express = require('express');
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticateToken, requireRole('hr'));

router.get('/dashboard', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [activeJobPostings] = await pool.query(
      `SELECT jp.id, jp.title, jp.status, jp.department_id, jp.created_at, jp.updated_at,
              d.name AS department_name
       FROM JobPosition jp
       LEFT JOIN departments d ON d.id = jp.department_id
       WHERE jp.status = 'open'
       ORDER BY jp.updated_at DESC
       LIMIT 50`
    );

    const [pendingAssessments] = await pool.query(
      `SELECT a.id, a.full_name, a.email, a.phone, a.hiring_decision, a.assessment_summary,
              a.created_at, a.updated_at,
              jp.id AS job_position_id, jp.title AS job_title
       FROM Applicant a
       INNER JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.assessment_summary IS NOT NULL
         AND TRIM(a.assessment_summary) <> ''
         AND a.hiring_decision IN ('pending', 'under_review')
         AND a.reviewed_by_user_id IS NULL
       ORDER BY a.updated_at DESC
       LIMIT 50`
    );

    const [[{ totalApplicants }]] = await pool.query(
      `SELECT COUNT(*) AS totalApplicants FROM Applicant`
    );

    return res.json({
      activeJobPostings,
      pendingAssessments,
      counts: {
        activeJobPostings: activeJobPostings.length,
        pendingAssessments: pendingAssessments.length,
        totalApplicants: Number(totalApplicants),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load HR dashboard' });
  }
});

router.get('/employees', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [employees] = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.role,
         u.full_name,
         u.is_active,
         u.created_at,
         e.id              AS employee_id,
         e.employee_number,
         e.employment_status,
         jp.title          AS job_title,
         d.name            AS department_name
       FROM users u
       LEFT JOIN Employee e    ON e.user_id = u.id
       LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
       LEFT JOIN departments d  ON d.id = COALESCE(e.department_id, u.department_id)
       ORDER BY u.created_at DESC`
    );
    return res.json({ employees });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load employees' });
  }
});

router.get('/messages', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    console.log('[/hr/messages] User ID:', req.user?.id);
    
    // Get UserNotification messages for HR
    const [messages] = await pool.query(
      `SELECT 
         un.id,
         un.title,
         un.body,
         un.category AS type,
         un.created_at,
         un.read_at,
         un.metadata,
         un.entity_type,
         un.entity_id
       FROM UserNotification un
       WHERE un.user_id = ?
       ORDER BY un.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    console.log('[/hr/messages] Found', messages.length, 'messages');

    // Enrich messages with applicant context where applicable
    const enrichedMessages = await Promise.all(messages.map(async (msg) => {
      return {
        id: msg.id,
        title: msg.title,
        body: msg.body,
        type: msg.type,
        created_at: msg.created_at,
        read_at: msg.read_at,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : {}
      };
    }));

    return res.json({ messages: enrichedMessages });
  } catch (err) {
    console.error('[/hr/messages] Error:', err.message);
    console.error('[/hr/messages] Full error:', err);
    return res.status(500).json({ error: 'Could not load messages' });
  }
});

module.exports = router;

