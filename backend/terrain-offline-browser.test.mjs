import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import fs from "node:fs";
import { openOfflineBrowser } from "./terrain-offline-e2e-browser.mjs";

const playwrightPackage = process.env.TERRAIN_PLAYWRIGHT_PACKAGE;

test("IndexedDB conserve puis synchronise une tournée après fermeture et retour réseau", {
    skip: playwrightPackage ? false : "TERRAIN_PLAYWRIGHT_PACKAGE non configuré"
}, async () => {
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const mission = randomUUID();
    const collecte = randomUUID();
    const specs = [
        ["demarrer_mission", `/terrain/missions/${mission}/demarrer`],
        ["arriver_site", `/terrain/missions/${mission}/collectes/${collecte}/arrivee`],
        ["demarrer_collecte", `/terrain/missions/${mission}/collectes/${collecte}/demarrer`],
        ["avant_collecte", `/terrain/missions/${mission}/collectes/${collecte}/preuves`],
        ["terminer_collecte", `/terrain/missions/${mission}/collectes/${collecte}/terminer`],
        ["apres_collecte", `/terrain/missions/${mission}/collectes/${collecte}/preuves`],
        ["terminer_mission", `/terrain/missions/${mission}/terminer`]
    ];
    const entries = specs.map(([action, url]) => {
        const photo = ["avant_collecte", "apres_collecte"].includes(action);
        return {
            url,
            photo,
            context: { action, mission, collecte: action.includes("mission") ? null : collecte },
            payload: {
                operation_id: randomUUID(),
                [photo ? "pris_le" : "survenu_le"]: new Date().toISOString(),
                latitude: -4.321,
                longitude: 15.312,
                precision_gps: 5,
                ...(photo ? { type_preuve: action } : {}),
                ...(action === "terminer_collecte"
                    ? { resultat_terrain: "collectee", poids_reel: 12.5, motif_terrain: null }
                    : {})
            }
        };
    });
    const day = {
        balances: [],
        missions: [{
            id: mission,
            statut: "planifiee",
            tricycle: {},
            collectes: [{
                id: collecte,
                site: {},
                progression: {},
                preuves: [],
                pesees: []
            }]
        }]
    };
    const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xw7xWQAAAABJRU5ErkJggg==",
        "base64"
    );
    const browser = await openOfflineBrowser(repo);
    try {
        const result = await browser.run({
            entries,
            day,
            png,
            checkOffline: async () => {},
            send: async () => ({ success: true })
        });
        assert.deepEqual(result, {
            queued: 7,
            sent: 7,
            remaining: 0,
            reload: true,
            durablePhotos: 2,
            sensitiveFields: 0
        });
    } finally {
        await browser.close();
    }
});

test("le manifest et le Service Worker installent un shell disponible hors ligne", {
    skip: playwrightPackage ? false : "TERRAIN_PLAYWRIGHT_PACKAGE non configuré"
}, async () => {
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const root = path.join(repo, "agent-app");
    const require = createRequire(import.meta.url);
    const { chromium } = require(playwrightPackage);
    const browser = await chromium.launch({
        headless: true,
        ...(process.env.TERRAIN_BROWSER_EXECUTABLE
            ? { executablePath: process.env.TERRAIN_BROWSER_EXECUTABLE }
            : {})
    });
    const server = createServer((request, response) => {
        const url = new URL(request.url, "http://127.0.0.1");
        if (url.pathname === "/agent-app/test-pwa.html") {
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end("<!doctype html><link rel=manifest href=./manifest.webmanifest><script>navigator.serviceWorker.register('./sw.js?v=1-18')</script>");
            return;
        }
        const relative = url.pathname.replace(/^\/agent-app\//, "");
        const file = path.resolve(root, relative || "index.html");
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
            response.writeHead(404).end();
            return;
        }
        const types = {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".webmanifest": "application/manifest+json",
            ".svg": "image/svg+xml"
        };
        response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
        response.end(fs.readFileSync(file));
    });
    try {
        await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        const origin = `http://127.0.0.1:${server.address().port}`;
        await page.goto(origin + "/agent-app/test-pwa.html");
        await page.evaluate(() => navigator.serviceWorker.ready);
        const manifest = await page.evaluate(async () =>
            (await fetch("./manifest.webmanifest")).json()
        );
        assert.equal(manifest.display, "standalone");
        assert.equal(manifest.start_url, "./index.html");
        await context.setOffline(true);
        const shell = await page.evaluate(async () =>
            (await fetch("./index.html")).text()
        );
        assert.match(shell, /Pro Récup/);
        await context.close();
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
});
