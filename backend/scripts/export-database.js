import "dotenv/config";

import {
    mkdir,
    writeFile
} from "node:fs/promises";

import {
    spawn
} from "node:child_process";

import path
    from "node:path";

import process
    from "node:process";

const racineProjet =
    path.resolve(
        process.cwd(),
        ".."
    );

const dossierDatabase =
    path.join(
        racineProjet,
        "database"
    );

const fichierSchema =
    path.join(
        dossierDatabase,
        "schema.sql"
    );

const fichierDonnees =
    path.join(
        dossierDatabase,
        "donnees-demo.sql"
    );

const executerPgDump = (
    argumentsCommande
) => {

    return new Promise(
        (resolve, reject) => {

            const processus =
                spawn(
                    "pg_dump",
                    argumentsCommande,
                    {
                        stdio: "inherit"
                    }
                );

            processus.on(
                "error",
                (erreur) => {

                    if (
                        erreur.code ===
                        "ENOENT"
                    ) {

                        reject(
                            new Error(
                                "pg_dump est introuvable. Installe PostgreSQL ou ajoute son dossier bin dans la variable PATH."
                            )
                        );

                        return;

                    }

                    reject(erreur);

                }
            );

            processus.on(
                "close",
                (code) => {

                    if (code === 0) {

                        resolve();

                        return;

                    }

                    reject(
                        new Error(
                            `pg_dump s'est terminé avec le code ${code}.`
                        )
                    );

                }
            );

        }
    );

};

const exporterBase = async () => {

    const databaseUrl =
        process.env.DATABASE_URL;

    if (!databaseUrl) {

        throw new Error(
            "DATABASE_URL est absente du fichier .env."
        );

    }

    await mkdir(
        dossierDatabase,
        {
            recursive: true
        }
    );

    console.log(
        "Export du schéma PostgreSQL..."
    );

    await executerPgDump([
        databaseUrl,
        "--schema-only",
        "--no-owner",
        "--no-privileges",
        "--file",
        fichierSchema
    ]);

    console.log(
        "Export des données de démonstration..."
    );

    await executerPgDump([
        databaseUrl,
        "--data-only",
        "--inserts",
        "--column-inserts",
        "--no-owner",
        "--no-privileges",
        "--file",
        fichierDonnees
    ]);

    const dateExport =
        new Date().toISOString();

    await writeFile(
        path.join(
            dossierDatabase,
            "derniere-sauvegarde.txt"
        ),
        `Dernière sauvegarde : ${dateExport}\n`,
        "utf8"
    );

    console.log("");
    console.log(
        "Sauvegarde terminée avec succès."
    );

    console.log(
        `Schéma : ${fichierSchema}`
    );

    console.log(
        `Données : ${fichierDonnees}`
    );

};

exporterBase().catch(
    (erreur) => {

        console.error("");
        console.error(
            "Échec de la sauvegarde :"
        );

        console.error(
            erreur.message
        );

        process.exit(1);

    }
);