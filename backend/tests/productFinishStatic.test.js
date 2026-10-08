import { strict as assert } from "node:assert";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = fichier => readFile(path.join(racine, fichier), "utf8");

describe("Product Finish — navigation et marque", () => {
    it("expose une porte d'entrée vers les trois produits, l'onboarding et l'aide", async () => {
        const html = await lire("frontend/accueil.html");
        for (const lien of ["portail-client/index.html", "index.html", "../agent-app/index.html", "devenir-client.html", "acces/index.html"]) {
            assert.ok(html.includes(`href="${lien}"`), `lien absent: ${lien}`);
        }
    });

    it("fournit les écrans d'activation et de vérification e-mail", async () => {
        await access(path.join(racine, "frontend/acces/activer.html"));
        await access(path.join(racine, "frontend/acces/verifier-email.html"));
        const activation = await lire("frontend/acces/activation.js");
        const verification = await lire("frontend/acces/verification-email.js");
        assert.ok(activation.includes("history.replaceState"));
        assert.ok(verification.includes("history.replaceState"));
    });

    it("ne conserve aucun chemin /frontend cassé dans l'application Agent", async () => {
        const html = await lire("agent-app/index.html");
        assert.equal(html.includes("../frontend/"), false);
        assert.ok(html.includes("../acces/index.html?produit=agent_terrain"));
        assert.ok(html.includes("../brand/brand.js"));
    });

    it("documente le fallback de marque sans présenter un faux logo officiel", async () => {
        const composant = await lire("frontend/brand/brand.js");
        const guide = await lire("docs/brand/BRAND-SYSTEM.md");
        assert.ok(composant.includes('name:"Pro Récup"'));
        assert.ok(composant.includes("horizontal:null"));
        assert.ok(guide.includes("Aucun logo officiel approuvé"));
    });
});
