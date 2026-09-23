/**
 * Prépare un parcours Terrain V1 temporaire pour un test manuel sur téléphone.
 *
 * Création : node backend/tester-terrain-v1-manuel-telephone.mjs C:\\ProRecup
 * Nettoyage après interruption :
 *   node backend/tester-terrain-v1-manuel-telephone.mjs C:\\ProRecup --cleanup <runId>
 *
 * Les mutations métier sont exclusivement effectuées par l'utilisateur depuis
 * le téléphone. Ce script ne les rejoue jamais et ne fait aucun retry de mutation.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const args = process.argv.slice(2);
const cleanupIndex = args.indexOf('--cleanup');
const cleanupRunId = cleanupIndex === -1 ? null : args[cleanupIndex + 1];
const positional = cleanupIndex === -1
    ? args
    : args.filter((value, index) => index !== cleanupIndex && index !== cleanupIndex + 1);
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
if (cleanupIndex !== -1) assert.match(cleanupRunId || '', /^[0-9a-f-]{36}$/i, 'runId de nettoyage invalide.');

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
const frontendUrl = process.env.TERRAIN_MANUAL_FRONTEND_URL || 'https://prorecup-frontend.onrender.com';
const gps = { latitude: -4.321, longitude: 15.312 };
const allowedTables = new Set([
    'organisations', 'utilisateurs', 'agents', 'tricycles', 'clients',
    'sites_de_collecte', 'collectes', 'missions', 'missions_collectes'
]);

function fixtureLabel(runId) {
    const label = 'tm-' + runId;
    assert.ok(label.length <= 50, 'Le libellé de fixture dépasse 50 caractères.');
    return label;
}

function assertGeneratedValueLengths(manifest) {
    assert.ok(manifest.label.length <= 50, 'Le libellé de fixture dépasse VARCHAR(50).');
    assert.ok(manifest.email.length <= 255, 'L’e-mail temporaire dépasse VARCHAR(255).');
}

function manifestPath(runId) {
    return path.join(runsDirectory, runId + '.json');
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
    assert.ok(fs.existsSync(source), 'Aucun manifeste trouvé pour ce runId.');
    const manifest = JSON.parse(fs.readFileSync(source, 'utf8'));
    assert.equal(manifest.runId, runId, 'Le manifeste ne correspond pas au runId demandé.');
    const validLabels = new Set([fixtureLabel(runId), 'terrain-manuel-' + runId]);
    assert.ok(validLabels.has(manifest.label), 'Libellé de propriété du manifeste invalide.');
    for (const key of ['org', 'user', 'agent', 'tricycle', 'client', 'site', 'collecte', 'mission']) {
        assert.match(manifest.ids?.[key] || '', /^[0-9a-f-]{36}$/i, 'Identifiant de manifeste invalide : ' + key);
    }
    return manifest;
}
function safeMessage(error) {
    let message = error instanceof Error ? error.message : 'Erreur inattendue.';
    for (const value of [
        process.env.DATABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
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
    try { data = await response.json(); } catch { /* Une suppression réussie peut ne rien renvoyer. */ }
    assert.ok(response.ok, 'Storage ' + method + ' : HTTP ' + response.status);
    return data;
}
async function insert(connection, table, values) {
    assert.ok(allowedTables.has(table), 'Table de fixture non autorisée.');
    const keys = Object.keys(values);
    assert.ok(keys.every(key => /^[a-z_]+$/.test(key)));
    const placeholders = keys.map((_, index) => '$' + (index + 1)).join(',');
    await connection.query(
        'INSERT INTO ' + table + ' (' + keys.join(',') + ') VALUES (' + placeholders + ')',
        Object.values(values)
    );
}
async function one(connection, sql, values = []) {
    const result = await connection.query(sql, values);
    assert.equal(result.rows.length, 1, 'Une ligne PostgreSQL attendue.');
    return result.rows[0];
}
async function checkPreconditions() {
    await pool.query('SELECT 1');
    const bucket = await storage('GET', '/bucket/' + encodeURIComponent(storageConfig.bucket));
    assert.equal(bucket.public, false, 'Le bucket Storage doit être privé.');
}
async function createFixtures(manifest, password) {
    assertGeneratedValueLengths(manifest);
    const ids = manifest.ids;
    const role = await one(pool, "SELECT id FROM roles WHERE lower(trim(nom))='agent_valorisation_carbone'");
    const wasteType = await one(pool, 'SELECT id FROM types_dechets ORDER BY id LIMIT 1');
    const passwordHash = await bcrypt.hash(password, 10);
    assert.ok(passwordHash.length <= 255, 'Le hash du mot de passe dépasse VARCHAR(255).');
    const connection = await pool.connect();
    try {
        await connection.query('BEGIN');
        await insert(connection, 'organisations', {
            id: ids.org, nom: manifest.label, slug: manifest.label,
            pays: 'RDC', devise: 'USD', fuseau_horaire: 'Africa/Kinshasa'
        });
        await insert(connection, 'utilisateurs', {
            id: ids.user, nom: manifest.label, email: manifest.email,
            mot_de_passe: passwordHash, organisation_id: ids.org,
            role_id: role.id, actif: true
        });
        await insert(connection, 'agents', {
            id: ids.agent, utilisateur_id: ids.user, statut: 'actif', disponible: true
        });
        await insert(connection, 'tricycles', {
            id: ids.tricycle, organisation_id: ids.org, numero_interne: manifest.label,
            plaque_identification: manifest.label, capacite_kg: 300, statut: 'disponible', etat: 'bon'
        });
        await insert(connection, 'clients', {
            id: ids.client, organisation_id: ids.org, nom: manifest.label, type_client: 'Entreprise'
        });
        await insert(connection, 'sites_de_collecte', {
            id: ids.site, organisation_id: ids.org, nom: manifest.label,
            latitude: gps.latitude, longitude: gps.longitude,
            precision_gps_reference: 5, rayon_validation_m: 100
        });
        await insert(connection, 'collectes', {
            id: ids.collecte, site_id: ids.site, client_id: ids.client, agent_id: ids.user,
            type_dechet_id: wasteType.id, poids_estime: 12, statut: 'en_attente'
        });
        await insert(connection, 'missions', {
            id: ids.mission, organisation_id: ids.org, agent_id: ids.agent,
            tricycle_id: ids.tricycle, date_prevue: new Date().toISOString().slice(0, 10),
            heure_depart_prevue: '08:00', heure_retour_prevue: '16:00', statut: 'planifiee',
            observations: manifest.label, cree_par: ids.user
        });
        await insert(connection, 'missions_collectes', {
            mission_id: ids.mission, collecte_id: ids.collecte, ordre_collecte: 1
        });
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
function exactTypes(rows, expected, key) {
    assert.deepEqual(
        rows.map(row => row[key]).sort(),
        [...expected].sort()
    );
}
async function validateFinalState(manifest) {
    const ids = manifest.ids;
    const mission = await one(readPool, 'SELECT statut, heure_depart_reelle, heure_retour_reelle FROM missions WHERE id=$1', [ids.mission]);
    const collecte = await one(readPool, 'SELECT statut, resultat_terrain, poids_reel, poids_reel_saisi_par FROM collectes WHERE id=$1', [ids.collecte]);
    const events = (await readPool.query(
        'SELECT operation_id, type_evenement FROM mission_evenements WHERE mission_id=$1',
        [ids.mission]
    )).rows;
    const proofs = (await readPool.query(
        'SELECT operation_id, type_preuve, storage_path FROM preuves_collecte WHERE mission_id=$1',
        [ids.mission]
    )).rows;

    assert.equal(mission.statut, 'terminee', 'La mission doit être terminée.');
    assert.ok(mission.heure_depart_reelle && mission.heure_retour_reelle, 'Les heures réelles de mission sont requises.');
    assert.equal(collecte.resultat_terrain, 'collectee', 'La collecte doit avoir le résultat collectée.');
    assert.ok(collecte.poids_reel !== null, 'Le poids réel doit être renseigné.');
    assert.equal(collecte.poids_reel_saisi_par, ids.user, 'Le poids doit être saisi par le compte temporaire.');
    assert.equal(events.length, 5, 'Cinq actions métier sont attendues.');
    assert.equal(proofs.length, 2, 'Deux preuves sont attendues.');
    exactTypes(events, ['mission_demarree', 'arrivee_site', 'collecte_demarree', 'collecte_terminee', 'mission_terminee'], 'type_evenement');
    exactTypes(proofs, ['avant_collecte', 'apres_collecte'], 'type_preuve');

    const operationIds = [...events, ...proofs].map(row => row.operation_id);
    assert.ok(operationIds.every(id => /^[0-9a-f-]{36}$/i.test(id || '')), 'Chaque action/preuve doit conserver un operation_id UUID.');
    assert.equal(new Set(operationIds).size, 7, 'Les sept operation_id doivent être uniques.');
    for (const proof of proofs) {
        const expectedPrefix = ids.org + '/' + ids.mission + '/' + ids.collecte + '/' + proof.type_preuve + '/';
        assert.ok(proof.storage_path.startsWith(expectedPrefix), 'Chemin Storage hors du préfixe temporaire.');
        const slash = proof.storage_path.lastIndexOf('/');
        const prefix = proof.storage_path.slice(0, slash);
        const name = proof.storage_path.slice(slash + 1);
        const files = await storage('POST', '/object/list/' + encodeURIComponent(storageConfig.bucket), { prefix, limit: 100 });
        assert.ok(files.some(file => file.name === name), 'Objet Storage de preuve absent.');
    }
    return {
        mission: mission.statut,
        collecte: collecte.resultat_terrain,
        poidsReel: Number(collecte.poids_reel),
        actions: events.length,
        preuves: proofs.length,
        operationIds: operationIds.length
    };
}
async function ownedStoragePaths(manifest) {
    const ids = manifest.ids;
    const paths = new Set();
    const rows = (await pool.query(
        'SELECT storage_path FROM preuves_collecte WHERE organisation_id=$1 AND mission_id=$2 AND collecte_id=$3',
        [ids.org, ids.mission, ids.collecte]
    )).rows;
    for (const row of rows) paths.add(row.storage_path);

    for (const type of ['avant_collecte', 'apres_collecte']) {
        const prefix = [ids.org, ids.mission, ids.collecte, type].join('/');
        const files = await storage('POST', '/object/list/' + encodeURIComponent(storageConfig.bucket), { prefix, limit: 100 });
        for (const file of files) paths.add(prefix + '/' + file.name);
    }
    for (const objectPath of paths) {
        const ownedPrefix = ids.org + '/' + ids.mission + '/' + ids.collecte + '/';
        assert.ok(objectPath.startsWith(ownedPrefix), 'Refus de supprimer un objet Storage hors du run.');
    }
    return [...paths];
}
async function cleanup(manifest) {
    const ids = manifest.ids;
    const owned = await pool.query(
        'SELECT id FROM organisations WHERE id=$1 AND slug=$2',
        [ids.org, manifest.label]
    );
    if (owned.rowCount === 0) {
        const leftovers = await pool.query('SELECT count(*)::int AS n FROM missions WHERE id=$1', [ids.mission]);
        assert.equal(leftovers.rows[0].n, 0, 'Organisation absente mais mission temporaire encore présente.');
        return { deletedRows: 0, deletedStorageObjects: 0 };
    }
    assert.equal(owned.rowCount, 1, 'La propriété des fixtures ne peut pas être confirmée.');

    const storagePaths = await ownedStoragePaths(manifest);
    for (const objectPath of storagePaths) {
        await storage('DELETE', '/object/' + encodeURIComponent(storageConfig.bucket), { prefixes: [objectPath] });
    }
    const connection = await pool.connect();
    let deletedRows = 0;
    try {
        await connection.query('BEGIN');
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
            ['DELETE FROM organisations WHERE id=$1 AND slug=$2', [ids.org, manifest.label]]
        ];
        for (const [sql, values] of queries) deletedRows += (await connection.query(sql, values)).rowCount;
        await connection.query('COMMIT');
    } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
    } finally {
        connection.release();
    }

    const checks = [
        ['organisations', 'id', ids.org], ['utilisateurs', 'id', ids.user],
        ['agents', 'id', ids.agent], ['tricycles', 'id', ids.tricycle],
        ['clients', 'id', ids.client], ['sites_de_collecte', 'id', ids.site],
        ['collectes', 'id', ids.collecte], ['missions', 'id', ids.mission],
        ['missions_collectes', 'mission_id', ids.mission],
        ['mission_evenements', 'mission_id', ids.mission],
        ['preuves_collecte', 'mission_id', ids.mission]
    ];
    for (const [table, key, id] of checks) {
        const result = await readPool.query('SELECT count(*)::int AS n FROM ' + table + ' WHERE ' + key + '=$1', [id]);
        assert.equal(result.rows[0].n, 0, 'Données temporaires restantes dans ' + table);
    }
    for (const type of ['avant_collecte', 'apres_collecte']) {
        const prefix = [ids.org, ids.mission, ids.collecte, type].join('/');
        const files = await storage('POST', '/object/list/' + encodeURIComponent(storageConfig.bucket), { prefix, limit: 100 });
        assert.equal(files.length, 0, 'Objets Storage temporaires encore présents.');
    }
    return { deletedRows, deletedStorageObjects: storagePaths.length };
}
async function closePools() {
    await Promise.allSettled([pool.end(), readPool.end()]);
}

