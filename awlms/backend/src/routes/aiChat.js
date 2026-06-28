/**
 * /api/ai/chat  — General-purpose HR assistant chat
 *
 * Conversations and messages are persisted in ai_chat_logs.
 * A lightweight "conversation" grouping is stored in ai_conversations.
 *
 * Routes:
 *   GET    /api/ai/chat/conversations          — list all conversations for the user
 *   POST   /api/ai/chat/conversations          — create a new conversation
 *   DELETE /api/ai/chat/conversations/:convId  — delete a conversation + all its messages
 *   GET    /api/ai/chat/conversations/:convId/messages  — load messages for a conversation
 *   POST   /api/ai/chat                        — send a message (saves both turns, returns reply)
 */

const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { getPool } = require('../config/db');
const { invokeAgent, DOMAIN } = require('../services/centralAiAgent');

const router = express.Router();
router.use(authenticateToken);

// ── helpers ──────────────────────────────────────────────────────────────────

async function getUserContext(pool, userId, userEmail, userRole) {
  let ctx = { id: userId, email: userEmail, role: userRole };
  try {
    const [rows] = await pool.query(
      `SELECT full_name, department_id FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (rows.length) {
      ctx.full_name = rows[0].full_name;
      ctx.department_id = rows[0].department_id;
    }
  } catch { /* non-fatal */ }
  return ctx;
}

function buildSystemPrompt(userContext) {
  return `You are AWLMS Assistant, an intelligent HR work assistant embedded in the AWLMS platform.

Your role is to help ${userContext.role} users with recruitment tasks such as:
- Answering questions about applicants, recruitment, interview summaries, and hiring decisions
- Drafting recruitment communications (offer letters, interview feedback, hiring summaries)
- Explaining hiring process best practices
- Summarizing data and suggesting next steps
- Helping with decisions around candidate selection and next steps in the hiring pipeline

Current user: ${userContext.full_name || userContext.email} (${userContext.role})

Guidelines:
- Be concise, professional, and helpful
- When you don't have specific data, say so clearly and suggest where to find it
- Never fabricate employee records or data
- Respond in plain conversational text (no JSON wrapping needed)
- Keep responses focused and actionable`;
}

// ── GET /conversations ────────────────────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  let pool;
  try { pool = getPool(); } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM ai_conversations
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    return res.json({ conversations: rows });
  } catch (err) {
    console.error('[AI Chat] list conversations', err.message);
    return res.status(500).json({ error: 'Could not load conversations' });
  }
});

// ── POST /conversations ───────────────────────────────────────────────────────
router.post('/conversations', async (req, res) => {
  const title = req.body?.title ? String(req.body.title).slice(0, 200) : 'New conversation';
  let pool;
  try { pool = getPool(); } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO ai_conversations (id, user_id, title) VALUES (?, ?, ?)`,
      [id, req.user.id, title]
    );
    return res.status(201).json({ conversation: { id, title, created_at: new Date(), updated_at: new Date() } });
  } catch (err) {
    console.error('[AI Chat] create conversation', err.message);
    return res.status(500).json({ error: 'Could not create conversation' });
  }
});

