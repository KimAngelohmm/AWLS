/**
 * Central LLM agent for AWLMS — all modules send structured organizational context
 * with each invocation so the model stays grounded in role requirements, competencies,
 * and employee/job records supplied by the backend (not inferred).
 */

const { openaiChatCompletion } = require('./openaiClient');

const DOMAIN = {
  RECRUITMENT: 'recruitment',
  LIFECYCLE: 'lifecycle',
  MONITORING: 'monitoring',
};

function logDebug(domain, operation, extra) {
  if (process.env.DEBUG_AWLMS_AI === '1') {
    console.log('[AWLMS AI]', domain, operation, extra || '');
  }
}

/**
 * Normalize MySQL JSON columns (object | string | null).
 */
function normalizeJsonField(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Wraps OpenAI calls with a mandatory structured context envelope (domain + operation + org data).
 *
 * @param {object} params
 * @param {string} params.domain - DOMAIN.* 
 * @param {string} params.operation - e.g. interview_turn, formal_notification, resignation_chat
 * @param {object} [params.structuredContext] - Role requirements, competencies, employee snapshots, etc.
 * @param {string} params.systemPrompt - Role-specific instructions (must reference CONTEXT truthfully).
 * @param {Array<{role:string,content:string}>} params.messages - Chat history / user turns (no system role).
 * @param {number} [params.temperature]
 * @param {boolean} [params.jsonMode=true] - JSON object response vs plain text.
 */
async function invokeAgent({
  domain,
  operation,
  structuredContext = {},
  systemPrompt,
  messages = [],
  temperature = 0.35,
  jsonMode = true,
}) {
  logDebug(domain, operation, { contextKeys: Object.keys(structuredContext || {}) });

  const envelope = {
    awlms_domain: domain,
    awlms_operation: operation,
    organizational_data: structuredContext && typeof structuredContext === 'object' ? structuredContext : {},
  };

  const contextBlock = `AWLMS_STRUCTURED_CONTEXT (JSON — authoritative data from the HRIS for this interaction; treat as ground truth):\n${JSON.stringify(envelope, null, 2)}`;

  const fullSystem = `${systemPrompt.trim()}\n\n${contextBlock}`;

  const msgs = [{ role: 'system', content: fullSystem }, ...messages];

  return openaiChatCompletion({
    messages: msgs,
    temperature,
    responseFormat: jsonMode ? 'json_object' : 'text',
  });
}

module.exports = {
  DOMAIN,
  invokeAgent,
  normalizeJsonField,
  logDebug,
};
