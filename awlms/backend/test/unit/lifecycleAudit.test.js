const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

describe('lifecycleAudit.insertLifecycleAudit', () => {
  it('writes audit row with JSON metadata', async () => {
    mock.method(crypto, 'randomUUID', () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

    const { insertLifecycleAudit } = require('../../src/services/lifecycleAudit');
    const queries = [];
    const pool = {
      async query(sql, params) {
        queries.push({ sql, params });
        return [];
      },
    };

    const id = await insertLifecycleAudit(pool, {
      action: 'resignation_completed',
      entityType: 'LifecycleEvent',
      entityId: 'evt-1',
      actorUserId: 'user-1',
      metadata: { auto_generated_job_position_id: 'job-new' },
    });

    assert.equal(id, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    assert.equal(queries.length, 1);
    assert.match(queries[0].sql, /INSERT INTO LifecycleAuditLog/i);
    assert.ok(queries[0].params[5].includes('auto_generated_job_position_id'));

    mock.restoreAll();
  });
});
