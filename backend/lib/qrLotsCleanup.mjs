import assert from "node:assert/strict";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const asArray = value => Array.isArray(value) ? value : [];
const sameNumber = (left, right) => Number(left) === Number(right);

const requireUuid = (value, name) => {
    assert.match(String(value || ""), UUID, `${name} invalide ou absent.`);
    return value;
};

export function validateCleanupManifest(manifest, organisationId) {
    assert.ok(manifest && typeof manifest === "object", "Manifeste absent ou invalide.");
    requireUuid(organisationId, "organisationId");
    const runId = requireUuid(manifest.runId, "runId");
    const compact = runId.replaceAll("-", "").toUpperCase();
    const expected = {
        label: `qrlots-v1-${runId}`,
        codeSac: `PR-C-SAC-${compact.slice(0, 12)}`,
        codeBac: `PR-C-BAC-${compact.slice(12, 24)}`,
        codeLot: `PR-L-LOT-${compact.slice(0, 12)}`,
        agentEmail: `qrlots-agent-${runId}@example.com`,
        managerEmail: `qrlots-manager-${runId}@example.com`
    };
    assert.equal(manifest.label, expected.label, "Libellé de propriétaire invalide.");
    assert.equal(manifest.codeSac, expected.codeSac, "Code sac non propriétaire.");
    assert.equal(manifest.codeBac, expected.codeBac, "Code bac non propriétaire.");
    assert.equal(manifest.codeLot, expected.codeLot, "Code lot non propriétaire.");
    assert.equal(manifest.emails?.agent, expected.agentEmail, "E-mail agent non propriétaire.");
    assert.equal(manifest.emails?.manager, expected.managerEmail, "E-mail manager non propriétaire.");

    const ids = manifest.ids || {};
    for (const key of ["agentUser", "agent", "managerUser", "collecte", "mission"]) {
        requireUuid(ids[key], `ids.${key}`);
    }
    if (ids.tricycle) requireUuid(ids.tricycle, "ids.tricycle");
    if (ids.balanceTerrain) requireUuid(ids.balanceTerrain, "ids.balanceTerrain");
    requireUuid(manifest.client?.id, "client.id");
    requireUuid(manifest.type?.id, "type.id");
    const allIds = Object.values(ids).filter(Boolean);
    assert.equal(new Set(allIds).size, allIds.length, "UUID de fixtures dupliqué.");

    if (manifest.stockBefore) {
        requireUuid(manifest.stockBefore.id, "stockBefore.id");
        assert.ok(Number.isFinite(Number(manifest.stockBefore.quantite)), "stockBefore.quantite invalide.");
        assert.ok(manifest.stockBefore.date_mise_a_jour, "stockBefore.date_mise_a_jour absente.");
    }
    if (manifest.lotId) requireUuid(manifest.lotId, "lotId");

    const version = Number(manifest.version || 1);
    const created = manifest.created || {};
    const containers = asArray(created.containers).map((item, index) => {
        requireUuid(item?.id, `created.containers[${index}].id`);
        assert.ok([manifest.codeSac, manifest.codeBac].includes(item.code), "Code de contenant enregistré invalide.");
        return { id: item.id, code: item.code };
    });
    assert.equal(new Set(containers.map(item => item.id)).size, containers.length,
        "UUID de contenants enregistrés dupliqués.");
    assert.equal(new Set(containers.map(item => item.code)).size, containers.length,
        "Codes de contenants enregistrés dupliqués.");

    const lotId = created.lot?.id || manifest.lotId || null;
    if (created.lot) {
        requireUuid(created.lot.id, "created.lot.id");
        requireUuid(created.lot.operationId, "created.lot.operationId");
        assert.equal(created.lot.code, manifest.codeLot, "Code du lot enregistré invalide.");
        assert.equal(manifest.lotId, created.lot.id, "UUID de lot incohérent dans le manifeste.");
    }
    if (created.stock) requireUuid(created.stock.id, "created.stock.id");
    if (created.mouvementStock) requireUuid(created.mouvementStock.id, "created.mouvementStock.id");
    return {
        manifest, organisationId, version, legacy: version < 3, ids, expected,
        containerRecords: version >= 3 ? containers : null,
        lotId,
        recordedStockId: created.stock?.id || null,
        recordedMovementId: created.mouvementStock?.id || null
    };
}

