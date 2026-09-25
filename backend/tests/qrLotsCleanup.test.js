import assert from "node:assert/strict";
import {
    __test,
    cleanupQrLotsFixtures,
    validateCleanupManifest,
    verifyCleanupOwnership
} from "../lib/qrLotsCleanup.mjs";

const organisationId = "04fbfede-8cf8-47fc-a9b2-599b766229e2";
const runId = "11111111-2222-4333-8444-555555555555";
const ids = {
    agentUser: "aaaaaaaa-1111-4111-8111-111111111111",
    agent: "aaaaaaaa-2222-4222-8222-222222222222",
    managerUser: "aaaaaaaa-3333-4333-8333-333333333333",
    collecte: "aaaaaaaa-4444-4444-8444-444444444444",
    mission: "aaaaaaaa-5555-4555-8555-555555555555",
    tricycle: "aaaaaaaa-6666-4666-8666-666666666666",
    balanceTerrain: "aaaaaaaa-7777-4777-8777-777777777777"
};
const clientId = "bbbbbbbb-1111-4111-8111-111111111111";
const typeId = "bbbbbbbb-2222-4222-8222-222222222222";
const containerId = "cccccccc-1111-4111-8111-111111111111";
const lotId = "cccccccc-2222-4222-8222-222222222222";
const stockId = "cccccccc-3333-4333-8333-333333333333";
const movementId = "cccccccc-4444-4444-8444-444444444444";
const operationId = "cccccccc-5555-4555-8555-555555555555";
const compact = runId.replaceAll("-", "").toUpperCase();

function manifest(overrides = {}) {
    return {
        version: 3,
        runId,
        label: `qrlots-v1-${runId}`,
        ids: { ...ids },
        codeSac: `PR-C-SAC-${compact.slice(0, 12)}`,
        codeBac: `PR-C-BAC-${compact.slice(12, 24)}`,
        codeLot: `PR-L-LOT-${compact.slice(0, 12)}`,
        numeroTricycle: `TRI-TEST-${compact.slice(0, 12)}`,
        numeroBalanceTerrain: `BAL-TEST-${compact.slice(0, 12)}`,
        client: { id: clientId },
        type: { id: typeId },
        stockBefore: null,
        lotId: null,
        emails: {
            agent: `qrlots-agent-${runId}@example.com`,
            manager: `qrlots-manager-${runId}@example.com`
        },
        created: {
            containers: [],
            lot: null,
            stock: null,
            mouvementStock: null
        },
        ...overrides
    };
}

const emptySnapshot = () => ({
    users: [], agents: [], missions: [], collectes: [], tricycles: [], balances: [],
    contenants: [], lots: [], stock: []
});

