const express = require('express');
const crypto = require('crypto');
const { getPool } = require('../config/db');
const { sendApplicationConfirmation } = require('../services/emailService');
const {
  generateFirstQuestion,
  generateNextTurn,
  transcriptAppend,
  normalizeStoredAiRecommendation,
} = require('../services/recruitmentInterview');

const router = express.Router();

function nowIso() {
  return new Date().toISOString();
}

function generateDocumentAccessToken() {
  return crypto.randomBytes(48).toString('hex');
}

function parseMessages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function bootstrapInterviewIfNeeded(pool, applicantRow, jobRow) {
  const messages = parseMessages(applicantRow.interview_messages);
  if (applicantRow.interview_status !== 'pending_start' || messages.length > 0) {
    return { messages, transcript: applicantRow.interview_transcript, status: applicantRow.interview_status };
  }

  const job = {
    title: jobRow.title,
    description: jobRow.description,
    competency_requirements: jobRow.competency_requirements,
    interview_criteria: jobRow.interview_criteria,
  };

  const first = await generateFirstQuestion({ job, applicantName: applicantRow.full_name, pool });
  if (first.type !== 'question') {
    throw Object.assign(new Error('AI did not return a valid first question'), { code: 'AI_BAD_FIRST' });
  }

  const newMessages = [{ role: 'assistant', content: first.text, ts: nowIso() }];
  const transcript = transcriptAppend(null, 'assistant', 'AI Interviewer', first.text);

  await pool.query(
    `UPDATE Applicant
     SET interview_messages = ?,
         interview_transcript = ?,
         interview_status = 'in_progress',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [JSON.stringify(newMessages), transcript, applicantRow.id]
  );

  return { messages: newMessages, transcript, status: 'in_progress' };
}

// List all open job positions (public, no auth)
router.get('/jobs', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT jp.id, jp.title, jp.description, jp.employment_type, jp.location, jp.number_of_openings,
              d.name AS department_name
       FROM JobPosition jp
       LEFT JOIN departments d ON d.id = jp.department_id
       WHERE jp.status = 'open'
       ORDER BY jp.created_at DESC`
    );
    return res.json({ jobs: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load job listings' });
  }
});

