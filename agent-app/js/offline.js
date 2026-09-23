(function () {
    'use strict';
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const actions = ['demarrer_mission', 'arriver_site', 'demarrer_collecte', 'avant_collecte', 'terminer_collecte', 'apres_collecte', 'terminer_mission'];
    const photo = type => ['avant_collecte', 'apres_collecte'].includes(type);
    const retryable = e => e.code === 'NETWORK_ERROR' || [408, 425, 429].includes(e.status) || e.status >= 500;
    const request = r => new Promise((resolve, reject) => {
        r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const complete = tx => new Promise((resolve, reject) => {
        tx.oncomplete = resolve; tx.onabort = () => reject(tx.error || new Error('Stockage local interrompu.'));
        tx.onerror = () => {}; // onabort is the final transaction outcome.
    });
    function clean(type, p) {
        if (!actions.includes(type) || !UUID.test(p?.operation_id || '')) throw new Error('Action invalide.');
        const dateKey = photo(type) ? 'pris_le' : 'survenu_le';
        if (typeof p[dateKey] !== 'string' || !Number.isFinite(Date.parse(p[dateKey]))) throw new Error('Date invalide.');
        if (![p.latitude, p.longitude, p.precision_gps].every(Number.isFinite) || Math.abs(p.latitude) > 90 || Math.abs(p.longitude) > 180 || p.precision_gps < 0) throw new Error('GPS invalide.');
        const out = { operation_id: p.operation_id, [dateKey]: p[dateKey], latitude: p.latitude, longitude: p.longitude, precision_gps: p.precision_gps };
        if (photo(type)) out.type_preuve = type;
        if (type === 'terminer_collecte') {
            if (!['collectee', 'partielle', 'aucune_matiere', 'non_collectee'].includes(p.resultat_terrain) || !Number.isFinite(p.poids_reel) || (['collectee', 'partielle'].includes(p.resultat_terrain) ? p.poids_reel <= 0 : p.poids_reel !== 0)) throw new Error('Résultat invalide.');
            const motif = typeof p.motif_terrain === 'string' ? p.motif_terrain.trim() : '';
            if (motif.length > 2000 || (p.resultat_terrain === 'non_collectee' && !motif)) throw new Error('Motif invalide (2000 caractères maximum).');
            Object.assign(out, { resultat_terrain: p.resultat_terrain, poids_reel: p.poids_reel, motif_terrain: motif || null });
        }
        return out;
    }
    function validateBlob(blob) {
        if (!(blob instanceof Blob) || !blob.size || blob.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error('Photo invalide : JPEG, PNG ou WebP, 5 Mo maximum.');
    }
    async function freshBlob(blob) {
        validateBlob(blob);
        const copy = new Blob([await blob.arrayBuffer()], { type: blob.type });
        validateBlob(copy);
        return copy;
    }
    // Explicit allowlist: never store the authenticated API response as a whole.
    function snapshot(day) {
        return { missions: (day?.missions || []).map(m => ({
            id: m.id, statut: m.statut,
            tricycle: { numero: String(m.tricycle?.numero || '') },
            collectes: (m.collectes || []).map(c => ({
                id: c.id, site: { nom: String(c.site?.nom || '') },
                progression: { arrivee: !!c.progression?.arrivee, collecte_demarree: !!c.progression?.collecte_demarree, collecte_terminee: !!c.progression?.collecte_terminee },
                preuves: (c.preuves || []).filter(p => photo(p.type_preuve)).map(p => ({ type_preuve: p.type_preuve }))
            }))
        })) };
    }
    function project(day, rows) {
        const result = snapshot(day);
        for (const r of rows) {
            const m = result.missions.find(m => m.id === r.mission_id);
            if (!m) continue;
            if (r.statut === 'erreur') { m.bloquee = true; continue; }
            if (m.bloquee) continue;
            const c = m.collectes.find(c => c.id === r.collecte_id);
            if (r.type === 'demarrer_mission') m.statut = 'en_cours';
            if (r.type === 'terminer_mission') m.statut = 'terminee';
            if (c) {
                const key = { arriver_site: 'arrivee', demarrer_collecte: 'collecte_demarree', terminer_collecte: 'collecte_terminee' }[r.type];
                if (key) c.progression[key] = true;
                if (photo(r.type) && !c.preuves.some(p => p.type_preuve === r.type)) c.preuves.push({ type_preuve: r.type });
            }
        }
        for (const m of result.missions) {
            const n = m.collectes.length, done = m.collectes.filter(c => c.progression.collecte_terminee).length;
            m.progression = { nombre_collectes: n, terminees: done, restantes: n - done, pourcentage: n ? done * 100 / n : 0 };
        }
        result.resume = { nombre_missions: result.missions.length, nombre_collectes: result.missions.reduce((n, m) => n + m.collectes.length, 0), collectes_terminees: result.missions.reduce((n, m) => n + m.progression.terminees, 0) };
        return result;
    }
    async function open(name) {
        const r = indexedDB.open(name, 2);
        r.onupgradeneeded = () => {
            if (!r.result.objectStoreNames.contains('queue')) {
                const q = r.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                q.createIndex('context', ['mission_id', 'collecte_id', 'type'], { unique: true });
                q.createIndex('operation', 'operation_id', { unique: true });
            }
            if (!r.result.objectStoreNames.contains('state')) r.result.createObjectStore('state');
            if (!r.result.objectStoreNames.contains('queue_meta')) r.result.createObjectStore('queue_meta');
        };
        const db = await request(r);
        db.onversionchange = () => db.close();
        let running = null;
        const transact = async (stores, mode, fn) => {
            const tx = db.transaction(stores, mode), done = complete(tx);
            try { const value = await fn(tx); await done; return value; }
            catch (e) { try { tx.abort(); } catch {} await done.catch(() => {}); throw e; }
        };
        const metadata = row => ({ statut: row.statut, retry_count: row.retry_count, last_error: row.last_error, next_attempt_at: row.next_attempt_at });
        const mergedRows = async tx => {
            const rows = await request(tx.objectStore('queue').getAll());
            return Promise.all(rows.map(async row => ({
                statut: 'en_attente', retry_count: 0, last_error: null, next_attempt_at: 0,
                ...row,
                ...((await request(tx.objectStore('queue_meta').get(row.id))) || {})
            })));
        };
        const list = () => transact(['queue', 'queue_meta'], 'readonly', mergedRows);
        const view = () => transact(['queue', 'queue_meta', 'state'], 'readonly', async tx => {
            const q = mergedRows(tx), s = request(tx.objectStore('state').get('day'));
            return project(await s, await q);
        });
        const saveDay = day => transact(['state'], 'readwrite', tx => request(tx.objectStore('state').put(snapshot(day), 'day')));
        async function enqueue(context, payload, blob) {
            const type = context.action, mission_id = context.mission, collecte_id = context.collecte || '';
            if (!UUID.test(mission_id) || (['demarrer_mission', 'terminer_mission'].includes(type) ? collecte_id !== '' : !UUID.test(collecte_id))) throw new Error('Contexte invalide.');
            const safe = clean(type, payload);
            if (photo(type)) validateBlob(blob);
            return transact(['queue', 'queue_meta'], 'readwrite', async tx => {
                const q = tx.objectStore('queue');
                const existing = await request(q.index('context').get([mission_id, collecte_id, type]));
                if (existing) return { statut: 'en_attente', retry_count: 0, last_error: null, next_attempt_at: 0, ...existing, ...((await request(tx.objectStore('queue_meta').get(existing.id))) || {}) };
                const row = { type, mission_id, collecte_id, operation_id: safe.operation_id, payload: safe, created_at: new Date().toISOString(), ...(photo(type) ? { blob: blob.slice(0, blob.size, blob.type) } : {}) };
                row.id = await request(q.add(row));
                const meta = { statut: 'en_attente', retry_count: 0, last_error: null, next_attempt_at: 0 };
                await request(tx.objectStore('queue_meta').put(meta, row.id));
                return { ...row, ...meta };
            });
        }
        const update = row => transact(['queue_meta'], 'readwrite', tx => request(tx.objectStore('queue_meta').put(metadata(row), row.id)));
        async function send(row, api) {
            const p = clean(row.type, row.payload);
            let url = '/terrain/missions/' + encodeURIComponent(row.mission_id);
            if (row.collecte_id) url += '/collectes/' + encodeURIComponent(row.collecte_id);
            if (photo(row.type)) {
                const blob = await freshBlob(row.blob);
                const form = new FormData();
                for (const [key, value] of Object.entries(p)) form.append(key, String(value));
                form.append('fichier', blob, 'preuve.' + ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[blob.type]);
                return api.post(url + '/preuves', form);
            }
            return api.post(url + '/' + ({ demarrer_mission: 'demarrer', arriver_site: 'arrivee', demarrer_collecte: 'demarrer', terminer_collecte: 'terminer', terminer_mission: 'terminer' })[row.type], p);
        }
        function sync(api, authorized, notify = () => {}) {
            if (running) return running;
            const run = async () => {
                for (const row of await list()) {
                    if (!navigator.onLine || !authorized()) return { stopped: 'auth' };
                    if (row.statut === 'erreur') return { stopped: 'erreur' };
                    if (row.next_attempt_at > Date.now()) return { stopped: 'backoff', at: row.next_attempt_at };
                    row.statut = 'envoi'; await update(row); notify();
                    try { await send(row, api); }
                    catch (e) {
                        row.retry_count++;
                        const auth = e.status === 401 || e.status === 403;
                        row.statut = auth || retryable(e) ? 'en_attente' : 'erreur';
                        // Never persist server messages, which may contain personal data or credentials.
                        row.last_error = auth ? 'RECONNEXION' : retryable(e) ? 'RESEAU_OU_SERVEUR' : 'REFUS_DEFINITIF';
                        row.next_attempt_at = auth ? 0 : Date.now() + Math.min(300000, 2000 * 2 ** Math.min(row.retry_count - 1, 8));
                        await update(row); notify();
                        return { stopped: auth ? 'auth' : row.statut === 'erreur' ? 'erreur' : 'backoff', at: row.next_attempt_at };
                    }
                    // Atomically advance the durable base and acknowledge the queue entry.
                    await transact(['queue', 'queue_meta', 'state'], 'readwrite', async tx => {
                        const state = tx.objectStore('state');
                        const day = await request(state.get('day'));
                        state.put(snapshot(project(day, [row])), 'day');
                        tx.objectStore('queue').delete(row.id);
                        tx.objectStore('queue_meta').delete(row.id);
                    });
                    notify();
                }
                return { stopped: null };
            };
            running = (navigator.locks ? navigator.locks.request(name + ':sync', run) : run()).finally(() => { running = null; });
            return running;
        }
        // Explicit operator recovery only: the rejected action and its dependent successors.
        const discardRejected = () => transact(['queue', 'queue_meta'], 'readwrite', async tx => {
            const q = tx.objectStore('queue'), rows = await mergedRows(tx);
            const first = rows.find(r => r.statut === 'erreur');
            if (first) for (const r of rows) if (r.id >= first.id) { q.delete(r.id); tx.objectStore('queue_meta').delete(r.id); }
        });
        return { list, view, saveDay, enqueue, sync, discardRejected, close: () => db.close() };
    }
    window.ProRecup.offline = { open, clean, snapshot, project, retryable };
})();