const oneOrZero = (rows, name) => {
    assert.ok(rows.length <= 1, `${name}: plusieurs lignes correspondent au manifeste.`);
    return rows[0] || null;
};

export function verifyCleanupOwnership(spec, snapshot) {
    const { manifest, ids, organisationId, expected } = spec;
    const users = asArray(snapshot.users);
    for (const expectedUser of [
        { id: ids.agentUser, email: expected.agentEmail, nom: `${expected.label} agent` },
        { id: ids.managerUser, email: expected.managerEmail, nom: `${expected.label} manager` }
    ]) {
        const row = users.find(item => item.id === expectedUser.id);
        if (!row) continue;
        assert.equal(row.organisation_id, organisationId, "Utilisateur d'une autre organisation.");
        assert.equal(row.email, expectedUser.email, "E-mail utilisateur différent du manifeste.");
        assert.equal(row.nom, expectedUser.nom, "Nom utilisateur différent du manifeste.");
    }
    const agent = oneOrZero(asArray(snapshot.agents), "Agent");
    if (agent) {
        assert.equal(agent.id, ids.agent, "UUID agent différent du manifeste.");
        assert.equal(agent.utilisateur_id, ids.agentUser, "Propriétaire de l'agent incorrect.");
    }
    const mission = oneOrZero(asArray(snapshot.missions), "Mission");
    if (mission) {
        assert.equal(mission.id, ids.mission, "UUID mission différent du manifeste.");
        assert.equal(mission.organisation_id, organisationId, "Mission d'une autre organisation.");
        assert.equal(mission.agent_id, ids.agent, "Agent de mission différent du manifeste.");
        if (ids.tricycle) assert.equal(mission.tricycle_id, ids.tricycle,
            "Tricycle de mission différent du manifeste.");
        assert.equal(mission.observations, expected.label, "Libellé de mission différent du manifeste.");
    }
    const collecte = oneOrZero(asArray(snapshot.collectes), "Collecte");
    if (collecte) {
        assert.equal(collecte.id, ids.collecte, "UUID collecte différent du manifeste.");
        assert.equal(collecte.organisation_id, organisationId, "Collecte d'une autre organisation.");
        assert.equal(collecte.agent_id, ids.agentUser, "Propriétaire de collecte incorrect.");
        assert.equal(collecte.client_id, manifest.client.id, "Client de collecte différent du manifeste.");
        assert.equal(collecte.type_dechet_id, manifest.type.id, "Matière de collecte différente du manifeste.");
    }
    const tricycle = oneOrZero(asArray(snapshot.tricycles), "Tricycle");
    if (tricycle) {
        assert.equal(tricycle.organisation_id, organisationId, "Tricycle d'une autre organisation.");
        assert.equal(tricycle.numero_interne, manifest.numeroTricycle, "Numéro de tricycle différent du manifeste.");
        assert.equal(tricycle.observations, expected.label, "Libellé de tricycle différent du manifeste.");
    }
    const balance = oneOrZero(asArray(snapshot.balances), "Balance");
    if (balance) {
        assert.equal(balance.organisation_id, organisationId, "Balance d'une autre organisation.");
        assert.equal(balance.numero_interne, manifest.numeroBalanceTerrain, "Numéro de balance différent du manifeste.");
        assert.equal(balance.tricycle_id, ids.tricycle, "Tricycle de la balance différent du manifeste.");
    }
    for (const row of asArray(snapshot.contenants)) {
        assert.equal(row.organisation_id, organisationId, "Contenant d'une autre organisation.");
        assert.ok([manifest.codeSac, manifest.codeBac].includes(row.code_qr), "Code contenant inattendu.");
        assert.equal(row.creation_user_id, ids.managerUser, "Créateur du contenant différent du manifeste.");
        assert.equal(Number(row.creation_count), 1, "Preuve de création du contenant ambiguë.");
        if (!spec.legacy) {
            const recorded = spec.containerRecords.find(item => item.id === row.id && item.code === row.code_qr);
            assert.ok(recorded, "Contenant présent mais non enregistré par ce run.");
        }
    }
    if (!spec.legacy) {
        for (const recorded of spec.containerRecords) {
            const row = asArray(snapshot.contenants).find(item => item.id === recorded.id);
            if (row) assert.equal(row.code_qr, recorded.code, "UUID/code contenant incohérent.");
        }
    }
    const lot = oneOrZero(asArray(snapshot.lots), "Lot");
    if (lot) {
        assert.ok(spec.lotId, "Lot présent mais non enregistré par ce run.");
        assert.equal(lot.id, spec.lotId, "UUID lot différent du manifeste.");
        assert.equal(lot.organisation_id, organisationId, "Lot d'une autre organisation.");
        assert.equal(lot.code_qr, manifest.codeLot, "Code lot différent du manifeste.");
        assert.equal(lot.type_dechet_id, manifest.type.id, "Matière du lot différente du manifeste.");
        if (!spec.legacy) assert.equal(lot.operation_id, manifest.created.lot.operationId,
            "Opération du lot différente du manifeste.");
        assert.equal(lot.creation_user_id, ids.managerUser, "Créateur du lot différent du manifeste.");
        assert.equal(Number(lot.creation_count), 1, "Preuve de création du lot ambiguë.");
    }
    const stock = oneOrZero(asArray(snapshot.stock), "Stock du run");
    if (stock) {
        assert.ok(spec.lotId, "Mouvement de stock sans lot enregistré.");
        assert.equal(stock.organisation_id, organisationId, "Stock d'une autre organisation.");
        assert.equal(stock.type_dechet_id, manifest.type.id, "Matière du stock différente du manifeste.");
        assert.equal(Number(stock.other_movements), 0, "Le stock a d'autres mouvements: nettoyage refusé.");
        if (spec.recordedStockId) assert.equal(stock.stock_id, spec.recordedStockId, "UUID stock différent du manifeste.");
        if (spec.recordedMovementId) assert.equal(stock.movement_id, spec.recordedMovementId,
            "UUID mouvement différent du manifeste.");
        if (!spec.legacy) assert.ok(spec.recordedStockId && spec.recordedMovementId,
            "Stock ou mouvement présent mais non enregistré par ce run.");
        const expectedQuantity = Number(stock.movement_quantity) + Number(manifest.stockBefore?.quantite || 0);
        assert.ok(sameNumber(stock.stock_quantity, expectedQuantity),
            "Le stock a changé depuis le run: nettoyage refusé.");
        if (manifest.stockBefore) assert.equal(stock.stock_id, manifest.stockBefore.id,
            "Le stock modifié n'est pas stockBefore.");
    }
    return true;
}

