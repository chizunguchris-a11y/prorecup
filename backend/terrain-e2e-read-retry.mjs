// Test-only: the caller supplies a PostgreSQL pool configured read-only.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';

const transientCodes = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'EAI_AGAIN', '08000', '08001', '08003', '08006', '57P01', '57P02', '57P03']);
const timeoutMessages = new Set(['Connection terminated due to connection timeout', 'Connection terminated unexpectedly', 'timeout exceeded when trying to connect', 'timeout expired', 'Query read timeout']);
export function isTransientReadError(error) {
    if (error instanceof AggregateError) return error.errors.length > 0 && error.errors.every(isTransientReadError);
    return transientCodes.has(error.code) || timeoutMessages.has(error.message) ||
        (error.code === '57014' && error.message === 'canceling statement due to statement timeout');
}

export async function readWithRetry(pool, sql, values = [], { onRetry = () => {}, wait = sleep } = {}) {
    // Fixed SELECTs only, parameterized values, plus server-enforced read-only mode.
    assert.match(sql, /^SELECT\s/i);
    for (let attempt = 1; attempt <= 3; attempt++) {
        try { return await pool.query(sql, values); }
        catch (error) {
            if (attempt === 3 || !isTransientReadError(error)) throw error;
            const delayMs = attempt * 1000;
            onRetry({ attempt, nextAttempt: attempt + 1, delayMs, code: error.code || 'TRANSIENT_CONNECTION_OR_TIMEOUT' });
            await wait(delayMs);
        }
    }
}
