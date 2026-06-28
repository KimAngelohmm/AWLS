/**
 * HR / Manager — employee account management
 *
 * Mounted at /api/hr/employees with requireRole('hr', 'manager')
 * GET endpoints accessible to both HR and Manager
 * PATCH, DELETE endpoints HR-only
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

// GET endpoints accessible to HR and Manager
// POST/PATCH/DELETE endpoints are HR-only

// GET /list  — employee directory (accessible to HR and Manager)
// Called as GET /api/hr/employees/list from the manager page
router.get('/list', async (req, res) => {
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
       LEFT JOIN Employee e  ON e.user_id = u.id
       LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
       LEFT JOIN departments d ON d.id = COALESCE(e.department_id, u.department_id)
       ORDER BY u.created_at DESC`
    );
    return res.json({ employees });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load employees' });
  }
});

// GET /pending — accounts waiting for HR approval/linking
// Returns:
//   unlinkedAccounts: employee-role users with no Employee record linked
//   unlinkedProfiles: Employee records with no user_id (hired but no login account)
router.get('/pending', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    // Employee-role users who have no linked Employee record
    const [unlinkedAccounts] = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.created_at,
              u.is_verified, d.name AS department_name
       FROM users u
       LEFT JOIN Employee e ON e.user_id = u.id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.role = 'employee'
         AND u.is_active = 1
         AND e.id IS NULL
       ORDER BY u.created_at DESC`
    );

    // Employee records with no login account yet
    const [unlinkedProfiles] = await pool.query(
      `SELECT e.id AS employee_id, e.employee_number, e.employment_status,
              e.hire_date, e.created_at,
              COALESCE(
                JSON_UNQUOTE(JSON_EXTRACT(e.profile, '$.display_name')),
                CONCAT('Employee ', SUBSTRING(e.id, 1, 8))
              ) AS display_name,
              jp.title AS job_title,
              d.name AS department_name
       FROM Employee e
       LEFT JOIN JobPosition jp ON jp.id = e.job_position_id
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.user_id IS NULL
         AND e.employment_status = 'active'
       ORDER BY e.created_at DESC`
    );

    return res.json({ unlinkedAccounts, unlinkedProfiles });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load pending approvals' });
  }
});

// POST /approve — link a user account to an Employee record and mark verified
// Body: { userId, employeeId? }  — employeeId is optional; if omitted a new Employee record is created
router.post('/approve', async (req, res) => {
  const userId     = String(req.body?.userId     || '').trim();
  const employeeId = String(req.body?.employeeId || '').trim();

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    // Verify user exists and is an employee role
    const [userRows] = await pool.query(
      `SELECT id, role, is_active, full_name, department_id FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!userRows.length) {
      return res.status(404).json({ error: 'User account not found' });
    }
    if (!userRows[0].is_active) {
      return res.status(400).json({ error: 'User account is deactivated' });
    }

    const user = userRows[0];

    if (employeeId) {
      // Link to an existing Employee record
      const [empRows] = await pool.query(
        `SELECT id, user_id FROM Employee WHERE id = ? LIMIT 1`,
        [employeeId]
      );
      if (!empRows.length) {
        return res.status(404).json({ error: 'Employee record not found' });
      }
      if (empRows[0].user_id) {
        return res.status(409).json({ error: 'Employee record is already linked to a user account' });
      }

      await pool.query(`UPDATE Employee SET user_id = ? WHERE id = ?`, [userId, employeeId]);
    } else {
      // No employee profile exists — create a minimal one and link it
      // Find or create a default job position
      let defaultJobPositionId;
      const [existingJobs] = await pool.query(`SELECT id FROM JobPosition LIMIT 1`);
      if (existingJobs.length) {
        defaultJobPositionId = existingJobs[0].id;
      } else {
        defaultJobPositionId = crypto.randomUUID();
        const deptId = user.department_id || null;
        await pool.query(
          `INSERT INTO JobPosition (id, title, status, department_id) VALUES (?, 'General Employee', 'open', ?)`,
          [defaultJobPositionId, deptId]
        );
      }

      const newEmployeeId = crypto.randomUUID();
      const empNumber = `EMP-${newEmployeeId.slice(0, 8).toUpperCase()}`;
      await pool.query(
        `INSERT INTO Employee (id, user_id, job_position_id, department_id, employee_number, employment_status, hire_date)
         VALUES (?, ?, ?, ?, ?, 'active', CURDATE())`,
        [newEmployeeId, userId, defaultJobPositionId, user.department_id || null, empNumber]
      );
    }

    // Mark account as verified
    await pool.query(`UPDATE users SET is_verified = 1 WHERE id = ?`, [userId]);

    return res.json({ ok: true, userId, employeeId: employeeId || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not approve account' });
  }
});

// POST /  (mounted at /api/hr/employees/create-account)
router.post('/', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    role = 'employee',
    department_id = null,
  } = req.body ?? {};

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!first_name || !String(first_name).trim()) {
    return res.status(400).json({ error: 'First name is required' });
  }
  if (!last_name || !String(last_name).trim()) {
    return res.status(400).json({ error: 'Last name is required' });
  }
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const allowedRoles = ['employee', 'manager', 'hr'];
  const roleNorm = String(role || 'employee').toLowerCase();
  if (!allowedRoles.includes(roleNorm)) {
    return res.status(400).json({ error: 'Role must be employee, manager, or hr' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    // Check for duplicate email
    const [existing] = await pool.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [emailNorm]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const firstNameTrim = String(first_name).trim();
    const lastNameTrim  = String(last_name).trim();
    const fullName      = `${lastNameTrim}, ${firstNameTrim}`;
    const userId        = crypto.randomUUID();
    const passwordHash  = await bcrypt.hash(String(password), 12);

    await pool.query(
      `INSERT INTO users
         (id, email, password_hash, full_name, first_name, last_name,
          role, department_id, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        userId,
        emailNorm,
        passwordHash,
        fullName,
        firstNameTrim,
        lastNameTrim,
        roleNorm,
        department_id || null,
      ]
    );

    return res.status(201).json({
      ok: true,
      user: {
        id: userId,
        email: emailNorm,
        full_name: fullName,
        first_name: firstNameTrim,
        last_name: lastNameTrim,
        role: roleNorm,
        department_id: department_id || null,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not create account' });
  }
});

// DELETE /:userId — deactivate a user account
// HR only — soft deletes by setting is_active = 0
router.delete('/:userId', async (req, res) => {
  // Already protected by router-level requireRole('hr', 'manager')
  // Only HR can manage all accounts; managers can only view
  if (req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Only HR personnel can deactivate accounts' });
  }

  const userId = String(req.params.userId || '').trim();
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    console.log(`[DELETE /:userId] Deactivating user: ${userId}`);
    // Check user exists and is not already inactive
    const [userRows] = await pool.query(
      `SELECT id, role, is_active, full_name FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    
    if (!userRows.length) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const user = userRows[0];
    
    if (!user.is_active) {
      return res.status(400).json({ error: 'User account is already deactivated' });
    }

    // Soft delete: set is_active = 0
    await pool.query(
      `UPDATE users SET is_active = 0 WHERE id = ?`,
      [userId]
    );

    console.log(`[DELETE /:userId] User ${userId} deactivated successfully`);
    return res.json({ ok: true, userId, message: 'Account deactivated successfully' });
  } catch (err) {
    console.error('[DELETE /:userId] Error:', err);
    return res.status(500).json({ error: 'Could not deactivate account', details: err.message });
  }
});

// PATCH /:userId — update user account (role, status, password reset, etc)
// HR only
router.patch('/:userId', async (req, res) => {
  // Already protected by router-level requireRole('hr', 'manager')
  // Only HR can modify accounts; managers can only view
  if (req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Only HR personnel can modify accounts' });
  }

  const userId = String(req.params.userId || '').trim();
  const { role, is_active, employment_status } = req.body ?? {};

  console.log('[PATCH /:userId] Request received');
  console.log('[PATCH /:userId] userId:', userId);
  console.log('[PATCH /:userId] Body:', req.body);
  console.log('[PATCH /:userId] Parsed updates:', { role, is_active, employment_status });

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    // Check user exists
    const [userRows] = await pool.query(
      `SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    
    if (!userRows.length) {
      return res.status(404).json({ error: 'User account not found' });
    }

    console.log('[PATCH /:userId] Found user:', userRows[0]);

    const updates = [];
    const values = [];

    // Update role if provided
    if (role !== undefined && role !== null) {
      const allowedRoles = ['employee', 'manager', 'hr'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be employee, manager, or hr' });
      }
      updates.push('role = ?');
      values.push(role);
      console.log('[PATCH /:userId] Adding role update:', role);
    }

    // Update active status if provided
    if (is_active !== undefined && is_active !== null) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
      console.log('[PATCH /:userId] Adding is_active update:', is_active ? 1 : 0);
    }

    // Update employment status (for linked Employee record) if provided
    if (employment_status !== undefined && employment_status !== null) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(employment_status)) {
        return res.status(400).json({ error: 'Invalid employment status' });
      }
      
      console.log('[PATCH /:userId] Updating Employee record with status:', employment_status);
      // Update Employee record if linked, or create if doesn't exist
      await pool.query(
        `INSERT INTO Employee (user_id, employment_status, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE employment_status = ?, updated_at = NOW()`,
        [userId, employment_status, employment_status]
      );
      console.log('[PATCH /:userId] Employee status updated/created successfully');
    }

    if (updates.length === 0) {
      console.log('[PATCH /:userId] No user table updates provided');
      // If only employment_status was updated (no user table changes), that's still valid
      if (!employment_status) {
        return res.status(400).json({ error: 'No updates provided' });
      }
      console.log('[PATCH /:userId] Employment status was updated, returning success');
      const [updatedUser] = await pool.query(
        `SELECT id, email, full_name, role, is_active FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      return res.json({ ok: true, user: updatedUser[0] });
    }

    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    console.log('[PATCH /:userId] Executing query:', query);
    console.log('[PATCH /:userId] With values:', values);
    
    const result = await pool.query(query, values);
    console.log('[PATCH /:userId] Query result:', result);

    // Get updated user
    const [updatedUser] = await pool.query(
      `SELECT id, email, full_name, role, is_active FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    console.log('[PATCH /:userId] Updated user:', updatedUser[0]);
    return res.json({ ok: true, user: updatedUser[0] });
  } catch (err) {
    console.error('[PATCH /:userId] Error:', err);
    console.error('[PATCH /:userId] Error stack:', err.stack);
    return res.status(500).json({ error: 'Could not update account', details: err.message });
  }
});

// POST /:userId/reset-password — generate password reset link
router.post('/:userId/reset-password', async (req, res) => {
  const userId = String(req.params.userId || '').trim();

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [userRows] = await pool.query(
      `SELECT id, email, full_name FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    
    if (!userRows.length) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // For now, return a placeholder message
    // In production, this would generate a real reset token and send email
    return res.json({
      ok: true,
      message: `Password reset link would be sent to ${userRows[0].email}`,
      user: userRows[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not initiate password reset' });
  }
});

module.exports = router;