async function loadSnapshot(client, spec) {
    const { manifest, ids, lotId } = spec;
    const query = async (sql, values) => (await client.query(sql, values)).rows;
    const containerIds = spec.containerRecords?.map(item => item.id) || [];
    const containerCodes = spec.legacy ? [manifest.codeSac, manifest.codeBac] : [];
    return {
        users: await query(`SELECT id,organisation_id,email,nom FROM utilisateurs
            WHERE id=ANY($1::uuid[]) FOR UPDATE`, [[ids.agentUser, ids.managerUser]]),
        agents: await query(`SELECT id,utilisateur_id FROM agents WHERE id=$1 FOR UPDATE`, [ids.agent]),
        missions: await query(`SELECT id,organisation_id,agent_id,tricycle_id,observations FROM missions
            WHERE id=$1 FOR UPDATE`, [ids.mission]),
        collectes: await query(`SELECT c.id,cl.organisation_id,c.agent_id,c.client_id,c.type_dechet_id,c.site_id
            FROM collectes c JOIN clients cl ON cl.id=c.client_id WHERE c.id=$1 FOR UPDATE OF c`, [ids.collecte]),
        tricycles: ids.tricycle ? await query(`SELECT id,organisation_id,numero_interne,observations
            FROM tricycles WHERE id=$1 FOR UPDATE`, [ids.tricycle]) : [],
        balances: ids.balanceTerrain ? await query(`SELECT id,organisation_id,numero_interne,tricycle_id
            FROM balances WHERE id=$1 FOR UPDATE`, [ids.balanceTerrain]) : [],
        contenants: await query(`SELECT c.id,c.organisation_id,c.code_qr,
            e.creation_user_id,e.creation_count
            FROM contenants c LEFT JOIN LATERAL (
              SELECT min(utilisateur_id::text)::uuid AS creation_user_id,count(*)::int AS creation_count
              FROM tracabilite_matiere_evenements
              WHERE contenant_id=c.id AND type_evenement='creation'
            ) e ON TRUE
            WHERE ($1::uuid[] <> '{}'::uuid[] AND c.id=ANY($1::uuid[]))
               OR ($2::text[] <> '{}'::text[] AND c.code_qr=ANY($2::text[]))
            FOR UPDATE OF c`, [containerIds, containerCodes]),
        lots: lotId ? await query(`SELECT l.id,l.organisation_id,l.code_qr,l.type_dechet_id,l.operation_id,
            e.creation_user_id,e.creation_count
            FROM lots l LEFT JOIN LATERAL (
              SELECT min(utilisateur_id::text)::uuid AS creation_user_id,count(*)::int AS creation_count
              FROM tracabilite_matiere_evenements
              WHERE lot_id=l.id AND type_evenement='creation'
            ) e ON TRUE
            WHERE l.id=$1 FOR UPDATE OF l`, [lotId]) : [],
        stock: lotId ? await query(`SELECT ms.id AS movement_id,ms.stock_id,ms.quantite AS movement_quantity,
            s.organisation_id,s.type_dechet_id,s.quantite AS stock_quantity,s.date_mise_a_jour,
            (SELECT count(*)::int FROM mouvements_stock other
             WHERE other.stock_id=s.id AND other.id<>ms.id
               AND other.date_mouvement>=ms.date_mouvement) AS other_movements
            FROM mouvements_stock ms JOIN stocks s ON s.id=ms.stock_id
            WHERE ms.lot_id=$1 FOR UPDATE OF ms,s`, [lotId]) : []
    };
}

