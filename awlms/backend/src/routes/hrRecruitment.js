const express = require('express');
const crypto = require('crypto');
const { getPool } = require('../config/db');
const { sendInterviewInvitation, sendInterviewLink } = require('../services/emailService');

const router = express.Router();

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract'];
const LOCATIONS = ['on_site', 'remote', 'hybrid'];

function parseNumberOfOpenings(value) {
  const n = Number.parseInt(String(value ?? '1'), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

router.get('/departments', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT id, name FROM departments ORDER BY name ASC`
    );
    return res.json({ departments: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load departments' });
  }
});

router.get('/job-positions', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  const status = req.query.status ? String(req.query.status) : null;
  try {
    let sql = `SELECT jp.id, jp.title, jp.description, jp.status, jp.department_id,
                      jp.employment_type, jp.location, jp.number_of_openings,
                      jp.created_at, jp.updated_at,
                      jp.competency_requirements, jp.interview_criteria,
                      d.name AS department_name
               FROM JobPosition jp
               LEFT JOIN departments d ON d.id = jp.department_id`;
    const params = [];
    if (status) {
      sql += ' WHERE jp.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY jp.updated_at DESC';
    const [rows] = await pool.query(sql, params);
    return res.json({ jobPositions: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load job positions' });
  }
});

router.post('/job-positions', async (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const description = req.body?.description != null ? String(req.body.description) : null;
  const departmentId = req.body?.department_id ? String(req.body.department_id).trim() : null;
  const employmentType = req.body?.employment_type ? String(req.body.employment_type).trim() : null;
  const location = req.body?.location ? String(req.body.location).trim() : null;
  const numberOfOpenings = parseNumberOfOpenings(req.body?.number_of_openings);
  const competency = req.body?.competency_requirements ?? {};
  const criteria = req.body?.interview_criteria ?? {};
  const status = req.body?.status ? String(req.body.status) : 'draft';
  if (!['draft', 'open', 'filled', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (employmentType && !EMPLOYMENT_TYPES.includes(employmentType)) {
    return res.status(400).json({ error: 'Invalid employment_type' });
  }
  if (location && !LOCATIONS.includes(location)) {
    return res.status(400).json({ error: 'Invalid location' });
  }
  if (req.body?.number_of_openings != null && numberOfOpenings == null) {
    return res.status(400).json({ error: 'number_of_openings must be an integer of at least 1' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  const id = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO JobPosition (
         id, title, competency_requirements, interview_criteria, status,
         department_id, employment_type, location, number_of_openings,
         created_by_user_id, description
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        JSON.stringify(competency),
        JSON.stringify(criteria),
        status,
        departmentId,
        employmentType,
        location,
        numberOfOpenings ?? 1,
        req.user.id,
        description,
      ]
    );
    const [rows] = await pool.query(`SELECT * FROM JobPosition WHERE id = ?`, [id]);
    return res.status(201).json({ jobPosition: rows[0] });
  } catch (err) {
    console.error(err);
    const detail =
      process.env.NODE_ENV !== 'production' && err.sqlMessage ? ` (${err.sqlMessage})` : '';
    return res.status(500).json({ error: `Could not create job position${detail}` });
  }
});

router.patch('/job-positions/:id', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  const id = req.params.id;
  const fields = [];
  const params = [];

  if (req.body.title != null) {
    fields.push('title = ?');
    params.push(String(req.body.title).trim());
  }
  if (req.body.description !== undefined) {
    fields.push('description = ?');
    params.push(req.body.description == null ? null : String(req.body.description));
  }
  if (req.body.department_id !== undefined) {
    fields.push('department_id = ?');
    params.push(req.body.department_id ? String(req.body.department_id) : null);
  }
  if (req.body.employment_type !== undefined) {
    const et = req.body.employment_type ? String(req.body.employment_type).trim() : null;
    if (et && !EMPLOYMENT_TYPES.includes(et)) {
      return res.status(400).json({ error: 'Invalid employment_type' });
    }
    fields.push('employment_type = ?');
    params.push(et);
  }
  if (req.body.location !== undefined) {
    const loc = req.body.location ? String(req.body.location).trim() : null;
    if (loc && !LOCATIONS.includes(loc)) {
      return res.status(400).json({ error: 'Invalid location' });
    }
    fields.push('location = ?');
    params.push(loc);
  }
  if (req.body.number_of_openings != null) {
    const openings = parseNumberOfOpenings(req.body.number_of_openings);
    if (openings == null) {
      return res.status(400).json({ error: 'number_of_openings must be an integer of at least 1' });
    }
    fields.push('number_of_openings = ?');
    params.push(openings);
  }
  if (req.body.competency_requirements != null) {
    fields.push('competency_requirements = ?');
    params.push(JSON.stringify(req.body.competency_requirements));
  }
  if (req.body.interview_criteria != null) {
    fields.push('interview_criteria = ?');
    params.push(JSON.stringify(req.body.interview_criteria));
  }
  if (req.body.status != null) {
    const st = String(req.body.status);
    if (!['draft', 'open', 'filled', 'closed'].includes(st)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    fields.push('status = ?');
    params.push(st);
  }

  if (!fields.length) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  try {
    const [result] = await pool.query(
      `UPDATE JobPosition SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Job position not found' });
    }
    const [rows] = await pool.query(`SELECT * FROM JobPosition WHERE id = ?`, [id]);
    return res.json({ jobPosition: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not update job position' });
  }
});

router.delete('/job-positions/:id', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  const id = String(req.params.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'Job position id is required' });
  }

  const conn = await pool.getConnection();
  try {
    const [jobs] = await conn.query(
      `SELECT id, title FROM JobPosition WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!jobs.length) {
      return res.status(404).json({ error: 'Job position not found' });
    }

    const [[empCount]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM Employee WHERE job_position_id = ?`,
      [id]
    );
    const employeesOnRole = Number(empCount.cnt);

    let reassignedTo = null;
    await conn.beginTransaction();

    if (employeesOnRole > 0) {
      const [fallbackJobs] = await conn.query(
        `SELECT id, title FROM JobPosition
         WHERE id <> ? AND title NOT IN ('Unassigned role')
         ORDER BY updated_at DESC LIMIT 1`,
        [id]
      );

      if (fallbackJobs.length) {
        reassignedTo = fallbackJobs[0];
      } else if (jobs[0].title === 'Unassigned role') {
        const [existingGeneral] = await conn.query(
          `SELECT id, title FROM JobPosition WHERE title = 'General Employee' LIMIT 1`
        );
        if (existingGeneral.length) {
          reassignedTo = existingGeneral[0];
        } else {
          const generalId = crypto.randomUUID();
          await conn.query(
            `INSERT INTO JobPosition (
               id, title, competency_requirements, interview_criteria, status,
               number_of_openings, created_by_user_id, description
             ) VALUES (?, 'General Employee', '{}', '{}', 'closed', 1, ?, NULL)`,
            [generalId, req.user.id]
          );
          reassignedTo = { id: generalId, title: 'General Employee' };
        }
      } else {
        await conn.rollback();
        return res.status(409).json({
          error: `${employeesOnRole} employee(s) use this role. Create another job listing first, then delete this one (employees will move to the other listing).`,
        });
      }

      await conn.query(`UPDATE Employee SET job_position_id = ? WHERE job_position_id = ?`, [
        reassignedTo.id,
        id,
      ]);
    }

    const [result] = await conn.query(`DELETE FROM JobPosition WHERE id = ?`, [id]);
    if (!result.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ error: 'Job position not found' });
    }

    await conn.commit();

    return res.json({
      ok: true,
      deletedId: id,
      title: jobs[0].title,
      reassignedEmployees: employeesOnRole,
      reassignedToJobId: reassignedTo?.id ?? null,
      reassignedToJobTitle: reassignedTo?.title ?? null,
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({
        error: 'Cannot delete this job: it is still referenced by other records.',
      });
    }
    return res.status(500).json({ error: 'Could not delete job position' });
  } finally {
    conn.release();
  }
});