let manifest;
let interrupted = false;
try {
    await checkPreconditions();
    if (cleanupRunId) {
        manifest = loadManifest(cleanupRunId);
        const result = await cleanup(manifest);
        fs.rmSync(manifestPath(manifest.runId));
        console.log('Nettoyage ciblé terminé pour runId : ' + manifest.runId);
        console.log('Lignes supprimées : ' + result.deletedRows + ' ; objets Storage supprimés : ' + result.deletedStorageObjects);
    } else {
        const runId = randomUUID();
        const password = randomBytes(24).toString('base64url');
        const ids = Object.fromEntries(
            ['org', 'user', 'agent', 'tricycle', 'client', 'site', 'collecte', 'mission']
                .map(key => [key, randomUUID()])
        );
        manifest = {
            version: 1,
            runId,
            label: fixtureLabel(runId),
            email: 'tm-' + runId + '@example.com',
            ids,
            fixturesCommitted: false,
            createdAt: new Date().toISOString()
        };
        saveManifest(manifest);
        await createFixtures(manifest, password);

        console.log('');
        console.log('=== TEST MANUEL TÉLÉPHONE PRÊT ===');
        console.log('URL : ' + frontendUrl);
        console.log('E-mail : ' + manifest.email);
        console.log('Mot de passe : ' + password);
        console.log('runId : ' + manifest.runId);
        console.log('');
        console.log('Effectuez tout le parcours : mission, arrivée, collecte, photos avant/après, poids et fin de mission.');
        console.log('Les fixtures restent actives tant que ce processus attend.');
        console.log('En cas d’interruption, utilisez le mode --cleanup avec le runId affiché.');

        const terminal = createInterface({ input: process.stdin, output: process.stdout });
        const waitForUser = terminal.question('\nAppuyez sur Entrée une fois le test téléphone terminé pour valider puis nettoyer...');
        const onInterrupt = () => {
            interrupted = true;
            rejectInterrupt(new Error('Interruption demandée.'));
        };
        let rejectInterrupt;
        const waitForInterrupt = new Promise((_, reject) => { rejectInterrupt = reject; });
        process.once('SIGINT', onInterrupt);
        try {
            await Promise.race([waitForUser, waitForInterrupt]);
        } finally {
            process.off('SIGINT', onInterrupt);
            terminal.close();
        }

        const finalState = await validateFinalState(manifest);
        console.log('Validation OK — mission : ' + finalState.mission +
            ', collecte : ' + finalState.collecte + ', poids : ' + finalState.poidsReel +
            ', actions : ' + finalState.actions + ', preuves : ' + finalState.preuves +
            ', operation_id : ' + finalState.operationIds + '/7.');
        const result = await cleanup(manifest);
        fs.rmSync(manifestPath(manifest.runId));
        console.log('Nettoyage strict OK — ' + result.deletedRows + ' lignes et ' +
            result.deletedStorageObjects + ' objets Storage supprimés.');
    }
} catch (error) {
    process.exitCode = 1;
    console.error('ÉCHEC : ' + safeMessage(error));
    if (manifest && !cleanupRunId) {
        try {
            const result = await cleanup(manifest);
            fs.rmSync(manifestPath(manifest.runId), { force: true });
            console.log('Nettoyage de sécurité OK — ' + result.deletedRows + ' lignes et ' +
                result.deletedStorageObjects + ' objets Storage supprimés.');
        } catch (cleanupError) {
            console.error('NETTOYAGE INCOMPLET : ' + safeMessage(cleanupError));
            console.error('Relancez le mode --cleanup avec le runId : ' + manifest.runId);
        }
    }
    if (interrupted) console.error('Le test a été interrompu avant la validation finale.');
} finally {
    await closePools();
}
