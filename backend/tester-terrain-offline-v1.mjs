// Isolated localhost runner. No backend, accounts or external services are used.
// Run: node backend/tester-terrain-offline-v1.mjs then open the printed URL.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Tests Offline Terrain V1</title><h1>Tests Offline Terrain V1</h1><button id="run">Exécuter les tests isolés</button><button id="reload-test">Tester fermeture et rechargement</button><button id="cache-test">Préparer le test du cache</button><button id="stop-shell">Couper le serveur du shell</button><pre id="result">Prêt. Données fictives uniquement.</pre><script>window.ProRecup={};</script><script src="/agent-app/js/offline.js"></script><script src="/tests.js"></script></html>`;
let denyShell = false;
const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/disable-shell' && req.method === 'POST') { denyShell = true; res.end('Shell désactivé pour le test'); return; }
        if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page); return; }
        if (url.pathname === '/tests.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await fs.readFile(path.join(root, 'backend/terrain-offline-tests.js'))); return; }
        if (!url.pathname.startsWith('/agent-app/') || url.pathname.includes('..')) { res.writeHead(404).end(); return; }
        if (denyShell) { res.destroy(); return; }
        const file = path.join(root, url.pathname === '/agent-app/' ? '/agent-app/index.html' : url.pathname);
        const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end(); }
});
server.listen(8765, '127.0.0.1', () => console.log('Tests isolés : http://127.0.0.1:8765/'));
