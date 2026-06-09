const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeJsonField } = require('../../src/services/centralAiAgent');

describe('centralAiAgent.normalizeJsonField', () => {
  it('returns null for null/undefined', () => {
    assert.equal(normalizeJsonField(null), null);
    assert.equal(normalizeJsonField(undefined), null);
  });

  it('passes through objects', () => {
    assert.deepEqual(normalizeJsonField({ a: 1 }), { a: 1 });
  });

  it('parses JSON strings', () => {
    assert.deepEqual(normalizeJsonField('{"x":2}'), { x: 2 });
  });

  it('returns raw string when JSON.parse fails', () => {
    assert.equal(normalizeJsonField('not-json'), 'not-json');
  });
});
