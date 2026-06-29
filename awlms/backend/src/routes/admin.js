const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

// All admin routes require admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// In-memory audit log (in production, use database)
const auditLogs = [];

// GET /api/admin/dashboard - System overview statistics
router.get('/dashboard', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [[totalUsers], [adminCount], [hrCount], [managerCount], [employeeCount], [positionCount], [applicantCount], [departmentCount]] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'hr'"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'manager'"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'employee'"),
      pool.query('SELECT COUNT(*) as count FROM JobPosition'),
      pool.query("SELECT COUNT(*) as count FROM Applicant WHERE hiring_decision NOT IN ('rejected', 'withdrawn')"),
      pool.query('SELECT COUNT(*) as count FROM departments'),
    ]);

    return res.json({
      totalUsers: totalUsers[0].count,
      adminCount: adminCount[0].count,
      hrCount: hrCount[0].count,
      managerCount: managerCount[0].count,
      employeeCount: employeeCount[0].count,
      positionCount: positionCount[0].count,
      applicantCount: applicantCount[0].count,
      departmentCount: departmentCount[0].count,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/admin/hr-accounts - List all HR accounts
router.get('/hr-accounts', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, full_name, is_active, is_verified, last_login_at, created_at
       FROM users WHERE role = 'hr' ORDER BY created_at DESC`
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load HR accounts' });
  }
});

// POST /api/admin/hr-accounts - Create new HR account
router.post('/hr-accounts', async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password, and full_name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
    if (existing.length) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, 'hr', 1, 1)`,
      [id, email.toLowerCase(), hash, full_name]
    );

    return res.status(201).json({ id, email: email.toLowerCase(), full_name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create HR account' });
  }
});

// PATCH /api/admin/hr-accounts/:id - Update HR account
router.patch('/hr-accounts/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active, full_name } = req.body;

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const setClauses = [];
    const params = [];

    if (typeof is_active === 'boolean') {
      setClauses.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (full_name) {
      setClauses.push('full_name = ?');
      params.push(full_name);
    }

    if (!setClauses.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ? AND role = 'hr'`, params);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update HR account' });
  }
});

// DELETE /api/admin/hr-accounts/:id - Delete HR account
router.delete('/hr-accounts/:id', async (req, res) => {
  const { id } = req.params;

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ? AND role = ?', [id, 'hr']);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'HR account not found' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete HR account' });
  }
});

// GET /api/admin/employees - List all employees
router.get('/employees', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.is_active, u.last_login_at, u.created_at,
              e.employee_number, e.employment_status, e.hire_date,
              d.name as department_name, jp.title as job_title
       FROM users u
       LEFT JOIN Employee e ON e.user_id = u.id
       LEFT JOIN departments d ON d.id = COALESCE(e.department_id, u.department_id)
       LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
       WHERE u.role = 'employee'
       ORDER BY u.created_at DESC`
    );
    return res.json({ employees: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load employees' });
  }
});

// GET /api/admin/departments - List all departments
router.get('/departments', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    return res.json({ departments: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load departments' });
  }
});

// POST /api/admin/departments - Create department
router.post('/departments', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const id = crypto.randomUUID();
    await pool.query('INSERT INTO departments (id, name) VALUES (?, ?)', [id, name]);
    return res.status(201).json({ id, name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create department' });
  }
});

// GET /api/admin/positions - List all job positions
router.get('/positions', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT jp.*, d.name as department_name,
              (SELECT COUNT(*) FROM Applicant WHERE job_position_id = jp.id) as applicant_count
       FROM JobPosition jp
       LEFT JOIN departments d ON d.id = jp.department_id
       ORDER BY jp.created_at DESC`
    );
    return res.json({ positions: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load positions' });
  }
});

// GET /api/admin/applicants - List all applicants
router.get('/applicants', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT a.*, jp.title as job_title, d.name as department_name
       FROM Applicant a
       LEFT JOIN JobPosition jp ON jp.id = a.job_position_id
       LEFT JOIN departments d ON d.id = jp.department_id
       ORDER BY a.created_at DESC`
    );
    return res.json({ applicants: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load applicants' });
  }
});

// GET /api/admin/audit-logs - System audit logs (placeholder)
router.get('/audit-logs', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.full_name, u.email, u.role, u.last_login_at, u.created_at
       FROM users u
       ORDER BY u.updated_at DESC
       LIMIT 100`
    );
    return res.json({ logs: rows, note: 'Full audit logging to be implemented' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

// GET /api/admin/all-users - List all users (admin view)
router.get('/all-users', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, full_name, role, is_active, is_verified, 
              login_attempts, locked_until, last_login_at, created_at
       FROM users
       ORDER BY role, created_at DESC`
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load users' });
  }
});

