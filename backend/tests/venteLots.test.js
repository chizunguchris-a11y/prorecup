import { strict as assert } from "node:assert";

describe("Allocations FIFO d'une vente hors réseau", function () {
    let venteService;
    let pool;
    let venteRepository;
    let venteLotRepository;
    let stockRepository;
    let lotRepository;
    let mouvementStockRepository;
    let facteurCarboneRepository;
    let impactCarboneRepository;
    let originals;
    let state;

    before(async function () {
        process.env.SKIP_DATABASE_STARTUP_CHECK = "1";
        process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
        [
            { default: venteService },
            { default: pool },
            { default: venteRepository },
            { default: venteLotRepository },
            { default: stockRepository },
            { default: lotRepository },
            { default: mouvementStockRepository },
            { default: facteurCarboneRepository },
            { default: impactCarboneRepository }
        ] = await Promise.all([
            import("../src/services/VenteService.js"),
            import("../src/config/db.js"),
            import("../src/repositories/VenteRepository.js"),
            import("../src/repositories/VenteLotRepository.js"),
            import("../src/repositories/StockRepository.js"),
            import("../src/repositories/LotRepository.js"),
            import("../src/repositories/MouvementStockRepository.js"),
            import("../src/repositories/FacteurCarboneRepository.js"),
            import("../src/repositories/ImpactCarboneRepository.js")
        ]);

        originals = {
            connect: pool.connect,
            creerVente: venteRepository.creer,
            marquerComplete: venteRepository.marquerProvenanceComplete,
            trouverStock: stockRepository.trouverParIdPourMiseAJour,
            mettreAJourStock: stockRepository.mettreAJour,
            listerLots: lotRepository.listerDisponiblesFifoPourMiseAJour,
            decrementerLot: lotRepository.decrementerQuantiteRestante,
            sommeLots: lotRepository.sommeQuantitesRestantes,
            creerAllocation: venteLotRepository.creer,
            sommeAllocations: venteLotRepository.sommeParVente,
            creerMouvement: mouvementStockRepository.creer,
            trouverFacteur: facteurCarboneRepository.trouverFacteurApplicable,
            trouverImpact: impactCarboneRepository.trouverParVenteId,
            creerImpact: impactCarboneRepository.creer
        };
    });

    beforeEach(function () {
        state = {
            commands: [],
            stock: {
                id: "stock-acier",
                organisation_id: "organisation-1",
                type_dechet_id: "type-acier",
                quantite: 20,
                unite: "kg",
                tracabilite_lots_active: true
            },
            lots: [{
                id: "lot-a",
                code_qr: "PR-L-LOT-A",
                organisation_id: "organisation-1",
                type_dechet_id: "type-acier",
                poids_reel: 20,
                quantite_restante_kg: 20,
                statut_lot: "en_stock",
                date_entree_stock: "2026-09-25T10:00:00Z"
            }],
            allocations: [],
            mouvements: [],
            ventes: [],
            contenants: [{ id: "sac-1", statut: "dans_lot", poids_courant_kg: 20 }]
        };

        let sauvegardeTransaction;
        const client = {
            async query(sql) {
                state.commands.push(sql);
                if (sql === "BEGIN") {
                    sauvegardeTransaction = structuredClone({
                        stock: state.stock,
                        lots: state.lots,
                        allocations: state.allocations,
                        mouvements: state.mouvements,
                        ventes: state.ventes
                    });
                }
                if (sql === "ROLLBACK" && sauvegardeTransaction) {
                    state.stock = sauvegardeTransaction.stock;
                    state.lots = sauvegardeTransaction.lots;
                    state.allocations = sauvegardeTransaction.allocations;
                    state.mouvements = sauvegardeTransaction.mouvements;
                    state.ventes = sauvegardeTransaction.ventes;
                }
                return { rows: [], rowCount: 0 };
            },
            release() {
                state.released = true;
            }
        };
        pool.connect = async () => client;
        stockRepository.trouverParIdPourMiseAJour = async () => ({ ...state.stock });
        stockRepository.mettreAJour = async (id, quantite) => {
            state.stock.quantite = quantite;
            return { ...state.stock, id };
        };
        lotRepository.listerDisponiblesFifoPourMiseAJour = async () =>
            state.lots.filter(lot => lot.quantite_restante_kg > 0);
        lotRepository.decrementerQuantiteRestante = async (id, organisationId, quantite) => {
            const lot = state.lots.find(item => item.id === id && item.organisation_id === organisationId);
            if (!lot || lot.quantite_restante_kg < quantite) return null;
            lot.quantite_restante_kg = Number((lot.quantite_restante_kg - quantite).toFixed(3));
            lot.statut_lot = lot.quantite_restante_kg === 0
                ? "vendu"
                : lot.quantite_restante_kg < lot.poids_reel
                    ? "partiellement_vendu"
                    : "en_stock";
            return { ...lot };
        };
        lotRepository.sommeQuantitesRestantes = async () => ({
            total: state.lots
                .filter(lot => lot.statut_lot !== "transforme")
                .reduce((total, lot) => total + Number(lot.quantite_restante_kg || 0), 0),
            lots_non_initialises: state.lots.filter(lot =>
                lot.statut_lot !== "transforme" && lot.quantite_restante_kg === null
            ).length,
            lots_statuts_inconnus: state.lots.filter(lot =>
                !["en_stock", "partiellement_vendu", "vendu", "transforme"].includes(lot.statut_lot)
            ).length
        });
        venteRepository.creer = async vente => {
            const creee = { id: "vente-1", ...vente };
            state.ventes.push(creee);
            return creee;
        };
        venteRepository.marquerProvenanceComplete = async id => {
            const creee = state.ventes.find(item => item.id === id);
            creee.provenance_lots_statut = "complete";
            return { ...creee };
        };
        venteLotRepository.creer = async allocation => {
            const creee = { id: `allocation-${state.allocations.length + 1}`, ...allocation };
            state.allocations.push(creee);
            return creee;
        };
        venteLotRepository.sommeParVente = async venteId => state.allocations
            .filter(item => item.vente_id === venteId)
            .reduce((total, item) => total + item.quantite_kg, 0);
        mouvementStockRepository.creer = async mouvement => {
            const cree = { id: "mouvement-1", ...mouvement };
            state.mouvements.push(cree);
            return cree;
        };
        facteurCarboneRepository.trouverFacteurApplicable = async () => null;
        impactCarboneRepository.trouverParVenteId = async () => null;
        impactCarboneRepository.creer = async impact => impact;
    });

    afterEach(function () {
        pool.connect = originals.connect;
        venteRepository.creer = originals.creerVente;
        venteRepository.marquerProvenanceComplete = originals.marquerComplete;
        stockRepository.trouverParIdPourMiseAJour = originals.trouverStock;
        stockRepository.mettreAJour = originals.mettreAJourStock;
        lotRepository.listerDisponiblesFifoPourMiseAJour = originals.listerLots;
        lotRepository.decrementerQuantiteRestante = originals.decrementerLot;
        lotRepository.sommeQuantitesRestantes = originals.sommeLots;
        venteLotRepository.creer = originals.creerAllocation;
        venteLotRepository.sommeParVente = originals.sommeAllocations;
        mouvementStockRepository.creer = originals.creerMouvement;
        facteurCarboneRepository.trouverFacteurApplicable = originals.trouverFacteur;
        impactCarboneRepository.trouverParVenteId = originals.trouverImpact;
        impactCarboneRepository.creer = originals.creerImpact;
    });

    const creer = (quantite = 7) => venteService.creer({
        organisation_id: "organisation-1",
        stock_id: "stock-acier",
        quantite,
        prix_unitaire: 500,
        acheteur_nom: "Acheteur test",
        cree_par: "utilisateur-1"
    });

    it("alloue 7 kg sur un lot de 20 et laisse 13 kg", async function () {
        const contenantsAvant = structuredClone(state.contenants);
        const resultat = await creer(7);

        assert.equal(state.stock.quantite, 13);
        assert.equal(state.lots[0].quantite_restante_kg, 13);
        assert.equal(state.lots[0].statut_lot, "partiellement_vendu");
        assert.deepEqual(state.allocations.map(item => item.quantite_kg), [7]);
        assert.equal(resultat.vente.provenance_lots_statut, "complete");
        assert.equal(resultat.impact_carbone, null);
        assert.equal(resultat.avertissements[0].code, "CARBON_FACTOR_NOT_FOUND");
        assert.deepEqual(state.contenants, contenantsAvant);
        assert.deepEqual(state.commands, ["BEGIN", "COMMIT"]);
    });

    it("épuise un lot vendu intégralement", async function () {
        await creer(20);
        assert.equal(state.lots[0].quantite_restante_kg, 0);
        assert.equal(state.lots[0].statut_lot, "vendu");
        assert.equal(state.stock.quantite, 0);
    });

    it("répartit 12 kg en FIFO sur 5 puis 7 kg", async function () {
        state.stock.quantite = 30;
        state.lots = [
            { ...state.lots[0], id: "lot-a", poids_reel: 5, quantite_restante_kg: 5 },
            { ...state.lots[0], id: "lot-b", poids_reel: 10, quantite_restante_kg: 10 },
            { ...state.lots[0], id: "lot-c", poids_reel: 15, quantite_restante_kg: 15 }
        ];
        await creer(12);
        assert.deepEqual(state.allocations.map(item => [item.lot_id, item.quantite_kg]), [
            ["lot-a", 5],
            ["lot-b", 7]
        ]);
        assert.deepEqual(state.lots.map(item => item.quantite_restante_kg), [0, 3, 15]);
    });

    it("refuse une divergence entre stock agrégé et lots", async function () {
        state.stock.quantite = 21;
        await assert.rejects(() => creer(7), /Stock traçable incohérent/);
        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
        assert.equal(state.allocations.length, 0);
    });

    it("refuse un stock actif contenant une quantité restante NULL", async function () {
        state.lots[0].quantite_restante_kg = null;
        await assert.rejects(() => creer(7), /lots non réconciliés/);
        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
        assert.equal(state.allocations.length, 0);
        assert.equal(state.ventes.length, 0);
    });

    it("refuse un stock actif contenant un statut de lot inconnu", async function () {
        state.lots[0].statut_lot = "inconnu";
        await assert.rejects(() => creer(7), /lots non réconciliés/);
        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
        assert.equal(state.allocations.length, 0);
        assert.equal(state.ventes.length, 0);
    });

    it("rollback toute la transaction si une allocation échoue", async function () {
        venteLotRepository.creer = async () => {
            throw new Error("Erreur allocation simulée");
        };
        await assert.rejects(() => creer(7), /Erreur allocation simulée/);
        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
        assert.equal(state.stock.quantite, 20);
        assert.equal(state.lots[0].quantite_restante_kg, 20);
        assert.equal(state.mouvements.length, 0);
        assert.equal(state.ventes.length, 0);
    });

    it("rollback une allocation multi-lots si la seconde insertion échoue", async function () {
        state.stock.quantite = 15;
        state.lots = [
            { ...state.lots[0], id: "lot-a", poids_reel: 5, quantite_restante_kg: 5 },
            { ...state.lots[0], id: "lot-b", poids_reel: 10, quantite_restante_kg: 10 }
        ];
        let appels = 0;
        venteLotRepository.creer = async allocation => {
            appels += 1;
            if (appels === 2) throw new Error("Seconde allocation refusée");
            const creee = { id: "allocation-1", ...allocation };
            state.allocations.push(creee);
            return creee;
        };

        await assert.rejects(() => creer(12), /Seconde allocation refusée/);
        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
        assert.deepEqual(state.lots.map(item => item.quantite_restante_kg), [5, 10]);
        assert.equal(state.allocations.length, 0);
        assert.equal(state.ventes.length, 0);
        assert.equal(state.stock.quantite, 15);
    });

    it("conserve le mode legacy sans allocation fictive", async function () {
        state.stock.tracabilite_lots_active = false;
        state.lots = [];
        const resultat = await creer(7);
        assert.equal(state.stock.quantite, 13);
        assert.equal(state.allocations.length, 0);
        assert.equal(resultat.vente.provenance_lots_statut, "non_determinee");
    });

    it("rollback allocations et lots sur une vraie erreur carbone", async function () {
        facteurCarboneRepository.trouverFacteurApplicable = async () => {
            throw new Error("Erreur SQL carbone simulée");
        };
        await assert.rejects(() => creer(7), /Erreur SQL carbone simulée/);
        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
        assert.equal(state.stock.quantite, 20);
        assert.equal(state.lots[0].quantite_restante_kg, 20);
        assert.equal(state.allocations.length, 0);
        assert.equal(state.mouvements.length, 0);
        assert.equal(state.ventes.length, 0);
    });

    it("rollback sans créer de vente lorsque le stock est insuffisant", async function () {
        state.stock.quantite = 6;
        state.lots[0].poids_reel = 6;
        state.lots[0].quantite_restante_kg = 6;
        await assert.rejects(() => creer(7), /Stock insuffisant/);
        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
        assert.equal(state.ventes.length, 0);
        assert.equal(state.allocations.length, 0);
    });

    it("refuse une quantité de lots insuffisante même si le stock annonce davantage", async function () {
        state.lots[0].quantite_restante_kg = 6;
        await assert.rejects(() => creer(7), /Stock traçable incohérent/);
        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
    });
});
