/**
 * E2E API Terrain isolé. Ne modifie ni le code de l'application ni les anciens tests.
 * Usage : node backend/tester-terrain-v1-e2e-isole.mjs C:\ProRecup
 * Nécessite l'accès réseau à la base et au Storage configurés dans backend/.env.
 * Le GPS est une donnée synthétique explicite du test, pas une mesure d'appareil.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const repo = path.resolve(process.argv[2] || 'C:\\ProRecup');
const backend = path.join(repo, 'backend');
const require = createRequire(path.join(backend, 'package.json'));
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
dotenv.config({ path: path.join(backend, '.env'), quiet: true });
const output = path.dirname(fileURLToPath(import.meta.url));
const runId = randomUUID();
const reportPath = path.join(output, 'terrain-e2e-resultat-' + runId + '.json');
const ids = Object.fromEntries(['org','user','agent','tricycle','client','site','collecte','mission','association'].map(k => [k, randomUUID()]));
const operations = new Map();
const storagePaths = new Set();
const steps = [];
const plannedSteps = ['préconditions', 'fixtures', 'connexion Terrain', 'démarrer mission', 'arrivée',
    'démarrer collecte', 'preuve avant', 'terminer collecte', 'preuve après', 'terminer mission',
    'état PostgreSQL final', 'nettoyage'];
const report = { runId, ids, steps, syntheticGps: true, status: 'EN_COURS' };
const gps = { latitude: -4.321, longitude: 15.312, precision_gps: 5 };
const email = 'terrain-e2e-' + runId + '@example.invalid';
const password = randomBytes(32).toString('base64url');
const label = 'terrain-e2e-' + runId;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000, max: 3 });
let fixtureAttempted = false;
let fixtureCommitted = false;
let server;
let appPool;
let origin;
let token;
let currentStep;
let config;

function save() {
    report.operationIds = [...operations.values()].map(o => o.operation_id);
    report.storagePaths = [...storagePaths];
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}
function safeError(error) {
    // Never log raw HTTP requests, tokens, connection strings or signed URLs.
    return { name: error.name, code: error.code || error.cause?.code || null,
        message: error.code === 'EACCES' ? 'Accès réseau refusé (EACCES).' :
            String(error.message || 'Échec sans message').replace(/https?:\/\/\S+/g, '[URL masquée]') };
}
async function step(name, fn) {
    currentStep = name;
    try {
        const detail = await fn();
        steps.push({ name, status: 'OK', detail });
        console.log('OK — ' + name);
        save();
        return detail;
    } catch (e) {
        steps.push({ name, status: 'ECHEC', error: safeError(e) });
        console.log('ECHEC — ' + name + ': ' + safeError(e).message);
        save();
        throw e;
    }
}
async function storage(method, suffix, body) {
    const headers = { apikey: config.key };
    if (!config.key.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + config.key;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(config.url + '/storage/v1' + suffix, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
    });
    let data;
    try { data = await response.json(); } catch { data = null; }
    assert.ok(response.ok, 'Storage ' + method + ': HTTP ' + response.status);
    return data;
}
const encodedPath = value => value.split('/').map(encodeURIComponent).join('/');
async function api(method, suffix, body, expected = 200) {
    const headers = { Origin: 'http://localhost:5000' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    // Mutations are awaited without client cancellation: cleanup must not race an in-flight commit.
    const response = await fetch(origin + suffix, {
        method, headers,
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body)
    });
    const data = await response.json();
    assert.equal(response.status, expected, method + ' ' + suffix + ' : ' + (data.error || data.message || 'réponse inattendue'));
    return data;
}
async function one(sql, values = []) {
    const result = await pool.query(sql, values);
    assert.equal(result.rows.length, 1, 'Une ligne PostgreSQL attendue.');
    return result.rows[0];
}
async function refresh(expectedAction) {
    const result = await api('GET', '/api/terrain/journee');
    const mission = result.data.missions.find(m => m.id === ids.mission);
    assert.ok(mission, 'La journée contient la mission temporaire.');
    if (expectedAction) assert.equal(mission.action_suivante, expectedAction);
    return mission;
}
const missionBase = () => '/api/terrain/missions/' + ids.mission;
const collecteBase = () => missionBase() + '/collectes/' + ids.collecte;
async function eventAction(name, suffix, eventType, extra, nextAction) {
    return step(name, async () => {
        const payload = { operation_id: randomUUID(), survenu_le: new Date().toISOString(), ...gps, ...extra };
        operations.set(name, payload);
        save();
        assert.equal('agent_id' in payload, false);
        const first = await api('POST', suffix, payload);
        assert.equal(first.data.deja_traitee, false);
        const repeat = await api('POST', suffix, payload);
        assert.equal(repeat.data.deja_traitee, true);
        const row = await one('SELECT * FROM mission_evenements WHERE operation_id=$1', [payload.operation_id]);
        assert.equal(row.mission_id, ids.mission);
        assert.equal(row.type_evenement, eventType);
        assert.equal(row.cree_par, ids.user);
        if (suffix.includes('/collectes/')) assert.equal(row.collecte_id, ids.collecte);
        assert.equal(new Date(row.survenu_le).toISOString(), payload.survenu_le);
        assert.equal(Number(row.latitude), gps.latitude);
        assert.equal(Number(row.longitude), gps.longitude);
        assert.equal(Number(row.precision_gps), gps.precision_gps);
        await refresh(nextAction);
        return { http: 200, retryHttp: 200, dejaTraitee: true, rowCount: 1, timestampAndGps: 'OK' };
    });
}
// A real tiny PNG fixture; both proof records are independent even with the same pixels.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
async function proofAction(name, type, nextAction) {
    return step(name, async () => {
        const payload = { operation_id: randomUUID(), pris_le: new Date().toISOString(), type_preuve: type, ...gps };
        operations.set(name, payload);
        const objectPath = [ids.org, ids.mission, ids.collecte, type, payload.operation_id + '.png'].join('/');
        storagePaths.add(objectPath); // register before upload, including uncertain responses
        save();
        function body() {
            const form = new FormData();
            for (const [key, value] of Object.entries(payload)) form.append(key, String(value));
            form.append('fichier', new Blob([png], { type: 'image/png' }), 'preuve-e2e.png');
            return form;
        }
        const first = await api('POST', collecteBase() + '/preuves', body());
        assert.equal(first.data.deja_traitee, false);
        const repeat = await api('POST', collecteBase() + '/preuves', body());
        assert.equal(repeat.data.deja_traitee, true);
        assert.equal(first.data.preuve.id, repeat.data.preuve.id);
        const proof = await one('SELECT * FROM preuves_collecte WHERE operation_id=$1', [payload.operation_id]);
        assert.equal(proof.storage_path, objectPath);
        assert.equal(proof.storage_bucket, config.bucket);
        assert.equal(proof.mission_id, ids.mission);
        assert.equal(proof.collecte_id, ids.collecte);
        assert.equal(proof.cree_par, ids.user);
        assert.equal(proof.type_preuve, type);
        assert.equal(Number(proof.taille_octets), png.length);
        assert.equal(proof.hash_sha256, createHash('sha256').update(png).digest('hex'));
        assert.equal(new Date(proof.pris_le).toISOString(), payload.pris_le);
        for (const key of Object.keys(gps)) assert.equal(Number(proof[key]), gps[key]);
        const prefix = [ids.org, ids.mission, ids.collecte, type].join('/');
        const listing = await storage('POST', '/object/list/' + encodeURIComponent(config.bucket), { prefix, limit: 100 });
        assert.equal(listing.length, 1, 'Un seul objet Storage après retry.');
        assert.equal(listing[0].name, payload.operation_id + '.png');
        const signed = await api('GET', collecteBase() + '/preuves/' + proof.id + '/url');
        assert.ok(signed.data.url);
        const download = await fetch(signed.data.url, { signal: AbortSignal.timeout(30000) });
        assert.equal(download.status, 200);
        assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
        const anonymous = await fetch(config.url + '/storage/v1/object/public/' + encodeURIComponent(config.bucket) + '/' + encodedPath(objectPath),
            { signal: AbortSignal.timeout(30000) });
        assert.ok(!anonymous.ok, 'Le fichier ne doit pas être accessible publiquement.');
        await refresh(nextAction);
        return { http: 200, retryHttp: 200, rowCount: 1, storageObjects: 1, signedDownload: 200, bytesAndHash: 'OK', publicAccessDenied: true };
    });
}
const allowedTables = new Set(['organisations','utilisateurs','agents','tricycles','clients','sites_de_collecte','collectes','missions','missions_collectes']);
async function insert(connection, table, values) {
    assert.ok(allowedTables.has(table));
    const keys = Object.keys(values);
    assert.ok(keys.every(k => /^[a-z_]+$/.test(k)));
    const placeholders = keys.map((_, i) => '$' + (i + 1)).join(',');
    await connection.query('INSERT INTO ' + table + ' (' + keys.join(',') + ') VALUES (' + placeholders + ')', Object.values(values));
}
async function fixtures() {
    const role = await one("SELECT id FROM roles WHERE lower(trim(nom))='agent_valorisation_carbone'");
    const type = await one('SELECT id FROM types_dechets ORDER BY id LIMIT 1');
    const connection = await pool.connect();
    fixtureAttempted = true;
    save();
    try {
        await connection.query('BEGIN');
        await insert(connection, 'organisations', { id: ids.org, nom: label, slug: label, pays: 'RDC', devise: 'USD', fuseau_horaire: 'Africa/Kinshasa' });
        await insert(connection, 'utilisateurs', { id: ids.user, nom: label, email, mot_de_passe: await bcrypt.hash(password, 10), organisation_id: ids.org, role_id: role.id, actif: true });
        await insert(connection, 'agents', { id: ids.agent, utilisateur_id: ids.user, statut: 'actif', disponible: true });
        await insert(connection, 'tricycles', { id: ids.tricycle, organisation_id: ids.org, numero_interne: label, plaque_identification: label, capacite_kg: 300, statut: 'disponible', etat: 'bon' });
        await insert(connection, 'clients', { id: ids.client, organisation_id: ids.org, nom: label, type_client: 'Entreprise' });
        await insert(connection, 'sites_de_collecte', { id: ids.site, organisation_id: ids.org, nom: label, latitude: gps.latitude, longitude: gps.longitude, precision_gps_reference: 5, rayon_validation_m: 100 });
        await insert(connection, 'collectes', { id: ids.collecte, site_id: ids.site, client_id: ids.client, agent_id: ids.user, type_dechet_id: type.id, poids_estime: 12, statut: 'en_attente' });
        await insert(connection, 'missions', { id: ids.mission, organisation_id: ids.org, agent_id: ids.agent, tricycle_id: ids.tricycle, date_prevue: new Date().toISOString().slice(0, 10), heure_depart_prevue: '08:00', heure_retour_prevue: '16:00', statut: 'planifiee', observations: label, cree_par: ids.user });
        // Association may not have an id column: use its natural key.
        await insert(connection, 'missions_collectes', { mission_id: ids.mission, collecte_id: ids.collecte, ordre_collecte: 1 });
        await connection.query('COMMIT');
        fixtureCommitted = true;
    } catch (e) {
        await connection.query('ROLLBACK');
        throw e;
    } finally { connection.release(); }
    return { newOrganisation: true, newUserAndAgent: true, plannedMission: true, associatedCollecte: true, availableTricycle: true, existingRoleAndWasteType: 'lecture seule' };
}
async function cleanup() {
    if (!fixtureAttempted) return { createdRows: 0, deletedRows: 0, storageObjects: 0 };
    // Every path was generated and registered by this run; never delete a broad prefix.
    for (const objectPath of storagePaths) {
        assert.ok(objectPath.startsWith(ids.org + '/' + ids.mission + '/' + ids.collecte + '/'));
        const slash = objectPath.lastIndexOf('/');
        const prefix = objectPath.slice(0, slash);
        const name = objectPath.slice(slash + 1);
        const files = await storage('POST', '/object/list/' + encodeURIComponent(config.bucket), { prefix, limit: 100 });
        if (files.some(file => file.name === name)) {
            await storage('DELETE', '/object/' + encodeURIComponent(config.bucket), { prefixes: [objectPath] });
        }
        const remaining = await storage('POST', '/object/list/' + encodeURIComponent(config.bucket), { prefix, limit: 100 });
        assert.equal(remaining.some(file => file.name === name), false, 'Objet temporaire encore présent.');
    }
    const connection = await pool.connect();
    let deletedRows = 0;
    try {
        await connection.query('BEGIN');
        const owned = await connection.query('SELECT id FROM organisations WHERE id=$1 AND slug=$2', [ids.org, label]);
        if (fixtureCommitted) assert.equal(owned.rowCount, 1, 'La propriété des fixtures doit être confirmée.');
        if (owned.rowCount === 1) {
            const queries = [
                ['DELETE FROM preuves_collecte WHERE organisation_id=$1 AND mission_id=$2 AND collecte_id=$3', [ids.org, ids.mission, ids.collecte]],
                ['DELETE FROM mission_evenements WHERE mission_id=$1', [ids.mission]],
                ['DELETE FROM missions_collectes WHERE mission_id=$1 AND collecte_id=$2', [ids.mission, ids.collecte]],
                ['DELETE FROM missions WHERE id=$1 AND organisation_id=$2', [ids.mission, ids.org]],
                ['DELETE FROM collectes WHERE id=$1 AND site_id=$2', [ids.collecte, ids.site]],
                ['DELETE FROM sites_de_collecte WHERE id=$1 AND organisation_id=$2', [ids.site, ids.org]],
                ['DELETE FROM clients WHERE id=$1 AND organisation_id=$2', [ids.client, ids.org]],
                ['DELETE FROM tricycles WHERE id=$1 AND organisation_id=$2', [ids.tricycle, ids.org]],
                ['DELETE FROM agents WHERE id=$1 AND utilisateur_id=$2', [ids.agent, ids.user]],
                ['DELETE FROM utilisateurs WHERE id=$1 AND organisation_id=$2', [ids.user, ids.org]],
                ['DELETE FROM organisations WHERE id=$1 AND slug=$2', [ids.org, label]]
            ];
            for (const [sql, values] of queries) deletedRows += (await connection.query(sql, values)).rowCount;
        }
        await connection.query('COMMIT');
    } catch (e) {
        await connection.query('ROLLBACK');
        throw e; // no CASCADE, no deletion of unrelated rows to force cleanup
    } finally { connection.release(); }
    const checks = [
        ['organisations', 'id', ids.org], ['utilisateurs', 'id', ids.user], ['agents', 'id', ids.agent],
        ['tricycles','id',ids.tricycle], ['clients','id',ids.client], ['sites_de_collecte','id',ids.site],
        ['collectes','id',ids.collecte], ['missions','id',ids.mission], ['missions_collectes','mission_id',ids.mission],
        ['mission_evenements','mission_id',ids.mission], ['preuves_collecte','mission_id',ids.mission]
    ];
    for (const [table, key, id] of checks) {
        const result = await one('SELECT count(*)::int AS n FROM ' + table + ' WHERE ' + key + '=$1', [id]);
        assert.equal(result.n, 0, 'Données temporaires restantes dans ' + table);
    }
    return { deletedRows, remainingFixtureRows: 0, remainingStorageObjects: 0 };
}

save();
try {
    await step('préconditions', async () => {
        assert.ok(process.env.DATABASE_URL, 'DATABASE_URL requise.');
        await pool.query('SELECT 1');
        assert.ok(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_STORAGE_BUCKET,
            'Configuration Storage backend requise.');
        config = { url: process.env.SUPABASE_URL.replace(/\/$/, ''), key: process.env.SUPABASE_SECRET_KEY, bucket: process.env.SUPABASE_STORAGE_BUCKET };
        const bucket = await storage('GET', '/bucket/' + encodeURIComponent(config.bucket));
        assert.equal(bucket.public, false, 'Bucket privé requis ; le test ne change jamais ses paramètres.');
        return { postgres: 'accessible', privateBucket: true };
    });
    await step('fixtures', fixtures);
    process.chdir(backend);
    const app = (await import(pathToFileURL(path.join(backend, 'src/app.js')).href)).default;
    appPool = (await import(pathToFileURL(path.join(backend, 'src/config/db.js')).href)).default;
    server = await new Promise((resolve, reject) => {
        const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
        httpServer.on('error', reject);
    });
    origin = 'http://127.0.0.1:' + server.address().port;
    await step('connexion Terrain', async () => {
        const login = await api('POST', '/api/auth/login', { email, motDePasse: password });
        token = login.token;
        assert.ok(token);
        assert.equal(login.utilisateur.id, ids.user);
        await api('GET', '/api/terrain/me');
        await refresh('demarrer_mission');
        return { loginHttp: 200, terrainMeHttp: 200, realJwt: true };
    });
    await eventAction('démarrer mission', missionBase() + '/demarrer', 'mission_demarree', {}, 'arriver_site');
    const started = await one('SELECT statut FROM missions WHERE id=$1', [ids.mission]);
    assert.equal(started.statut, 'en_cours');
    const busy = await one('SELECT disponible FROM agents WHERE id=$1', [ids.agent]);
    assert.equal(busy.disponible, false);
    await eventAction('arrivée', collecteBase() + '/arrivee', 'arrivee_site', {}, 'demarrer_collecte');
    await eventAction('démarrer collecte', collecteBase() + '/demarrer', 'collecte_demarree', {}, 'terminer_collecte');
    await proofAction('preuve avant', 'avant_collecte', 'terminer_collecte');
    await eventAction('terminer collecte', collecteBase() + '/terminer', 'collecte_terminee',
        { resultat_terrain: 'collectee', poids_reel: 12.5, motif_terrain: null }, 'terminer_mission');
    await proofAction('preuve après', 'apres_collecte', 'terminer_mission');
    await eventAction('terminer mission', missionBase() + '/terminer', 'mission_terminee', {}, 'aucune');
    await step('état PostgreSQL final', async () => {
        const mission = await one('SELECT * FROM missions WHERE id=$1', [ids.mission]);
        assert.equal(mission.statut, 'terminee');
        assert.equal(new Date(mission.heure_depart_reelle).toISOString(), operations.get('démarrer mission').survenu_le);
        assert.equal(new Date(mission.heure_retour_reelle).toISOString(), operations.get('terminer mission').survenu_le);
        const collecte = await one('SELECT * FROM collectes WHERE id=$1', [ids.collecte]);
        assert.equal(collecte.resultat_terrain, 'collectee');
        assert.equal(Number(collecte.poids_reel), 12.5);
        assert.equal(collecte.poids_reel_saisi_par, ids.user);
        const agent = await one('SELECT disponible FROM agents WHERE id=$1', [ids.agent]);
        assert.equal(agent.disponible, true);
        const tricycle = await one('SELECT statut FROM tricycles WHERE id=$1', [ids.tricycle]);
        assert.equal(tricycle.statut, 'disponible');
        const events = await one('SELECT count(*)::int AS n FROM mission_evenements WHERE mission_id=$1', [ids.mission]);
        const proofs = await one('SELECT count(*)::int AS n FROM preuves_collecte WHERE mission_id=$1', [ids.mission]);
        assert.equal(events.n, 5);
        assert.equal(proofs.n, 2);
        assert.equal(new Set([...operations.values()].map(o => o.operation_id)).size, 7);
        return { mission: 'terminee', poids: 12.5, events: 5, proofs: 2, uniqueOperationIds: 7, agentAvailable: true, tricycleAvailable: true };
    });
    report.status = 'OK';
} catch (error) {
    report.status = currentStep === 'préconditions' ? 'BLOQUE_AVANT_CREATION' : 'ECHEC';
    report.error = safeError(error);
    process.exitCode = 1;
} finally {
    if (server) {
        server.closeIdleConnections?.();
        await new Promise(resolve => server.close(resolve));
    }
    if (appPool) await appPool.end();
    try { await step('nettoyage', cleanup); }
    catch (error) { report.status = 'NETTOYAGE_INCOMPLET'; report.cleanupError = safeError(error); process.exitCode = 1; }
    await pool.end();
    for (const name of plannedSteps) if (!steps.some(s => s.name === name)) steps.push({ name, status: 'NON_EXECUTE' });
    save();
    console.log('Résultat : ' + report.status);
    console.log('Rapport : ' + reportPath);
}