// ── DELETE /conversations/:convId ─────────────────────────────────────────────
router.delete('/conversations/:convId', async (req, res) => {
  let pool;
  try { pool = getPool(); } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    // Verify ownership before deleting
    const [rows] = await pool.query(
      `SELECT id FROM ai_conversations WHERE id = ? AND user_id = ? LIMIT 1`,
      [req.params.convId, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    // ai_chat_logs rows are deleted via ON DELETE CASCADE on the FK
    await pool.query(
      `DELETE FROM ai_conversations WHERE id = ? AND user_id = ?`,
      [req.params.convId, req.user.id]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('[AI Chat] delete conversation', err.message);
    return res.status(500).json({ error: 'Could not delete conversation' });
  }
});

// ── GET /conversations/:convId/messages ───────────────────────────────────────
router.get('/conversations/:convId/messages', async (req, res) => {
  let pool;
  try { pool = getPool(); } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }
  try {
    // Verify ownership
    const [convRows] = await pool.query(
      `SELECT id FROM ai_conversations WHERE id = ? AND user_id = ? LIMIT 1`,
      [req.params.convId, req.user.id]
    );
    if (!convRows.length) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const [messages] = await pool.query(
      `SELECT id, role, message AS content, created_at
       FROM ai_chat_logs
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
      [req.params.convId]
    );
    return res.json({ messages });
  } catch (err) {
    console.error('[AI Chat] load messages', err.message);
    return res.status(500).json({ error: 'Could not load messages' });
  }
});

// ── POST / (send message) ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { messages, conversation_id } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  for (const m of messages) {
    if (!m || typeof m.role !== 'string' || typeof m.content !== 'string') {
      return res.status(400).json({ error: 'Each message must have role and content strings' });
    }
  }

  let pool;
  try { pool = getPool(); } catch {
    return res.status(503).json({ error: 'Database is not available' });
  }

  // Resolve or create conversation
  let convId = conversation_id ? String(conversation_id) : null;
  try {
    if (convId) {
      const [rows] = await pool.query(
        `SELECT id FROM ai_conversations WHERE id = ? AND user_id = ? LIMIT 1`,
        [convId, req.user.id]
      );
      if (!rows.length) convId = null; // not found / not owned — create fresh
    }
    if (!convId) {
      convId = crypto.randomUUID();
      // Title = first user message, truncated
      const firstUser = messages.find((m) => m.role === 'user');
      const title = firstUser
        ? (firstUser.content.length > 80 ? firstUser.content.slice(0, 80) + '…' : firstUser.content)
        : 'New conversation';
      await pool.query(
        `INSERT INTO ai_conversations (id, user_id, title) VALUES (?, ?, ?)`,
        [convId, req.user.id, title]
      );
    }
  } catch (err) {
    console.error('[AI Chat] resolve conversation', err.message);
    return res.status(500).json({ error: 'Could not resolve conversation' });
  }

  // Save the incoming user message (last message in the array)
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role === 'user') {
    try {
      await pool.query(
        `INSERT INTO ai_chat_logs (id, user_id, conversation_id, role, message)
         VALUES (?, ?, ?, 'user', ?)`,
        [crypto.randomUUID(), req.user.id, convId, lastMsg.content]
      );
    } catch (err) {
      console.error('[AI Chat] save user message', err.message);
    }
  }

  // Call the AI
  const userContext = await getUserContext(pool, req.user.id, req.user.email, req.user.role);
  const systemPrompt = buildSystemPrompt(userContext);

  let reply;
  try {
    const result = await invokeAgent({
      domain: DOMAIN.RECRUITMENT,
      operation: 'assistant_chat',
      structuredContext: { user: userContext },
      systemPrompt,
      messages,
      temperature: 0.5,
      jsonMode: false,
    });
    reply = result.content;
  } catch (err) {
    if (err.code === 'OPENAI_MISSING') {
      reply = "I'm not fully configured yet — the Groq API key hasn't been set up. Once it's added to the backend `.env` as `GROQ_API_KEY`, I'll be ready to help.";
    } else {
      console.error('[AI Chat]', err.message);
      return res.status(500).json({ error: 'AI assistant is temporarily unavailable' });
    }
  }

  // Save the assistant reply
  try {
    await pool.query(
      `INSERT INTO ai_chat_logs (id, user_id, conversation_id, role, message)
       VALUES (?, ?, ?, 'ai', ?)`,
      [crypto.randomUUID(), req.user.id, convId, reply]
    );
    // Bump conversation updated_at so it sorts to top
    await pool.query(
      `UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [convId]
    );
  } catch (err) {
    console.error('[AI Chat] save assistant message', err.message);
  }

  return res.json({ reply, conversation_id: convId });
});

module.exports = router;