// POST /api/admin/users - Create new user (any role)
router.post('/users', async (req, res) => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'email, password, full_name, and role are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!['admin', 'hr', 'manager', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
    if (existing.length) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    await pool.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_active, is_verified, login_attempts)
       VALUES (?, ?, ?, ?, ?, 1, 1, 0)`,
      [id, email.toLowerCase(), hash, full_name, role]
    );

    // Log audit
    auditLogs.unshift({
      id: crypto.randomUUID(),
      action: 'user_created',
      email: email.toLowerCase(),
      role: req.user.role,
      user_email: req.user.email,
      details: `Created ${role} user: ${email}`,
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({ id, email: email.toLowerCase(), full_name, role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { is_active, full_name, role, password } = req.body;

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    // Prevent admin from modifying themselves
    if (id === req.user.id && (is_active === false || role)) {
      return res.status(400).json({ error: 'Cannot modify your own account status or role' });
    }

    // Check if trying to remove last admin
    if (role && role !== 'admin') {
      const [admins] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1");
      const [user] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
      if (user.length && user[0].role === 'admin' && admins[0].count <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last administrator' });
      }
    }

    const setClauses = [];
    const params = [];

    if (typeof is_active === 'boolean') {
      setClauses.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (full_name) {
      setClauses.push('full_name = ?');
      params.push(full_name);
    }
    if (role && ['admin', 'hr', 'manager', 'employee'].includes(role)) {
      setClauses.push('role = ?');
      params.push(role);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      setClauses.push('password_hash = ?');
      params.push(hash);
    }

    if (!setClauses.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await pool.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, params);

    // Log audit
    auditLogs.unshift({
      id: crypto.randomUUID(),
      action: 'user_updated',
      user_email: req.user.email,
      details: `Updated user ID: ${id}`,
      created_at: new Date().toISOString(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Get user info before deletion
    const [user] = await pool.query('SELECT role, email FROM users WHERE id = ?', [id]);
    if (!user.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of last admin
    if (user[0].role === 'admin') {
      const [admins] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1");
      if (admins[0].count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last administrator' });
      }
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    // Log audit
    auditLogs.unshift({
      id: crypto.randomUUID(),
      action: 'user_deleted',
      user_email: req.user.email,
      details: `Deleted user: ${user[0].email} (${user[0].role})`,
      created_at: new Date().toISOString(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/admin/users/:id/unlock - Unlock a locked account
router.post('/users/:id/unlock', async (req, res) => {
  const { id } = req.params;

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    await pool.query(
      'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
      [id]
    );

    // Log audit
    auditLogs.unshift({
      id: crypto.randomUUID(),
      action: 'user_unlocked',
      user_email: req.user.email,
      details: `Unlocked user ID: ${id}`,
      created_at: new Date().toISOString(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to unlock user' });
  }
});

// GET /api/admin/audit-logs - Get audit logs
router.get('/audit-logs', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  
  // Combine stored logs with actual user login data
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    // Get recent user logins from users table
    const [recentLogins] = await pool.query(
      `SELECT 'login' as action, email, full_name as name, role, last_login_at as created_at, 'User login' as details
       FROM users 
       WHERE last_login_at IS NOT NULL
       ORDER BY last_login_at DESC 
       LIMIT ?`,
      [limit]
    );

    // Combine with in-memory audit logs
    const allLogs = [...auditLogs, ...recentLogins.map(l => ({
      ...l,
      details: l.details || 'User activity',
    }))];

    // Sort by date descending
    allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ logs: allLogs.slice(0, limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

// GET /api/admin/settings - Get system settings
router.get('/settings', async (req, res) => {
  // Return default settings (in production, load from database/config)
  return res.json({
    settings: {
      maxLoginAttempts: 5,
      lockoutMinutes: 15,
      sessionTimeout: 480,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumber: true,
      passwordRequireSpecial: true,
      maintenanceMode: false,
    }
  });
});

// PUT /api/admin/settings - Update system settings
router.put('/settings', async (req, res) => {
  // In production, validate and save to database
  const { settings } = req.body;
  
  if (!settings) {
    return res.status(400).json({ error: 'Settings object required' });
  }

  // Log audit
  auditLogs.unshift({
    id: crypto.randomUUID(),
    action: 'settings_updated',
    user_email: req.user.email,
    details: 'System settings updated',
    created_at: new Date().toISOString(),
  });

  return res.json({ ok: true, settings });
});

// POST /api/admin/settings/test-email - Test email configuration
router.post('/settings/test-email', async (req, res) => {
  // In production, actually send a test email
  return res.json({ ok: true, message: 'Test email would be sent to: ' + req.user.email });
});

module.exports = router;