router.get('/jobs/:id', async (req, res) => {
  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT jp.id, jp.title, jp.description, jp.status, jp.competency_requirements, jp.interview_criteria,
              jp.department_id, jp.employment_type, jp.location, jp.number_of_openings,
              jp.created_at, d.name AS department_name
       FROM JobPosition jp
       LEFT JOIN departments d ON d.id = jp.department_id
       WHERE jp.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length || rows[0].status !== 'open') {
      return res.status(404).json({ error: 'Job not found or not accepting applications' });
    }
    const j = rows[0];
    return res.json({
      job: {
        id: j.id,
        title: j.title,
        description: j.description,
        competency_requirements: j.competency_requirements,
        interview_criteria: j.interview_criteria,
        department_id: j.department_id,
        department_name: j.department_name,
        employment_type: j.employment_type,
        location: j.location,
        number_of_openings: j.number_of_openings,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load job' });
  }
});

router.post('/apply', async (req, res) => {
  const jobPositionId = String(req.body?.job_position_id || '').trim();
  const fullName = String(req.body?.full_name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = req.body?.phone ? String(req.body.phone).trim() : null;
  const aboutYourself = req.body?.about_yourself != null ? String(req.body.about_yourself).trim() : null;
  const applicationDetails = req.body?.application_details ?? null;
  const submitDocumentsLater = req.body?.submit_documents_later === true;

  if (!jobPositionId || !fullName || !email) {
    return res.status(400).json({ error: 'job_position_id, full_name, and email are required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [jobs] = await pool.query(
      `SELECT id, title, status FROM JobPosition WHERE id = ? LIMIT 1`,
      [jobPositionId]
    );
    if (!jobs.length || jobs[0].status !== 'open') {
      return res.status(404).json({ error: 'Job is not open for applications' });
    }
    const job = jobs[0];

    const applicantId = crypto.randomUUID();
    let documentAccessToken = generateDocumentAccessToken();

    // If submitting documents later, status is pending_documents
    // Otherwise, status is pending_review (documents included in initial submission)
    const documentsPending = submitDocumentsLater ? 1 : 0;
    const hiringDecision = submitDocumentsLater ? 'pending_documents' : 'pending_review';

    try {
      await pool.query(
        `INSERT INTO Applicant (
           id, job_position_id, full_name, email, phone, application_details, about_yourself,
           document_access_token, interview_token, interview_status, interview_messages,
           interview_transcript, assessment_summary, hiring_decision, documents_pending
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending_start', NULL, NULL, NULL, ?, ?)`,
        [
          applicantId,
          jobPositionId,
          fullName,
          email,
          phone,
          applicationDetails ? JSON.stringify(applicationDetails) : null,
          aboutYourself || null,
          documentAccessToken,
          hiringDecision,
          documentsPending,
        ]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const msg = String(err.sqlMessage || err.message || '');
        if (msg.includes('document_access_token')) {
          documentAccessToken = generateDocumentAccessToken();
          try {
            await pool.query(
              `INSERT INTO Applicant (
                 id, job_position_id, full_name, email, phone, application_details, about_yourself,
                 document_access_token, interview_token, interview_status, interview_messages,
                 interview_transcript, assessment_summary, hiring_decision, documents_pending
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending_start', NULL, NULL, NULL, ?, ?)`,
              [
                applicantId,
                jobPositionId,
                fullName,
                email,
                phone,
                applicationDetails ? JSON.stringify(applicationDetails) : null,
                aboutYourself || null,
                documentAccessToken,
                hiringDecision,
                documentsPending,
              ]
            );
          } catch (innerErr) {
            if (innerErr.code === 'ER_DUP_ENTRY' && String(innerErr.sqlMessage || innerErr.message || '').includes('document_access_token')) {
              return res.status(500).json({ error: 'Could not generate a unique document access token. Please try again.' });
            }
            if (innerErr.code === 'ER_DUP_ENTRY') {
              return res.status(409).json({ error: 'You have already applied to this position with this email.' });
            }
            throw innerErr;
          }
        } else {
          return res.status(409).json({ error: 'You have already applied to this position with this email.' });
        }
      } else {
        throw err;
      }
    }

    sendApplicationConfirmation({ to: email, fullName, jobTitle: job.title }).catch((e) =>
      console.error('[email] application confirmation failed:', e)
    );

    const message = submitDocumentsLater
      ? 'Application received. You can submit your documents later using the document portal link.'
      : 'Application received. You will be contacted by email if selected for an AI interview.';

    return res.status(201).json({
      applicantId,
      documentAccessToken,
      documentsPending: submitDocumentsLater,
      message,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Application failed' });
  }
});

router.get('/interview/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();

  if (!token) {
    return res.status(400).json({ error: 'Interview token is required' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.full_name, a.interview_status, a.interview_messages,
              a.assessment_summary, a.ai_recommendation, a.hiring_decision, a.interview_token,
              a.interview_transcript,
              jp.title, jp.description, jp.competency_requirements, jp.interview_criteria
       FROM Applicant a
       INNER JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.interview_token = ? LIMIT 1`,
      [token]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Interview session not found' });
    }
    const a = rows[0];

    let messages = parseMessages(a.interview_messages);
    let status = a.interview_status;

    if (status === 'pending_start' && messages.length === 0) {
      try {
        const boot = await bootstrapInterviewIfNeeded(pool, a, {
          title: a.title,
          description: a.description,
          competency_requirements: a.competency_requirements,
          interview_criteria: a.interview_criteria,
        });
        messages = boot.messages;
        status = boot.status;
      } catch (e) {
        if (e.code === 'OPENAI_MISSING') {
          return res.status(503).json({
            error:
              'AI interview is not configured. Set OPENAI_API_KEY on the server (and optionally OPENAI_MODEL).',
          });
        }
        console.error('[interview/:token] Failed to bootstrap interview:', e.code, e.message);
        console.error('Full error:', e);
        return res.status(502).json({ error: 'Could not start AI interview. Please try again later.' });
      }
    }

    return res.json({
      interviewStatus: status,
      messages,
      assessmentSummary: a.assessment_summary || '',
      aiRecommendation: a.ai_recommendation || '',
      hiringDecision: a.hiring_decision,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load interview session' });
  }
});

router.post('/interview/:token/message', async (req, res) => {
  const token = String(req.params.token || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!token || !message) {
    return res.status(400).json({ error: 'Interview token and message are required' });
  }
  if (message.length > 12000) {
    return res.status(400).json({ error: 'Message is too long' });
  }

  let pool;
  try {
    pool = getPool();
  } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT a.*, jp.title, jp.description, jp.status AS job_status, jp.competency_requirements, jp.interview_criteria
       FROM Applicant a
       INNER JOIN JobPosition jp ON jp.id = a.job_position_id
       WHERE a.interview_token = ? LIMIT 1`,
      [token]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Interview session not found' });
    }
    const a = rows[0];
    const applicantId = a.id;

    if (a.interview_status === 'completed') {
      return res.json({
        interviewStatus: 'completed',
        messages: parseMessages(a.interview_messages),
        assessmentSummary: a.assessment_summary,
        aiRecommendation: a.ai_recommendation,
        hiringDecision: a.hiring_decision,
      });
    }
    if (a.interview_status === 'failed') {
      return res.status(410).json({ error: 'Interview session has failed. Please contact HR.' });
    }

    let interviewMessages = parseMessages(a.interview_messages);
    let interviewStatus = a.interview_status;

    if (interviewStatus === 'pending_start' && interviewMessages.length === 0) {
      try {
        const boot = await bootstrapInterviewIfNeeded(pool, a, {
          title: a.title,
          description: a.description,
          competency_requirements: a.competency_requirements,
          interview_criteria: a.interview_criteria,
        });
        interviewMessages = boot.messages;
        interviewStatus = boot.status;
      } catch (e) {
        if (e.code === 'OPENAI_MISSING') {
          return res.status(503).json({ error: 'AI interview is not configured (OPENAI_API_KEY).' });
        }
        console.error(e);
        return res.status(502).json({ error: 'Could not start AI interview.' });
      }
    }

    const job = {
      title: a.title,
      description: a.description,
      competency_requirements: a.competency_requirements,
      interview_criteria: a.interview_criteria,
    };

    interviewMessages = [
      ...interviewMessages,
      { role: 'user', content: message, ts: nowIso() },
    ];

    let transcript = transcriptAppend(a.interview_transcript, 'user', a.full_name, message);

    let parsed;
    try {
      parsed = await generateNextTurn({
        job,
        interviewMessages,
        pool,
      });
    } catch (e) {
      if (e.code === 'OPENAI_MISSING') {
        return res.status(503).json({ error: 'AI interview is not configured (OPENAI_API_KEY).' });
      }
      console.error(e);
      await pool.query(`UPDATE Applicant SET interview_status = 'failed' WHERE id = ?`, [applicantId]);
      return res.status(502).json({ error: 'AI interview error. HR has been notified to use manual follow-up.' });
    }

    if (parsed.type === 'question') {
      interviewMessages.push({ role: 'assistant', content: parsed.text, ts: nowIso() });
      transcript = transcriptAppend(transcript, 'assistant', 'AI Interviewer', parsed.text);
      await pool.query(
        `UPDATE Applicant
         SET interview_messages = ?,
             interview_transcript = ?,
             interview_status = 'in_progress',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [JSON.stringify(interviewMessages), transcript, applicantId]
      );
      return res.json({
        interviewStatus: 'in_progress',
        messages: interviewMessages,
      });
    }

    interviewMessages.push({
      role: 'assistant',
      content: `Interview complete. Summary recorded for HR review.`,
      ts: nowIso(),
    });
    transcript = transcriptAppend(
      transcript,
      'assistant',
      'AI Interviewer',
      'Interview concluded. Formal assessment has been submitted to HR.'
    );

    const aiRec = normalizeStoredAiRecommendation(parsed.ai_recommendation);

    await pool.query(
      `UPDATE Applicant
       SET interview_messages = ?,
           interview_transcript = ?,
           interview_status = 'completed',
           assessment_summary = ?,
           ai_recommendation = ?,
           hiring_decision = 'under_review',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        JSON.stringify(interviewMessages),
        transcript,
        parsed.assessment_summary,
        aiRec,
        applicantId,
      ]
    );

    return res.json({
      interviewStatus: 'completed',
      messages: interviewMessages,
      assessmentSummary: parsed.assessment_summary,
      aiRecommendation: aiRec,
      hiringDecision: 'under_review',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not process interview message' });
  }
});

module.exports = router;
