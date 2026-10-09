import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const active = process.env.RUN_ALPHA_UI_TESTS === "1";

test("Admin, Manager, Client et Agent restent utilisables en desktop et 390 px", {
    skip: active ? false : "RUN_ALPHA_UI_TESTS non activé"
}, async () => {
    for (const nom of ["TEST_DATABASE_URL", "INTEGRATION_TEST_PASSWORD", "TERRAIN_PLAYWRIGHT_PACKAGE"])
        assert.ok(process.env[nom], `${nom} requise.`);
    if (process.env.PRODUCTION_DATABASE_URL)
        assert.notEqual(process.env.TEST_DATABASE_URL, process.env.PRODUCTION_DATABASE_URL);

    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "prorecup-alpha-ui-local-only";
    process.env.SKIP_DATABASE_STARTUP_CHECK = "1";
    process.env.FRONTEND_URL = "http://127.0.0.1:8080";
    process.env.RESEND_API_KEY = "";

    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const publicRoot = path.join(repo, "alpha-dist");
    assert.ok(fs.existsSync(path.join(publicRoot, "accueil.html")), "Exécutez d'abord le build Alpha statique.");
    const app = (await import(pathToFileURL(path.join(repo, "backend/src/app.js")).href)).default;
    const pool = (await import(pathToFileURL(path.join(repo, "backend/src/config/db.js")).href)).default;
    const api = await new Promise((resolve, reject) => {
        const server = app.listen(5000, "127.0.0.1", () => resolve(server));
        server.once("error", reject);
    });
    const staticServer = createServer((request, response) => {
        const url = new URL(request.url, "http://127.0.0.1");
        const relative = url.pathname === "/favicon.ico"
            ? "brand/favicon.svg"
            : decodeURIComponent(url.pathname).replace(/^\/+/, "") || "accueil.html";
        const file = path.resolve(publicRoot, relative);
        if (!file.startsWith(publicRoot + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            response.writeHead(404).end();
            return;
        }
        const types = {
            ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
            ".webmanifest": "application/manifest+json"
        };
        response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
        response.end(fs.readFileSync(file));
    });
    await new Promise((resolve, reject) => {
        staticServer.listen(8080, "127.0.0.1", resolve);
        staticServer.once("error", reject);
    });

    const require = createRequire(import.meta.url);
    const { chromium } = require(process.env.TERRAIN_PLAYWRIGHT_PACKAGE);
    const browser = await chromium.launch({
        headless: true,
        ...(process.env.TERRAIN_BROWSER_EXECUTABLE
            ? { executablePath: process.env.TERRAIN_BROWSER_EXECUTABLE }
            : {})
    });
    const observations = [];
    const checkPage = async (page, role) => {
        await page.waitForLoadState("networkidle");
        const dimensions = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth
        }));
        assert.ok(dimensions.scroll <= dimensions.client + 1, `${role} déborde horizontalement.`);
        observations.push({ role, dimensions });
    };
    const open = async (role, url, email, form, destination) => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(`page:${error.message}`));
        page.on("console", message => {
            if (message.type() === "error") {
                const location = message.location();
                errors.push(`console:${message.text()}${location.url ? `@${location.url}` : ""}`);
            }
        });
        page.on("response", response => { if (response.status() === 404) errors.push(`404:${response.url()}`); });
        page.on("requestfailed", request => errors.push(`request:${request.url()}:${request.failure()?.errorText || "échec"}`));
        await page.goto(url);
        await page.locator(`${form} [name=email]`).fill(email);
        await page.locator(`${form} [name=motDePasse]`).fill(process.env.INTEGRATION_TEST_PASSWORD);
        await page.locator(form).evaluate(element => element.requestSubmit());
        try {
            if (destination.startsWith("url:"))
                await page.waitForURL(`**/${destination.slice(4)}`, { timeout: 15000 });
            else
                await page.locator(destination).waitFor({ state: "visible", timeout: 15000 });
        } catch (cause) {
            const messages = await page.locator(".message-erreur, .message, [role=status]")
                .allTextContents().catch(() => []);
            throw new Error(`${role} ne termine pas sa connexion : ${[...messages, ...errors].filter(Boolean).join(" | ") || "aucun diagnostic visible"}`, { cause });
        }
        await checkPage(page, `${role} desktop`);
        await page.setViewportSize({ width: 390, height: 844 });
        await checkPage(page, `${role} mobile`);
        assert.deepEqual(errors, [], `${role} produit des erreurs navigateur.`);
        await context.close();
    };

    try {
        if (!process.env.UI_ROLE || process.env.UI_ROLE === "admin") await open("Administrateur", "http://127.0.0.1:8080/index.html",
            process.env.INTEGRATION_TEST_EMAIL, "#formulaireConnexion", "url:dashboard.html");
        if (!process.env.UI_ROLE || process.env.UI_ROLE === "manager") await open("Manager", "http://127.0.0.1:8080/index.html",
            "qa.manager@prorecup.test", "#formulaireConnexion", "url:dashboard.html");
        if (!process.env.UI_ROLE || process.env.UI_ROLE === "client") await open("Client", "http://127.0.0.1:8080/portail-client/index.html",
            "qa.client@prorecup.test", "#formulaireConnexionClient", "url:portail-client/accueil.html");
        if (!process.env.UI_ROLE || process.env.UI_ROLE === "agent") await open("Agent", "http://127.0.0.1:8080/agent-app/index.html",
            "qa.agent@prorecup.test", "#form-connexion", "#ecran-application:not(.masque)");
        assert.equal(observations.length, process.env.UI_ROLE ? 2 : 8);
    } finally {
        await browser.close();
        await new Promise(resolve => staticServer.close(resolve));
        await new Promise(resolve => api.close(resolve));
        await pool.end();
    }
});
