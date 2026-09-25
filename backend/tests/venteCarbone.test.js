import { strict as assert } from "node:assert";

describe("Création d'une vente et impact carbone hors réseau", function () {
    let venteService;
    let pool;
    let venteRepository;
    let stockRepository;
    let mouvementStockRepository;
    let facteurCarboneRepository;
    let impactCarboneRepository;
    let originals;
    let state;

    before(async function () {
        process.env.SKIP_DATABASE_STARTUP_CHECK = "1";
        process.env.DATABASE_URL =
            process.env.DATABASE_URL ||
            "postgresql://test:test@127.0.0.1:5432/test";

        [
            { default: venteService },
            { default: pool },
            { default: venteRepository },
            { default: stockRepository },
            { default: mouvementStockRepository },
            { default: facteurCarboneRepository },
            { default: impactCarboneRepository }
        ] = await Promise.all([
            import("../src/services/VenteService.js"),
            import("../src/config/db.js"),
            import("../src/repositories/VenteRepository.js"),
            import("../src/repositories/StockRepository.js"),
            import("../src/repositories/MouvementStockRepository.js"),
            import("../src/repositories/FacteurCarboneRepository.js"),
            import("../src/repositories/ImpactCarboneRepository.js")
        ]);

        originals = {
            connect: pool.connect,
            creerVente: venteRepository.creer,
            trouverStock: stockRepository.trouverParIdPourMiseAJour,
            mettreAJourStock: stockRepository.mettreAJour,
            creerMouvement: mouvementStockRepository.creer,
            trouverFacteur: facteurCarboneRepository.trouverFacteurApplicable,
            trouverImpact: impactCarboneRepository.trouverParVenteId,
            creerImpact: impactCarboneRepository.creer
        };
    });

    beforeEach(function () {
        state = {
            commands: [],
            stockUpdates: [],
            movements: [],
            impacts: []
        };

        const client = {
            async query(sql) {
                state.commands.push(sql);
                return { rows: [], rowCount: 0 };
            },
            release() {
                state.released = true;
            }
        };

        pool.connect = async () => client;

        stockRepository.trouverParIdPourMiseAJour = async () => ({
            id: "stock-acier",
            organisation_id: "organisation-1",
            type_dechet_id: "type-acier",
            quantite: "20",
            unite: "kg"
        });

        venteRepository.creer = async vente => ({
            id: "vente-1",
            ...vente,
            date_vente: "2026-09-25T12:00:00.000Z"
        });

        stockRepository.mettreAJour = async (id, quantite) => {
            state.stockUpdates.push({ id, quantite });
            return { id, quantite };
        };

        mouvementStockRepository.creer = async donnees => {
            const mouvement = {
                id: "mouvement-1",
                ...donnees
            };
            state.movements.push(mouvement);
            return mouvement;
        };

        impactCarboneRepository.trouverParVenteId = async () => null;
        impactCarboneRepository.creer = async impact => {
            state.impacts.push(impact);
            return { id: "impact-1", ...impact };
        };
    });

    afterEach(function () {
        pool.connect = originals.connect;
        venteRepository.creer = originals.creerVente;
        stockRepository.trouverParIdPourMiseAJour = originals.trouverStock;
        stockRepository.mettreAJour = originals.mettreAJourStock;
        mouvementStockRepository.creer = originals.creerMouvement;
        facteurCarboneRepository.trouverFacteurApplicable = originals.trouverFacteur;
        impactCarboneRepository.trouverParVenteId = originals.trouverImpact;
        impactCarboneRepository.creer = originals.creerImpact;
    });

    const creerVente = () =>
        venteService.creer({
            organisation_id: "organisation-1",
            stock_id: "stock-acier",
            quantite: 7,
            prix_unitaire: 500,
            acheteur_nom: "Acheteur test",
            cree_par: "utilisateur-1"
        });

    it("commit la vente sans créer d'impact lorsqu'aucun facteur n'existe", async function () {
        facteurCarboneRepository.trouverFacteurApplicable = async () => null;

        const resultat = await creerVente();

        assert.equal(resultat.vente.montant_total, 3500);
        assert.deepEqual(state.stockUpdates, [
            { id: "stock-acier", quantite: 13 }
        ]);
        assert.deepEqual(state.movements, [
            {
                id: "mouvement-1",
                stock_id: "stock-acier",
                vente_id: "vente-1",
                lot_id: null,
                type_mouvement: "SORTIE",
                quantite: 7
            }
        ]);
        assert.equal(state.impacts.length, 0);
        assert.equal(resultat.impact_carbone, null);
        assert.deepEqual(resultat.avertissements, [
            {
                code: "CARBON_FACTOR_NOT_FOUND",
                message: "Impact carbone non calculé : aucun facteur carbone applicable."
            }
        ]);
        assert.deepEqual(state.commands, ["BEGIN", "COMMIT"]);
        assert.equal(state.released, true);
    });

    it("conserve le calcul et la création d'impact lorsqu'un facteur existe", async function () {
        facteurCarboneRepository.trouverFacteurApplicable = async () => ({
            id: "facteur-1",
            facteur_kg_co2e_par_kg: "0.75"
        });

        const resultat = await creerVente();

        assert.equal(state.impacts.length, 1);
        assert.deepEqual(state.impacts[0], {
            vente_id: "vente-1",
            facteur_carbone_id: "facteur-1",
            quantite_kg: 7,
            facteur_utilise: 0.75,
            co2e_estime_kg: 5.25
        });
        assert.equal(resultat.impact_carbone.co2e_estime_kg, 5.25);
        assert.deepEqual(resultat.avertissements, []);
        assert.deepEqual(state.commands, ["BEGIN", "COMMIT"]);
    });

    it("propage une erreur technique carbone et conserve le rollback", async function () {
        facteurCarboneRepository.trouverFacteurApplicable = async () => {
            throw new Error("Erreur SQL simulée");
        };

        await assert.rejects(
            () => creerVente(),
            /Erreur SQL simulée/
        );

        assert.deepEqual(state.commands, ["BEGIN", "ROLLBACK"]);
        assert.equal(state.impacts.length, 0);
        assert.equal(state.released, true);
    });
});
