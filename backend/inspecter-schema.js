import "dotenv/config";
import pool from "./src/config/db.js";

const tablesRecherchees = [
    "utilisateurs",
    "agents",
    "sites_de_collecte",
    "collectes",
    "missions",
    "missions_collectes",
    "mission_evenements",
    "tricycles",
    "notifications",
    "audits"
];

const inspecter = async () => {

    try {

        const tables = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        console.log("");
        console.log("========================================");
        console.log("TABLES PRO RECUP");
        console.log("========================================");

        tables.rows.forEach((ligne) => {
            console.log(ligne.table_name);
        });

        for (const table of tablesRecherchees) {

            const resultat = await pool.query(
                `
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = $1
                ORDER BY ordinal_position;
                `,
                [table]
            );

            console.log("");
            console.log("========================================");
            console.log("TABLE :", table);
            console.log("========================================");

            if (resultat.rows.length === 0) {

                console.log("TABLE ABSENTE OU NOM DIFFERENT");
                continue;

            }

            resultat.rows.forEach((colonne) => {

                console.log(
                    colonne.column_name,
                    "|",
                    colonne.data_type,
                    "| nullable:",
                    colonne.is_nullable,
                    "| default:",
                    colonne.column_default
                );

            });

        }

    } catch (erreur) {

        console.error("");
        console.error("ERREUR :", erreur.message);

    } finally {

        await pool.end();

    }

};

inspecter();