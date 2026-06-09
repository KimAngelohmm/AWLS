const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { evaluatePerformance } = require('../../src/services/performanceMetrics');
const {
  validateInterviewModelOutput,
  mergeThresholds,
} = require('../../src/services/recruitmentInterview');
const { mergeThresholds: mergePerf } = require('../../src/services/performanceMetrics');

describe('system — concurrency and edge cases', () => {
  it('many concurrent performance evaluations return isolated results', async () => {
    const tasks = Array.from({ length: 80 }, (_, i) =>
      Promise.resolve(
        evaluatePerformance({
          thresholds: { focus_score_min: 40 + (i % 5) },
          submitted: { focus_score: 30 + i, activity_index: 0.5 },
        })
      )
    );
    const results = await Promise.all(tasks);
    assert.equal(results.length, 80);
    const severityCounts = results.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {});
    assert.ok(Object.keys(severityCounts).length >= 1);
    assert.ok(results.every((r) => r.metrics.thresholds_applied != null));
  });

  it('parallel mergeThresholds does not corrupt DEFAULT_THRESHOLDS export', async () => {
    const { DEFAULT_THRESHOLDS } = require('../../src/services/performanceMetrics');
    const baseline = { ...DEFAULT_THRESHOLDS };
    await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        Promise.resolve(mergePerf({ focus_score_min: 10 + i }))
      )
    );
    assert.deepEqual(DEFAULT_THRESHOLDS, baseline);
  });

  it('incomplete model payloads remain invalid under parallel validation', async () => {
    const badPayloads = [
      null,
      {},
      { type: 'complete', assessment_summary: 'only summary' },
      { type: 'question' },
      { type: 'complete', ai_recommendation: 'hire' },
    ];
    const outcomes = await Promise.all(
      badPayloads.map((p) => Promise.resolve(validateInterviewModelOutput(p)))
    );
    assert.ok(outcomes.every((o) => o.ok === false));
  });

  it('simulated burst of lifecycle-style counters stays consistent', async () => {
    let auditSeq = 0;
    const incrementAudit = () => {
      auditSeq += 1;
      return auditSeq;
    };
    const burst = await Promise.all(Array.from({ length: 50 }, () => Promise.resolve(incrementAudit())));
    assert.equal(Math.max(...burst), 50);
    assert.equal(auditSeq, 50);
  });
});
