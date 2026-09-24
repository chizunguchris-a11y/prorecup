/**
 * Prépare et vérifie la recette manuelle Pesée & Traçabilité V1.
 *
 * Création :
 *   node backend/tester-pesee-tracabilite-v1-manuel.mjs C:\ProRecup
 * Nettoyage après interruption :
 *   node backend/tester-pesee-tracabilite-v1-manuel.mjs C:\ProRecup --cleanup <runId>
 *
 * Les balances, le site, le client et le type de déchet sont réutilisés et ne
 * sont jamais créés, modifiés ou supprimés par ce script. L'état de TRI-001
 * est sauvegardé avant le run, rendu disponible si nécessaire, puis restauré
 * exactement au nettoyage normal ou via --cleanup.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const ORGANISATION_ID = '04fbfede-8cf8-47fc-a9b2-599b766229e2';
const TRICYCLE_ID = '3e1a04b7-bd5d-472a-b59c-ff1fd83fd8d5';
const SITE_ID = '781d4e3f-903d-4779-9137-304202e99767';
const BALANCE_TERRAIN_ID = '932d2c33-785a-4f56-910d-262d7e828999';
const BALANCE_DEPOT_ID = '137b8c49-4f99-444a-a1e5-45198ba43a44';
const BALANCE_TERRAIN_NUMERO = 'PILOTE-TERRAIN-20260923';
const BALANCE_DEPOT_NUMERO = 'PILOTE-DEPOT-20260923';
const API_BASE_URL = process.env.PESEE_MANUAL_API_URL || 'https://prorecup-backend.onrender.com/api';
const TERRAIN_URL = process.env.PESEE_MANUAL_TERRAIN_URL ||
    'https://prorecup-frontend.onrender.com/agent-app/index.html?v=1-6';
const BACKOFFICE_URL = process.env.PESEE_MANUAL_BACKOFFICE_URL ||
    'https://prorecup-frontend.onrender.com/index.html';
const FRONTEND_ORIGIN = new URL(TERRAIN_URL).origin;
const BUSINESS_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Kinshasa';

const args = process.argv.slice(2);
const cleanupIndex = args.indexOf('--cleanup');
const cleanupRunId = cleanupIndex === -1 ? null : args[cleanupIndex + 1];
const smokeMode = args.includes('--smoke');
const positional = args.filter((argument, index) =>
    argument !== '--smoke' && index !== cleanupIndex && index !== cleanupIndex + 1);
const repo = path.resolve(positional[0] || 'C:\\ProRecup');
const backend = path.join(repo, 'backend');
const runsDirectory = path.join(backend, 'terrain-manuel-runs');
const require = createRequire(path.join(backend, 'package.json'));
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
dotenv.config({ path: path.join(backend, '.env'), quiet: true });

assert.ok(process.env.DATABASE_URL, 'DATABASE_URL requise dans backend/.env.');
assert.ok(process.env.SUPABASE_URL, 'SUPABASE_URL requise dans backend/.env.');
assert.ok(process.env.SUPABASE_SECRET_KEY, 'SUPABASE_SECRET_KEY requise dans backend/.env.');
assert.ok(process.env.SUPABASE_STORAGE_BUCKET, 'SUPABASE_STORAGE_BUCKET requise dans backend/.env.');
if (cleanupIndex !== -1) {
    assert.match(cleanupRunId || '', /^[0-9a-f-]{36}$/i, 'runId de nettoyage invalide.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    max: 2
});
const readPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    statement_timeout: 30000,
    query_timeout: 35000,
    max: 1,
    options: '-c default_transaction_read_only=on'
});
const storageConfig = {
    url: process.env.SUPABASE_URL.replace(/\/$/, ''),
    key: process.env.SUPABASE_SECRET_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET
};

function fixtureLabel(runId) {
    return 'ptv1-' + runId;
}
function businessDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-CA', {
        timeZone: BUSINESS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value]));
    return values.year + '-' + values.month + '-' + values.day;
}
function manifestPath(runId) {
    return path.join(runsDirectory, 'pesee-' + runId + '.json');
}
function saveManifest(manifest) {
    fs.mkdirSync(runsDirectory, { recursive: true });
    const destination = manifestPath(manifest.runId);
    const temporary = destination + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, destination);
}
function loadManifest(runId) {
    const source = manifestPath(runId);
    assert.ok(fs.existsSync(source), 'Aucun manifeste Pesée trouvé pour ce runId.');
    const manifest = JSON.parse(fs.readFileSync(source, 'utf8'));
    assert.ok([1, 2].includes(manifest.version), 'Version de manifeste non prise en charge.');
    assert.equal(manifest.runId, runId, 'Le manifeste ne correspond pas au runId demandé.');
    assert.equal(manifest.label, fixtureLabel(runId), 'Libellé de propriété invalide.');
    assert.equal(manifest.refs?.organisation, ORGANISATION_ID, 'Organisation du manifeste invalide.');
    assert.equal(manifest.refs?.tricycle, TRICYCLE_ID, 'Tricycle du manifeste invalide.');
    assert.equal(manifest.refs?.site, SITE_ID, 'Site du manifeste invalide.');
    assert.equal(manifest.refs?.balanceTerrain, BALANCE_TERRAIN_ID, 'Balance terrain du manifeste invalide.');
    assert.equal(manifest.refs?.balanceDepot, BALANCE_DEPOT_ID, 'Balance dépôt du manifeste invalide.');
    for (const key of ['agentUser', 'agent', 'backofficeUser', 'collecte', 'mission']) {
        assert.match(manifest.ids?.[key] || '', /^[0-9a-f-]{36}$/i, 'Identifiant invalide : ' + key);
    }
    if (manifest.version === 2) {
        assert.equal(manifest.tricycleSnapshot?.id, TRICYCLE_ID, 'Snapshot tricycle invalide.');
        assert.equal(manifest.tricycleSnapshot?.organisation_id, ORGANISATION_ID,
            'Organisation du snapshot tricycle invalide.');
        assert.equal(manifest.tricycleSnapshot?.numero_interne, 'TRI-001',
            'Numéro du snapshot tricycle invalide.');
        assert.ok(['disponible', 'en_mission'].includes(manifest.tricycleSnapshot?.statut),
            'Statut initial de TRI-001 non restaurable automatiquement.');
        assert.match(manifest.tricycleSnapshot?.modifie_le || '', /^\d{4}-\d{2}-\d{2}[ T]/,
            'Horodatage du snapshot tricycle invalide.');
        assert.ok(['not_started', 'not_needed', 'pending', 'applied'].includes(manifest.tricycleOverrideState),
            'État de préparation de TRI-001 invalide dans le manifeste.');
    }
    return manifest;
}
function safeMessage(error) {
    let message = error instanceof Error ? error.message : 'Erreur inattendue.';
    for (const value of [
        process.env.DATABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        process.env.JWT_SECRET,
        process.env.SUPABASE_URL
    ]) {
        if (value) message = message.split(value).join('[masqué]');
    }
    return message;
}
async function storage(method, suffix, body) {
    const headers = { apikey: storageConfig.key };
    if (!storageConfig.key.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + storageConfig.key;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(storageConfig.url + '/storage/v1' + suffix, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
    });
    let data = null;
    try { data = await response.json(); } catch { /* Certaines suppressions n'ont pas de corps. */ }
    assert.ok(response.ok, 'Storage ' + method + ' : HTTP ' + response.status);
    return data;
}
async function one(connection, sql, values = [], message = 'Une ligne PostgreSQL attendue.') {
    const result = await connection.query(sql, values);
    assert.equal(result.rows.length, 1, message);
    return result.rows[0];
}
function stableBalance(row) {
    return {
        id: row.id,
        organisation_id: row.organisation_id,
        numero_interne: row.numero_interne,
        type: row.type,
        capacite_max_kg: String(row.capacite_max_kg),
        precision_kg: String(row.precision_kg),
        statut: row.statut,
        date_calibrage: row.date_calibrage ? new Date(row.date_calibrage).toISOString().slice(0, 10) : null,
        prochain_calibrage: row.prochain_calibrage ? new Date(row.prochain_calibrage).toISOString().slice(0, 10) : null,
        tricycle_id: row.tricycle_id,
        site_id: row.site_id
    };
}
function stableTricycle(row) {
    return {
        id: row.id,
        organisation_id: row.organisation_id,
        numero_interne: row.numero_interne,
        statut: row.statut,
        etat: row.etat,
        modifie_le: row.modifie_le_exact
    };
}
async function currentBalanceSnapshot(connection = readPool) {
    const result = await connection.query(`
        SELECT * FROM balances WHERE id = ANY($1::uuid[]) ORDER BY id
    `, [[BALANCE_TERRAIN_ID, BALANCE_DEPOT_ID]]);
    assert.equal(result.rows.length, 2, 'Les deux balances pilotes doivent exister.');
    return result.rows.map(stableBalance);
}
async function checkPreconditions() {
    await pool.query('SELECT 1');
    const bucket = await storage('GET', '/bucket/' + encodeURIComponent(storageConfig.bucket));
    assert.equal(bucket.public, false, 'Le bucket Storage doit être privé.');

    const tricycle = await one(pool, `
        SELECT id, organisation_id, numero_interne, statut, etat,
               modifie_le::text AS modifie_le_exact
        FROM tricycles WHERE id=$1 AND numero_interne='TRI-001'
    `, [TRICYCLE_ID], 'TRI-001 absent.');
    assert.equal(tricycle.organisation_id, ORGANISATION_ID, 'TRI-001 hors organisation.');
    assert.notEqual(tricycle.etat, 'mauvais', 'TRI-001 est en mauvais état.');
    assert.ok(['disponible', 'en_mission'].includes(tricycle.statut),
        'TRI-001 ne peut être préparé depuis le statut ' + tricycle.statut + '.');
    const references = await pool.query(`
        SELECT organisation_id AS site_org
        FROM sites_de_collecte WHERE id=$1 AND nom='Centre de collecte Gombe'
    `, [SITE_ID]);
    assert.equal(references.rows[0]?.site_org, ORGANISATION_ID, 'Site Gombe absent ou hors organisation.');

    const balances = await currentBalanceSnapshot(pool);
    const terrain = balances.find(balance => balance.id === BALANCE_TERRAIN_ID);
    const depot = balances.find(balance => balance.id === BALANCE_DEPOT_ID);
    assert.equal(terrain.numero_interne, BALANCE_TERRAIN_NUMERO, 'Numéro de balance terrain inattendu.');
    assert.equal(terrain.tricycle_id, TRICYCLE_ID, 'Affectation de la balance terrain incorrecte.');
    assert.equal(terrain.site_id, null, 'La balance terrain ne doit pas être affectée à un site.');
    assert.equal(depot.numero_interne, BALANCE_DEPOT_NUMERO, 'Numéro de balance dépôt inattendu.');
    assert.equal(depot.site_id, SITE_ID, 'Affectation de la balance dépôt incorrecte.');
    assert.equal(depot.tricycle_id, null, 'La balance dépôt ne doit pas être affectée à un tricycle.');
    assert.ok(balances.every(balance => balance.organisation_id === ORGANISATION_ID && balance.statut === 'active'),
        'Les balances pilotes doivent être actives et appartenir à Pro Récup RDC.');
    return { balances, tricycle: stableTricycle(tricycle) };
}
async function prepareTricycle(manifest) {
    const snapshot = manifest.tricycleSnapshot;
    if (snapshot.statut === 'disponible') {
        manifest.tricycleOverrideState = 'not_needed';
        saveManifest(manifest);
        return;
    }
    manifest.tricycleOverrideState = 'pending';
    saveManifest(manifest);
    const result = await pool.query(`
        UPDATE tricycles
        SET statut='disponible', modifie_le=CURRENT_TIMESTAMP
        WHERE id=$1 AND organisation_id=$2 AND numero_interne=$3
          AND statut=$4 AND etat=$5 AND modifie_le=$6::timestamptz
        RETURNING modifie_le::text AS modifie_le_exact
    `, [snapshot.id, snapshot.organisation_id, snapshot.numero_interne,
        snapshot.statut, snapshot.etat, snapshot.modifie_le]);
    if (result.rowCount !== 1) {
        manifest.tricycleOverrideState = 'not_started';
        saveManifest(manifest);
        assert.fail('TRI-001 a changé depuis le snapshot ; préparation annulée sans écrasement.');
    }
    manifest.tricycleOverrideState = 'applied';
    manifest.tricyclePreparedAt = result.rows[0].modifie_le_exact;
    saveManifest(manifest);
}
async function createFixtures(manifest, agentPassword, backofficePassword) {
    const roles = (await pool.query(`
        SELECT id, lower(trim(nom)) AS nom FROM roles
        WHERE lower(trim(nom)) IN ('agent_valorisation_carbone', 'manager')
    `)).rows;
    const agentRole = roles.find(role => role.nom === 'agent_valorisation_carbone');
    const managerRole = roles.find(role => role.nom === 'manager');
    assert.ok(agentRole, 'Rôle agent_valorisation_carbone introuvable.');
    assert.ok(managerRole, 'Rôle manager introuvable.');
    const client = await one(pool, `
        SELECT id, nom FROM clients
        WHERE organisation_id=$1 AND nom NOT ILIKE 'Client Test %'
        ORDER BY nom, id LIMIT 1
    `, [ORGANISATION_ID], 'Aucun client réel réutilisable dans l’organisation.');
    const wasteType = await one(pool, 'SELECT id, nom FROM types_dechets ORDER BY nom, id LIMIT 1');
    manifest.refs.client = client.id;
    manifest.refs.clientNom = client.nom;
    manifest.refs.typeDechet = wasteType.id;
    manifest.refs.typeDechetNom = wasteType.nom;
    saveManifest(manifest);

    const [agentHash, backofficeHash] = await Promise.all([
        bcrypt.hash(agentPassword, 12),
        bcrypt.hash(backofficePassword, 12)
    ]);
    const connection = await pool.connect();
    try {
        await connection.query('BEGIN');
        await connection.query(`
            INSERT INTO utilisateurs (id, nom, email, mot_de_passe, organisation_id, role_id, actif)
            VALUES ($1,$2,$3,$4,$5,$6,TRUE), ($7,$8,$9,$10,$5,$11,TRUE)
        `, [
            manifest.ids.agentUser, manifest.label + '-agent', manifest.emails.agent, agentHash,
            ORGANISATION_ID, agentRole.id,
            manifest.ids.backofficeUser, manifest.label + '-manager', manifest.emails.backoffice,
            backofficeHash, managerRole.id
        ]);
        await connection.query(`
            INSERT INTO agents (id, utilisateur_id, statut, disponible)
            VALUES ($1,$2,'actif',TRUE)
        `, [manifest.ids.agent, manifest.ids.agentUser]);
        await connection.query(`
            INSERT INTO collectes
                (id, site_id, client_id, agent_id, type_dechet_id, poids_estime, statut)
            VALUES ($1,$2,$3,$4,$5,100,'en_attente')
        `, [manifest.ids.collecte, SITE_ID, client.id, manifest.ids.agentUser, wasteType.id]);
        await connection.query(`
            INSERT INTO missions
                (id, organisation_id, agent_id, tricycle_id, date_prevue,
                 heure_depart_prevue, heure_retour_prevue, statut, observations, cree_par)
            VALUES ($1,$2,$3,$4,$5::date,'08:00','18:00','planifiee',$6,$7)
        `, [manifest.ids.mission, ORGANISATION_ID, manifest.ids.agent, TRICYCLE_ID,
            manifest.businessDate, manifest.label, manifest.ids.backofficeUser]);
        await connection.query(`
            INSERT INTO missions_collectes (mission_id, collecte_id, ordre_collecte)
            VALUES ($1,$2,1)
        `, [manifest.ids.mission, manifest.ids.collecte]);
        await connection.query('COMMIT');
        manifest.fixturesCommitted = true;
        saveManifest(manifest);
    } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
    } finally {
        connection.release();
    }
}
async function login(email, password) {
    const response = await fetch(API_BASE_URL + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: FRONTEND_ORIGIN },
        body: JSON.stringify({ email, motDePasse: password }),
        signal: AbortSignal.timeout(30000)
    });
    const data = await response.json().catch(() => ({}));
    assert.ok(response.ok, 'Connexion API refusée pour le compte temporaire : HTTP ' + response.status);
    const token = data.accessToken || data.token;
    assert.ok(token, 'Jeton de connexion absent de la réponse API.');
    return token;
}
async function apiGet(endpoint, token) {
    const response = await fetch(API_BASE_URL + endpoint, {
        headers: { Authorization: 'Bearer ' + token, Origin: FRONTEND_ORIGIN },
        signal: AbortSignal.timeout(30000)
    });
    return { response, data: await response.json().catch(() => ({})) };
}
async function apiPost(endpoint, token, body) {
    const response = await fetch(API_BASE_URL + endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Origin: FRONTEND_ORIGIN },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
    });
    return { response, data: await response.json().catch(() => ({})) };
}
async function smokeStartMission(manifest, agentPassword) {
    const token = await login(manifest.emails.agent, agentPassword);
    const started = await apiPost('/terrain/missions/' + manifest.ids.mission + '/demarrer', token, {
        operation_id: randomUUID(),
        survenu_le: new Date().toISOString(),
        latitude: -4.325,
        longitude: 15.322,
        precision_gps: 10
    });
    assert.ok(started.response.ok,
        'Démarrage smoke refusé : HTTP ' + started.response.status + ' ' + (started.data?.message || ''));
    const mission = await one(readPool, 'SELECT statut FROM missions WHERE id=$1', [manifest.ids.mission]);
    const tricycle = await one(readPool, 'SELECT statut FROM tricycles WHERE id=$1', [TRICYCLE_ID]);
    assert.equal(mission.statut, 'en_cours', 'La mission smoke n’est pas en cours.');
    assert.equal(tricycle.statut, 'en_mission', 'TRI-001 n’est pas passé en mission.');
}
async function validatePermissions(manifest, credentials) {
    const [agentToken, backofficeToken] = await Promise.all([
        login(manifest.emails.agent, credentials.agentPassword),
        login(manifest.emails.backoffice, credentials.backofficePassword)
    ]);
    const [terrain, agentDepot, backofficeDepot, backofficeCollectes] = await Promise.all([
        apiGet('/terrain/journee', agentToken),
        apiGet('/collectes/balances', agentToken),
        apiGet('/collectes/balances', backofficeToken),
        apiGet('/collectes', backofficeToken)
    ]);
    assert.ok(terrain.response.ok, 'L’agent temporaire ne peut pas lire sa journée Terrain.');
    assert.equal(terrain.data?.data?.date, manifest.businessDate,
        'La journée Terrain ne correspond pas à la date métier du run.');
    assert.equal(terrain.data?.data?.timezone, BUSINESS_TIMEZONE,
        'Le fuseau de la journée Terrain ne correspond pas au fuseau métier du run.');
    const terrainMissions = Array.isArray(terrain.data?.data?.missions) ? terrain.data.data.missions : [];
    assert.ok(terrainMissions.some(mission => mission.id === manifest.ids.mission),
        'La mission temporaire est absente de la journée Terrain à sa date métier.');
    assert.equal(terrain.data?.data?.resume?.nombre_missions, 1,
        'La journée Terrain doit exposer exactement une mission temporaire.');
    assert.equal(terrain.data?.data?.resume?.nombre_collectes, 1,
        'La journée Terrain doit exposer exactement une collecte temporaire.');
    assert.equal(agentDepot.response.status, 403, 'L’agent Terrain doit être refusé sur les balances dépôt.');
    assert.ok(backofficeDepot.response.ok, 'Le manager temporaire ne peut pas accéder aux balances dépôt.');
    assert.ok(backofficeCollectes.response.ok, 'Le manager temporaire ne peut pas lire les collectes.');
    const balances = Array.isArray(backofficeDepot.data?.data) ? backofficeDepot.data.data : [];
    assert.ok(balances.some(balance => balance.id === BALANCE_DEPOT_ID), 'La balance dépôt pilote est absente de l’API manager.');
    const collectes = Array.isArray(backofficeCollectes.data?.data) ? backofficeCollectes.data.data : [];
    assert.ok(collectes.some(collecte => collecte.id === manifest.ids.collecte), 'La collecte temporaire est absente de l’API manager.');
}
function assertWeight(row, expected) {
    assert.equal(Number(row.poids_brut), expected.brut, expected.label + ' : poids brut incorrect.');
    assert.equal(Number(row.tare), expected.tare, expected.label + ' : tare incorrecte.');
    assert.equal(Number(row.poids_net), expected.net, expected.label + ' : poids net incorrect.');
}
async function validateFinalState(manifest, credentials) {
    const ids = manifest.ids;
    const mission = await one(readPool, `
        SELECT statut, heure_depart_reelle, heure_retour_reelle, agent_id, tricycle_id
        FROM missions WHERE id=$1 AND organisation_id=$2
    `, [ids.mission, ORGANISATION_ID]);
    const collecte = await one(readPool, `
        SELECT statut, resultat_terrain, poids_reel, poids_reel_saisi_par, site_id, agent_id
        FROM collectes WHERE id=$1
    `, [ids.collecte]);
    const pesees = (await readPool.query(`
        SELECT p.*, b.numero_interne AS balance_numero
        FROM pesees p JOIN balances b ON b.id=p.balance_id
        WHERE p.organisation_id=$1 AND p.mission_id=$2 AND p.collecte_id=$3
        ORDER BY p.date_heure ASC, p.cree_le ASC, p.id ASC
    `, [ORGANISATION_ID, ids.mission, ids.collecte])).rows;
    const proofs = (await readPool.query(`
        SELECT id, type_preuve, storage_path, operation_id, cree_par
        FROM preuves_collecte
        WHERE organisation_id=$1 AND mission_id=$2 AND collecte_id=$3
        ORDER BY pris_le, cree_le, id
    `, [ORGANISATION_ID, ids.mission, ids.collecte])).rows;

    assert.equal(mission.statut, 'terminee', 'La mission doit être terminée.');
    assert.ok(mission.heure_depart_reelle && mission.heure_retour_reelle, 'Les heures réelles de mission sont requises.');
    assert.equal(mission.agent_id, ids.agent, 'La mission n’appartient plus à l’agent temporaire.');
    assert.equal(mission.tricycle_id, TRICYCLE_ID, 'La mission n’utilise pas TRI-001.');
    assert.equal(collecte.resultat_terrain, 'collectee', 'La collecte doit avoir le résultat collectée.');
    assert.equal(Number(collecte.poids_reel), 100, 'poids_reel doit être exactement 100 kg.');
    assert.equal(collecte.poids_reel_saisi_par, ids.agentUser, 'poids_reel doit provenir de l’agent temporaire.');
    assert.equal(collecte.site_id, SITE_ID, 'La collecte n’utilise pas le site Gombe.');
    assert.equal(collecte.agent_id, ids.agentUser, 'La collecte n’est plus affectée au compte Terrain temporaire.');
    assert.equal(pesees.length, 4, 'Quatre pesées exactement sont attendues dans l’historique.');

    const terrain = pesees.filter(row => row.type === 'terrain');
    const depot = pesees.filter(row => row.type === 'depot');
    assert.equal(terrain.length, 2, 'Deux pesées terrain sont attendues.');
    assert.equal(depot.length, 2, 'Deux pesées dépôt sont attendues.');
    assertWeight(terrain[0], { brut: 101, tare: 1, net: 100, label: 'Première pesée terrain' });
    assertWeight(terrain[1], { brut: 100.5, tare: 0.5, net: 100, label: 'Correction terrain' });
    assert.equal(terrain[0].balance_id, BALANCE_TERRAIN_ID, 'Mauvaise balance sur la première pesée terrain.');
    assert.equal(terrain[1].balance_id, BALANCE_TERRAIN_ID, 'Mauvaise balance sur la correction terrain.');
    assert.equal(terrain[0].remplace_pesee_id, null, 'La première pesée terrain ne doit rien remplacer.');
    assert.equal(terrain[1].remplace_pesee_id, terrain[0].id, 'La correction terrain doit historiser la première mesure.');
    assert.ok(terrain.every(row => row.utilisateur_id === ids.agentUser && row.agent_id === ids.agent),
        'Les pesées terrain doivent provenir de l’identité JWT de l’agent temporaire.');

    assertWeight(depot[0], { brut: 105, tare: 0, net: 105, label: 'Première pesée dépôt' });
    assertWeight(depot[1], { brut: 105.1, tare: 0, net: 105.1, label: 'Re-pesée dépôt' });
    assert.equal(depot[0].balance_id, BALANCE_DEPOT_ID, 'Mauvaise balance sur la première pesée dépôt.');
    assert.equal(depot[1].balance_id, BALANCE_DEPOT_ID, 'Mauvaise balance sur la re-pesée dépôt.');
    assert.equal(depot[0].remplace_pesee_id, null, 'La première pesée dépôt ne doit rien remplacer.');
    assert.equal(depot[1].remplace_pesee_id, depot[0].id, 'La re-pesée dépôt doit historiser la première mesure.');
    assert.ok(depot.every(row => row.utilisateur_id === ids.backofficeUser),
        'Les pesées dépôt doivent provenir du manager temporaire.');

    const operationIds = pesees.map(row => row.operation_id);
    assert.ok(operationIds.every(id => /^[0-9a-f-]{36}$/i.test(id || '')), 'Chaque pesée doit conserver un operation_id UUID.');
    assert.equal(new Set(operationIds).size, 4, 'Les quatre operation_id de pesée doivent être uniques.');

    const tickets = proofs.filter(proof => proof.type_preuve === 'ticket_balance');
    for (const ticket of tickets) {
        const linked = pesees.find(row => row.preuve_id === ticket.id);
        assert.ok(linked, 'Un ticket_balance présent doit être lié à une pesée.');
        assert.equal(ticket.cree_par, ids.agentUser, 'Le ticket_balance doit provenir de l’agent temporaire.');
        assert.ok(ticket.storage_path.startsWith(
            ORGANISATION_ID + '/' + ids.mission + '/' + ids.collecte + '/ticket_balance/'
        ), 'Chemin Storage du ticket_balance hors du run.');
    }
    if (tickets.length > 0) {
        assert.ok(terrain.some(row => row.preuve_id), 'Le ticket_balance doit être lié à une pesée terrain.');
    }

    const firstGap = Math.round(Math.abs(105 - 100) / 100 * 10000) / 100;
    const finalGap = Math.round(Math.abs(105.1 - 100) / 100 * 10000) / 100;
    assert.equal(firstGap, 5);
    assert.equal(firstGap > 5, false, '5,00 % ne doit pas être une anomalie.');
    assert.equal(finalGap, 5.1);
    assert.equal(finalGap > 5, true, '5,10 % doit être une anomalie.');

    await validatePermissions(manifest, credentials);
    const managerToken = await login(manifest.emails.backoffice, credentials.backofficePassword);
    const api = await apiGet('/collectes', managerToken);
    assert.ok(api.response.ok, 'Lecture finale des collectes refusée au manager.');
    const apiRows = Array.isArray(api.data?.data) ? api.data.data : [];
    const apiCollecte = apiRows.find(row => row.id === ids.collecte);
    assert.ok(apiCollecte, 'Collecte temporaire absente de la lecture back-office finale.');
    assert.equal(Number(apiCollecte.ecart_terrain_depot_pct), 5.1, 'Écart final back-office différent de 5,10 %.');
    assert.equal(apiCollecte.anomalie_pesee, true, 'L’anomalie finale doit être active.');
    assert.equal(apiCollecte.pesees?.length, 4, 'L’API back-office doit exposer l’historique complet des quatre pesées.');
    const apiCurrent = apiCollecte.pesees.filter(row => row.est_courante);
    assert.equal(apiCurrent.length, 2, 'L’API doit exposer une mesure courante terrain et une mesure courante dépôt.');
    assert.deepEqual(apiCurrent.map(row => row.type).sort(), ['depot', 'terrain']);

    return {
        mission: mission.statut,
        collecte: collecte.resultat_terrain,
        poidsReel: Number(collecte.poids_reel),
        pesees: pesees.length,
        tickets: tickets.length,
        ecartFinal: Number(apiCollecte.ecart_terrain_depot_pct),
        anomalie: apiCollecte.anomalie_pesee
    };
}
async function ownedStoragePaths(manifest) {
    const ids = manifest.ids;
    const paths = new Set();
    const rows = (await pool.query(`
        SELECT storage_path FROM preuves_collecte
        WHERE organisation_id=$1 AND mission_id=$2 AND collecte_id=$3
    `, [ORGANISATION_ID, ids.mission, ids.collecte])).rows;
    for (const row of rows) paths.add(row.storage_path);
    for (const type of ['avant_collecte', 'apres_collecte', 'ticket_balance']) {
        const prefix = [ORGANISATION_ID, ids.mission, ids.collecte, type].join('/');
        const files = await storage('POST', '/object/list/' + encodeURIComponent(storageConfig.bucket), { prefix, limit: 100 });
        for (const file of files || []) paths.add(prefix + '/' + file.name);
    }
    const ownedPrefix = ORGANISATION_ID + '/' + ids.mission + '/' + ids.collecte + '/';
    for (const objectPath of paths) {
        assert.ok(objectPath.startsWith(ownedPrefix), 'Refus de supprimer un objet Storage hors du run.');
    }
    return [...paths];
}
async function cleanup(manifest) {
    const ids = manifest.ids;
    const ownership = await pool.query(`
        SELECT m.id
        FROM missions m
        JOIN missions_collectes mc ON mc.mission_id=m.id
        JOIN collectes c ON c.id=mc.collecte_id
        JOIN agents a ON a.id=m.agent_id
        JOIN utilisateurs u ON u.id=a.utilisateur_id
        WHERE m.id=$1 AND c.id=$2 AND m.organisation_id=$3
          AND u.id=$4 AND u.email=$5 AND m.observations=$6
    `, [ids.mission, ids.collecte, ORGANISATION_ID, ids.agentUser, manifest.emails.agent, manifest.label]);
    if (ownership.rowCount === 0) {
        const leftovers = await pool.query(`
            SELECT
              (SELECT count(*)::int FROM missions WHERE id=$1) AS missions,
              (SELECT count(*)::int FROM collectes WHERE id=$2) AS collectes,
              (SELECT count(*)::int FROM utilisateurs WHERE id=ANY($3::uuid[])) AS utilisateurs
        `, [ids.mission, ids.collecte, [ids.agentUser, ids.backofficeUser]]);
        assert.deepEqual(leftovers.rows[0], { missions: 0, collectes: 0, utilisateurs: 0 },
            'Propriété du run non confirmée alors que des fixtures subsistent.');
        const connection = await pool.connect();
        try {
            await connection.query('BEGIN');
            await restoreTricycle(connection, manifest);
            await connection.query('COMMIT');
        } catch (error) {
            await connection.query('ROLLBACK');
            throw error;
        } finally {
            connection.release();
        }
        await assertReferencesUnchanged(manifest);
        return { deletedRows: 0, deletedStorageObjects: 0 };
    }
    assert.equal(ownership.rowCount, 1, 'La propriété des fixtures ne peut pas être confirmée.');

    const storagePaths = await ownedStoragePaths(manifest);
    if (storagePaths.length) {
        await storage('DELETE', '/object/' + encodeURIComponent(storageConfig.bucket), { prefixes: storagePaths });
    }
    const connection = await pool.connect();
    let deletedRows = 0;
    try {
        await connection.query('BEGIN');
        const queries = [
            ['UPDATE pesees SET preuve_id=NULL WHERE organisation_id=$1 AND mission_id=$2 AND collecte_id=$3', [ORGANISATION_ID, ids.mission, ids.collecte]],
            ['UPDATE pesees SET remplace_pesee_id=NULL WHERE organisation_id=$1 AND mission_id=$2 AND collecte_id=$3', [ORGANISATION_ID, ids.mission, ids.collecte]],
            ['DELETE FROM pesees WHERE organisation_id=$1 AND mission_id=$2 AND collecte_id=$3', [ORGANISATION_ID, ids.mission, ids.collecte]],
            ['DELETE FROM preuves_collecte WHERE organisation_id=$1 AND mission_id=$2 AND collecte_id=$3', [ORGANISATION_ID, ids.mission, ids.collecte]],
            ['DELETE FROM mission_evenements WHERE mission_id=$1', [ids.mission]],
            ['DELETE FROM missions_collectes WHERE mission_id=$1 AND collecte_id=$2', [ids.mission, ids.collecte]],
            ['DELETE FROM missions WHERE id=$1 AND organisation_id=$2 AND observations=$3', [ids.mission, ORGANISATION_ID, manifest.label]],
            ['DELETE FROM collectes WHERE id=$1 AND site_id=$2 AND agent_id=$3', [ids.collecte, SITE_ID, ids.agentUser]],
            ['DELETE FROM agents WHERE id=$1 AND utilisateur_id=$2', [ids.agent, ids.agentUser]],
            ['DELETE FROM utilisateurs WHERE id=$1 AND organisation_id=$2 AND email=$3', [ids.agentUser, ORGANISATION_ID, manifest.emails.agent]],
            ['DELETE FROM utilisateurs WHERE id=$1 AND organisation_id=$2 AND email=$3', [ids.backofficeUser, ORGANISATION_ID, manifest.emails.backoffice]]
        ];
        for (const [sql, values] of queries) deletedRows += (await connection.query(sql, values)).rowCount;
        await restoreTricycle(connection, manifest);
        await connection.query('COMMIT');
    } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
    } finally {
        connection.release();
    }

    const checks = [
        ['utilisateurs', 'id', ids.agentUser], ['utilisateurs', 'id', ids.backofficeUser],
        ['agents', 'id', ids.agent], ['collectes', 'id', ids.collecte],
        ['missions', 'id', ids.mission], ['missions_collectes', 'mission_id', ids.mission],
        ['mission_evenements', 'mission_id', ids.mission], ['preuves_collecte', 'mission_id', ids.mission],
        ['pesees', 'mission_id', ids.mission]
    ];
    for (const [table, key, id] of checks) {
        const result = await readPool.query('SELECT count(*)::int AS n FROM ' + table + ' WHERE ' + key + '=$1', [id]);
        assert.equal(result.rows[0].n, 0, 'Données temporaires restantes dans ' + table + '.');
    }
    for (const type of ['avant_collecte', 'apres_collecte', 'ticket_balance']) {
        const prefix = [ORGANISATION_ID, ids.mission, ids.collecte, type].join('/');
        const files = await storage('POST', '/object/list/' + encodeURIComponent(storageConfig.bucket), { prefix, limit: 100 });
        assert.equal(files.length, 0, 'Objets Storage temporaires encore présents sous ' + type + '.');
    }
    await assertReferencesUnchanged(manifest);
    return { deletedRows, deletedStorageObjects: storagePaths.length };
}
async function restoreTricycle(connection, manifest) {
    if (manifest.version < 2 || manifest.tricycleOverrideState === 'not_started') return;
    const snapshot = manifest.tricycleSnapshot;
    const current = await one(connection, `
        SELECT id, organisation_id, numero_interne, statut, etat,
               modifie_le::text AS modifie_le_exact
        FROM tricycles WHERE id=$1 FOR UPDATE
    `, [snapshot.id], 'TRI-001 a disparu ; restauration impossible.');
    assert.equal(current.organisation_id, snapshot.organisation_id, 'Organisation de TRI-001 modifiée.');
    assert.equal(current.numero_interne, snapshot.numero_interne, 'Numéro de TRI-001 modifié.');
    assert.equal(current.etat, snapshot.etat,
        'État mécanique de TRI-001 modifié pendant le run ; restauration automatique refusée.');
    assert.ok(['disponible', 'en_mission'].includes(current.statut),
        'Statut de TRI-001 modifié hors du scénario ; restauration automatique refusée.');
    const restored = await connection.query(`
        UPDATE tricycles SET statut=$1, modifie_le=$2::timestamptz
        WHERE id=$3 AND organisation_id=$4 AND numero_interne=$5 AND etat=$6
    `, [snapshot.statut, snapshot.modifie_le, snapshot.id, snapshot.organisation_id,
        snapshot.numero_interne, snapshot.etat]);
    assert.equal(restored.rowCount, 1, 'Restauration de TRI-001 non appliquée.');
}
async function assertReferencesUnchanged(manifest) {
    const current = await currentBalanceSnapshot(readPool);
    assert.deepEqual(current, manifest.balanceSnapshot, 'Une balance pilote a été modifiée, supprimée ou recréée.');
    if (manifest.version === 2) {
        const tricycle = await one(readPool, `
            SELECT id, organisation_id, numero_interne, statut, etat,
                   modifie_le::text AS modifie_le_exact
            FROM tricycles WHERE id=$1
        `, [TRICYCLE_ID]);
        assert.deepEqual(stableTricycle(tricycle), manifest.tricycleSnapshot,
            'TRI-001 n’a pas été restauré exactement à son état antérieur.');
    }
}
async function closePools() {
    await Promise.allSettled([pool.end(), readPool.end()]);
}

