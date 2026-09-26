import { strict as assert } from "node:assert";
import fs from "node:fs";

const lire = chemin => fs.readFileSync(new URL(chemin, import.meta.url), "utf8");

describe("Contrat backend de traçabilité vente/lot", function () {
    const lotRepository = lire("../src/repositories/LotRepository.js");
    const traceRepository = lire("../src/repositories/TraceabiliteMatiereRepository.js");
    const venteRepository = lire("../src/repositories/VenteRepository.js");
    const traceService = lire("../src/services/TraceabiliteMatiereService.js");
    const lotService = lire("../src/services/LotService.js");

    it("utilise la première entrée en stock puis l'UUID pour le FIFO", function () {
        assert.match(lotRepository, /MIN\(ms\.date_mouvement\) AS date_entree_stock/);
        assert.match(lotRepository, /ORDER BY entree\.date_entree_stock ASC, l\.id ASC/);
        assert.doesNotMatch(lotRepository, /SKIP LOCKED/);
        assert.match(lotRepository, /FOR UPDATE OF l/);
    });

    it("filtre strictement les lots par organisation et matière", function () {
        assert.match(lotRepository, /l\.organisation_id = \$1/);
        assert.match(lotRepository, /l\.type_dechet_id = \$3/);
    });

    it("expose les allocations d'une vente et les ventes d'un lot", function () {
        assert.match(venteRepository, /allocations_lots/);
        assert.match(venteRepository, /LEFT JOIN LATERAL/);
        assert.match(venteRepository, /COALESCE\(provenance\.allocations, '\[\]'::json\)/);
        assert.match(traceService, /venteLotRepository\.listerParLot/);
    });

    it("initialise les nouveaux lots sans backfill des anciens", function () {
        assert.match(lotRepository, /VALUES \(\$1, \$2, \$3, \$3, \$4/);
        assert.match(traceRepository, /poids_reel,quantite_restante_kg/);
        assert.match(traceRepository, /VALUES \(\$1,NULL,\$2,\$3,\$3,'en_stock'/);
        assert.match(traceService, /lot\.quantite_restante_kg = null/);
        assert.match(lotService, /nouveauLot\.quantite_restante_kg = null/);
    });
});
