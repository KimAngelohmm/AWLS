const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('lifecycleAi — deterministic fallbacks (no OpenAI)', () => {
  let prevKey;

  beforeEach(() => {
    prevKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (prevKey !== undefined) process.env.OPENAI_API_KEY = prevKey;
    else delete process.env.OPENAI_API_KEY;
  });

  it('generateFormalHrNotification returns template letter when API key missing', async () => {
    const lifecycleAi = require('../../src/services/lifecycleAi');
    const r = await lifecycleAi.generateFormalHrNotification({
      decisionType: 'promotion',
      employeeName: 'Alex',
      jobTitle: 'Analyst',
      departmentName: 'Ops',
      effectiveNote: 'Effective next quarter.',
    });
    assert.equal(r.source, 'template');
    assert.ok(r.subject.toLowerCase().includes('promotion'));
    assert.ok(r.body.includes('Alex'));
  });

  it('generateResignationPack returns template acknowledgment when API key missing', async () => {
    const lifecycleAi = require('../../src/services/lifecycleAi');
    const r = await lifecycleAi.generateResignationPack({
      employeeName: 'Sam',
      jobTitle: 'Designer',
      lastWorkingDate: '2026-06-01',
      departmentName: 'Product',
      competencySnapshot: null,
      performanceSnapshot: null,
    });
    assert.equal(r.source, 'template');
    assert.ok(r.assistant_acknowledgment.includes('Sam'));
    assert.ok(r.exit_documentation.includes('EXIT RECORD'));
  });

  it('generateResignationChatReply falls back to rule-based assistant when API key missing', async () => {
    const lifecycleAi = require('../../src/services/lifecycleAi');
    const r = await lifecycleAi.generateResignationChatReply({
      employeeDisplayName: 'Sam',
      jobTitle: 'Designer',
      departmentName: 'Product',
      employmentStatus: 'active',
      competencySnapshot: null,
      performanceSnapshot: null,
      recentDialogue: '',
      userMessage: 'I want to resign',
    });
    assert.equal(r.source, 'template');
    assert.ok(typeof r.reply === 'string' && r.reply.length > 0);
  });
});
