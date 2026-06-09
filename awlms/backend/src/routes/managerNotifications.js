const express = require('express');
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
router.use(authenticateToken, requireRole('manager'));

router.get('/notifications', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 30, 1), 80);

  try {
    const [userNotifications] = await pool.query(
      `SELECT id, category, title, body, entity_type, entity_id, read_at, created_at, metadata
       FROM UserNotification
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [req.user.id, limit]
    );

    const [[{ unreadInbox }]] = await pool.query(
      `SELECT COUNT(*) AS unreadInbox FROM UserNotification WHERE user_id = ? AND read_at IS NULL`,
      [req.user.id]
    );

    return res.json({
      userNotifications,
      unreadUserNotificationCount: Number(unreadInbox) || 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load notifications' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE UserNotification
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3))
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
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

module.exports = router;
