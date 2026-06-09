const { invokeAgent, DOMAIN } = require('./centralAiAgent');

function safeParseJson(text) {
  if (!text || typeof text !== 'string') return null;
  const s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(s);
  } catch {
    const i = s.indexOf('{');
    const j = s.lastIndexOf('}');
    if (i >= 0 && j > i) {
      try {
        return JSON.parse(s.slice(i, j + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * HR / manager monitoring brief from dashboard aggregates (structured context).
 */
async function generateMonitoringBrief({
  scope,
  trendDaily,
  employeeSnapshots,
  openAlerts,
  counts,
}) {
  const structuredContext = {
    dashboard_scope: scope,
    aggregate_counts: counts || {},
    trend_daily: Array.isArray(trendDaily) ? trendDaily.slice(-14) : [],
    employee_snapshots: Array.isArray(employeeSnapshots) ? employeeSnapshots.slice(0, 40) : [],
    open_performance_alerts: Array.isArray(openAlerts) ? openAlerts.slice(0, 25) : [],
  };

  const systemPrompt = `You are AWLMS Monitoring intelligence. Interpret ONLY the numeric and textual facts in AWLMS_STRUCTURED_CONTEXT.
Summarize workforce activity trends, threshold breaches, and priorities for leadership. Do not invent metrics.
Output JSON only: {"brief":"<multi-paragraph plain text>","priority_actions":["<short bullet>", "..."]}`;

  try {
    const { content } = await invokeAgent({
      domain: DOMAIN.MONITORING,
      operation: 'dashboard_brief',
      structuredContext,
      systemPrompt,
      messages: [
        {
          role: 'user',
          content:
            'Produce a concise executive brief and priority actions from the structured monitoring snapshot.',
        },
      ],
      temperature: 0.3,
      jsonMode: true,
    });
    const parsed = safeParseJson(content);
    if (parsed?.brief && typeof parsed.brief === 'string') {
      return {
        brief: String(parsed.brief).trim(),
        priority_actions: Array.isArray(parsed.priority_actions) ? parsed.priority_actions.map(String) : [],
        source: 'openai',
      };
    }
  } catch (e) {
    if (e.code !== 'OPENAI_MISSING') console.error('generateMonitoringBrief', e.message);
  }

  const alertN = structuredContext.open_performance_alerts?.length || 0;
  const empN = structuredContext.employee_snapshots?.length || 0;
  return {
    brief: `Monitoring snapshot (${scope}): ${empN} employee snapshot(s), ${alertN} open alert(s). Review the alert queue and drill into individuals with repeated threshold breaches.`,
    priority_actions: ['Review open alerts', 'Validate thresholds against role definitions'],
    source: 'template',
  };
}

module.exports = { generateMonitoringBrief };
