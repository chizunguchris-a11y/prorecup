import { strict as assert } from "assert";
import fs from "node:fs";

const lire = chemin => fs.readFileSync(new URL(chemin, import.meta.url), "utf8");

describe("Interfaces pesée et balances", function () {
    const balancesHtml = lire("../../frontend/balances.html");
    const balancesJs = lire("../../frontend/js/balances.js");
    const collectesHtml = lire("../../frontend/collectes.html");
    const collectesJs = lire("../../frontend/js/collectes.js");
    const terrainJs = lire("../../agent-app/js/app.js");
    const offlineJs = lire("../../agent-app/js/offline.js");

    it("expose la gestion capacité, précision, calibrage, affectation et statut", function () {
        for (const champ of ["capacite_max_kg", "precision_kg", "date_calibrage",
            "prochain_calibrage", "type_affectation", "affectation_id"])
            assert.match(balancesHtml, new RegExp(`id="${champ}"`));
        assert.match(balancesJs, /\/api\/balances/);
        assert.match(balancesJs, /\/statut/);
    });

    it("permet la pesée et re-pesée dépôt avec une nouvelle operation_id", function () {
        assert.match(collectesHtml, /id="formulairePeseeDepot"/);
        assert.match(collectesJs, /Re-peser au dépôt/);
        assert.match(collectesJs, /operation_id: crypto\.randomUUID\(\)/);
    });

    it("propose une correction terrain et garde une seule mesure locale courante", function () {
        assert.match(terrainJs, /Corriger la pesée/);
        assert.match(terrainJs, /action: "enregistrer_pesee"/);
        assert.match(offlineJs, /p\.est_courante = false/);
        assert.match(offlineJs, /est_courante: true/);
    });

    it("envoie l'instant terrain ISO sous survenu_le et le mappe explicitement côté API", function () {
        const controller = lire("../src/controllers/TerrainPeseeController.js");
        assert.match(terrainJs, /const instantAction = new Date\(\)\.toISOString\(\)/);
        assert.match(offlineJs, /dateKey = photo\(type\) \? 'pris_le' : 'survenu_le'/);
        assert.match(controller, /date_heure: req\.body\?\.survenu_le/);
    });
});
