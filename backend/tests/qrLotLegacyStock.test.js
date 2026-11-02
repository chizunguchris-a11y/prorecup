import { strict as assert } from "node:assert";

describe("Réponse de création d'un lot QR selon le mode du stock hors réseau", function () {
    let service;
    let pool;
    let repository;
    let stockService;
    let originals;
    let stockTraceable;
    let commands;

    before(async function () {
        process.env.SKIP_DATABASE_STARTUP_CHECK = "1";
        process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
        [
            { default: service },
            { default: pool },
            { default: repository },
            { default: stockService }
        ] = await Promise.all([
            import("../src/services/TraceabiliteMatiereService.js"),
            import("../src/config/db.js"),
            import("../src/repositories/TraceabiliteMatiereRepository.js"),
            import("../src/services/StockService.js")
        ]);
        originals = {
            connect: pool.connect,
            lotOperation: repository.trouverLotParOperation,
            references: repository.verifierReferences,
            unites: repository.trouverUnitesParCodes,
            regrouper: repository.regrouperLot,
            ajouterStock: stockService.ajouterAuStock,
            origines: repository.originesPourMiseAJour,
            mesures: repository.mesuresContenants
        };
    });

    beforeEach(function () {
        commands = [];
        stockTraceable = false;
        pool.connect = async () => ({
            async query(sql) {
                commands.push(sql);
                return { rows: [], rowCount: 0 };
            },
            release() {}
        });
        repository.trouverLotParOperation = async () => null;
        repository.verifierReferences = async () => ({ site_ok: true });
        repository.trouverUnitesParCodes = async () => [{
            id: "contenant-1",
            nature: "contenant",
            code_qr: "PR-C-ABCDEF",
            statut: "recu_depot",
            site_courant_id: "00000000-0000-4000-8000-000000000002",
            type_dechet_id: "acier",
            collecte_origine_id: 'collecte-1',
            poids_courant: 20,
            tare_kg: 1
        }];
        repository.originesPourMiseAJour = async () => [{id:'collecte-1',statut:'valide',poids_reel:20,type_dechet_id:'acier',deja_loti_kg:0}];
        repository.mesuresContenants = async () => [{id:'contenant-1',collecte_id:'collecte-1',poids_net:20,tare:1,date_heure:'2026-09-22T08:00:00Z'}];
        repository.regrouperLot = async donnees => ({
            id: "lot-1",
            code_qr: donnees.code_qr,
            poids_reel: donnees.poids_reel,
            quantite_restante_kg: donnees.poids_reel,
            statut_lot: "en_stock"
        });
        stockService.ajouterAuStock = async () => ({
            id: "stock-1",
            quantite: 120,
            tracabilite_lots_active: stockTraceable
        });
    });

    afterEach(function () {
        pool.connect = originals.connect;
        repository.trouverLotParOperation = originals.lotOperation;
        repository.verifierReferences = originals.references;
        repository.trouverUnitesParCodes = originals.unites;
        repository.regrouperLot = originals.regrouper;
        stockService.ajouterAuStock = originals.ajouterStock;
        repository.originesPourMiseAJour = originals.origines;
        repository.mesuresContenants = originals.mesures;
    });

    const regrouper = () => service.regrouper(
        "organisation-1",
        "utilisateur-1",
        {
            operation_id: "00000000-0000-4000-8000-000000000001",
            site_id: "00000000-0000-4000-8000-000000000002",
            codes_qr: ["PR-C-ABCDEF"],
            code_qr: "PR-L-ABCDEF",
            poids_reel: 20
        }
    );

    it("retourne NULL comme quantité restante lorsque le stock reste legacy", async function () {
        const lot = await regrouper();
        assert.equal(lot.quantite_restante_kg, null);
        assert.equal(commands[0], 'BEGIN');assert.equal(commands.at(-1),'COMMIT');
        assert.ok(commands.some(sql => sql.includes('pg_advisory_xact_lock')));
    });

    it("conserve le poids initial comme reste certifié pour un stock neuf traçable", async function () {
        stockTraceable = true;
        const lot = await regrouper();
        assert.equal(lot.quantite_restante_kg, 20);
        assert.equal(commands[0], 'BEGIN');assert.equal(commands.at(-1),'COMMIT');
        assert.ok(commands.some(sql => sql.includes('pg_advisory_xact_lock')));
    });
});
