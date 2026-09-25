import { strict as assert } from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend =
    fileURLToPath(
        new URL("../", import.meta.url)
    );

const extensionsSource =
    new Set([
        ".js",
        ".mjs",
        ".cjs",
        ".json",
        ".sql"
    ]);

const listerSources = dossier =>
    fs.readdirSync(
        dossier,
        { withFileTypes: true }
    ).flatMap(entree => {
        if (
            entree.name === "node_modules" ||
            entree.name === ".git" ||
            entree.name === "qr-lots-manuel-runs"
        ) {
            return [];
        }

        const cible =
            path.join(
                dossier,
                entree.name
            );

        if (entree.isDirectory()) {
            return listerSources(cible);
        }

        return extensionsSource.has(
            path.extname(entree.name).toLowerCase()
        )
            ? [cible]
            : [];
    });

describe("Encodage des sources backend", function () {
    it("conserve des sources UTF-8 sans caractère de remplacement", function () {
        const decodeur =
            new TextDecoder(
                "utf-8",
                { fatal: true }
            );

        for (const fichier of listerSources(backend)) {
            const contenu =
                decodeur.decode(
                    fs.readFileSync(fichier)
                );

            assert.equal(
                contenu.includes("\uFFFD"),
                false,
                `Caractère U+FFFD présent dans ${fichier}`
            );
        }
    });
});