describe("Nettoyage hors réseau QR/Lots", function () {
    it("refuse un manifeste incomplet avant toute requête", function () {
        assert.throws(
            () => validateCleanupManifest({ version: 3, runId }, organisationId),
            /Libellé de propriétaire invalide/
        );
    });

    it("refuse un mismatch de propriétaire ou d'UUID", function () {
        const spec = validateCleanupManifest(manifest(), organisationId);
        const snapshot = emptySnapshot();
        snapshot.users.push({
            id: ids.agentUser,
            organisation_id: "dddddddd-1111-4111-8111-111111111111",
            email: spec.expected.agentEmail,
            nom: `${spec.expected.label} agent`
        });
        assert.throws(() => verifyCleanupOwnership(spec, snapshot), /autre organisation/);

        const withContainer = manifest({
            created: {
                containers: [{ id: containerId, code: `PR-C-SAC-${compact.slice(0, 12)}` }],
                lot: null, stock: null, mouvementStock: null
            }
        });
        const containerSpec = validateCleanupManifest(withContainer, organisationId);
        const wrongUuid = emptySnapshot();
        wrongUuid.contenants.push({
            id: "dddddddd-2222-4222-8222-222222222222",
            organisation_id: organisationId,
            code_qr: withContainer.codeSac,
            creation_user_id: ids.managerUser,
            creation_count: 1
        });
        assert.throws(() => verifyCleanupOwnership(containerSpec, wrongUuid), /non enregistré/);
    });

    it("conserve une compatibilité sûre avec un ancien manifeste", function () {
        const legacy = manifest({ version: 2, created: undefined });
        const spec = validateCleanupManifest(legacy, organisationId);
        const snapshot = emptySnapshot();
        snapshot.contenants.push({
            id: containerId,
            organisation_id: organisationId,
            code_qr: legacy.codeSac,
            creation_user_id: ids.managerUser,
            creation_count: 1
        });
        assert.equal(verifyCleanupOwnership(spec, snapshot), true);
    });

    it("ne supprime aucun stock lorsque stockBefore est vide et aucun stock n'est enregistré", async function () {
        const spec = validateCleanupManifest(manifest(), organisationId);
        const sql = [];
        const client = {
            async query(text) {
                sql.push(text.replace(/\s+/g, " ").trim());
                return { rowCount: 0, rows: [] };
            }
        };
        await __test.applyCleanup(client, spec, emptySnapshot());
        assert.equal(sql.some(text => /^DELETE FROM stocks/i.test(text)), false);
        assert.equal(sql.some(text => /^UPDATE stocks/i.test(text)), false);
    });

    it("effectue le nettoyage nominal du stock uniquement par UUID enregistré", async function () {
        const value = manifest({
            lotId,
            created: {
                containers: [{ id: containerId, code: `PR-C-SAC-${compact.slice(0, 12)}` }],
                lot: { id: lotId, code: `PR-L-LOT-${compact.slice(0, 12)}`, operationId },
                stock: { id: stockId },
                mouvementStock: { id: movementId }
            }
        });
        const spec = validateCleanupManifest(value, organisationId);
        const snapshot = emptySnapshot();
        snapshot.contenants.push({ id: containerId });
        snapshot.stock.push({
            movement_id: movementId,
            stock_id: stockId,
            stock_quantity: "110",
            movement_quantity: "110"
        });
        const calls = [];
        const client = {
            async query(text, values) {
                const normalized = text.replace(/\s+/g, " ").trim();
                calls.push({ text: normalized, values });
                const one = /^DELETE FROM (stocks|mouvements_stock|contenants)/i.test(normalized);
                return { rowCount: one ? 1 : 0, rows: [] };
            }
        };
        await __test.applyCleanup(client, spec, snapshot);
        const stockDelete = calls.find(call => /^DELETE FROM stocks/i.test(call.text));
        assert.ok(stockDelete);
        assert.match(stockDelete.text, /WHERE id=\$1 AND organisation_id=\$2/);
        assert.equal(stockDelete.values[0], stockId);
        assert.equal(calls.some(call => /DELETE FROM stocks WHERE organisation_id/i.test(call.text)), false);
    });

    it("rollback automatiquement si une vérification de propriété échoue", async function () {
        const commands = [];
        const client = {
            async query(text) {
                const normalized = text.replace(/\s+/g, " ").trim();
                commands.push(normalized);
                if (/^SELECT id,organisation_id,email,nom FROM utilisateurs/i.test(normalized)) {
                    return { rows: [{
                        id: ids.agentUser,
                        organisation_id: "dddddddd-1111-4111-8111-111111111111",
                        email: `qrlots-agent-${runId}@example.com`,
                        nom: `qrlots-v1-${runId} agent`
                    }], rowCount: 1 };
                }
                return { rows: [], rowCount: 0 };
            },
            release() { commands.push("RELEASE"); }
        };
        const pool = { async connect() { return client; } };
        await assert.rejects(() => cleanupQrLotsFixtures(pool, manifest(), organisationId), /autre organisation/);
        assert.ok(commands.includes("BEGIN"));
        assert.ok(commands.includes("ROLLBACK"));
        assert.equal(commands.includes("COMMIT"), false);
        assert.ok(commands.includes("RELEASE"));
    });
});
