import { strict as assert } from "node:assert";

describe("Nouveau lot ajouté à un stock legacy puis vendu hors réseau", function () {
    let stockService;
    let venteService;
    let pool;
    let stockRepository;
    let lotRepository;
    let mouvementStockRepository;
    let venteRepository;
    let venteLotRepository;
    let facteurCarboneRepository;
    let impactCarboneRepository;
    let originals;
    let state;

    before(async function () {
        process.env.SKIP_DATABASE_STARTUP_CHECK = "1";
        process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
        [
            { default: stockService },
            { default: venteService },
            { default: pool },
            { default: stockRepository },
            { default: lotRepository },
            { default: mouvementStockRepository },
            { default: venteRepository },
            { default: venteLotRepository },
            { default: facteurCarboneRepository },
            { default: impactCarboneRepository }
        ] = await Promise.all([
            import("../src/services/StockService.js"),
            import("../src/services/VenteService.js"),
            import("../src/config/db.js"),
            import("../src/repositories/StockRepository.js"),
            import("../src/repositories/LotRepository.js"),
            import("../src/repositories/MouvementStockRepository.js"),
            import("../src/repositories/VenteRepository.js"),
            import("../src/repositories/VenteLotRepository.js"),
            import("../src/repositories/FacteurCarboneRepository.js"),
            import("../src/repositories/ImpactCarboneRepository.js")
        ]);
        originals = {
            connect: pool.connect,
            stockType: stockRepository.trouverParTypeDechetPourMiseAJour,
            stockId: stockRepository.trouverParIdPourMiseAJour,
            stockUpdate: stockRepository.mettreAJour,
            lotEntree: lotRepository.trouverParIdPourEntree,
            lotLegacy: lotRepository.marquerQuantiteRestanteNonDeterminee,
            entreeExiste: mouvementStockRepository.existeEntreePourLot,
            mouvement: mouvementStockRepository.creer,
            vente: venteRepository.creer,
            complete: venteRepository.marquerProvenanceComplete,
            allocation: venteLotRepository.creer,
            facteur: facteurCarboneRepository.trouverFacteurApplicable,
            impactTrouver: impactCarboneRepository.trouverParVenteId,
            impactCreer: impactCarboneRepository.creer
        };
    });

    beforeEach(function () {
        state = {
            stock: {
                id: "stock-legacy",
                organisation_id: "organisation-1",
                type_dechet_id: "acier",
                quantite: 100,
                unite: "kg",
                tracabilite_lots_active: false
            },
            lot: {
                id: "lot-nouveau",
                organisation_id: "organisation-1",
                type_dechet_id: "acier",
                poids_reel: 20,
                quantite_restante_kg: 20,
                statut_lot: "en_stock"
            },
            mouvements: [],
            allocations: [],
            commandes: []
        };
        const client = {
            async query(sql) {
                state.commandes.push(sql);
                return { rows: [], rowCount: 0 };
            },
            release() {}
        };
        pool.connect = async () => client;
        stockRepository.trouverParTypeDechetPourMiseAJour = async () => state.stock;
        stockRepository.trouverParIdPourMiseAJour = async () => ({ ...state.stock });
        stockRepository.mettreAJour = async (id, quantite) => {
            state.stock.quantite = quantite;
            return { ...state.stock, id };
        };
        lotRepository.trouverParIdPourEntree = async () => state.lot;
        lotRepository.marquerQuantiteRestanteNonDeterminee = async () => {
            state.lot.quantite_restante_kg = null;
            return { ...state.lot };
        };
        mouvementStockRepository.existeEntreePourLot = async () => false;
        mouvementStockRepository.creer = async mouvement => {
            const cree = { id: `mouvement-${state.mouvements.length + 1}`, ...mouvement };
            state.mouvements.push(cree);
            return cree;
        };
        venteRepository.creer = async vente => ({ id: "vente-legacy", ...vente });
        venteRepository.marquerProvenanceComplete = async () => {
            throw new Error("Une vente legacy ne doit pas devenir complete.");
        };
        venteLotRepository.creer = async allocation => {
            state.allocations.push(allocation);
            return allocation;
        };
        facteurCarboneRepository.trouverFacteurApplicable = async () => null;
        impactCarboneRepository.trouverParVenteId = async () => null;
        impactCarboneRepository.creer = async impact => impact;
    });

    afterEach(function () {
        pool.connect = originals.connect;
        stockRepository.trouverParTypeDechetPourMiseAJour = originals.stockType;
        stockRepository.trouverParIdPourMiseAJour = originals.stockId;
        stockRepository.mettreAJour = originals.stockUpdate;
        lotRepository.trouverParIdPourEntree = originals.lotEntree;
        lotRepository.marquerQuantiteRestanteNonDeterminee = originals.lotLegacy;
        mouvementStockRepository.existeEntreePourLot = originals.entreeExiste;
        mouvementStockRepository.creer = originals.mouvement;
        venteRepository.creer = originals.vente;
        venteRepository.marquerProvenanceComplete = originals.complete;
        venteLotRepository.creer = originals.allocation;
        facteurCarboneRepository.trouverFacteurApplicable = originals.facteur;
        impactCarboneRepository.trouverParVenteId = originals.impactTrouver;
        impactCarboneRepository.creer = originals.impactCreer;
    });

    it("garde le lot indéterminé après une vente legacy non allouée", async function () {
        const stockApresEntree = await stockService.ajouterDansTransaction(
            "organisation-1",
            "acier",
            20,
            "lot-nouveau",
            {}
        );
        assert.equal(stockApresEntree.quantite, 120);
        assert.equal(stockApresEntree.tracabilite_lots_active, false);
        assert.equal(state.lot.quantite_restante_kg, null);

        const resultat = await venteService.creer({
            organisation_id: "organisation-1",
            stock_id: "stock-legacy",
            quantite: 15,
            prix_unitaire: 500,
            acheteur_nom: "Acheteur legacy"
        });

        assert.equal(state.stock.quantite, 105);
        assert.equal(state.lot.quantite_restante_kg, null);
        assert.equal(resultat.vente.provenance_lots_statut, "non_determinee");
        assert.equal(resultat.allocations_lots.length, 0);
        assert.equal(state.allocations.length, 0);
        assert.deepEqual(state.mouvements.map(item => [item.type_mouvement, item.quantite]), [
            ["ENTREE", 20],
            ["SORTIE", 15]
        ]);
    });
});
