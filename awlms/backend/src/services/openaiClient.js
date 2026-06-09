/**
 * Groq Chat Completions for AWLMS AI.
 * Requires GROQ_API_KEY. Model: GROQ_MODEL (default llama-3.1-8b-instant).
 *
 * Groq uses the OpenAI-compatible API format, so the interface is identical.
 */

async function openaiChatCompletion({ messages, temperature = 0.35, responseFormat }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('GROQ_API_KEY is not configured');
    err.code = 'OPENAI_MISSING';
    throw err;
  }

  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  const wantJson = responseFormat === 'json_object';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
      ...(wantJson && { response_format: { type: 'json_object' } }),
      messages,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || 'Groq request failed';
    const err = new Error(msg);
    err.code = 'OPENAI_HTTP';
    err.status = res.status;
    err.detail = data;
    throw err;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    const err = new Error('Empty model response');
    err.code = 'OPENAI_EMPTY';
    throw err;
  }

  return { content, raw: data };
}

module.exports = { openaiChatCompletion };
