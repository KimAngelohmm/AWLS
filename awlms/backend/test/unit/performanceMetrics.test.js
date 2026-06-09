const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluatePerformance,
  mergeThresholds,
  DEFAULT_THRESHOLDS,
} = require('../../src/services/performanceMetrics');

describe('performanceMetrics', () => {
  it('mergeThresholds keeps defaults and overlays JSON string/object', () => {
    const merged = mergeThresholds({ focus_score_min: 60 });
    assert.equal(merged.focus_score_min, 60);
    assert.equal(merged.activity_index_min, DEFAULT_THRESHOLDS.activity_index_min);
    const fromStr = mergeThresholds(JSON.stringify({ productive_minutes_min: 120 }));
    assert.equal(fromStr.productive_minutes_min, 120);
    assert.equal(fromStr.focus_score_min, DEFAULT_THRESHOLDS.focus_score_min);
  });

  it('evaluatePerformance reports no breaches when metrics meet thresholds', () => {
    const { metrics, breaches, alert, severity } = evaluatePerformance({
      thresholds: { focus_score_min: 50, activity_index_min: 0.4 },
      submitted: { focus_score: 80, activity_index: 0.9 },
    });
    assert.equal(breaches.length, 0);
    assert.equal(alert, false);
    assert.equal(severity, 'ok');
    assert.equal(metrics.severity, 'ok');
    assert.equal(metrics.alert, false);
  });

  it('evaluatePerformance aggregates multiple breaches and severity', () => {
    const r = evaluatePerformance({
      thresholds: {
        focus_score_min: 80,
        activity_index_min: 0.9,
        productive_minutes_min: 400,
        tasks_completed_min: 50,
      },
      submitted: {
        focus_score: 10,
        activity_index: 0.1,
        productive_minutes: 0,
        tasks_completed: 0,
      },
    });
    assert.ok(r.breaches.length >= 3);
    assert.equal(r.alert, true);
    assert.equal(r.severity, 'high');
  });

  it('evaluatePerformance upgrades severity when focus_score is far below threshold', () => {
    const r = evaluatePerformance({
      thresholds: { focus_score_min: 100 },
      submitted: { focus_score: 50 },
    });
    assert.equal(r.breaches.length, 1);
    assert.equal(r.severity, 'high');
  });
});
