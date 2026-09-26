import { strict as assert } from "node:assert";

describe("Entrées de stock et activation de la traçabilité lots hors réseau", function () {
    let service;
    let stockRepository;
    let lotRepository;
    let mouvementStockRepository;
    let mouvementStockService;
    let originals;
    let state;

    before(async function () {
        process.env.SKIP_DATABASE_STARTUP_CHECK = "1";
        process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
        [
            { default: service },
            { default: stockRepository },
            { default: lotRepository },
            { default: mouvementStockRepository },
            { default: mouvementStockService }
        ] = await Promise.all([
            import("../src/services/StockService.js"),
            import("../src/repositories/StockRepository.js"),
            import("../src/repositories/LotRepository.js"),
            import("../src/repositories/MouvementStockRepository.js"),
            import("../src/services/MouvementStockService.js")
        ]);
        originals = {
            trouverLot: lotRepository.trouverParIdPourEntree,
            sommeLots: lotRepository.sommeQuantitesRestantes,
            marquerLotLegacy: lotRepository.marquerQuantiteRestanteNonDeterminee,
            entreeExiste: mouvementStockRepository.existeEntreePourLot,
            trouverStock: stockRepository.trouverParTypeDechetPourMiseAJour,
            creerStock: stockRepository.creer,
            majStock: stockRepository.mettreAJour,
            entree: mouvementStockService.enregistrerEntree
        };
    });

    beforeEach(function () {
        state = {
            lot: {
                id: "lot-1",
                organisation_id: "organisation-1",
                type_dechet_id: "acier",
                poids_reel: 20,
                quantite_restante_kg: 20,
                statut_lot: "en_stock"
            },
            stock: null,
            creation: null,
            mouvements: []
        };
        lotRepository.trouverParIdPourEntree = async () => state.lot;
        lotRepository.sommeQuantitesRestantes = async () => ({
            total: state.lot.quantite_restante_kg || 0,
            lots_non_initialises: state.lot.quantite_restante_kg === null ? 1 : 0,
            lots_statuts_inconnus: 0
        });
        lotRepository.marquerQuantiteRestanteNonDeterminee = async () => {
            state.lot.quantite_restante_kg = null;
            return state.lot;
        };
        mouvementStockRepository.existeEntreePourLot = async () => false;
        stockRepository.trouverParTypeDechetPourMiseAJour = async () => state.stock;
        stockRepository.creer = async (organisationId, typeDechetId, quantite, active) => {
            state.creation = { organisationId, typeDechetId, quantite, active };
            state.stock = {
                id: "stock-1",
                organisation_id: organisationId,
                type_dechet_id: typeDechetId,
                quantite,
                tracabilite_lots_active: active
            };
            return state.stock;
        };
        stockRepository.mettreAJour = async (id, quantite) => ({ ...state.stock, id, quantite });
        mouvementStockService.enregistrerEntree = async (stockId, lotId, quantite) => {
            state.mouvements.push({ stockId, lotId, quantite });
        };
    });

    afterEach(function () {
        lotRepository.trouverParIdPourEntree = originals.trouverLot;
        lotRepository.sommeQuantitesRestantes = originals.sommeLots;
        lotRepository.marquerQuantiteRestanteNonDeterminee = originals.marquerLotLegacy;
        mouvementStockRepository.existeEntreePourLot = originals.entreeExiste;
        stockRepository.trouverParTypeDechetPourMiseAJour = originals.trouverStock;
        stockRepository.creer = originals.creerStock;
        stockRepository.mettreAJour = originals.majStock;
        mouvementStockService.enregistrerEntree = originals.entree;
    });

    it("active un stock neuf créé intégralement depuis un lot neuf", async function () {
        const stock = await service.ajouterDansTransaction(
            "organisation-1", "acier", 20, "lot-1", {}
        );
        assert.equal(state.creation.active, true);
        assert.equal(stock.tracabilite_lots_active, true);
        assert.deepEqual(state.mouvements, [{ stockId: "stock-1", lotId: "lot-1", quantite: 20 }]);
    });

    it("laisse false un stock legacy qui reçoit un nouveau lot", async function () {
        state.stock = {
            id: "stock-legacy",
            organisation_id: "organisation-1",
            type_dechet_id: "acier",
            quantite: 10,
            tracabilite_lots_active: false
        };
        const stock = await service.ajouterDansTransaction(
            "organisation-1", "acier", 20, "lot-1", {}
        );
        assert.equal(stock.tracabilite_lots_active, false);
        assert.equal(stock.quantite, 30);
        assert.equal(state.lot.quantite_restante_kg, null);
    });

    it("n'active pas un stock neuf si un lot historique non initialisé existe", async function () {
        lotRepository.sommeQuantitesRestantes = async () => ({
            total: 20,
            lots_non_initialises: 1,
            lots_statuts_inconnus: 0
        });
        const stock = await service.ajouterDansTransaction(
            "organisation-1", "acier", 20, "lot-1", {}
        );
        assert.equal(state.creation.active, false);
        assert.equal(stock.tracabilite_lots_active, false);
        assert.equal(state.lot.quantite_restante_kg, null);
    });

    it("n'active pas un stock neuf si un statut de lot est inconnu", async function () {
        lotRepository.sommeQuantitesRestantes = async () => ({
            total: 20,
            lots_non_initialises: 0,
            lots_statuts_inconnus: 1
        });
        const stock = await service.ajouterDansTransaction(
            "organisation-1", "acier", 20, "lot-1", {}
        );
        assert.equal(stock.tracabilite_lots_active, false);
        assert.equal(state.lot.quantite_restante_kg, null);
    });

    it("n'active pas un stock neuf si la somme des lots diffère du stock", async function () {
        lotRepository.sommeQuantitesRestantes = async () => ({
            total: 19,
            lots_non_initialises: 0,
            lots_statuts_inconnus: 0
        });
        const stock = await service.ajouterDansTransaction(
            "organisation-1", "acier", 20, "lot-1", {}
        );
        assert.equal(stock.tracabilite_lots_active, false);
        assert.equal(state.lot.quantite_restante_kg, null);
    });

    it("refuse une entrée manuelle incohérente sur un stock actif", async function () {
        state.stock = {
            id: "stock-actif",
            organisation_id: "organisation-1",
            type_dechet_id: "acier",
            quantite: 10,
            tracabilite_lots_active: true
        };
        await assert.rejects(
            () => service.ajouterDansTransaction("organisation-1", "acier", 5, "lot-1", {}),
            /stock traçable n'accepte/
        );
        assert.equal(state.mouvements.length, 0);
    });

    it("refuse un lot d'une autre matière", async function () {
        state.lot.type_dechet_id = "cuivre";
        await assert.rejects(
            () => service.ajouterDansTransaction("organisation-1", "acier", 20, "lot-1", {}),
            /matière du lot ne correspond pas/
        );
    });

    it("refuse une seconde entrée du même lot", async function () {
        mouvementStockRepository.existeEntreePourLot = async () => true;
        await assert.rejects(
            () => service.ajouterDansTransaction("organisation-1", "acier", 20, "lot-1", {}),
            /déjà une entrée en stock/
        );
    });
});
