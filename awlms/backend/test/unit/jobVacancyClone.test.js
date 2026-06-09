const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

describe('jobVacancyClone', () => {
  it('cloneJobPositionFromSource inserts open job cloned from source row', async () => {
    mock.method(crypto, 'randomUUID', () => '11111111-1111-1111-1111-111111111111');

    const { cloneJobPositionFromSource } = require('../../src/services/jobVacancyClone');
    const calls = [];
    const pool = {
      async query(sql, params) {
        calls.push({ sql, params });
        return [];
      },
    };

    const newId = await cloneJobPositionFromSource(pool, {
      sourceJobPositionId: 'src-job',
      createdByUserId: 'hr-user',
    });

    assert.equal(newId, '11111111-1111-1111-1111-111111111111');
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /INSERT INTO JobPosition/i);
    assert.match(calls[0].sql, /'open'/);
    assert.match(calls[0].sql, /FROM JobPosition WHERE id = \?/);
    assert.deepEqual(calls[0].params, [newId, 'hr-user', 'src-job']);

    mock.restoreAll();
  });
});
