/**
 * Evaluates digital activity / productivity metrics against HR-defined role thresholds
 * stored on JobPosition.performance_thresholds (JSON).
 *
 * Expected threshold keys (optional; missing keys are skipped):
 *   focus_score_min          — minimum 0–100 focus score
 *   activity_index_min       — minimum 0–1 activity ratio
 *   productive_minutes_min     — minimum productive minutes in the reporting window
 *   tasks_completed_min        — minimum tasks completed in the window
 *
 * Submitted metrics may include: focus_score, activity_index, productive_minutes,
 * tasks_completed, digital_events_count, window_minutes, client (browser/app label).
 */

const DEFAULT_THRESHOLDS = {
  focus_score_min: 50,
  activity_index_min: 0.4,
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mergeThresholds(raw) {
  let t = { ...DEFAULT_THRESHOLDS };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    t = { ...t, ...raw };
  } else if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') t = { ...t, ...p };
    } catch {
      /* keep defaults */
    }
  }
  return t;
}

function evaluatePerformance({ thresholds, submitted }) {
  const th = mergeThresholds(thresholds);
  const metrics = { ...submitted };
  const breaches = [];

  const fs = num(metrics.focus_score);
  const ai = num(metrics.activity_index);
  const pm = num(metrics.productive_minutes);
  const tc = num(metrics.tasks_completed);
  const thFs = num(th.focus_score_min);
  const thAi = num(th.activity_index_min);
  const thPm = num(th.productive_minutes_min);
  const thTc = num(th.tasks_completed_min);

  if (fs != null && thFs != null && fs < thFs) {
    breaches.push({
      metric: 'focus_score',
      value: fs,
      minimum: thFs,
      message: `Focus score ${fs} is below the role minimum of ${thFs}.`,
    });
  }
  if (ai != null && thAi != null && ai < thAi) {
    breaches.push({
      metric: 'activity_index',
      value: ai,
      minimum: thAi,
      message: `Activity index ${ai.toFixed(2)} is below the role minimum of ${thAi}.`,
    });
  }
  if (pm != null && thPm != null && pm < thPm) {
    breaches.push({
      metric: 'productive_minutes',
      value: pm,
      minimum: thPm,
      message: `Productive minutes (${pm}) are below the role minimum (${thPm}).`,
    });
  }
  if (tc != null && thTc != null && tc < thTc) {
    breaches.push({
      metric: 'tasks_completed',
      value: tc,
      minimum: thTc,
      message: `Tasks completed (${tc}) are below the role minimum (${thTc}).`,
    });
  }

  const alert = breaches.length > 0;
  let severity = 'medium';
  if (breaches.length >= 3) severity = 'high';
  else if (breaches.length === 1 && breaches[0].metric === 'focus_score' && fs != null && thFs != null && fs < thFs * 0.7) {
    severity = 'high';
  }

  metrics.alert = alert;
  metrics.severity = alert ? severity : 'ok';
  metrics.thresholds_applied = th;
  metrics.breach_count = breaches.length;

  const resolvedSeverity = alert ? severity : 'ok';
  return { metrics, breaches, alert, severity: resolvedSeverity };
}

module.exports = { evaluatePerformance, mergeThresholds, DEFAULT_THRESHOLDS };