async function deleteChecked(client, sql, values, maximum, name) {
    const result = await client.query(sql, values);
    assert.ok(result.rowCount <= maximum, `${name}: plus de lignes que prévu, annulation.`);
    return result.rowCount;
}

async function applyCleanup(client, spec, snapshot) {
    const { manifest, ids, organisationId, lotId } = spec;
    const containerIds = asArray(snapshot.contenants).map(row => row.id);
    const stock = asArray(snapshot.stock)[0] || null;
    let affected = 0;
    const q = async (sql, values, maximum, name, expected = null) => {
        const count = await deleteChecked(client, sql, values, maximum, name);
        if (expected !== null) {
            assert.equal(count, expected, `${name}: nombre de lignes différent de la vérification, annulation.`);
        }
        affected += count;
    };

    await q(`DELETE FROM tracabilite_matiere_evenements
        WHERE organisation_id=$1 AND (collecte_id=$2 OR mission_id=$3
          OR contenant_id=ANY($4::uuid[]) OR lot_id=$5)`,
    [organisationId, ids.collecte, ids.mission, containerIds, lotId], Number.MAX_SAFE_INTEGER, "Traçabilité");
    await q(`DELETE FROM pesees_unites WHERE pesee_id IN
        (SELECT id FROM pesees WHERE collecte_id=$1)`, [ids.collecte], Number.MAX_SAFE_INTEGER, "Liens pesées");

    if (stock) {
        await q(`DELETE FROM mouvements_stock WHERE id=$1 AND lot_id=$2 AND stock_id=$3`,
            [stock.movement_id, lotId, stock.stock_id], 1, "Mouvement de stock", 1);
        if (manifest.stockBefore) {
            const result = await client.query(`UPDATE stocks SET quantite=$1,date_mise_a_jour=$2::timestamptz
                WHERE id=$3 AND organisation_id=$4 AND type_dechet_id=$5 AND quantite=$6`,
            [manifest.stockBefore.quantite, manifest.stockBefore.date_mise_a_jour, stock.stock_id,
                organisationId, manifest.type.id, stock.stock_quantity]);
            assert.equal(result.rowCount, 1, "Stock modifié entre vérification et restauration.");
            affected += result.rowCount;
        } else {
            const result = await client.query(`DELETE FROM stocks WHERE id=$1 AND organisation_id=$2
                AND type_dechet_id=$3 AND quantite=$4`,
            [stock.stock_id, organisationId, manifest.type.id, stock.stock_quantity]);
            assert.equal(result.rowCount, 1, "Stock modifié entre vérification et suppression.");
            affected += result.rowCount;
        }
    }

    if (lotId) await q(`DELETE FROM lots WHERE id=$1 AND organisation_id=$2 AND code_qr=$3`,
        [lotId, organisationId, manifest.codeLot], 1, "Lot", asArray(snapshot.lots).length);
    if (containerIds.length) await q(`DELETE FROM contenants WHERE id=ANY($1::uuid[])
        AND organisation_id=$2 AND code_qr=ANY($3::text[])`,
    [containerIds, organisationId, [manifest.codeSac, manifest.codeBac]], containerIds.length,
    "Contenants", containerIds.length);
    await q(`UPDATE pesees SET remplace_pesee_id=NULL,preuve_id=NULL WHERE collecte_id=$1`,
        [ids.collecte], Number.MAX_SAFE_INTEGER, "Références pesées");
    await q(`DELETE FROM pesees WHERE collecte_id=$1`, [ids.collecte], Number.MAX_SAFE_INTEGER, "Pesées");
    await q(`DELETE FROM preuves_collecte WHERE mission_id=$1 OR collecte_id=$2`,
        [ids.mission, ids.collecte], Number.MAX_SAFE_INTEGER, "Preuves");
    await q(`DELETE FROM mission_evenements WHERE mission_id=$1`, [ids.mission], Number.MAX_SAFE_INTEGER, "Événements mission");
    await q(`DELETE FROM missions_collectes WHERE mission_id=$1 AND collecte_id=$2`,
        [ids.mission, ids.collecte], 1, "Lien mission/collecte");
    await q(`DELETE FROM missions WHERE id=$1 AND organisation_id=$2 AND observations=$3 AND agent_id=$4`,
        [ids.mission, organisationId, manifest.label, ids.agent], 1, "Mission", asArray(snapshot.missions).length);
    await q(`DELETE FROM collectes WHERE id=$1 AND agent_id=$2 AND client_id=$3 AND type_dechet_id=$4`,
        [ids.collecte, ids.agentUser, manifest.client.id, manifest.type.id], 1, "Collecte",
        asArray(snapshot.collectes).length);
    if (ids.balanceTerrain) await q(`DELETE FROM balances WHERE id=$1 AND organisation_id=$2 AND numero_interne=$3`,
        [ids.balanceTerrain, organisationId, manifest.numeroBalanceTerrain], 1, "Balance",
        asArray(snapshot.balances).length);
    if (ids.tricycle) await q(`DELETE FROM tricycles WHERE id=$1 AND organisation_id=$2 AND observations=$3
        AND numero_interne=$4`, [ids.tricycle, organisationId, manifest.label, manifest.numeroTricycle], 1,
    "Tricycle", asArray(snapshot.tricycles).length);
    await q(`DELETE FROM agents WHERE id=$1 AND utilisateur_id=$2`, [ids.agent, ids.agentUser], 1,
        "Agent", asArray(snapshot.agents).length);
    await q(`DELETE FROM utilisateurs WHERE id=ANY($1::uuid[]) AND organisation_id=$2
        AND email=ANY($3::text[])`, [[ids.agentUser, ids.managerUser], organisationId,
        [manifest.emails.agent, manifest.emails.manager]], 2, "Utilisateurs", asArray(snapshot.users).length);
    return affected;
}

export async function cleanupQrLotsFixtures(pool, manifest, organisationId) {
    const spec = validateCleanupManifest(manifest, organisationId);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const snapshot = await loadSnapshot(client, spec);
        verifyCleanupOwnership(spec, snapshot);
        const affected = await applyCleanup(client, spec, snapshot);
        await client.query("COMMIT");
        return affected;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export const __test = { applyCleanup };
