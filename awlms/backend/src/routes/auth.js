const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { authenticateToken, getJwtSecret } = require('../middleware/auth');

const router = express.Router();

// Max failed attempts before temporary lockout
const MAX_LOGIN_ATTEMPTS = 5;
// Lockout duration in minutes
const LOCKOUT_MINUTES = 15;

function signToken(user, rememberMe) {
  const secret = getJwtSecret();
  const shortTtl = process.env.JWT_EXPIRES_IN || '8h';
  const longTtl = process.env.JWT_REMEMBER_EXPIRES_IN || '30d';
  const expiresIn = rememberMe ? longTtl : shortTtl;
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn }
  );
}

const VALID_ROLES = new Set(['hr', 'manager', 'employee', 'admin']);

// Note: 'applicant' role uses separate authentication via applicantAuth.js routes

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const rememberMe = Boolean(req.body?.rememberMe);
  const selectedRole = String(req.body?.selectedRole || '').trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!selectedRole || !VALID_ROLES.has(selectedRole)) {
    return res.status(400).json({ error: 'A valid role must be selected to sign in.' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, password_hash, full_name, role, department_id,
              is_active, is_verified,
              login_attempts, locked_until
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    // Use a generic message to avoid leaking whether the email exists
    const invalidMsg = 'Invalid email or password';

    if (!rows.length) {
      return res.status(401).json({ error: invalidMsg });
    }

    const user = rows[0];

    // ── Account deactivated ──────────────────────────────────────────────────
    if (!user.is_active) {
      return res.status(403).json({
        error: 'This account has been deactivated. Contact your HR administrator.',
      });
    }

    // ── Brute-force lockout ──────────────────────────────────────────────────
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil(
        (new Date(user.locked_until) - Date.now()) / 60000
      );
      return res.status(429).json({
        error: `Account temporarily locked. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`,
      });
    }

    // ── Password check ───────────────────────────────────────────────────────
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      const newAttempts = (user.login_attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await pool.query(
        `UPDATE users
         SET login_attempts = ?,
             locked_until   = ?
         WHERE id = ?`,
        [newAttempts, lockedUntil, user.id]
      );

      if (shouldLock) {
        return res.status(429).json({
          error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }

      return res.status(401).json({ error: invalidMsg });
    }

    // ── Success — reset lockout counters, record login time ─────────────────
    // ── Role tab validation ──────────────────────────────────────────────────
    if (user.role !== selectedRole) {
      return res.status(401).json({
        error: 'Invalid credentials for the selected role. Please select the correct role and try again.',
      });
    }

    await pool.query(
      `UPDATE users
       SET login_attempts = 0,
           locked_until   = NULL,
           last_login_at  = NOW()
       WHERE id = ?`,
      [user.id]
    );

    const token = signToken(user, rememberMe);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department_id: user.department_id,
        is_verified: Boolean(user.is_verified),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Always return the same response — never reveal whether the account exists
  return res.json({
    message:
      'If an account exists for that email, password reset instructions will be sent. Contact HR or your system administrator if you need immediate access.',
  });
});

// ── PATCH /api/auth/profile — update display name, phone, birthdate ──────────
router.patch('/profile', authenticateToken, async (req, res) => {
  const fullName = req.body?.full_name ? String(req.body.full_name).trim() : undefined;
  const phone    = req.body?.phone     !== undefined ? String(req.body.phone || '').trim()    : undefined;
  const birthdate = req.body?.birthdate !== undefined ? String(req.body.birthdate || '').trim() : undefined;

  if (fullName !== undefined && !fullName) {
    return res.status(400).json({ error: 'Display name cannot be empty' });
  }

  // Validate birthdate format if provided
  if (birthdate !== undefined && birthdate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    return res.status(400).json({ error: 'Birthdate must be in YYYY-MM-DD format' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const setClauses = [];
    const params = [];

    if (fullName !== undefined) {
      setClauses.push('full_name = ?');
      params.push(fullName);
    }
    if (phone !== undefined) {
      setClauses.push('phone = ?');
      params.push(phone || null);
    }
    if (birthdate !== undefined) {
      setClauses.push('birthdate = ?');
      params.push(birthdate || null);
    }

    if (!setClauses.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.user.id);
    await pool.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );

    const [rows] = await pool.query(
      `SELECT id, email, full_name, phone, birthdate, role, department_id,
              is_active, is_verified, last_login_at, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    return res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not update profile' });
  }
});

// ── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', authenticateToken, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword     = String(req.body?.newPassword     || '');

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Account not found' });
    }

    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, req.user.id]);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not change password' });
  }
});

// ── GET /api/auth/profile-details — extended profile with employee record ─────
router.get('/profile-details', authenticateToken, async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [userRows] = await pool.query(
      `SELECT id, email, full_name, phone, birthdate, role, department_id,
              is_active, is_verified, last_login_at, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    if (!userRows.length) {
      return res.status(401).json({ error: 'Account not found' });
    }
    const user = userRows[0];

    // Fetch linked Employee record (hire date and role assignment)
    const [empRows] = await pool.query(
      `SELECT e.id AS employee_id, e.employee_number, e.hire_date, e.employment_status,
              jp.title AS job_title,
              d.name AS department_name
       FROM Employee e
       LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
       LEFT JOIN departments d ON d.id = COALESCE(e.department_id, ?)
       WHERE e.user_id = ?
       LIMIT 1`,
      [user.department_id, req.user.id]
    );

    const emp = empRows[0] ?? null;

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone ?? '',
        birthdate: user.birthdate ?? '',
        role: user.role,
        department_id: user.department_id,
        is_verified: Boolean(user.is_verified),
        last_login_at: user.last_login_at,
        created_at: user.created_at,
      },
      employee: emp ? {
        employee_id: emp.employee_id,
        employee_number: emp.employee_number,
        hire_date: emp.hire_date,
        employment_status: emp.employment_status,
        job_title: emp.job_title,
        department_name: emp.department_name,
      } : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load profile details' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, full_name, role, department_id,
              is_active, is_verified, last_login_at, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department_id: user.department_id,
        is_verified: Boolean(user.is_verified),
        last_login_at: user.last_login_at,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load profile' });
  }
});

module.exports = router;
