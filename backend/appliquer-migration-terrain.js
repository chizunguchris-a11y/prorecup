import "dotenv/config";

import {
    readFile
} from "node:fs/promises";

import path
    from "node:path";

import pool
    from "./src/config/db.js";


const executer = async () => {

    const cheminMigration =
        path.resolve(
            process.cwd(),
            "../database/migrations/20260819_02_resultat_collecte_terrain.sql"
        );

    try {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "PRO RECUP - MIGRATION TERRAIN V1"
        );

        console.log(
            "========================================"
        );

        console.log("");
        console.log(
            "Lecture de la migration..."
        );


        const contenu =
    await readFile(
        cheminMigration,
        "utf8"
    );


const sql =
    contenu
        .replace(
            /^\uFEFF/,
            ""
        )
        .trim();


        if (!sql.trim()) {

            throw new Error(
                "Le fichier de migration est vide."
            );

        }


        console.log(
            "Connexion PostgreSQL..."
        );


        await pool.query(
            "SELECT 1;"
        );


        console.log(
            "Connexion réussie."
        );

        console.log("");
        console.log(
            "Application de la migration..."
        );


        await pool.query(
            sql
        );


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "MIGRATION TERRAIN V1 REUSSIE"
        );

        console.log(
            "========================================"
        );

    } catch (erreur) {

        console.error("");
        console.error(
            "========================================"
        );

        console.error(
            "ECHEC DE LA MIGRATION"
        );

        console.error(
            "========================================"
        );

        console.error(
            erreur.message
        );

        process.exitCode = 1;

    } finally {

        await pool.end();

    }

};


executer();