router.get('/job-positions/:id/applicants', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, about_yourself, hiring_decision,
              interview_status, assessment_summary, ai_recommendation, created_at, updated_at
       FROM Applicant
       WHERE job_position_id = ?
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    return res.json({ applicants: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load applicants' });
  }
});

router.post('/applicants/:id/invite-interview', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.full_name, a.email, a.hiring_decision, jp.title AS job_title
       FROM Applicant a
       INNER JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    const a = rows[0];
    if (a.hiring_decision !== 'pending_review') {
      return res.status(409).json({
        error: `Cannot invite: applicant status is '${a.hiring_decision}', expected 'pending_review'`,
      });
    }

    const interviewToken = crypto.randomBytes(32).toString('hex');

    const [result] = await pool.query(
      `UPDATE Applicant
       SET hiring_decision = 'interview_invited',
           interview_token = ?,
           interview_status = 'pending_start',
           interview_messages = NULL,
           interview_transcript = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND hiring_decision = 'pending_review'`,
      [interviewToken, req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(409).json({ error: 'Applicant was already invited or status changed' });
    }

    sendInterviewInvitation({
      to: a.email,
      fullName: a.full_name,
      jobTitle: a.job_title,
      interviewToken,
    }).catch((e) => console.error('[email] interview invitation failed:', e));

    return res.json({ ok: true, hiring_decision: 'interview_invited' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not send interview invitation' });
  }
});

router.post('/applicants/:id/send-interview-link', async (req, res) => {
  const applicantEmail = String(req.body?.email || '').trim();
  const hrEmail = String(req.body?.hrEmail || '').trim();
  const subject = String(req.body?.subject || '').trim();
  const regenerateToken = req.body?.regenerateToken === true;

  if (!applicantEmail) {
    return res.status(400).json({ error: 'email is required' });
  }
  if (!hrEmail) {
    return res.status(400).json({ error: 'hrEmail is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.full_name, a.email, a.interview_token, a.interview_status, jp.title AS job_title
       FROM Applicant a
       INNER JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Applicant not found' });
    }

    const a = rows[0];
    let interviewToken = a.interview_token;

    // Generate a fresh token on demand, or create one if the applicant does not have one yet.
    if (regenerateToken || !interviewToken) {
      interviewToken = crypto.randomBytes(32).toString('hex');
      console.log(`[send-interview-link] Generated token for applicant ${req.params.id}: ${interviewToken}`);
      try {
        const nextInterviewStatus = a.interview_status || 'pending_start';
        const updateResult = await pool.query(
          `UPDATE Applicant 
           SET interview_token = ?, 
               interview_status = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [interviewToken, nextInterviewStatus, req.params.id]
        );
        console.log(`[send-interview-link] Update successful. Affected rows:`, updateResult[0].affectedRows);
      } catch (updateErr) {
        console.error('[send-interview-link] UPDATE FAILED:', updateErr.message);
        throw updateErr;
      }
    }

    const interviewLink = `${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/interview/${interviewToken}`;
    console.log(`[send-interview-link] Interview link: ${interviewLink}`);

    sendInterviewLink({
      to: applicantEmail,
      fullName: a.full_name,
      jobTitle: a.job_title,
      interviewLink,
      hrEmail,
      subject: subject || undefined,
      hrNotes: req.body?.subject || undefined,
    }).catch((e) => console.error('[email] send interview link failed:', e));

    // Create a notification for the authenticated HR user
    try {
      console.log('[send-interview-link] Creating notification for user:', req.user?.id, 'email:', req.user?.email);
      const result = await pool.query(
        `INSERT INTO UserNotification (user_id, category, title, body, created_at)
         VALUES (?, 'hr_assessment_pending', ?, ?, CURRENT_TIMESTAMP)`,
        [
          req.user.id,
          `Interview link sent to ${a.full_name}`,
          `You sent an AI interview link for the ${a.job_title} position to ${a.full_name} (${applicantEmail}). The applicant will receive this link via email.`,
        ]
      );
      console.log('[send-interview-link] Notification created successfully');
    } catch (notifyErr) {
      console.error('[send-interview-link] Could not create notification:', notifyErr.message, notifyErr.sql);
    }

    return res.json({
      ok: true,
      message: regenerateToken ? 'New interview link sent successfully' : 'Interview link sent successfully',
      interviewLink,
      interviewToken,
      regenerated: regenerateToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not send interview link' });
  }
});

router.get('/applicants/:id/transcript', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.full_name, a.email, a.phone, a.about_yourself, a.hiring_decision,
              a.assessment_summary, a.ai_recommendation, a.interview_status,
              a.interview_transcript, a.interview_messages, a.created_at, a.updated_at,
              jp.title AS job_title
       FROM Applicant a
       INNER JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    return res.json({ applicant: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load transcript' });
  }
});

router.get('/assessments-pending', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.full_name, a.email, a.phone, a.hiring_decision, a.assessment_summary, a.ai_recommendation,
              a.interview_status, a.created_at, a.updated_at,
              jp.id AS job_position_id, jp.title AS job_title
       FROM Applicant a
       INNER JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.reviewed_by_user_id IS NULL
         AND a.assessment_summary IS NOT NULL
         AND TRIM(a.assessment_summary) <> ''
         AND a.hiring_decision IN ('under_review', 'pending')
       ORDER BY a.updated_at DESC
       LIMIT 100`
    );
    return res.json({ assessments: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load assessments' });
  }
});

router.post('/applicants/:id/review', async (req, res) => {
  const decision = String(req.body?.hiring_decision || '').trim();
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'hiring_decision must be approved or rejected' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE Applicant
       SET hiring_decision = ?,
           reviewed_by_user_id = ?,
           decided_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
         AND reviewed_by_user_id IS NULL`,
      [decision, req.user.id, req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Applicant not found or already reviewed' });
    }
    return res.json({ ok: true, hiring_decision: decision });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not record review' });
  }
});

// Allow applicant to retake interview (HR decision)
router.post('/applicants/:id/allow-retake', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const applicantId = req.params.id;
    
    // Get current applicant
    const [applicantRows] = await pool.query(
      `SELECT id, interview_token FROM Applicant WHERE id = ? LIMIT 1`,
      [applicantId]
    );
    
    if (!applicantRows.length) {
      return res.status(404).json({ error: 'Applicant not found' });
    }

    // Generate new interview token
    const newToken = crypto.randomBytes(32).toString('hex');

    // Update applicant: reset interview status, clear previous data, set new token
    const [updateResult] = await pool.query(
      `UPDATE Applicant
       SET interview_token = ?,
           interview_status = 'pending_start',
           interview_messages = NULL,
           interview_transcript = NULL,
           assessment_summary = NULL,
           ai_recommendation = NULL,
           hiring_decision = 'interview_invited',
           reviewed_by_user_id = NULL,
           decided_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newToken, applicantId]
    );

    if (!updateResult.affectedRows) {
      return res.status(500).json({ error: 'Could not update applicant' });
    }

    return res.json({ 
      ok: true, 
      message: 'Applicant has been given another interview opportunity',
      newInterviewToken: newToken
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not allow retake' });
  }
});

// Get questionnaire for a specific job role
router.get('/questionnaire/:jobTitle', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const jobTitle = String(req.params.jobTitle).trim();
    const [rows] = await pool.query(
      `SELECT question_number, question_text FROM InterviewQuestionnaire 
       WHERE job_title = ? 
       ORDER BY question_number ASC`,
      [jobTitle]
    );

    return res.json({
      jobTitle,
      questions: rows || [],
      totalQuestions: rows?.length || 0
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load questionnaire' });
  }
});

// Save facial expression data during interview
router.post('/interview/:token/expression', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const { token } = req.params;
    const { emotion, confidence, expressions } = req.body;

    if (!token || !emotion) {
      return res.status(400).json({ error: 'token and emotion are required' });
    }

    // Get applicant by interview token
    const [applicantRows] = await pool.query(
      `SELECT id FROM Applicant WHERE interview_token = ? LIMIT 1`,
      [token]
    );

    if (!applicantRows.length) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const applicantId = applicantRows[0].id;

    // Save expression data
    await pool.query(
      `INSERT INTO InterviewFacialData (applicant_id, emotion, confidence, expressions)
       VALUES (?, ?, ?, ?)`,
      [applicantId, emotion, confidence || null, expressions ? JSON.stringify(expressions) : null]
    );

    return res.json({ success: true, message: 'Expression data saved' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not save expression data' });
  }
});

router.get('/stats', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    // Total Applicants
    const [totalApplicantsRows] = await pool.query(
      `SELECT COUNT(*) as count FROM Applicant`
    );
    const totalApplicants = totalApplicantsRows[0]?.count ?? 0;

    // AI Interviews Completed
    const [aiInterviewsRows] = await pool.query(
      `SELECT COUNT(*) as count FROM Applicant WHERE interview_status = 'completed'`
    );
    const aiInterviewsCompleted = aiInterviewsRows[0]?.count ?? 0;

    // Hiring Decisions Made
    const [hiringDecisionsRows] = await pool.query(
      `SELECT COUNT(*) as count FROM Applicant WHERE hiring_decision IN ('approved', 'rejected')`
    );
    const hiringDecisions = hiringDecisionsRows[0]?.count ?? 0;

    // Offers Extended
    const [offersRows] = await pool.query(
      `SELECT COUNT(*) as count FROM Applicant WHERE hiring_decision = 'approved'`
    );
    const offersExtended = offersRows[0]?.count ?? 0;

    return res.json({
      totalApplicants,
      aiInterviewsCompleted,
      hiringDecisions,
      offersExtended,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load recruitment statistics' });
  }
});

module.exports = router;
