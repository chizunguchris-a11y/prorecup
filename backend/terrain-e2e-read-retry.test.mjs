import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWithRetry } from './terrain-e2e-read-retry.mjs';

test('transient reads recover with bounded backoff and unchanged parameters', async () => {
    let calls = 0;
    const waits = [], retries = [], values = ['fixture'];
    const pool = { query: async (sql, args) => {
        assert.equal(sql, 'SELECT id FROM missions WHERE id=$1'); assert.equal(args, values);
        if (++calls < 3) throw Object.assign(new Error('network'), { code: 'ETIMEDOUT' });
        return { rows: [{ id: 'fixture' }] };
    } };
    const result = await readWithRetry(pool, 'SELECT id FROM missions WHERE id=$1', values,
        { wait: async ms => waits.push(ms), onRetry: r => retries.push(r) });
    assert.equal(result.rows[0].id, 'fixture'); assert.equal(calls, 3);
    assert.deepEqual(waits, [1000, 2000]); assert.equal(retries.length, 2);
});
test('third transient failure propagates without a fourth attempt', async () => {
    let calls = 0;
    const error = new Error('Query read timeout');
    await assert.rejects(readWithRetry({ query: async () => { calls++; throw error; } }, 'SELECT 1', [], { wait: async () => {} }), e => e === error);
    assert.equal(calls, 3);
});
test('business, authorization, SQL errors and manual cancellation never retry', async () => {
    for (const error of [new assert.AssertionError({ message: 'wrong mission status' }),
        ...['42501', '42601', '23505', '57014'].map(code => Object.assign(new Error('permanent'), { code }))]) {
        let calls = 0;
        await assert.rejects(readWithRetry({ query: async () => { calls++; throw error; } }, 'SELECT 1'), e => e === error);
        assert.equal(calls, 1);
    }
});
test('wrong or missing rows are returned once for immediate business assertions', async () => {
    for (const rows of [[], [{ statut: 'planifiee' }]]) {
        let calls = 0;
        const result = await readWithRetry({ query: async () => { calls++; return { rows }; } }, 'SELECT statut FROM missions');
        assert.equal(result.rows, rows); assert.equal(calls, 1);
    }
});
test('mutation statements never reach the pool', async () => {
    for (const sql of ['POST /api/terrain', 'DELETE FROM missions', 'UPDATE missions SET statut=1', 'WITH mutation AS (DELETE FROM missions) SELECT 1']) {
        await assert.rejects(readWithRetry({ query: async () => assert.fail('Must not run') }, sql), assert.AssertionError);
    }
});
