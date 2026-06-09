const express = require('express');
const { getPool } = require('../config/db');

const router = express.Router();

// Public endpoint - get available jobs
router.get('/available-jobs', async (req, res) => {
  console.log('[API] Fetching available jobs');

  let pool;
  try {
    pool = getPool();
    console.log('[API] Database pool retrieved successfully');
  } catch (err) {
    console.error('[API] Database pool error:', err.message);
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    console.log('[API] Querying for open jobs');
    const [jobs] = await pool.query(
      `SELECT 
        id,
        title,
        description,
        employment_type,
        location,
        number_of_openings,
        status,
        created_at
       FROM JobPosition
       WHERE status = 'open'
       ORDER BY created_at DESC`
    );

    console.log(`[API] Found ${jobs.length} open jobs`);
    return res.json({ jobs });
  } catch (err) {
    console.error('[API] Query error:', err);
    return res.status(500).json({ error: 'Could not retrieve job listings', details: err.message });
  }
});

// Public endpoint - get applications by email
router.post('/applicant-applications', async (req, res) => {
  const { email } = req.body;
  
  console.log(`[API] Received request for applicant email: ${email}`);

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let pool;
  try {
    pool = getPool();
    console.log('[API] Database pool retrieved successfully');
  } catch (err) {
    console.error('[API] Database pool error:', err.message);
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    console.log(`[API] Querying for applications with email: ${email}`);
    const [applications] = await pool.query(
      `SELECT 
        a.id,
        a.full_name,
        a.email,
        a.phone,
        a.hiring_decision,
        a.assessment_summary,
        a.interview_token,
        a.created_at,
        a.updated_at,
        jp.id AS job_position_id,
        jp.title AS job_title
       FROM Applicant a
       LEFT JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE LOWER(a.email) = LOWER(?)
       ORDER BY a.created_at DESC`,
      [email]
    );

    console.log(`[API] Found ${applications.length} applications for ${email}`);
    return res.json({ applications });
  } catch (err) {
    console.error('[API] Query error:', err);
    return res.status(500).json({ error: 'Could not retrieve applications', details: err.message });
  }
});

module.exports = router;