let manifest;
try {
    if (cleanupRunId) {
        manifest = loadManifest(cleanupRunId);
        const result = await cleanup(manifest);
        fs.rmSync(manifestPath(manifest.runId), { force: true });
        console.log('Nettoyage ciblé terminé pour runId : ' + manifest.runId);
        console.log('Lignes affectées : ' + result.deletedRows + ' ; objets Storage supprimés : ' + result.deletedStorageObjects);
        console.log('Balances pilotes vérifiées et conservées.');
    } else {
        const snapshots = await checkPreconditions();
        const runId = randomUUID();
        const agentPassword = randomBytes(18).toString('base64url') + '!aA1';
        const backofficePassword = randomBytes(18).toString('base64url') + '!bB2';
        manifest = {
            version: 2,
            runId,
            label: fixtureLabel(runId),
            createdAt: new Date().toISOString(),
            businessDate: businessDate(),
            businessTimezone: BUSINESS_TIMEZONE,
            fixturesCommitted: false,
            emails: {
                agent: 'ptv1-agent-' + runId + '@example.com',
                backoffice: 'ptv1-manager-' + runId + '@example.com'
            },
            ids: {
                agentUser: randomUUID(),
                agent: randomUUID(),
                backofficeUser: randomUUID(),
                collecte: randomUUID(),
                mission: randomUUID()
            },
            refs: {
                organisation: ORGANISATION_ID,
                tricycle: TRICYCLE_ID,
                site: SITE_ID,
                balanceTerrain: BALANCE_TERRAIN_ID,
                balanceDepot: BALANCE_DEPOT_ID
            },
            balanceSnapshot: snapshots.balances,
            tricycleSnapshot: snapshots.tricycle,
            tricycleOverrideState: 'not_started'
        };
        saveManifest(manifest);
        await prepareTricycle(manifest);
        await createFixtures(manifest, agentPassword, backofficePassword);
        await validatePermissions(manifest, { agentPassword, backofficePassword });

        if (smokeMode) {
            await smokeStartMission(manifest, agentPassword);
            const result = await cleanup(manifest);
            fs.rmSync(manifestPath(manifest.runId), { force: true });
            console.log('Cycle smoke OK : création, démarrage mission et nettoyage strict.');
            console.log('Lignes affectées : ' + result.deletedRows + ' ; objets Storage supprimés : ' + result.deletedStorageObjects);
            console.log('TRI-001 restauré exactement ; balances pilotes inchangées.');
        } else {
            console.log('');
            console.log('=== VALIDATION MANUELLE PESÉE & TRAÇABILITÉ V1 PRÊTE ===');
            console.log('runId : ' + runId);
            console.log('Mission : ' + manifest.ids.mission);
            console.log('Collecte : ' + manifest.ids.collecte);
            console.log('Client réutilisé : ' + manifest.refs.clientNom);
            console.log('');
            console.log('TERRAIN');
            console.log('URL : ' + TERRAIN_URL);
            console.log('E-mail : ' + manifest.emails.agent);
            console.log('Mot de passe : ' + agentPassword);
            console.log('Balance : ' + BALANCE_TERRAIN_NUMERO);
            console.log('');
            console.log('BACK-OFFICE');
            console.log('URL : ' + BACKOFFICE_URL);
            console.log('E-mail : ' + manifest.emails.backoffice);
            console.log('Mot de passe : ' + backofficePassword);
            console.log('Balance : ' + BALANCE_DEPOT_NUMERO);
            console.log('');
            console.log('Les fixtures restent en place jusqu’à validation et nettoyage.');
            console.log('Après interruption : node backend/tester-pesee-tracabilite-v1-manuel.mjs C:\\ProRecup --cleanup ' + runId);

            const terminal = createInterface({ input: process.stdin, output: process.stdout });
            await terminal.question('\nAppuyez sur Entrée après les deux pesées terrain, la clôture et les deux pesées dépôt...');
            terminal.close();

            const finalState = await validateFinalState(manifest, { agentPassword, backofficePassword });
            console.log('Validation OK — mission : ' + finalState.mission +
                ', collecte : ' + finalState.collecte + ', poids_reel : ' + finalState.poidsReel +
                ', historique : ' + finalState.pesees + ' pesées, tickets : ' + finalState.tickets +
                ', écart final : ' + finalState.ecartFinal.toFixed(2) + ' %, anomalie : ' + finalState.anomalie + '.');
            const result = await cleanup(manifest);
            fs.rmSync(manifestPath(manifest.runId), { force: true });
            console.log('Nettoyage strict OK — ' + result.deletedRows + ' lignes affectées et ' +
                result.deletedStorageObjects + ' objets Storage supprimés.');
            console.log('TRI-001 restauré exactement ; les deux balances pilotes sont inchangées.');
        }
    }
} catch (error) {
    process.exitCode = 1;
    console.error('ÉCHEC : ' + safeMessage(error));
    if (manifest) {
        console.error('Les fixtures sont conservées pour diagnostic/nettoyage ciblé.');
        console.error('Relancez : node backend/tester-pesee-tracabilite-v1-manuel.mjs C:\\ProRecup --cleanup ' + manifest.runId);
    }
} finally {
    await closePools();
}
