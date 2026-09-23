/**
 * Vérifications Terrain sans réseau. Usage : node verifier-terrain-v1-frontend.mjs [racine du dépôt]
 * Charge les fonctions de l'application en mémoire, sans modifier leur source.
 * Simule uniquement le stockage pour vérifier la préparation des actions.
 * Retry HTTP/queue réelle : terrain-offline-tests.js et E2E --offline.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { randomUUID, webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const source = fs.readFileSync(path.join(root, 'agent-app/js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'agent-app/css/app.css'), 'utf8');
const helperCode = source.slice(source.indexOf('    let journeeCourante'), source.indexOf('    const afficherJournee ='));
const actionCode = source.slice(source.indexOf('    const fermerSaisie ='), source.indexOf('    const demarrer ='));
const refreshCode = source.slice(source.indexOf('    const chargerJournee ='), source.indexOf('    const entrerApplication ='));
assert.ok(helperCode && actionCode && refreshCode);

function harness() {
    const cache = new Map(), calls = [], messages = [], queued = [];
    const user = { id: randomUUID() };
    const controls = [{ disabled: false }, { disabled: true }];
    const refreshButton = { disabled: false }, logoutButton = { disabled: false };
    const state = { fail: null, gpsError: null, gpsCalls: 0, refreshCalls: 0, now: 1800000000000 };
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [state.now])); }
        static now() { return state.now; }
    }
    class TestFormData {
        constructor(form) { this.values = Object.entries(form?.values || {}); }
        append(key, value) { this.values.push([key, value]); }
        [Symbol.iterator]() { return this.values[Symbol.iterator](); }
    }
    const elements = { 'bouton-actualiser': refreshButton, 'bouton-deconnexion': logoutButton };
    const context = {
        crypto: webcrypto, Date: Clock, Number, String, Error, Promise, JSON, Object, Map, Set, WeakMap,
        Uint8Array, Array, FormData: TestFormData, File, Blob,
        document: { getElementById: id => elements[id], createElement: () => { throw new Error('Élément DOM non simulé.'); } },
        localStorage: {
            getItem: key => cache.get(key) ?? null,
            setItem: (key, value) => cache.set(key, value),
            removeItem: key => cache.delete(key)
        },
        auth: { obtenirUtilisateur: () => user, deconnexion: () => { state.loggedOut = true; } },
        afficherEcran: () => {}, connexion: {},
        navigator: { onLine: true, geolocation: { getCurrentPosition(ok, error, options) {
            state.gpsCalls++;
            state.gpsOptions = options;
            state.now += 1500;
            if (state.gpsError) error(state.gpsError);
            else ok({ coords: state.coords || { latitude: -4.32, longitude: 15.31, accuracy: 8 } });
        } } },
        synchronisation: null,
        synchroniser: () => { state.syncCalls = (state.syncCalls || 0) + 1; },
        updateQueueUI: async () => {},
        window: { ProRecup: { offline: { retryable: e => e.code === 'NETWORK_ERROR' } } },
        terrainStore: {
            async enqueue(context, payload, blob) {
                calls.push({ context: { ...context }, payload: { ...payload }, blob });
                if (state.pendingRequest) await state.pendingRequest;
                if (state.fail) throw state.fail;
                if (!queued.some(r => JSON.stringify(r.context) === JSON.stringify(context)))
                    queued.push(calls.at(-1));
            },
            async view() { return { missions: [] }; },
            async saveDay() {}
        },
        api: {
            async post() { assert.fail('executerAction ne doit pas envoyer de POST.'); },
            async get(url) {
                assert.equal(url, '/terrain/journee');
                state.refreshCalls++;
                if (state.refreshError) throw state.refreshError;
                return { data: { missions: [] } };
            }
        },
        listeMissions: {
            querySelectorAll: selector => selector === '.saisie-terrain' ? [] : controls,
            addEventListener: (_type, callback) => { state.click = callback; }
        },
        afficherMessage: (_element, message, type) => messages.push({ message, type }),
        masquerMessage: () => {}, messageApplication: {}, afficherJournee: () => {},
        libelleAction: action => action
    };
    vm.createContext(context);
    vm.runInContext(helperCode + refreshCode + actionCode +
        '\nglobalThis.exposed = { executerAction, lancer, contexteOperation, cleOperation, filtrerPayload, lireTentative,' +
        ' obtenirGps, preparerPhoto, chargerJournee, setJournee: value => { journeeCourante = value; },' +
        ' setPhoto: (form, photo) => photosFormulaires.set(form, photo),' +
        ' setDocument: value => { document = value; }, setMedia: value => { navigator.mediaDevices = value; } };', context);
    return { ...context.exposed, cache, calls, queued, state, controls, messages, user, refreshButton, logoutButton, context };
}
const mission = () => ({ id: randomUUID() });
const step = action => ({ action, ...(['demarrer_mission','terminer_mission'].includes(action) ? {} : { collecte: { id: randomUUID() } }) });
const networkError = () => Object.assign(new Error('Réseau interrompu'), { code: 'NETWORK_ERROR' });
const form = (poids = '10', resultat = 'collectee', motif = '') =>
    ({ values: { poids_reel: poids, resultat_terrain: resultat, motif_terrain: motif } });
const photo = content => new File([content], 'preuve.png', { type: 'image/png', lastModified: 1 });
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('OK — ' + name); }

await test('échec du stockage : UUID, données et instant au clic inchangés, sans nouveau GPS', async () => {
    const h = harness(), m = mission(), e = step('arriver_site');
    const instant = new Date(h.state.now).toISOString();
    h.state.fail = networkError();
    await assert.rejects(h.executerAction(m, e));
    h.state.gpsError = { code: 1 };
    h.state.now += 60000;
    await assert.rejects(h.executerAction(m, e));
    assert.deepEqual(h.calls[0], h.calls[1]);
    assert.equal(h.calls[0].payload.survenu_le, instant);
    assert.equal(h.state.gpsCalls, 1);
    h.state.fail = null;
    await h.executerAction(m, e);
    assert.equal(h.cache.size, 0);
});
await test('isolation utilisateur/mission/collecte/action et rejet d’une enveloppe déplacée', async () => {
    const h = harness(), m = mission(), e = step('arriver_site');
    h.state.fail = networkError();
    await assert.rejects(h.executerAction(m, e));
    const original = h.cache.get(h.cleOperation(h.contexteOperation(m, e)));
    const secondMission = mission();
    const secondKey = h.cleOperation(h.contexteOperation(secondMission, e));
    h.cache.set(secondKey, original);
    await assert.rejects(h.executerAction(secondMission, e), /autre action/);
    assert.equal(h.calls.length, 1);
    h.cache.delete(secondKey);
    await assert.rejects(h.executerAction(secondMission, e));
    await assert.rejects(h.executerAction(m, step('arriver_site')));
    await assert.rejects(h.executerAction(m, { ...e, action: 'demarrer_collecte' }));
    h.user.id = randomUUID();
    await assert.rejects(h.executerAction(m, e));
    assert.equal(new Set(h.calls.map(c => c.payload.operation_id)).size, 5);
});
await test('filtrage JSON restauré : aucun agent_id, secret, ni champ inattendu transmis', async () => {
    const h = harness(), m = mission(), e = step('terminer_collecte');
    h.state.fail = networkError();
    await assert.rejects(h.executerAction(m, e, form()));
    const key = h.cleOperation(h.contexteOperation(m, e));
    const saved = JSON.parse(h.cache.get(key));
    Object.assign(saved.payload, { agent_id: randomUUID(), secret: 'interdit', organisation_id: randomUUID(), observations: 'non autorisé' });
    h.cache.set(key, JSON.stringify(saved));
    await assert.rejects(h.executerAction(m, e, form('99')));
    assert.deepEqual(Object.keys(h.calls[1].payload).sort(), [
        'operation_id','survenu_le','latitude','longitude','precision_gps',
        'resultat_terrain','poids_reel','motif_terrain'
    ].sort());
    assert.equal(h.calls[1].payload.poids_reel, 10);
});
await test('preuve : payload et Blob séparés, reprise après échec du stockage', async () => {
    const h = harness(), m = mission(), e = step('avant_collecte'), f = {};
    const captureTime = new Date(h.state.now - 5000).toISOString();
    h.setPhoto(f, { fichier: photo('original'), pris_le: captureTime });
    h.state.fail = networkError();
    await assert.rejects(h.executerAction(m, e, f));
    h.state.now += 60000;
    await assert.rejects(h.executerAction(m, e, f));
    assert.deepEqual(h.calls[0], h.calls[1]);
    assert.equal(h.calls[1].payload.pris_le, captureTime);
    assert.equal(await h.calls[1].blob.text(), 'original');
    assert.equal(h.state.gpsCalls, 1);
    assert.deepEqual(Object.keys(h.calls[0].payload).sort(),
        ['type_preuve','operation_id','pris_le','latitude','longitude','precision_gps'].sort());
    h.setPhoto(f, { fichier: photo('autre photo'), pris_le: new Date(h.state.now).toISOString() });
    await assert.rejects(h.executerAction(m, e, f), /photo d’origine/);
    assert.equal(h.calls.length, 2);
    const fresh = harness();
    fresh.user.id = h.user.id;
    for (const [key, value] of h.cache) fresh.cache.set(key, value);
    fresh.setPhoto(f, { fichier: photo('original'), pris_le: new Date(h.state.now).toISOString() });
    await fresh.executerAction(m, e, f);
    assert.equal(fresh.calls[0].payload.operation_id, h.calls[0].payload.operation_id);
    assert.equal(fresh.calls[0].payload.pris_le, captureTime);
});
await test('photo importée : date explicite obligatoire, lastModified jamais utilisé', async () => {
    const h = harness(), m = mission(), e = step('avant_collecte'), f = {};
    h.setPhoto(f, { fichier: photo('import'), pris_le: null });
    await assert.rejects(h.executerAction(m, e, f), /date et l’heure/);
    assert.equal(h.calls.length, 0);
    assert.equal(source.includes('lastModified'), false);
});
await test('capture caméra : horodatage au déclenchement, avant l’envoi', async () => {
    const h = harness();
    const make = () => ({ disabled: false, hidden: false, value: '', readOnly: false, listeners: {},
        addEventListener(name, fn) { this.listeners[name] = fn; } });
    const input = make(), date = make(), video = make(), open = make(), snap = make(), message = make();
    Object.assign(video, { videoWidth: 640, videoHeight: 480, play: async () => {} });
    let stopped = 0;
    const canvas = { getContext: () => ({ drawImage() {} }),
        toBlob: resolve => { h.state.now += 2000; resolve(new Blob(['camera'], { type: 'image/jpeg' })); } };
    h.setDocument({ createElement: () => canvas });
    h.setMedia({ getUserMedia: async () => ({ getTracks: () => [{ stop: () => { stopped++; } }] }) });
    const fields = { '[name="fichier"]': input, '[name="pris_le"]': date, video,
        '[data-camera]': open, '[data-photo]': snap, '[data-message-photo]': message };
    const f = { isConnected: true, querySelector: selector => fields[selector] };
    h.preparerPhoto(f);
    await open.listeners.click();
    const instantCapture = new Date(h.state.now).toISOString();
    await snap.listeners.click();
    h.state.now += 60000;
    await h.executerAction(mission(), step('avant_collecte'), f);
    assert.equal(h.calls[0].payload.pris_le, instantCapture);
    assert.equal(stopped, 1);
});
await test('GPS : refus, indisponibilité et timeout distincts ; position invalide bloquée', async () => {
    const messages = [];
    for (const code of [1,2,3]) {
        const h = harness();
        h.state.gpsError = { code };
        await assert.rejects(h.executerAction(mission(), step('arriver_site')), error => {
            messages.push(error.message); return true;
        });
        assert.equal(h.calls.length, 0);
        assert.equal(h.cache.size, 0);
        assert.equal(h.state.gpsOptions.timeout, 15000);
    }
    assert.equal(new Set(messages).size, 3);
    for (const coords of [
        { latitude: NaN, longitude: 15, accuracy: 8 },
        { latitude: 91, longitude: 15, accuracy: 8 },
        { latitude: -4, longitude: 15, accuracy: -1 }
    ]) {
        const h = harness();
        h.state.coords = coords;
        await assert.rejects(h.executerAction(mission(), step('arriver_site')));
        assert.equal(h.calls.length, 0);
    }
});
await test('résultat/poids/motif : onze cas, vide et non fini refusés', async () => {
    const cases = [
        ['collectee','1','',true], ['partielle','1','',true], ['collectee','0','',false],
        ['partielle','-1','',false], ['aucune_matiere','0','',true],
        ['non_collectee','0','Site fermé',true], ['non_collectee','0',' ',false],
        ['aucune_matiere','2','',false], ['inconnu','0','',false],
        ['aucune_matiere','','',false], ['collectee','Infinity','',false]
    ];
    for (const [result, weight, motif, valid] of cases) {
        const h = harness();
        const operation = h.executerAction(mission(), step('terminer_collecte'), form(weight, result, motif));
        if (valid) await operation;
        else { await assert.rejects(operation); assert.equal(h.calls.length, 0); }
    }
});
await test('erreur enqueue : état exact des boutons restauré, Actualiser compris', async () => {
    const h = harness();
    h.state.fail = networkError();
    await h.lancer(mission(), step('arriver_site'));
    assert.deepEqual(h.controls.map(c => c.disabled), [false, true]);
    assert.equal(h.refreshButton.disabled, false);
    assert.equal(h.logoutButton.disabled, false);
});
await test('enregistrement local : aucun POST/GET, tentative effacée après enqueue, sync demandée', async () => {
    const h = harness();
    await h.lancer(mission(), step('demarrer_mission'));
    assert.equal(h.queued.length, 1);
    assert.equal(h.cache.size, 0);
    assert.equal(h.state.refreshCalls, 0);
    assert.equal(h.state.syncCalls, 1);
    assert.match(h.messages.at(-1).message, /En attente de synchronisation/);
    assert.deepEqual(h.controls.map(c => c.disabled), [false, true]);
    assert.equal(h.refreshButton.disabled, false);
    assert.equal(h.logoutButton.disabled, false);
});
await test('actualisation hors ligne : tournée locale sans appel réseau', async () => {
    const h = harness(); h.context.navigator.onLine = false;
    const day = await h.chargerJournee();
    assert.equal(day.missions.length, 0);
    assert.equal(h.state.refreshCalls, 0);
    assert.match(h.messages.at(-1).message, /Tournée locale/);
});
await test('sept actions : contexte, champs autorisés et Blob séparé transmis à enqueue', async () => {
    for (const action of ['demarrer_mission', 'arriver_site', 'demarrer_collecte', 'avant_collecte',
        'terminer_collecte', 'apres_collecte', 'terminer_mission']) {
        const h = harness(), m = mission(), e = step(action), f = form();
        const isPhoto = ['avant_collecte', 'apres_collecte'].includes(action);
        if (isPhoto) h.setPhoto(f, { fichier: photo('pixels'), pris_le: new Date(h.state.now).toISOString() });
        await h.executerAction(m, e, f);
        const row = h.queued[0];
        assert.equal(row.context.action, action);
        assert.equal(row.context.mission, m.id);
        assert.equal(row.context.collecte, e.collecte?.id || null);
        const keys = ['operation_id', 'latitude', 'longitude', 'precision_gps', isPhoto ? 'pris_le' : 'survenu_le'];
        if (isPhoto) keys.push('type_preuve');
        if (action === 'terminer_collecte') keys.push('poids_reel', 'resultat_terrain', 'motif_terrain');
        assert.deepEqual(Object.keys(row.payload).sort(), keys.sort());
        assert.equal(row.blob instanceof Blob, isPhoto);
        assert.equal(h.cache.size, 0);
    }
});
await test('double clic neutralisé pendant enqueue ; synchronisation après succès', async () => {
    const h = harness(), m = mission();
    let release;
    h.state.pendingRequest = new Promise(resolve => { release = resolve; });
    h.setJournee({ missions: [{ ...m, statut: 'planifiee', collectes: [] }] });
    const button = { dataset: { missionId: m.id }, disabled: false, closest: () => ({}) };
    const event = { target: { closest: () => button } };
    const first = h.state.click(event);
    await h.state.click(event);
    await Promise.resolve();
    assert.equal(h.calls.length, 1);
    release();
    await first;
    assert.equal(h.state.refreshCalls, 0);
    assert.equal(h.state.syncCalls, 1);
});
await test('CSS ajouté : absence des + parasites et propriétés valides', async () => {
    const added = css.slice(css.indexOf('.saisie-terrain {'));
    assert.equal(/^\+/m.test(added), false);
    let parser;
    const parserBases = [path.join(root, 'backend/package.json')];
    if (process.env.TERRAIN_AUDIT_PACKAGE) parserBases.push(process.env.TERRAIN_AUDIT_PACKAGE);
    for (const base of parserBases) {
        try { parser = createRequire(base)('postcss'); break; } catch { /* vérification statique ci-dessous */ }
    }
    if (parser) {
        const properties = [];
        parser.parse(added).walkDecls(d => properties.push(d.prop));
        assert.ok(properties.includes('display') && properties.includes('min-height'));
        assert.ok(properties.every(p => /^[a-z-]+$/.test(p)));
    } else {
        assert.equal((added.match(/\{/g) || []).length, (added.match(/\}/g) || []).length);
        assert.match(added, /display:\s*grid;/);
        assert.match(added, /min-height:\s*44px;/);
        for (const declaration of added.split(/\r?\n/).filter(l => l.includes(':')))
            assert.match(declaration.trim(), /^[a-z-]+:\s*[^;{}]+;$/);
    }
});
console.log('\n' + passed + ' groupes réussis. Aucun accès réseau ou changement de données réelles.');
