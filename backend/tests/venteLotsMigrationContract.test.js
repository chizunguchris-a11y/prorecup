import { strict as assert } from "node:assert";
import fs from "node:fs";

const lire = chemin => fs.readFileSync(new URL(chemin, import.meta.url), "utf8");

describe("Contrat SQL allocations ventes/lots", function () {
    const migration = lire("../../database/migrations/20260926_05_ventes_lots_fifo_v1.sql");
    const rollback = lire("../../database/rollbacks/20260926_05_ventes_lots_fifo_v1.rollback.sql");

    it("est additive et ne fabrique aucune provenance historique", function () {
        assert.match(migration, /CREATE TABLE vente_lots/);
        assert.match(migration, /ADD COLUMN quantite_restante_kg/);
        assert.match(migration, /provenance_lots_statut/);
        assert.match(migration, /tracabilite_lots_active BOOLEAN NOT NULL DEFAULT FALSE/);
        assert.doesNotMatch(migration, /UPDATE\s+lots/i);
        assert.doesNotMatch(migration, /UPDATE\s+ventes/i);
        assert.doesNotMatch(migration, /INSERT\s+INTO\s+vente_lots\s+SELECT/i);
    });

    it("protège les organisations, matières et invariants", function () {
        assert.match(migration, /FOREIGN KEY \(organisation_id, vente_id\)/);
        assert.match(migration, /FOREIGN KEY \(organisation_id, lot_id\)/);
        assert.match(migration, /La matière du lot ne correspond pas/);
        assert.match(migration, /DEFERRABLE INITIALLY DEFERRED/);
        assert.match(migration, /Allocations incomplètes/);
        assert.match(migration, /provenance non déterminée ne peut pas porter d''allocation/);
        assert.match(migration, /Stock traçable incohérent/);
        assert.match(migration, /sans mouvement ENTREE/);
        assert.match(migration, /IS DISTINCT FROM 'transforme'/);
        assert.match(migration, /avec un statut inconnu/);
        assert.match(migration, /autre organisation ou matière/);
        assert.match(migration, /CREATE UNIQUE INDEX mouvements_stock_entree_lot_unique_idx/);
        assert.match(migration, /lots_quantite_statut_coherent/);
    });

    it("fournit un rollback qui refuse la perte de données actives", function () {
        assert.match(rollback, /Rollback ventes\/lots refusé/);
        assert.match(rollback, /EXISTS \(SELECT 1 FROM vente_lots\)/);
        assert.match(rollback, /provenance_lots_statut = 'complete'/);
        assert.match(rollback, /tracabilite_lots_active IS TRUE/);
        assert.match(rollback, /quantite_restante_kg IS NOT NULL/);
        assert.doesNotMatch(rollback, /DELETE FROM/);
    });
});
