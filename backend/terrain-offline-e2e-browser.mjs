/** Real browser IndexedDB/Blob runner. Playwright is a test-only dependency.
 * TERRAIN_PLAYWRIGHT_PACKAGE may point to an existing playwright package.
 * TERRAIN_BROWSER_EXECUTABLE may select an installed Chromium/Edge executable.
 * API credentials stay in the Node process; the bridge calls the real local API.
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

export async function openOfflineBrowser(repo) {
    const require = createRequire(import.meta.url);
    const { chromium } = require(process.env.TERRAIN_PLAYWRIGHT_PACKAGE || 'playwright');
    const browser = await chromium.launch({ headless: true,
        ...(process.env.TERRAIN_BROWSER_EXECUTABLE ? { executablePath: process.env.TERRAIN_BROWSER_EXECUTABLE } : {}) });
    const shell = createServer((req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        if (req.url === '/offline.js') {
            res.setHeader('Content-Type', 'text/javascript');
            res.end(fs.readFileSync(path.join(repo, 'agent-app/js/offline.js')));
        } else {
            res.setHeader('Content-Type', 'text/html');
            res.end('<!doctype html><script>window.ProRecup={}</script><script src="/offline.js"></script>');
        }
    });
    try {
        await new Promise((resolve, reject) => { shell.once('error', reject); shell.listen(0, '127.0.0.1', resolve); });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:' + shell.address().port);
        return {
            async run({ entries, day, png, send, checkOffline }) {
                let sent = 0;
                let bridgeError;
                await page.exposeFunction('sendTerrain', async (url, fields, bytes) => {
                    try {
                        const entry = entries[sent];
                        assert.ok(entry, 'Aucun envoi supplémentaire.');
                        assert.equal(url, entry.url);
                        const expected = bytes ? Object.fromEntries(Object.entries(entry.payload).map(([k,v]) => [k,String(v)])) : entry.payload;
                        assert.deepEqual(fields, expected, 'Payload durable transmis sans changement.');
                        let body = fields;
                        if (bytes) {
                            assert.deepEqual(Buffer.from(bytes), png);
                            body = new FormData();
                            for (const [k,v] of Object.entries(fields)) body.append(k,v);
                            body.append('fichier', new Blob([Buffer.from(bytes)], { type: 'image/png' }), 'preuve.png');
                        }
                        await send(entry, body);
                        sent++;
                        return { success: true };
                    } catch (error) { bridgeError = error; throw new Error('Validation API E2E échouée.'); }
                });
                await context.setOffline(true);
                await page.evaluate(async ({ entries, day, bytes }) => {
                    if (navigator.onLine) throw new Error('Le navigateur doit être hors ligne.');
                    window.store = await ProRecup.offline.open('terrain-e2e');
                    await store.saveDay(day);
                    for (const e of entries) await store.enqueue(e.context, e.payload,
                        e.photo ? new Blob([new Uint8Array(bytes)], { type: 'image/png' }) : undefined);
                    await store.sync({ post: () => { throw new Error('Envoi hors ligne interdit.'); } }, () => true);
                    if ((await store.list()).length !== 7) throw new Error('Sept actions attendues hors ligne.');
                    store.close();
                }, { entries, day, bytes: [...png] });
                assert.equal(sent, 0);
                await checkOffline();
                // Real navigation destroys JS state; the database is reopened afterwards.
                await context.setOffline(false);
                await page.reload();
                await context.setOffline(true);
                const restored = await page.evaluate(async () => {
                    window.store = await ProRecup.offline.open('terrain-e2e');
                    const rows = await store.list();
                    const db = await new Promise((resolve, reject) => {
                        const r = indexedDB.open('terrain-e2e'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
                    });
                    const state = await new Promise((resolve, reject) => {
                        const r = db.transaction('state').objectStore('state').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
                    });
                    db.close();
                    if (localStorage.length || sessionStorage.length) throw new Error('Web Storage inattendu.');
                    const stored = JSON.stringify({ rows, state });
                    if (/"(?:agent_id|token|secret|authorization|password)"/i.test(stored)) throw new Error('Champ sensible persisté.');
                    return { rows: await Promise.all(rows.map(async r => ({ type: r.type, payload: r.payload,
                        operation_id: r.operation_id, bytes: r.blob ? [...new Uint8Array(await r.blob.arrayBuffer())] : null }))),
                        statut: (await store.view()).missions[0].statut };
                });
                assert.equal(restored.rows.length, 7);
                assert.equal(restored.statut, 'terminee');
                restored.rows.forEach((r,i) => {
                    assert.equal(r.type, entries[i].context.action);
                    assert.equal(r.operation_id, entries[i].payload.operation_id);
                    assert.deepEqual(r.payload, entries[i].payload);
                    if (entries[i].photo) assert.deepEqual(Buffer.from(r.bytes), png);
                });
                await context.setOffline(false);
                const result = await page.evaluate(async () => {
                    if (!navigator.onLine) throw new Error('Retour online attendu.');
                    const result = await store.sync({ post: async (url, body) => {
                        if (body instanceof FormData) {
                            const blob = body.get('fichier');
                            const fields = Object.fromEntries([...body].filter(([k]) => k !== 'fichier'));
                            return window.sendTerrain(url, fields, [...new Uint8Array(await blob.arrayBuffer())]);
                        }
                        return window.sendTerrain(url, body, null);
                    } }, () => true);
                    return { result, remaining: (await store.list()).length };
                });
                if (bridgeError) throw bridgeError;
                assert.equal(result.result.stopped, null);
                assert.equal(result.remaining, 0);
                assert.equal(sent, 7);
                await page.evaluate(async () => {
                    store.close();
                    await new Promise((resolve, reject) => {
                        const r = indexedDB.deleteDatabase('terrain-e2e'); r.onsuccess = resolve; r.onerror = () => reject(r.error);
                        r.onblocked = () => reject(new Error('Suppression IndexedDB bloquée.'));
                    });
                });
                return { queued: 7, sent, remaining: 0, reload: true, durablePhotos: 2, sensitiveFields: 0 };
            },
            async close() { await browser.close(); await new Promise(resolve => shell.close(resolve)); }
        };
    } catch (error) { await browser.close(); shell.close(); throw error; }
}
