import assert from "node:assert/strict";
import {
    beginTransactionWithRetry,
    isTransientConnectionError
} from "../lib/qrLotsTransaction.mjs";

const timeout = () => {
    const error = new Error("Connection terminated due to connection timeout");
    error.code = "ETIMEDOUT";
    return error;
};

describe("Ouverture transaction recette QR/Lots hors réseau", function () {
    it("retente un timeout de connexion puis réussit", async function () {
        let connections = 0;
        const queries = [];
        const sleeps = [];
        const client = {
            async query(sql) {
                queries.push(sql);
            },
            release() {
                throw new Error("Le client réussi ne doit pas être libéré par le helper.");
            }
        };
        const pool = {
            async connect() {
                connections += 1;
                if (connections === 1) throw timeout();
                return client;
            }
        };

        const result = await beginTransactionWithRetry(pool, {
            delaysMs: [10, 20],
            sleep: async delay => sleeps.push(delay)
        });

        assert.equal(result, client);
        assert.equal(connections, 2);
        assert.deepEqual(queries, ["BEGIN"]);
        assert.deepEqual(sleeps, [10]);
    });

    it("détruit une connexion dont BEGIN expire avant de retenter", async function () {
        let connections = 0;
        const releases = [];
        const pool = {
            async connect() {
                connections += 1;
                const current = connections;
                return {
                    async query(sql) {
                        assert.equal(sql, "BEGIN");
                        if (current === 1) throw timeout();
                    },
                    release(destroy) {
                        releases.push({ current, destroy });
                    }
                };
            }
        };

        const client = await beginTransactionWithRetry(pool, {
            delaysMs: [0],
            sleep: async () => {}
        });

        assert.equal(connections, 2);
        assert.deepEqual(releases, [{ current: 1, destroy: true }]);
        client.release();
        assert.deepEqual(releases, [
            { current: 1, destroy: true },
            { current: 2, destroy: undefined }
        ]);
    });

    it("s'arrête après un nombre borné de timeouts", async function () {
        let connections = 0;
        const pool = {
            async connect() {
                connections += 1;
                throw timeout();
            }
        };

        await assert.rejects(
            () => beginTransactionWithRetry(pool, {
                delaysMs: [0, 0],
                sleep: async () => {}
            }),
            /connexion, tentative 3\/3.*connection timeout/i
        );
        assert.equal(connections, 3);
    });

    it("ne rejoue jamais une opération métier après BEGIN", async function () {
        let connections = 0;
        let businessCalls = 0;
        const client = {
            async query(sql) {
                if (sql === "BEGIN") return;
                businessCalls += 1;
                throw timeout();
            },
            release() {}
        };
        const pool = {
            async connect() {
                connections += 1;
                return client;
            }
        };

        const transaction = await beginTransactionWithRetry(pool, {
            delaysMs: [0, 0],
            sleep: async () => {}
        });
        await assert.rejects(
            () => transaction.query("INSERT OPERATION METIER"),
            /connection timeout/i
        );

        assert.equal(connections, 1);
        assert.equal(businessCalls, 1);
        assert.equal(isTransientConnectionError(timeout()), true);
    });
});
