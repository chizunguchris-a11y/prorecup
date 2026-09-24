import { strict as assert } from "node:assert";
import fs from "node:fs";

const lire = chemin => fs.readFileSync(new URL(chemin, import.meta.url), "utf8");

describe("Contrat SQL QR et traçabilité matière V1", function () {
    const migration = lire("../../database/migrations/20260924_04_qr_contenants_lots_tracabilite_v1.sql");
    const rollback = lire("../../database/rollbacks/20260924_04_qr_contenants_lots_tracabilite_v1.rollback.sql");

    it("réutilise lots et ajoute contenants, filiations, pesées et historique", function () {
        assert.match(migration, /ALTER TABLE lots/);
        for (const table of ["contenants", "lot_contenants", "pesees_unites", "tracabilite_matiere_evenements"])
            assert.match(migration, new RegExp(`CREATE TABLE ${table}`));
        assert.match(migration, /code_qr SET NOT NULL/);
        assert.match(migration, /organisation_id UUID NOT NULL/);
    });

    it("fournit un rollback symétrique", function () {
        for (const table of ["tracabilite_matiere_evenements", "pesees_unites", "lot_contenants", "contenants"])
            assert.match(rollback, new RegExp(`DROP TABLE IF EXISTS ${table}`));
        assert.match(rollback, /Rollback QR\/Lots refusé/);
        assert.doesNotMatch(rollback, /DELETE FROM lots/);
    });
});
