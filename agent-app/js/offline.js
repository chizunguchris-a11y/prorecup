(function () {
    'use strict';
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const actions = ['demarrer_mission', 'arriver_site', 'demarrer_collecte', 'avant_collecte', 'enregistrer_pesee', 'ticket_balance', 'terminer_collecte', 'apres_collecte', 'terminer_mission', 'signaler_incident'];
    const photo = type => ['avant_collecte', 'apres_collecte', 'ticket_balance'].includes(type);
    const retryable = e => ['NETWORK_ERROR', 'PROTOCOL_ERROR'].includes(e.code) || [408, 425, 429].includes(e.status) || e.status >= 500;
    const safeErrors = ['RECONNEXION', 'RESEAU_OU_SERVEUR', 'UPLOAD_RESEAU', 'ERREUR_SERVEUR', 'REFUS_DEFINITIF', 'BLOB_ILLISIBLE', 'ACCES_REFUSE', 'REPONSE_INVALIDE'];
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
        if (photo(type)) {
            out.type_preuve = type;
            if (type === 'ticket_balance' && p.pesee_operation_id) {
                if (!UUID.test(p.pesee_operation_id)) throw new Error('Référence de pesée invalide.');
                out.pesee_operation_id = p.pesee_operation_id;
            }
        }
        if (type === 'terminer_collecte') {
            if (!['collectee', 'partielle', 'aucune_matiere', 'non_collectee'].includes(p.resultat_terrain) || !Number.isFinite(p.poids_reel) || (['collectee', 'partielle'].includes(p.resultat_terrain) ? p.poids_reel <= 0 : p.poids_reel !== 0)) throw new Error('Résultat invalide.');
            const motif = typeof p.motif_terrain === 'string' ? p.motif_terrain.trim() : '';
            if (motif.length > 2000 || (p.resultat_terrain === 'non_collectee' && !motif)) throw new Error('Motif invalide (2000 caractères maximum).');
            Object.assign(out, { resultat_terrain: p.resultat_terrain, poids_reel: p.poids_reel, motif_terrain: motif || null });
        }
        if (type === 'enregistrer_pesee') {
            if (!UUID.test(p.balance_id || '') || !Number.isFinite(p.poids_brut) ||
                !Number.isFinite(p.tare) || p.poids_brut < 0 || p.tare < 0 || p.tare > p.poids_brut)
                throw new Error('Pesée invalide.');
            const codes = Array.isArray(p.codes_qr) ? [...new Set(p.codes_qr.map(code => String(code).trim().toUpperCase()).filter(Boolean))] : [];
            if (codes.some(code => !/^PR-[CL]-[A-Z0-9-]{6,60}$/.test(code))) throw new Error('Code QR invalide.');
            Object.assign(out, { balance_id: p.balance_id, poids_brut: p.poids_brut, tare: p.tare, codes_qr: codes });
        }
        if (type === 'signaler_incident') {
            const categories = [
                'panne_tricycle',
                'accident',
                'client_absent',
                'acces_refuse',
                'dechets_non_conformes',
                'securite',
                'autre'
            ];

            const gravites = [
                'faible',
                'moyenne',
                'elevee',
                'critique'
            ];

            const categorie =
                String(p.categorie || '').trim().toLowerCase();

            const gravite =
                String(p.gravite || '').trim().toLowerCase();

            const description =
                String(p.description || '').trim();

            const collecte =
                p.collecte_id ? String(p.collecte_id) : null;

            if (!categories.includes(categorie))
                throw new Error("Cat?gorie d'incident invalide.");

            if (!gravites.includes(gravite))
                throw new Error("Gravit? d'incident invalide.");

            if (description.length < 5)
                throw new Error("La description de l'incident est obligatoire.");

            if (collecte && !UUID.test(collecte))
                throw new Error("Collecte d'incident invalide.");

            Object.assign(out, {
                collecte_id: collecte,
                categorie,
                gravite,
                bloquant: p.bloquant === true,
                description,
                mode: p.mode === 'offline' ? 'offline' : 'online'
            });
        }
        return out;
    }
    function validateBlob(blob) {
        if (!(blob instanceof Blob) || !blob.size || blob.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error('Photo invalide : JPEG, PNG ou WebP, 5 Mo maximum.');
    }
    async function freshBlob(blob) {
        try {
            validateBlob(blob);
            const copy = new Blob([await blob.arrayBuffer()], { type: blob.type });
            validateBlob(copy);
            return copy;
        } catch (cause) {
            const error = new Error('La preuve photo locale est illisible.');
            error.code = 'BLOB_ILLISIBLE';
            error.cause = cause;
            throw error;
        }
    }
    // Explicit allowlist: never store the authenticated API response as a whole.
    function snapshot(day) {
        return {
            date: day?.date || null,
            genere_le: day?.genere_le || null,
            timezone: day?.timezone || null,
            balances:
                (day?.balances || []).map(b => ({
                    id: b.id,
                    numero_interne:
                        String(b.numero_interne || ''),
                    capacite_max_kg:
                        Number(b.capacite_max_kg),
                    precision_kg:
                        Number(b.precision_kg),
                    tricycle_id:
                        b.tricycle_id || null,
                    site_id:
                        b.site_id || null
                })),

            unites_qr:
                (day?.unites_qr || []).map(u => ({
                    code_qr:
                        String(u.code_qr || ''),
                    type:
                        String(u.type || ''),
                    tare_kg:
                        u.tare_kg === null
                            ? null
                            : Number(u.tare_kg),
                    statut:
                        String(u.statut || ''),
                    site_courant_id:
                        u.site_courant_id || null,
                    client_courant_id:
                        u.client_courant_id || null,
                    type_dechet_id:
                        u.type_dechet_id || null
                })),

            missions:
                (day?.missions || []).map(m => ({

                    id:
                        m.id,
                    local_only: m.local_only === true,

                    statut:
                        m.statut,

                    date_prevue:
                        m.date_prevue || null,

                    heure_depart_prevue:
                        m.heure_depart_prevue || null,

                    heure_retour_prevue:
                        m.heure_retour_prevue || null,

                    heure_depart_reelle:
                        m.heure_depart_reelle || null,

                    heure_retour_reelle:
                        m.heure_retour_reelle || null,

                    observations:
                        String(m.observations || ''),

                    action_suivante:
                        String(m.action_suivante || ''),

                    prochaine_collecte:
                        m.prochaine_collecte
                            ? {
                                id:
                                    m.prochaine_collecte.id || null,

                                ordre_collecte:
                                    m.prochaine_collecte.ordre_collecte == null
                                        ? null
                                        : Number(
                                            m.prochaine_collecte
                                                .ordre_collecte
                                        ),

                                site_nom:
                                    String(
                                        m.prochaine_collecte.site_nom ||
                                        ''
                                    ),

                                action:
                                    String(
                                        m.prochaine_collecte.action ||
                                        ''
                                    )
                            }
                            : null,

                    tricycle: {

                        id:
                            m.tricycle?.id || null,

                        numero:
                            String(
                                m.tricycle?.numero ||
                                ''
                            ),

                        plaque:
                            String(
                                m.tricycle?.plaque ||
                                ''
                            ),

                        capacite_kg:
                            m.tricycle?.capacite_kg == null
                                ? null
                                : Number(
                                    m.tricycle.capacite_kg
                                ),

                        capacite_max_kg:
                            m.tricycle?.capacite_max_kg == null
                                ? null
                                : Number(
                                    m.tricycle.capacite_max_kg
                                )
                    },

                    collectes:
                        (m.collectes || []).map(c => {

                            const ordre =
                                c.ordre_collecte ??
                                c.ordre ??
                                null;

                            const estime =
                                c.poids?.estime_kg ??
                                c.poids_estime ??
                                null;

                            const reel =
                                c.poids?.reel_kg ??
                                c.poids_reel ??
                                null;

                            const client =
                                c.client &&
                                typeof c.client ===
                                    'object'

                                    ? {
                                        id:
                                            c.client.id ||
                                            c.client_id ||
                                            null,

                                        nom:
                                            String(
                                                c.client.nom ||
                                                ''
                                            )
                                    }

                                    : {
                                        id:
                                            c.client_id ||
                                            null,

                                        nom:
                                            String(
                                                c.client ||
                                                ''
                                            )
                                    };

                            const typeDechet =
                                c.type_dechet &&
                                typeof c.type_dechet ===
                                    'object'

                                    ? {
                                        id:
                                            c.type_dechet.id ||
                                            c.type_dechet_id ||
                                            null,

                                        nom:
                                            String(
                                                c.type_dechet.nom ||
                                                ''
                                            )
                                    }

                                    : {
                                        id:
                                            c.type_dechet_id ||
                                            null,

                                        nom:
                                            String(
                                                c.type_dechet ||
                                                ''
                                            )
                                    };

                            const zone =
                                String(
                                    c.site?.zone_geographique ||
                                    c.site?.zone ||
                                    ''
                                );

                            const responsable =
                                String(
                                    c.site?.responsable_nom ||
                                    c.site?.responsable ||
                                    ''
                                );

                            return {

                                id:
                                    c.id,

                                ordre_collecte:
                                    ordre == null
                                        ? null
                                        : Number(ordre),

                                etat:
                                    String(c.etat || ''),

                                action_suivante:
                                    String(
                                        c.action_suivante ||
                                        ''
                                    ),

                                client,

                                type_dechet:
                                    typeDechet,

                                poids: {

                                    estime_kg:
                                        estime == null
                                            ? null
                                            : Number(estime),

                                    reel_kg:
                                        reel == null
                                            ? null
                                            : Number(reel),

                                    reel_saisi_le:
                                        c.poids
                                            ?.reel_saisi_le ||
                                        c.poids_reel_saisi_le ||
                                        null
                                },

                                site: {

                                    id:
                                        c.site?.id ||
                                        null,

                                    nom:
                                        String(
                                            c.site?.nom ||
                                            ''
                                        ),

                                    adresse:
                                        String(
                                            c.site?.adresse ||
                                            ''
                                        ),

                                    zone_geographique:
                                        zone,

                                    zone,

                                    responsable_nom:
                                        responsable,

                                    responsable,

                                    latitude:
                                        c.site?.latitude == null
                                            ? null
                                            : Number(
                                                c.site.latitude
                                            ),

                                    longitude:
                                        c.site?.longitude == null
                                            ? null
                                            : Number(
                                                c.site.longitude
                                            ),

                                    precision_gps_reference:
                                        c.site?.precision_gps_reference == null
                                            ? null
                                            : Number(
                                                c.site
                                                    .precision_gps_reference
                                            ),

                                    rayon_validation_m:
                                        c.site?.rayon_validation_m == null
                                            ? null
                                            : Number(
                                                c.site
                                                    .rayon_validation_m
                                            )
                                },

                                progression: {

                                    arrivee:
                                        !!c.progression
                                            ?.arrivee,

                                    collecte_demarree:
                                        !!c.progression
                                            ?.collecte_demarree,

                                    collecte_terminee:
                                        !!c.progression
                                            ?.collecte_terminee
                                },

                                preuves:
                                    (
                                        c.preuves ||
                                        []
                                    )
                                        .filter(
                                            p =>
                                                photo(
                                                    p.type_preuve
                                                )
                                        )
                                        .map(
                                            p => ({
                                                type_preuve:
                                                    p.type_preuve
                                            })
                                        ),

                                pesees:
                                    (
                                        c.pesees ||
                                        []
                                    ).map(
                                        p => ({

                                            id:
                                                p.id ||
                                                null,

                                            operation_id:
                                                p.operation_id ||
                                                null,

                                            type:
                                                p.type,

                                            poids_brut:
                                                Number(
                                                    p.poids_brut
                                                ),

                                            tare:
                                                Number(
                                                    p.tare
                                                ),

                                            poids_net:
                                                Number(
                                                    p.poids_net
                                                ),

                                            balance_id:
                                                p.balance_id ||
                                                null,

                                            codes_qr:
                                                Array.isArray(
                                                    p.codes_qr
                                                )
                                                    ? [
                                                        ...p.codes_qr
                                                    ]
                                                    : [],

                                            date_heure:
                                                p.date_heure ||
                                                null,

                                            est_courante:
                                                p.est_courante ===
                                                true
                                        })
                                    )
                            };
                        })
                }))
        };
    }
    function project(day, rows) {
        const result = snapshot(day);
        for (const r of rows) {
            const m = result.missions.find(m => m.id === r.mission_id);
            if (!m) continue;
            if (['erreur', 'recuperation'].includes(r.statut)) { m.bloquee = true; continue; }
            if (m.bloquee) continue;
            const c = m.collectes.find(c => c.id === r.collecte_id);
            if (r.type === 'demarrer_mission') m.statut = 'en_cours';
            if (r.type === 'terminer_mission') m.statut = 'terminee';
            if (c) {
                const key = { arriver_site: 'arrivee', demarrer_collecte: 'collecte_demarree', terminer_collecte: 'collecte_terminee' }[r.type];
                if (key) c.progression[key] = true;
                if (photo(r.type) && !c.preuves.some(p => p.type_preuve === r.type)) c.preuves.push({ type_preuve: r.type });
                if (r.type === 'enregistrer_pesee' && !c.pesees.some(p => p.operation_id === r.operation_id)) {
                    const devientCourante = !c.pesees.some(p => p.type === 'terrain' &&
                        Date.parse(p.date_heure) > Date.parse(r.payload.survenu_le));
                    if (devientCourante) c.pesees.filter(p => p.type === 'terrain').forEach(p => { p.est_courante = false; });
                    c.pesees.push({ operation_id: r.operation_id, type: 'terrain', poids_brut: r.payload.poids_brut,
                        tare: r.payload.tare, poids_net: r.payload.poids_brut - r.payload.tare,
                        balance_id: r.payload.balance_id, codes_qr: r.payload.codes_qr || [],
                        date_heure: r.payload.survenu_le, est_courante: devientCourante });
                }
            }
        }
        for (const m of result.missions) {
            if (m.local_only) m.bloquee = true;
            const n = m.collectes.length, done = m.collectes.filter(c => c.progression.collecte_terminee).length;
            m.progression = { nombre_collectes: n, terminees: done, restantes: n - done, pourcentage: n ? done * 100 / n : 0 };
        }
        result.resume = { nombre_missions: result.missions.length, nombre_collectes: result.missions.reduce((n, m) => n + m.collectes.length, 0), collectes_terminees: result.missions.reduce((n, m) => n + m.progression.terminees, 0) };
        return result;
    }
    async function open(name) {
        const r = indexedDB.open(name, 4);
        r.onupgradeneeded = event => {
            if (!r.result.objectStoreNames.contains('queue')) {
                const q = r.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
                q.createIndex('context', ['mission_id', 'collecte_id', 'type'], { unique: false });
                q.createIndex('operation', 'operation_id', { unique: true });
            }
            if (event.oldVersion > 0 && event.oldVersion < 4) {
                const queue =
                    event.target.transaction.objectStore('queue');

                if (queue.indexNames.contains('context')) {
                    queue.deleteIndex('context');
                }

                queue.createIndex(
                    'context',
                    ['mission_id', 'collecte_id', 'type'],
                    { unique: false }
                );
            }
            if (!r.result.objectStoreNames.contains('state')) r.result.createObjectStore('state');
            const meta = r.result.objectStoreNames.contains('queue_meta')
                ? event.target.transaction.objectStore('queue_meta')
                : r.result.createObjectStore('queue_meta');
            // A v1 status described an interrupted execution, not a durable decision.
            // Seed v2 metadata without ever rewriting the historical row or its Blob.
            if (event.oldVersion === 1) {
                const cursor = event.target.transaction.objectStore('queue').openCursor();
                cursor.onsuccess = () => {
                    if (!cursor.result) return;
                    const row = cursor.result.value;
                    meta.put({
                        statut: row.statut === 'erreur' ? 'erreur' : 'en_attente',
                        retry_count: Number.isSafeInteger(row.retry_count) && row.retry_count >= 0 ? row.retry_count : 0,
                        last_error: safeErrors.includes(row.last_error) ? row.last_error : null,
                        next_attempt_at: Number.isFinite(row.next_attempt_at) && row.next_attempt_at > 0 ? row.next_attempt_at : 0,
                        post_initiated: row.post_initiated === true
                    }, row.id);
                    cursor.result.continue();
                };
            }
            // v2 envoyait déjà le bon instant ISO sous `survenu_le`, mais l'API de
            // pesée lisait `date_heure`. Réarmer une seule fois cette action permet
            // de reprendre le run sans modifier son UUID, son GPS ni son instant.
            if (event.oldVersion === 2) {
                const queue = event.target.transaction.objectStore('queue');
                const cursor = queue.openCursor();
                cursor.onsuccess = () => {
                    if (!cursor.result) return;
                    const row = cursor.result.value;
                    if (row.type !== 'enregistrer_pesee' ||
                        typeof row.payload?.survenu_le !== 'string' ||
                        !Number.isFinite(Date.parse(row.payload.survenu_le))) {
                        cursor.result.continue();
                        return;
                    }
                    const current = meta.get(row.id);
                    current.onsuccess = () => {
                        if (current.result?.statut === 'erreur') meta.put({
                            statut: 'en_attente', retry_count: 0, last_error: null,
                            next_attempt_at: 0, post_initiated: false
                        }, row.id);
                        cursor.result.continue();
                    };
                };
            }
        };
        const db = await request(r);
        db.onversionchange = () => db.close();
        let running = null;
        const transact = async (stores, mode, fn) => {
            const tx = db.transaction(stores, mode), done = complete(tx);
            try { const value = await fn(tx); await done; return value; }
            catch (e) { try { tx.abort(); } catch {} await done.catch(() => {}); throw e; }
        };
        const metadata = row => ({ statut: row.statut, retry_count: row.retry_count, last_error: row.last_error, next_attempt_at: row.next_attempt_at, post_initiated: row.post_initiated === true });
        const safeMetadata = (row, meta, interrupted = false) => {
            const source = meta || row || {};
            const rejected = source.statut === 'erreur';
            const recovery = source.statut === 'recuperation' || source.last_error === 'BLOB_ILLISIBLE';
            return {
                statut: recovery ? 'recuperation' : rejected ? 'erreur' : interrupted || source.statut !== 'envoi' ? 'en_attente' : 'envoi',
                retry_count: Number.isSafeInteger(source.retry_count) && source.retry_count >= 0 ? source.retry_count : 0,
                last_error: safeErrors.includes(source.last_error) ? source.last_error : null,
                next_attempt_at: Number.isFinite(source.next_attempt_at) && source.next_attempt_at > 0 ? source.next_attempt_at : 0,
                post_initiated: source.post_initiated === true
            };
        };
        // Also repairs databases that were already opened once by v2 before this fix.
        // Opening a store means any persisted "envoi" belongs to a dead page execution.
        const repairMetadata = () => transact(['queue', 'queue_meta'], 'readwrite', async tx => {
            const q = tx.objectStore('queue'), metaStore = tx.objectStore('queue_meta');
            const rows = await request(q.getAll());
            let interrupted = false;
            for (const row of rows) {
                const current = await request(metaStore.get(row.id));
                interrupted ||= row.statut === 'envoi' || current?.statut === 'envoi';
                await request(metaStore.put(safeMetadata(row, current, true), row.id));
            }
            return interrupted;
        });
        // Opening another tab does not imply that the first tab has died.
        // Interrupted metadata is repaired only under the exclusive sync lock.
        const mergedRows = async tx => {
            const rows = await request(tx.objectStore('queue').getAll());
            return Promise.all(rows.map(async row => ({ ...row, ...safeMetadata(row, await request(tx.objectStore('queue_meta').get(row.id))) })));
        };
        const list = () => transact(['queue', 'queue_meta'], 'readonly', mergedRows);
        const view = () => transact(['queue', 'queue_meta', 'state'], 'readonly', async tx => {
            const q = mergedRows(tx), s = request(tx.objectStore('state').get('day'));
            return project(await s, await q);
        });
        const saveDay = day => {
            if (!day || !Array.isArray(day.missions)) throw new Error('Journée serveur invalide : données locales conservées.');
            return transact(['state', 'queue'], 'readwrite', async tx => {
                const state = tx.objectStore('state');
                const previous = await request(state.get('day'));
                const rows = await request(tx.objectStore('queue').getAll());
                const next = snapshot(day);
                for (const mission of previous?.missions || []) {
                    if (!next.missions.some(m => m.id === mission.id) && rows.some(row => row.mission_id === mission.id))
                        next.missions.push({ ...mission, local_only: true });
                }
                return request(state.put(next, 'day'));
            });
        };
        const draftKey = context => {
            if (!UUID.test(context.mission || '') || !UUID.test(context.collecte || '') || !actions.includes(context.action))
                throw new Error('Contexte de brouillon invalide.');
            return 'draft:' + [context.mission, context.collecte, context.action].join(':');
        };
        const draftFields = ['balance_id', 'poids_brut', 'tare', 'codes_qr', 'resultat_terrain', 'poids_reel', 'motif_terrain', 'pris_le'];
        const saveDraft = (context, values, blob) => {
            const key = draftKey(context);
            if (blob) validateBlob(blob);
            const fields = Object.fromEntries(draftFields.filter(key => typeof values.fields?.[key] === 'string')
                .map(key => [key, values.fields[key].slice(0, key === 'codes_qr' ? 10000 : 2000)]));
            return transact(['state'], 'readwrite', tx => request(tx.objectStore('state').put({ fields,
                pris_le: values.pris_le || null, saved_at: new Date().toISOString(),
                ...(blob ? { blob: blob.slice(0, blob.size, blob.type) } : {}) }, key)));
        };
        const getDraft = context => transact(['state'], 'readonly', tx => request(tx.objectStore('state').get(draftKey(context))));
        const preparerEntree =
            function (
                context,
                payload,
                blob
            ) {

                const type =
                    context.action;

                const mission_id =
                    context.mission;

                const collecte_id =
                    context.collecte || "";

                const missionOnly =
                    [
                        "demarrer_mission",
                        "terminer_mission"
                    ].includes(type);

                const incident =
                    type ===
                    "signaler_incident";

                const collecteInvalide =
                    missionOnly
                        ? collecte_id !== ""
                        : incident
                            ? (
                                collecte_id !== "" &&
                                !UUID.test(collecte_id)
                              )
                            : !UUID.test(collecte_id);

                if (
                    !UUID.test(mission_id) ||
                    collecteInvalide
                ) {

                    throw new Error(
                        "Contexte invalide."
                    );

                }

                const safe =
                    clean(
                        type,
                        payload
                    );

                if (photo(type)) {
                    validateBlob(blob);
                }

                return {
                    type,
                    mission_id,
                    collecte_id,
                    safe,
                    blob
                };

            };


        async function enqueueBatch(
            items
        ) {

            if (
                !Array.isArray(items) ||
                items.length === 0
            ) {

                throw new Error(
                    "Aucune action a enregistrer."
                );

            }

            const entrees =
                items.map(
                    function (item) {

                        return preparerEntree(
                            item.context,
                            item.payload,
                            item.blob
                        );

                    }
                );

            return transact(
                [
                    "queue",
                    "queue_meta",
                    "state"
                ],
                "readwrite",
                async function (tx) {

                    const q =
                        tx.objectStore(
                            "queue"
                        );

                    const metaStore =
                        tx.objectStore(
                            "queue_meta"
                        );

                    const resultat = [];

                    for (
                        const entree
                        of entrees
                    ) {

                        const byOperation = await request(q.index('operation').get(entree.safe.operation_id));
                        if (byOperation && (byOperation.type !== entree.type ||
                            byOperation.mission_id !== entree.mission_id || byOperation.collecte_id !== entree.collecte_id ||
                            JSON.stringify(byOperation.payload) !== JSON.stringify(entree.safe))) {
                            throw new Error("Cet identifiant d’opération appartient à une autre action.");
                        }
                        const repeatable = ['enregistrer_pesee', 'ticket_balance', 'signaler_incident'].includes(entree.type);
                        const existing = byOperation || (repeatable ? null : await request(q.index('context').get([
                            entree.mission_id, entree.collecte_id, entree.type
                        ])));

                        if (existing) {

                            const metaExistant =
                                await request(
                                    metaStore.get(
                                        existing.id
                                    )
                                );

                            resultat.push({
                                statut: "en_attente",
                                retry_count: 0,
                                last_error: null,
                                next_attempt_at: 0,
                                post_initiated: false,
                                ...existing,
                                ...(metaExistant || {})
                            });

                            continue;

                        }

                        const row = {

                            type:
                                entree.type,

                            mission_id:
                                entree.mission_id,

                            collecte_id:
                                entree.collecte_id,

                            operation_id:
                                entree.safe.operation_id,

                            payload:
                                entree.safe,

                            created_at:
                                new Date()
                                    .toISOString(),

                            ...(photo(entree.type)
                                ? {
                                    blob:
                                        entree.blob.slice(
                                            0,
                                            entree.blob.size,
                                            entree.blob.type
                                        )
                                  }
                                : {})

                        };

                        row.id =
                            await request(
                                q.add(row)
                            );

                        const meta = {
                            statut: "en_attente",
                            retry_count: 0,
                            last_error: null,
                            next_attempt_at: 0,
                            post_initiated: false
                        };

                        await request(
                            metaStore.put(
                                meta,
                                row.id
                            )
                        );

                        resultat.push({
                            ...row,
                            ...meta
                        });

                    }

                    for (const item of items) {
                        if (item.context.collecte) await request(tx.objectStore('state').delete(draftKey(item.context)));
                    }
                    return resultat;

                }
            );

        }


        async function enqueue(
            context,
            payload,
            blob
        ) {

            const resultat =
                await enqueueBatch([
                    {
                        context,
                        payload,
                        blob
                    }
                ]);

            return resultat[0];

        }

        const update = row => transact(['queue_meta'], 'readwrite', tx => request(tx.objectStore('queue_meta').put(metadata(row), row.id)));
        async function prepare(row) {
            const p = clean(row.type, row.payload);
            let url =
                '/terrain/missions/' +
                encodeURIComponent(row.mission_id);

            if (row.type === 'signaler_incident') {
                return {
                    url: url + '/incidents',
                    body: p
                };
            }
            if (row.collecte_id) url += '/collectes/' + encodeURIComponent(row.collecte_id);
            if (photo(row.type)) {
                const blob = await freshBlob(row.blob);
                const form = new FormData();
                for (const [key, value] of Object.entries(p)) form.append(key, String(value));
                form.append('fichier', blob, 'preuve.' + ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[blob.type]);
                return { url: url + '/preuves', body: form };
            }
            return { url: url + '/' + ({ demarrer_mission: 'demarrer', arriver_site: 'arrivee', demarrer_collecte: 'demarrer', enregistrer_pesee: 'pesees', terminer_collecte: 'terminer', terminer_mission: 'terminer' })[row.type], body: p };
        }
        function sync(api, authorized, notify = () => {}, options = {}) {
            if (running) return running;
            const run = async () => {
                await repairMetadata();
                let forceBackoff = options.forceBackoff === true;
                let blockedResult = null;
                const blockedMissions = new Set();
                for (const row of await list()) {
                    if (!navigator.onLine) return { stopped: 'offline' };
                    if (!authorized()) return { stopped: 'auth' };
                    if (blockedMissions.has(row.mission_id)) continue;
                    if (['erreur', 'recuperation'].includes(row.statut)) {
                        blockedMissions.add(row.mission_id);
                        blockedResult ||= row.statut === 'erreur' ? { stopped: 'erreur' }
                            : { stopped: 'recuperation', replacementAllowed: !row.post_initiated };
                        continue;
                    }
                    if (row.next_attempt_at > Date.now() && !forceBackoff) return { stopped: 'backoff', at: row.next_attempt_at };
                    forceBackoff = false;
                    row.statut = 'envoi'; await update(row); notify();
                    try {
                        const prepared = await prepare(row);
                        // This durable flag separates a local read failure from an uncertain HTTP attempt.
                        if (!authorized()) { row.statut = 'en_attente'; await update(row); return { stopped: 'auth' }; }
                        row.post_initiated = true;
                        await update(row);
                        const response = await api.post(prepared.url, prepared.body);
                        if (api.requireReceipt) {
                            const receipt = response?.data?.evenement || response?.data?.arrivee || response?.data?.preuve || response?.data?.pesee || response?.data?.incident;
                            if (!receipt || receipt.operation_id !== row.operation_id || receipt.mission_id !== row.mission_id ||
                                (row.collecte_id && receipt.collecte_id !== row.collecte_id)) {
                                const error = new Error('Accusé de réception incohérent : action conservée.');
                                error.code = 'PROTOCOL_ERROR';
                                throw error;
                            }
                        }
                    }
                    catch (e) {
                        if (e.code === 'BLOB_ILLISIBLE') {
                            row.statut = 'recuperation';
                            row.last_error = 'BLOB_ILLISIBLE';
                            row.next_attempt_at = 0;
                            await update(row); notify();
                            blockedMissions.add(row.mission_id);
                            blockedResult ||= { stopped: 'recuperation', replacementAllowed: !row.post_initiated };
                            continue;
                        }
                        row.retry_count++;
                        const auth = e.status === 401;
                        row.statut = auth || retryable(e) ? 'en_attente' : 'erreur';
                        // Never persist server messages, which may contain personal data or credentials.
                        row.last_error = auth ? 'RECONNEXION' : e.status === 403 ? 'ACCES_REFUSE' : e.code === 'PROTOCOL_ERROR' ? 'REPONSE_INVALIDE' : e.code === 'NETWORK_ERROR' ? 'UPLOAD_RESEAU' : retryable(e) ? 'ERREUR_SERVEUR' : 'REFUS_DEFINITIF';
                        row.next_attempt_at = auth ? 0 : Date.now() + Math.min(300000, 2000 * 2 ** Math.min(row.retry_count - 1, 8));
                        await update(row); notify();
                        if (row.statut === 'erreur') {
                            blockedMissions.add(row.mission_id);
                            blockedResult ||= { stopped: 'erreur' };
                            continue;
                        }
                        return { stopped: auth ? 'auth' : 'backoff', at: row.next_attempt_at };
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
                if (api.get && authorized() && navigator.onLine) {
                    try {
                        const response = await api.get('/terrain/journee');
                        if (!authorized()) return { stopped: 'auth' };
                        await saveDay(response?.data || response);
                    } catch (e) {
                        return { stopped: e.status === 401 ? 'auth' : 'refresh', status: e.status };
                    }
                }
                return blockedResult || { stopped: null };
            };
            // Never steal a lock from a live sender. If Web Locks is unavailable,
            // keep the queue intact rather than race two writers.
            const locked = navigator.locks
                ? navigator.locks.request(name + ':sync', run)
                : Promise.resolve({ stopped: 'lock' });
            running = locked.finally(() => { running = null; });
            return running;
        }
        const replaceUnreadablePhoto = async (blob, prisLe, gps) => {
            const replacement = await freshBlob(blob);
            if (typeof prisLe !== 'string' || !Number.isFinite(Date.parse(prisLe)) || Date.parse(prisLe) > Date.now() + 5000)
                throw new Error('Date de prise de photo invalide.');
            return transact(['queue', 'queue_meta', 'state'], 'readwrite', async tx => {
                const q = tx.objectStore('queue'), metaStore = tx.objectStore('queue_meta');
                const rows = await request(q.getAll());
                const first = rows[0];
                if (!first) throw new Error('Aucune preuve à remplacer.');
                const meta = safeMetadata(first, await request(metaStore.get(first.id)));
                if (!photo(first.type) || meta.last_error !== 'BLOB_ILLISIBLE' || meta.statut !== 'recuperation')
                    throw new Error('Cette action ne demande pas de remplacement de photo.');
                if (meta.post_initiated)
                    throw new Error('Un envoi a déjà pu commencer. La preuve doit être vérifiée avant remplacement.');
                if (!gps) throw new Error('Un nouveau relevé GPS est obligatoire pour remplacer cette preuve.');
                const payload = clean(first.type, { ...first.payload, ...gps, pris_le: prisLe });
                const state = tx.objectStore('state');
                const archiveKey = 'recovery:' + first.operation_id;
                const previousArchive = await request(state.get(archiveKey));
                await request(state.put({ row: first, metadata: meta, replaced_at: new Date().toISOString() },
                    previousArchive ? archiveKey + ':' + crypto.randomUUID() : archiveKey));
                await request(q.put({ ...first, payload, blob: replacement }));
                const reset = { statut: 'en_attente', retry_count: 0, last_error: null, next_attempt_at: 0, post_initiated: false };
                await request(metaStore.put(reset, first.id));
                return { ...first, payload, blob: replacement, ...reset };
            });
        };
        // Re-arm the exact immutable operation after explicit review. Never delete successors.
        const retryRejected = id => transact(['queue', 'queue_meta', 'state'], 'readwrite', async tx => {
            const row = await request(tx.objectStore('queue').get(id));
            if (!row) throw new Error('Action introuvable.');
            const meta = safeMetadata(row, await request(tx.objectStore('queue_meta').get(id)));
            if (meta.statut !== 'erreur') throw new Error('Cette action ne peut pas être réarmée.');
            await request(tx.objectStore('state').put({ operation_id: row.operation_id, metadata: meta,
                retried_at: new Date().toISOString() }, 'retry:' + row.operation_id + ':' + Date.now()));
            await request(tx.objectStore('queue_meta').put({ ...meta, statut: 'en_attente', last_error: null, next_attempt_at: 0 }, id));
        });
        const discardRejected = () => Promise.reject(new Error('Suppression désactivée : vérifiez puis réessayez la même action.'));
        return { list, view, saveDay, saveDraft, getDraft, enqueue, enqueueBatch, sync, replaceUnreadablePhoto, retryRejected, discardRejected, close: () => db.close() };
    }
    window.ProRecup.offline = { open, clean, snapshot, project, retryable };
})();
