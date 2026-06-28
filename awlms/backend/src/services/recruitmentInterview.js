const { invokeAgent, DOMAIN, normalizeJsonField } = require('./centralAiAgent');
const { getPsfContext } = require('./psfService');

function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildInterviewRulesPrompt() {
  return `You are the AWLMS AI interviewer. All facts about the open role (title, competencies, rubric, expectations) are supplied in AWLMS_STRUCTURED_CONTEXT — rely on that data; do not invent policy.

RULES:
1. Conduct a structured, role-specific conversational interview using the provided questionnaire as your guide.
2. Ask exactly ONE clear question at a time. Never ask multiple unrelated questions in one turn.
3. Follow the questionnaire order when possible, but adapt follow-up questions based on the candidate's prior answers.
4. If AWLMS_STRUCTURED_CONTEXT contains "questionnaire_questions", use them as the primary interview guide. These are role-specific questions designed specifically for this position.
5. If AWLMS_STRUCTURED_CONTEXT contains "psf_competency_context", use the "functional_skills_to_assess" and "enabling_skills_to_assess" lists to guide follow-ups.
6. Keep a professional, neutral tone. Do not reveal internal scoring formulas; evaluate internally.
7. Evaluate only job-relevant evidence from the candidate's answers, interview transcript, and role criteria.
8. Do NOT infer responsibility, maturity, honesty, professionalism, attitude, or job fit from camera appearance, clothing, facial expression, body language, accent, age, disability, race, ethnicity, or gender.
9. Do NOT mention visual traits, emotions detected from video, or speculative personality judgments in questions, summaries, or recommendations.
10. After asking 5-7 questions OR when you can confidently decide, end the interview.
11. You MUST respond with a single JSON object only (no markdown fences), using one of these shapes:
   {"type":"question","text":"<your next question>"}
   {"type":"complete","assessment_summary":"<formal multi-paragraph summary referencing criteria>","ai_recommendation":"hire"|"no_hire"}
12. assessment_summary must be suitable for HR review: summarize strengths, risks, evidence from answers, and alignment with competencies.
13. ai_recommendation "hire" means you recommend moving forward; "no_hire" means you recommend not hiring, based on the rubric. HR makes the final hiring decision.`;
}

async function buildInterviewStructuredContext(job, pool) {
  // Look up PSF competency context for this job title
  const psf = getPsfContext(job.title || '');

  // Fetch questionnaire for this job role
  let questionnaire = [];
  try {
    if (pool) {
      const [rows] = await pool.query(
        `SELECT question_number, question_text FROM InterviewQuestionnaire 
         WHERE job_title = ? 
         ORDER BY question_number ASC`,
        [job.title || '']
      );
      questionnaire = rows || [];
    }
  } catch (err) {
    console.warn('Could not fetch questionnaire:', err.message);
  }

  return {
    job_requisition: {
      title: job.title,
      description: job.description || null,
      department_id: job.department_id || null,
      department_name: job.department_name || null,
    },
    competency_requirements: normalizeJsonField(job.competency_requirements),
    interview_criteria_rubric: normalizeJsonField(job.interview_criteria),
    questionnaire_questions: questionnaire.length > 0 
      ? questionnaire.map(q => `${q.question_number}. ${q.question_text}`)
      : null,
    psf_competency_context: psf.found
      ? {
          domain: psf.domain,
          domain_description: psf.description,
          functional_skills_to_assess: psf.functional_skills,
          enabling_skills_to_assess: psf.enabling_skills,
          interview_guidance: psf.interviewGuidance,
        }
      : null,
  };
}

function transcriptAppend(existing, speaker, name, text) {
  const line = `[${speaker === 'assistant' ? 'AI Interviewer' : name || 'Candidate'}]: ${text}\n`;
  return (existing || '') + line;
}

function countAssistantTurns(messages) {
  if (!Array.isArray(messages)) return 0;
  return messages.filter((m) => m.role === 'assistant').length;
}

function validateParsed(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Invalid JSON from model' };
  if (parsed.type === 'question' && parsed.text && typeof parsed.text === 'string') {
    return { ok: true, value: { type: 'question', text: parsed.text.trim() } };
  }
  if (parsed.type === 'complete' && parsed.assessment_summary && parsed.ai_recommendation) {
    const rec = String(parsed.ai_recommendation).trim().toLowerCase().replace(/\s+/g, '_');
    const normalized =
      rec === 'no_hire' || rec === 'nohire' || rec === 'reject'
        ? 'no_hire'
        : rec === 'hire' || rec === 'accept'
          ? 'hire'
          : null;
    if (!normalized) {
      return { ok: false, error: 'ai_recommendation must be hire or no_hire' };
    }
    return {
      ok: true,
      value: {
        type: 'complete',
        assessment_summary: String(parsed.assessment_summary).trim(),
        ai_recommendation: normalized,
      },
    };
  }
  return { ok: false, error: 'Model JSON must be type question or complete with required fields' };
}

/** Maps validated model recommendation to Applicant.ai_recommendation storage values. */
function normalizeStoredAiRecommendation(aiRecommendation) {
  return aiRecommendation === 'no_hire' ? 'no_hire' : 'hire';
}

async function runInterviewModel({ job, interviewMessages, userInstruction, pool }) {
  const structuredContext = await buildInterviewStructuredContext(job, pool);

  const msgs = [];
  for (const m of interviewMessages || []) {
    if (m.role === 'assistant' || m.role === 'user') {
      msgs.push({ role: m.role, content: String(m.content || '') });
    }
  }
  msgs.push({ role: 'user', content: userInstruction });

  const { content } = await invokeAgent({
    domain: DOMAIN.RECRUITMENT,
    operation: 'interview_turn',
    structuredContext,
    systemPrompt: buildInterviewRulesPrompt(),
    messages: msgs,
    temperature: 0.35,
    jsonMode: true,
  });

  const parsedRaw = safeJsonParse(content);
  const validated = validateParsed(parsedRaw);
  if (!validated.ok) {
    const err = new Error(validated.error || 'Model output invalid');
    err.code = 'MODEL_PARSE';
    err.rawContent = content;
    throw err;
  }
  return validated.value;
}

async function generateFirstQuestion({ job, applicantName, pool }) {
  const instruction = `The candidate "${applicantName}" has just applied. Begin the interview. Output JSON only with your first question.`;
  return runInterviewModel({ job, interviewMessages: [], userInstruction: instruction, pool });
}

async function generateNextTurn({ job, interviewMessages, pool }) {
  const turns = countAssistantTurns(interviewMessages);
  const mustComplete = turns >= 8;
  const instruction =
    `The full conversation so far is in the thread (the applicant's latest answer is the most recent user message). ` +
    `Assistant questions so far: ${turns}. ` +
    (mustComplete
      ? `You MUST now respond with JSON type "complete" with assessment_summary and ai_recommendation.`
      : `If you have enough evidence against the rubric, respond with JSON type "complete"; otherwise respond with JSON type "question" and a single follow-up question.`);
  return runInterviewModel({ job, interviewMessages, userInstruction: instruction, pool });
}

module.exports = {
  generateFirstQuestion,
  generateNextTurn,
  transcriptAppend,
  countAssistantTurns,
  buildInterviewStructuredContext,
  validateInterviewModelOutput: validateParsed,
  safeJsonParse,
  normalizeStoredAiRecommendation,
};
