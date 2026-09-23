import { strict as assert } from "assert";
import { BalanceService } from "../src/services/BalanceService.js";
import { normaliserBalance } from "../src/services/BalanceRules.js";

describe("Administration des balances", function () {
    const organisationId = "11111111-1111-4111-8111-111111111111";
    const id = "22222222-2222-4222-8222-222222222222";
    const base = { numero_interne: " BAL-01 ", type: "numerique",
        capacite_max_kg: 150, precision_kg: 0.1,
        date_calibrage: "2026-09-01", prochain_calibrage: "2027-09-01" };

    it("normalise capacité, précision, calibrage et affectation exclusive", function () {
        assert.equal(normaliserBalance(base).numero_interne, "BAL-01");
        assert.throws(() => normaliserBalance({ ...base, precision_kg: 151 }), /MESURES_INVALIDES/);
        assert.throws(() => normaliserBalance({ ...base, tricycle_id: id, site_id: organisationId }), /AFFECTATION_DOUBLE/);
        assert.throws(() => normaliserBalance({ ...base, prochain_calibrage: "2026-08-01" }), /CALIBRAGE_INVALIDe/i);
    });

    it("crée active, modifie sans changer le statut et active/désactive", async function () {
        const appels = [];
        const repository = {
            affectationValide: async () => true,
            creer: async (org, donnees) => (appels.push(["creer", org, donnees]), { id, ...donnees }),
            trouver: async () => ({ id, statut: "active" }),
            modifier: async (balanceId, org, donnees) => (appels.push(["modifier", balanceId, org, donnees]), { id, statut: "active", ...donnees }),
            modifierStatut: async (balanceId, org, statut) => (appels.push(["statut", balanceId, org, statut]), { id, statut })
        };
        const service = new BalanceService(repository);
        assert.equal((await service.creer(organisationId, base)).statut, "active");
        assert.equal((await service.modifier(id, organisationId, { ...base, capacite_max_kg: 200 })).capacite_max_kg, 200);
        assert.equal((await service.modifierStatut(id, organisationId, "hors_service")).statut, "hors_service");
        assert.equal((await service.modifierStatut(id, organisationId, "active")).statut, "active");
        assert.deepEqual(appels.map(appel => appel[0]), ["creer", "modifier", "statut", "statut"]);
    });
});
