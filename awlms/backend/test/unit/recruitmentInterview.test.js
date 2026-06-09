const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateInterviewModelOutput,
  safeJsonParse,
  normalizeStoredAiRecommendation,
  buildInterviewStructuredContext,
  countAssistantTurns,
} = require('../../src/services/recruitmentInterview');

describe('recruitmentInterview — interview question / evaluation contract', () => {
  it('safeJsonParse strips markdown fences and parses embedded JSON', () => {
    const raw = '```json\n{"type":"question","text":"What is your experience?"}\n```';
    const p = safeJsonParse(raw);
    assert.deepEqual(p, { type: 'question', text: 'What is your experience?' });
  });

  it('validateInterviewModelOutput accepts question shape', () => {
    const v = validateInterviewModelOutput({ type: 'question', text: '  One question?  ' });
    assert.equal(v.ok, true);
    assert.equal(v.value.type, 'question');
    assert.equal(v.value.text, 'One question?');
  });

  it('validateInterviewModelOutput accepts complete shape with hire synonyms', () => {
    for (const ai_recommendation of ['hire', 'accept', 'Hire']) {
      const v = validateInterviewModelOutput({
        type: 'complete',
        assessment_summary: 'Strong candidate.',
        ai_recommendation,
      });
      assert.equal(v.ok, true);
      assert.equal(v.value.ai_recommendation, 'hire');
    }
  });

  it('validateInterviewModelOutput accepts no_hire synonyms', () => {
    for (const ai_recommendation of ['no_hire', 'reject', 'NO_HIRE']) {
      const v = validateInterviewModelOutput({
        type: 'complete',
        assessment_summary: 'Summary.',
        ai_recommendation,
      });
      assert.equal(v.ok, true);
      assert.equal(v.value.ai_recommendation, 'no_hire');
    }
  });

  it('validateInterviewModelOutput rejects incomplete applicant-style payloads', () => {
    assert.equal(validateInterviewModelOutput(null).ok, false);
    assert.equal(validateInterviewModelOutput({ type: 'question' }).ok, false);
    assert.equal(
      validateInterviewModelOutput({ type: 'complete', assessment_summary: 'x' }).ok,
      false
    );
    assert.equal(
      validateInterviewModelOutput({
        type: 'complete',
        assessment_summary: 'x',
        ai_recommendation: 'maybe',
      }).ok,
      false
    );
  });

  it('normalizeStoredAiRecommendation maps unknown values to hire (HR review gate)', () => {
    assert.equal(normalizeStoredAiRecommendation('no_hire'), 'no_hire');
    assert.equal(normalizeStoredAiRecommendation('hire'), 'hire');
    assert.equal(normalizeStoredAiRecommendation(undefined), 'hire');
  });

  it('buildInterviewStructuredContext normalizes JSON columns', () => {
    const job = {
      title: 'Dev',
      description: 'd',
      department_id: 1,
      department_name: 'Eng',
      competency_requirements: '{"k":"v"}',
      interview_criteria: { rubric: true },
      performance_thresholds: null,
    };
    const ctx = buildInterviewStructuredContext(job);
    assert.deepEqual(ctx.competency_requirements, { k: 'v' });
    assert.deepEqual(ctx.interview_criteria_rubric, { rubric: true });
    assert.equal(ctx.performance_expectations_for_role, null);
  });

  it('countAssistantTurns counts interviewer turns for caps', () => {
    assert.equal(countAssistantTurns([]), 0);
    assert.equal(
      countAssistantTurns([
        { role: 'assistant', content: 'a' },
        { role: 'user', content: 'b' },
        { role: 'assistant', content: 'c' },
      ]),
      2
    );
  });
});
