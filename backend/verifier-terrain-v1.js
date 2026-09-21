import "dotenv/config";

import pool
    from "./src/config/db.js";


const verifierColonnes = async (
    table,
    colonnesAttendues
) => {

    const resultat =
        await pool.query(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1;
            `,
            [table]
        );


    const colonnes =
        resultat.rows.map(
            ligne =>
                ligne.column_name
        );


    console.log("");
    console.log(
        "TABLE :",
        table
    );


    for (
        const colonne
        of colonnesAttendues
    ) {

        if (
            colonnes.includes(
                colonne
            )
        ) {

            console.log(
                "[OK] ",
                colonne
            );

        } else {

            console.log(
                "[MANQUANT] ",
                colonne
            );

        }

    }

};


const verifier = async () => {

    try {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "VERIFICATION TERRAIN V1"
        );

        console.log(
            "========================================"
        );


        await verifierColonnes(
            "sites_de_collecte",
            [
                "latitude",
                "longitude",
                "precision_gps_reference",
                "rayon_validation_m"
            ]
        );


        await verifierColonnes(
            "collectes",
            [
                "poids_reel",
                "poids_reel_saisi_le",
                "poids_reel_saisi_par"
            ]
        );


        await verifierColonnes(
            "mission_evenements",
            [
                "operation_id",
                "survenu_le",
                "recu_le",
                "contexte"
            ]
        );


        const preuve =
            await pool.query(
                `
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = 'preuves_collecte'
                ) AS existe;
                `
            );


        console.log("");
        console.log(
            "TABLE : preuves_collecte"
        );

        console.log(
            preuve.rows[0].existe
                ? "[OK] preuves_collecte"
                : "[MANQUANT] preuves_collecte"
        );


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "VERIFICATION TERMINEE"
        );

        console.log(
            "========================================"
        );

    } catch (erreur) {

        console.error(
            "ERREUR :",
            erreur.message
        );

    } finally {

        await pool.end();

    }

};


verifier();