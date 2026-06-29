const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const { getJwtSecret } = require('../middleware/auth');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/applicantEmailService');

const router = express.Router();

// Verification code expiration time in minutes
const VERIFICATION_EXPIRY_MINUTES = Number(process.env.VERIFICATION_CODE_EXPIRY_MINUTES) || 15;
// Max verification attempts before lockout
const MAX_VERIFICATION_ATTEMPTS = 5;
// Lockout duration in minutes
const VERIFICATION_LOCKOUT_MINUTES = 15;

function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function signToken(applicant, rememberMe) {
  const secret = getJwtSecret();
  const shortTtl = process.env.JWT_EXPIRES_IN || '8h';
  const longTtl = process.env.JWT_REMEMBER_EXPIRES_IN || '30d';
  const expiresIn = rememberMe ? longTtl : shortTtl;
  return jwt.sign(
    { sub: applicant.id, email: applicant.email, role: 'applicant' },
    secret,
    { expiresIn }
  );
}

// POST /api/applicant-auth/register - Register new applicant account
router.post('/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const fullName = String(req.body?.full_name || '').trim();

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'email, password, and full_name are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    // Check if email already exists
    const [existing] = await pool.query(
      'SELECT id FROM applicant_accounts WHERE email = ? LIMIT 1',
      [email]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO applicant_accounts 
       (id, email, password_hash, full_name, verification_code, verification_code_expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, email, hash, fullName, verificationCode, expiresAt]
    );

    // Send verification email
    await sendVerificationEmail({
      to: email,
      fullName,
      verificationCode,
      expiresInMinutes: VERIFICATION_EXPIRY_MINUTES,
    });

    return res.status(201).json({
      message: 'Account created. Please check your email for the verification code.',
      email,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/applicant-auth/login - Login with applicant credentials
router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const rememberMe = Boolean(req.body?.rememberMe);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, password_hash, full_name, is_verified,
              verification_attempts, locked_until
       FROM applicant_accounts WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const applicant = rows[0];

    // Check if account is locked
    if (applicant.locked_until && new Date(applicant.locked_until) > new Date()) {
      const remaining = Math.ceil(
        (new Date(applicant.locked_until) - Date.now()) / 60000
      );
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`,
      });
    }

    // Check password
    const ok = await bcrypt.compare(password, applicant.password_hash);
    if (!ok) {
      const newAttempts = (applicant.verification_attempts || 0) + 1;
      const shouldLock = newAttempts >= MAX_VERIFICATION_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + VERIFICATION_LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await pool.query(
        `UPDATE applicant_accounts 
         SET verification_attempts = ?, locked_until = ? WHERE id = ?`,
        [newAttempts, lockedUntil, applicant.id]
      );

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!applicant.is_verified) {
      return res.status(403).json({
        error: 'Your account has not been verified. Please check your email for the 6-digit verification code.',
        needsVerification: true,
      });
    }

    // Success - reset attempts and generate token
    await pool.query(
      `UPDATE applicant_accounts 
       SET verification_attempts = 0, locked_until = NULL WHERE id = ?`,
      [applicant.id]
    );

    const token = signToken(applicant, rememberMe);
    return res.json({
      token,
      user: {
        id: applicant.id,
        email: applicant.email,
        full_name: applicant.full_name,
        role: 'applicant',
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/applicant-auth/verify - Verify email with code
router.post('/verify', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const code = String(req.body?.code || '').trim();

  if (!email || !code) {
    return res.status(400).json({ error: 'email and code are required' });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Verification code must be 6 digits' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, full_name, verification_code, verification_code_expires_at, is_verified
       FROM applicant_accounts WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const applicant = rows[0];

    if (applicant.is_verified) {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    // Check if code is expired
    if (!applicant.verification_code_expires_at || 
        new Date(applicant.verification_code_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Check if code matches
    if (applicant.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Verify the account
    await pool.query(
      `UPDATE applicant_accounts 
       SET is_verified = 1, verification_code = NULL, verification_code_expires_at = NULL
       WHERE id = ?`,
      [applicant.id]
    );

    // Send welcome email
    await sendWelcomeEmail({
      to: applicant.email,
      fullName: applicant.full_name,
    });

    return res.json({
      message: 'Email verified successfully! You can now log in.',
      verified: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/applicant-auth/resend-verification - Resend verification code
router.post('/resend-verification', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, full_name, is_verified
       FROM applicant_accounts WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      // Don't reveal if email exists
      return res.json({ message: 'If an account exists, a verification code has been sent.' });
    }

    const applicant = rows[0];

    if (applicant.is_verified) {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `UPDATE applicant_accounts 
       SET verification_code = ?, verification_code_expires_at = ?
       WHERE id = ?`,
      [verificationCode, expiresAt, applicant.id]
    );

    // Send verification email
    await sendVerificationEmail({
      to: applicant.email,
      fullName: applicant.full_name,
      verificationCode,
      expiresInMinutes: VERIFICATION_EXPIRY_MINUTES,
    });

    return res.json({
      message: 'A new verification code has been sent to your email.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

// GET /api/applicant-auth/me - Get current applicant profile
router.get('/me', async (req, res) => {
  // This endpoint is called from frontend with JWT in Authorization header
  // The frontend uses publicApiFetch which includes the token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret);
    
    let pool;
    try {
      pool = getPool();
    } catch {
      return res.status(503).json({ error: 'Database not available' });
    }

    const [rows] = await pool.query(
      `SELECT id, email, full_name, is_verified, created_at
       FROM applicant_accounts WHERE id = ? LIMIT 1`,
      [payload.sub]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Account not found' });
    }

    const applicant = rows[0];
    return res.json({
      user: {
        id: applicant.id,
        email: applicant.email,
        full_name: applicant.full_name,
        role: 'applicant',
        is_verified: Boolean(applicant.is_verified),
        created_at: applicant.created_at,
      },
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session' });
  }
});

module.exports = router;
