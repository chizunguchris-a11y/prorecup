import { strict as assert } from "assert";
import fs from "node:fs";

describe("Contrat SQL pesée et re-pesée", function () {
    const migration = fs.readFileSync(new URL("../../database/migrations/20260923_03_pesees_tracabilite_v1.sql", import.meta.url), "utf8");
    const repository = fs.readFileSync(new URL("../src/repositories/PeseeRepository.js", import.meta.url), "utf8");
    const collectes = fs.readFileSync(new URL("../src/repositories/CollecteRepository.js", import.meta.url), "utf8");
    const preuves = fs.readFileSync(new URL("../src/services/TerrainPreuveService.js", import.meta.url), "utf8");
    const finCollecte = fs.readFileSync(new URL("../src/services/TerrainCollecteService.js", import.meta.url), "utf8");

    it("conserve les pesées immuables et relie la correction à la mesure remplacée", function () {
        assert.match(migration, /remplace_pesee_id UUID REFERENCES pesees\(id\)/);
        assert.match(repository, /INSERT INTO pesees/);
        assert.doesNotMatch(repository, /UPDATE pesees\s+SET\s+(?!preuve_id)/s);
        assert.match(repository, /remplace_pesee_id/);
    });

    it("calcule l'état courant et l'écart avec un ordre déterministe", function () {
        assert.match(collectes, /ORDER BY date_heure DESC, cree_le DESC, id DESC LIMIT 1/g);
        assert.match(collectes, /ABS\(pd\.poids_net - pt\.poids_net\).* > \$2/s);
    });

    it("préserve poids_reel et lie ticket_balance par operation_id", function () {
        assert.match(repository, /UPDATE collectes[\s\S]*poids_reel = \$1/);
        assert.match(preuves, /typePreuve === "ticket_balance"[\s\S]*pesee_operation_id/);
        assert.match(preuves, /lierPreuveParOperation/);
        assert.match(finCollecte, /trouverDerniere\([\s\S]*"terrain"/);
        assert.match(finCollecte, /doit correspondre à la dernière pesée terrain/);
    });

    it("filtre les balances selon l'usage terrain ou dépôt", function () {
        assert.match(repository, /\$2 = 'terrain' AND site_id IS NULL/);
        assert.match(repository, /\$2 = 'depot' AND tricycle_id IS NULL/);
    });
});
