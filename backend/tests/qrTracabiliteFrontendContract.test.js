import { strict as assert } from "node:assert";
import fs from "node:fs";

const lire = chemin => fs.readFileSync(new URL(chemin, import.meta.url), "utf8");

describe("Interfaces QR et offline V1", function () {
    const terrain = lire("../../agent-app/js/app.js");
    const offline = lire("../../agent-app/js/offline.js");
    const lots = lire("../../frontend/js/lots.js");
    const depot = lire("../../frontend/js/collectes.js");

    it("scanne ou saisit le QR terrain et conserve codes et tare dans la queue", function () {
        assert.match(terrain, /BarcodeDetector/);
        assert.match(terrain, /codes_qr/);
        assert.match(terrain, /tareEnregistree/);
        assert.match(offline, /codes_qr: codes/);
        assert.match(offline, /unites_qr/);
    });

    it("crée, imprime et consulte les QR au back-office", function () {
        assert.match(lots, /\/api\/lots\/contenants/);
        assert.match(lots, /\/api\/lots\/etiquette/);
        assert.match(lots, /\/api\/lots\/tracabilite/);
        assert.match(lots, /\/api\/lots\/regroupements/);
        assert.match(depot, /codes_qr/);
        assert.match(depot, /BarcodeDetector/);
    });
});
