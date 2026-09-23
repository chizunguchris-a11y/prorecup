import { strict as assert } from "assert";
import { calculerEcartRelatif, calculerPoidsNet, doitSuperseder, normaliserInstantIso, respectePrecision }
    from "../src/services/PeseeRules.js";

describe("Règles de pesée V1", function () {
    it("calcule le poids net sans dérive flottante", function () {
        assert.equal(calculerPoidsNet(12.3, 0.2), 12.1);
        assert.equal(calculerPoidsNet(0, 0), 0);
    });

    it("refuse une tare supérieure au poids brut", function () {
        assert.throws(() => calculerPoidsNet(2, 3), /POIDS_INVALIDES/);
    });

    it("contrôle les pas de précision de la balance", function () {
        assert.equal(respectePrecision(12.3, 0.1), true);
        assert.equal(respectePrecision(12.35, 0.1), false);
    });

    it("signale seulement les écarts strictement supérieurs au seuil", function () {
        assert.deepEqual(calculerEcartRelatif(100, 105, 5), { pourcentage: 5, anomalie: false });
        assert.deepEqual(calculerEcartRelatif(100, 105.01, 5), { pourcentage: 5.01, anomalie: true });
        assert.deepEqual(calculerEcartRelatif(0, 1, 5), { pourcentage: null, anomalie: true });
    });

    it("une re-pesée plus récente supersède sans qu'une mesure offline ancienne ne reprenne la main", function () {
        assert.equal(doitSuperseder("2026-09-23T10:01:00Z", "2026-09-23T10:00:00Z"), true);
        assert.equal(doitSuperseder("2026-09-23T10:00:00Z", "2026-09-23T10:00:00Z"), true);
        assert.equal(doitSuperseder("2026-09-23T09:59:00Z", "2026-09-23T10:00:00Z"), false);
    });

    it("normalise les instants ISO 8601 UTC et avec décalage explicite", function () {
        assert.equal(normaliserInstantIso("2026-09-23T10:00:00.123Z"), "2026-09-23T10:00:00.123Z");
        assert.equal(normaliserInstantIso("2026-09-23T12:00:00+02:00"), "2026-09-23T10:00:00.000Z");
        assert.equal(normaliserInstantIso("2026-09-23T11:00:00+01:00"), "2026-09-23T10:00:00.000Z");
    });

    it("refuse un datetime-local sans fuseau et les valeurs invalides", function () {
        assert.equal(normaliserInstantIso("2026-09-23T12:00:00"), null);
        assert.equal(normaliserInstantIso("date-invalide"), null);
        assert.equal(normaliserInstantIso("2026-99-99T25:00:00Z"), null);
        assert.equal(normaliserInstantIso("2026-02-31T12:00:00Z"), null);
    });
});
