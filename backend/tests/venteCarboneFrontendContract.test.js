import { strict as assert } from "node:assert";
import fs from "node:fs";

const lire = chemin =>
    fs.readFileSync(
        new URL(chemin, import.meta.url),
        "utf8"
    );

describe("Interface vente et impact carbone", function () {
    const ventes = lire("../../frontend/js/ventes.js");
    const styles = lire("../../frontend/css/common.css");

    it("affiche un succès différent lorsque le facteur carbone est absent", function () {
        assert.match(ventes, /CARBON_FACTOR_NOT_FOUND/);
        assert.match(
            ventes,
            /Impact carbone non calculé : aucun facteur carbone applicable\./
        );
        assert.match(
            ventes,
            /impact carbone calculé\./
        );
        assert.match(ventes, /notification-avertissement|"avertissement"/);
        assert.match(styles, /\.notification-avertissement/);
    });

    it("distingue les ventes non calculées dans le KPI CO₂e", function () {
        assert.match(ventes, /vente\.co2e_estime_kg === null/);
        assert.match(ventes, /ventesSansImpact/);
        assert.match(ventes, /vente\(s\) non calculée\(s\)/);
        assert.match(ventes, /: "Non calculé"/);
    });
});
