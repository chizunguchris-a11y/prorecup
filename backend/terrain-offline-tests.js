'use strict';
document.getElementById('run').onclick = async () => {
    const output = document.getElementById('result'); output.textContent = '';
    let passed = 0;
    const check = (condition, name) => { if (!condition) throw new Error(name); output.textContent += 'PASS ' + name + '\n'; passed++; };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const O = window.ProRecup.offline;
    const mission = crypto.randomUUID(), collecte = crypto.randomUUID();
    const context = action => ({ action, mission, collecte: action.includes('mission') ? null : collecte, agent_id: 'INTERDIT' });
    const payload = action => ({ operation_id: crypto.randomUUID(), survenu_le: '2026-09-22T10:00:00.000Z', pris_le: '2026-09-22T10:00:00.000Z', latitude: 0, longitude: 0, precision_gps: 1, resultat_terrain: 'collectee', poids_reel: 1, token: 'INTERDIT', agent_id: 'INTERDIT', secret: 'INTERDIT' });
    const day = { agent_id: 'INTERDIT', token: 'INTERDIT', missions: [{ id: mission, statut: 'planifiee', agent_id: 'INTERDIT', collectes: [{ id: collecte, progression: {}, preuves: [] }] }] };
    const names = []; let store;
    async function fresh() { const name = 'terrain-test-' + crypto.randomUUID(); names.push(name); return O.open(name); }
    async function legacyPhoto() {
        const name = 'terrain-test-' + crypto.randomUUID(); names.push(name);
        const db = await new Promise((resolve, reject) => {
            const opening = indexedDB.open(name, 1);
            opening.onupgradeneeded = () => {
                const q = opening.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                q.createIndex('context', ['mission_id', 'collecte_id', 'type'], { unique: true });
                q.createIndex('operation', 'operation_id', { unique: true });
                opening.result.createObjectStore('state');
            };
            opening.onsuccess = () => resolve(opening.result); opening.onerror = () => reject(opening.error);
        });
        const p = payload('avant_collecte');
        await new Promise((resolve, reject) => {
            const tx = db.transaction('queue', 'readwrite');
            tx.objectStore('queue').add({ type: 'avant_collecte', mission_id: mission, collecte_id: collecte, operation_id: p.operation_id, payload: O.clean('avant_collecte', p), statut: 'envoi', created_at: new Date().toISOString(), retry_count: 0, last_error: null, next_attempt_at: 0, blob: new Blob(['photo-v1'], { type: 'image/jpeg' }) });
            tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); tx.onerror = () => {};
        });
        db.close(); return { name, operation_id: p.operation_id };
    }
    try {
        store = await fresh(); await store.saveDay(day);
        const order = ['demarrer_mission', 'arriver_site', 'demarrer_collecte', 'avant_collecte', 'terminer_collecte', 'apres_collecte', 'terminer_mission'];
        const blob = new Blob(['photo-fictive'], { type: 'image/jpeg' });
        for (const action of order) await store.enqueue(context(action), payload(action), action.includes('avant') || action.includes('apres') ? blob : undefined);
        const initial = await store.list();
        check(initial.length === 7, 'mission, actions et photos en file');
        await store.enqueue(context(order[0]), payload(order[0]));
        check((await store.list()).length === 7, 'doublon de contexte empêché');
        check(!JSON.stringify(initial).includes('INTERDIT') && !JSON.stringify(await store.view()).includes('INTERDIT'), 'aucun token, secret ou agent_id dans queue et tournée');
        check((await store.view()).missions[0].statut === 'terminee', 'progression locale complète');
        store.close(); store = await O.open(names[0]);
        check((await store.list())[0].operation_id === initial[0].operation_id, 'reprise après fermeture IndexedDB, operation_id conservé');
        check(await (await store.list())[3].blob.text() === 'photo-fictive', 'Blob durable après réouverture');
        const sent = [];
        await store.sync({ post: async (url, body) => { sent.push({ url, body }); } }, () => true);
        check(sent.length === 7 && sent[0].url.endsWith('/demarrer') && sent[1].url.endsWith('/arrivee') && sent[3].url.endsWith('/preuves') && sent[4].url.endsWith('/terminer'), 'ordre métier respecté');
        check(sent[3].body instanceof FormData && await sent[3].body.get('fichier').text() === 'photo-fictive', 'FormData reconstruit avec photo');
        check((await store.list()).length === 0 && (await store.view()).missions[0].statut === 'terminee', 'acquittement atomique et progression durable');
        store.close();
        const legacy = await legacyPhoto();
        store = await O.open(legacy.name);
        const legacyRows = await store.list(); let legacySent = 0;
        check(legacyRows.length === 1 && legacyRows[0].statut === 'en_attente' && legacyRows[0].operation_id === legacy.operation_id, 'migration version 1 : statut envoi interrompu réarmé sans toucher à la photo');
        await store.sync({ post: async (url, form) => {
            if (!url.endsWith('/preuves') || await form.get('fichier').text() !== 'photo-v1') throw new Error('Photo version 1 perdue');
            legacySent++;
        } }, () => true);
        check(legacySent === 1 && !(await store.list()).length, 'photo version 1 en statut envoi synchronisée puis acquittée');
        store.close();
        const legacyReload = await legacyPhoto();
        store = await O.open(legacyReload.name);
        const legacyReloadId = (await store.list())[0].id;
        await new Promise((resolve, reject) => {
            const opening = indexedDB.open(legacyReload.name);
            opening.onsuccess = () => {
                const db = opening.result, tx = db.transaction('queue_meta', 'readwrite');
                tx.objectStore('queue_meta').put({ statut: 'envoi', retry_count: 'invalide', last_error: 'DETAIL_INTERDIT', next_attempt_at: NaN }, legacyReloadId);
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onabort = () => reject(tx.error); tx.onerror = () => {};
            };
            opening.onerror = () => reject(opening.error);
        });
        store.close();
        store = await O.open(legacyReload.name);
        const afterDoubleReload = await store.list();
        const raw = await new Promise((resolve, reject) => {
            const opening = indexedDB.open(legacyReload.name);
            opening.onsuccess = () => {
                const db = opening.result, tx = db.transaction(['queue', 'queue_meta']);
                const q = tx.objectStore('queue').get(afterDoubleReload[0].id);
                const m = tx.objectStore('queue_meta').get(afterDoubleReload[0].id);
                tx.oncomplete = () => { db.close(); resolve({ row: q.result, meta: m.result }); };
                tx.onabort = () => reject(tx.error); tx.onerror = () => {};
            };
            opening.onerror = () => reject(opening.error);
        });
        check(raw.row.statut === 'envoi' && raw.row.blob instanceof Blob && raw.meta.statut === 'en_attente' && raw.meta.retry_count === 0 && raw.meta.last_error === null && raw.meta.next_attempt_at === 0, 'double rechargement : Blob historique intact et queue_meta incohérent réparé');
        let reloadedSent = 0;
        await store.sync({ post: async () => reloadedSent++ }, () => true);
        check(reloadedSent === 1 && !(await store.list()).length, 'double rechargement : reprise réelle de la photo historique');
        store.close();
        for (const error of [{ code: 'NETWORK_ERROR' }, { status: 500 }, { status: 408 }, { status: 425 }, { status: 429 }, { status: 400 }, { status: 401 }, { status: 403 }]) {
            store = await fresh(); await store.saveDay(day);
            const p = payload('demarrer_mission');
            await store.enqueue(context('demarrer_mission'), p);
            await store.enqueue(context('arriver_site'), payload('arriver_site'));
            let calls = 0;
            const result = await store.sync({ post: async () => { calls++; throw error; } }, () => true);
            const rows = await store.list();
            check(calls === 1 && rows.length === 2 && rows[0].operation_id === p.operation_id && rows[0].payload.survenu_le === p.survenu_le, 'conservation et blocage après ' + (error.status || error.code));
            if (error.status === 400) {
                check(rows[0].statut === 'erreur' && (await store.view()).missions[0].bloquee, '4xx définitif bloque la mission');
                await store.sync({ post: async () => calls++ }, () => true);
                check(calls === 1, 'pas de retry automatique du refus');
                await store.discardRejected();
                const next = await store.enqueue(context('demarrer_mission'), payload('demarrer_mission'));
                check(next.operation_id !== p.operation_id, 'nouvelle tentative après refus : nouvel identifiant');
            } else if ([401, 403].includes(error.status)) {
                check(result.stopped === 'auth', 'reconnexion requise sans perte');
                await store.sync({ post: async () => calls++ }, () => true);
                check((await store.list()).length === 0, 'reprise après reconnexion');
            } else {
                await store.sync({ post: async () => calls++ }, () => true);
                check(calls === 1 && result.stopped === 'backoff', 'backoff sans boucle agressive');
                await sleep(2050);
                const ids = [];
                await store.sync({ post: async (url, body) => ids.push(body.operation_id) }, () => true);
                check(ids[0] === p.operation_id && (await store.list()).length === 0, 'retry idempotent après délai');
            }
            store.close();
        }
        store = await fresh();
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
        await store.enqueue(context('demarrer_mission'), payload('demarrer_mission'));
        let offlineCalls = 0;
        await store.sync({ post: async () => offlineCalls++ }, () => true);
        check(offlineCalls === 0 && (await store.list()).length === 1, 'navigator hors ligne : stockage sans envoi');
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
        await store.sync({ post: async () => offlineCalls++ }, () => true);
        check(offlineCalls === 1, 'retour réseau : reprise de la file');
        let invalid = false;
        try { await store.enqueue(context('avant_collecte'), payload('avant_collecte'), new Blob(['bad'], { type: 'text/plain' })); } catch { invalid = true; }
        check(invalid && !(await store.list()).length, 'type photo invalide refusé avant stockage');
        invalid = false;
        try { await store.enqueue(context('avant_collecte'), payload('avant_collecte'), new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' })); } catch { invalid = true; }
        check(invalid, 'photo supérieure à 5 Mo refusée');
        await store.enqueue(context('demarrer_mission'), payload('demarrer_mission'));
        let n = 0; await store.sync({ post: async () => n++ }, () => false);
        check(n === 0 && (await store.list()).length === 1, 'session absente : aucun envoi');
        await Promise.all([store.sync({ post: async () => { n++; await sleep(20); } }, () => true), store.sync({ post: async () => n++ }, () => true)]);
        check(n === 1, 'synchronisations concurrentes regroupées');
        output.textContent += '\n' + passed + ' tests réussis. Aucun appel backend.\n';
    } catch (e) { output.textContent += 'FAIL ' + e.stack; }
    finally { store?.close(); for (const name of names) indexedDB.deleteDatabase(name); }
};
document.getElementById('reload-test').onclick = async () => {
    const name = 'terrain-reload-' + crypto.randomUUID();
    const store = await window.ProRecup.offline.open(name);
    const mission = crypto.randomUUID(), collecte = crypto.randomUUID();
    await store.enqueue({ action: 'avant_collecte', mission, collecte }, { operation_id: crypto.randomUUID(), pris_le: new Date().toISOString(), latitude: 0, longitude: 0, precision_gps: 1 }, new Blob(['durable-reload'], { type: 'image/jpeg' }));
    store.close();
    location.href = '/?resume=' + encodeURIComponent(name);
};
(async () => {
    const name = new URL(location.href).searchParams.get('resume');
    if (!name || !/^terrain-reload-[a-f0-9-]+$/.test(name)) return;
    const store = await window.ProRecup.offline.open(name);
    const rows = await store.list(); let sent = 0;
    const originalPut = IDBObjectStore.prototype.put;
    const originalArrayBuffer = Blob.prototype.arrayBuffer;
    let arrayBufferCalls = 0;
    IDBObjectStore.prototype.put = function (value, key) {
        if (value?.blob instanceof Blob) throw new Error('Le Blob relu a été réécrit pendant un changement de statut');
        return originalPut.call(this, value, key);
    };
    Blob.prototype.arrayBuffer = function () { arrayBufferCalls++; return originalArrayBuffer.call(this); };
    try {
        await store.sync({ post: async (url, form) => {
            if (form.get('operation_id') !== rows[0].operation_id || await form.get('fichier').text() !== 'durable-reload') throw new Error('Photo perdue');
            sent++;
        } }, () => true);
        document.getElementById('result').textContent = sent === 1 && arrayBufferCalls >= 1 && !(await store.list()).length ? 'PASS Safari-compat : rechargement réel, aucun Blob réécrit, Blob frais envoyé après reprise' : 'FAIL reprise Safari-compat';
    } finally {
        IDBObjectStore.prototype.put = originalPut;
        Blob.prototype.arrayBuffer = originalArrayBuffer;
        store.close(); indexedDB.deleteDatabase(name);
    }
})().catch(e => { document.getElementById('result').textContent = 'FAIL ' + e.message; });
document.getElementById('cache-test').onclick = async () => {
    try {
        const reg = await navigator.serviceWorker.register('/agent-app/sw.js?v=1-3', { scope: '/agent-app/' });
        const worker = reg.installing || reg.waiting;
        if (worker && !['installed', 'activated'].includes(worker.state)) {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Installation du cache trop longue.')), 10000);
                worker.addEventListener('statechange', () => {
                    if (['installed', 'activated'].includes(worker.state)) { clearTimeout(timeout); resolve(); }
                    if (worker.state === 'redundant') { clearTimeout(timeout); reject(new Error('Service worker abandonné.')); }
                });
            });
        }
        const cache = await caches.open('prorecup-terrain-shell-v1-3');
        const urls = (await cache.keys()).map(r => r.url);
        document.getElementById('result').textContent = urls.length === 10 && !urls.some(u => u.includes('/api/')) ? 'PASS 10 fichiers du shell en cache, aucune réponse API. Ouvrez /agent-app/index.html puis coupez le serveur du shell et rechargez.' : 'FAIL cache : ' + urls.join(', ');
    } catch (e) { document.getElementById('result').textContent = 'FAIL ' + e.message; }
};
document.getElementById('stop-shell').onclick = async () => {
    await fetch('/disable-shell', { method: 'POST' });
    document.getElementById('result').textContent = 'Serveur du shell coupé. Rechargez maintenant l’application déjà ouverte.';
};
