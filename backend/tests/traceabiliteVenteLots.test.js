import { strict as assert } from "node:assert";

describe("Reconstruction backend lot vers ventes hors réseau", function () {
    let service;
    let traceRepository;
    let venteLotRepository;
    let originals;

    before(async function () {
        process.env.SKIP_DATABASE_STARTUP_CHECK = "1";
        process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
        [
            { default: service },
            { default: traceRepository },
            { default: venteLotRepository }
        ] = await Promise.all([
            import("../src/services/TraceabiliteMatiereService.js"),
            import("../src/repositories/TraceabiliteMatiereRepository.js"),
            import("../src/repositories/VenteLotRepository.js")
        ]);
        originals = {
            historique: traceRepository.historique,
            contenants: traceRepository.listerContenantsLot,
            ventes: venteLotRepository.listerParLot
        };
    });

    afterEach(function () {
        traceRepository.historique = originals.historique;
        traceRepository.listerContenantsLot = originals.contenants;
        venteLotRepository.listerParLot = originals.ventes;
    });

    it("retourne poids initial, quantité restante, filiation et ventes allouées", async function () {
        traceRepository.historique = async () => [{
            nature: "lot",
            id: "lot-1",
            code_qr: "PR-L-ABCDEF",
            poids_initial: "20",
            quantite_restante_kg: "13",
            type_evenement: "creation"
        }];
        traceRepository.listerContenantsLot = async () => [{
            id: "contenant-1",
            code_qr: "PR-C-ABCDEF"
        }];
        venteLotRepository.listerParLot = async () => [{
            vente_id: "vente-1",
            quantite_kg: "7",
            reference_vente: "VTE-TEST-QRLOTS-V1",
            acheteur_nom: "Acheteur X"
        }];

        const resultat = await service.historique("organisation-1", "PR-L-ABCDEF");
        assert.equal(Number(resultat.unite.poids_initial), 20);
        assert.equal(Number(resultat.unite.quantite_restante_kg), 13);
        assert.equal(resultat.filiation[0].code_qr, "PR-C-ABCDEF");
        assert.deepEqual(resultat.ventes.map(item => ({
            reference: item.reference_vente,
            quantite: Number(item.quantite_kg),
            acheteur: item.acheteur_nom
        })), [{
            reference: "VTE-TEST-QRLOTS-V1",
            quantite: 7,
            acheteur: "Acheteur X"
        }]);
    });
});
