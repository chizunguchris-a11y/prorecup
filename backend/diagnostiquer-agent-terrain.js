import "dotenv/config";

import pool
    from "./src/config/db.js";


const executer = async () => {

    try {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "DIAGNOSTIC AGENTS TERRAIN PRO RECUP"
        );

        console.log(
            "========================================"
        );


        const roles =
            await pool.query(`
                SELECT
                    r.id,
                    r.nom,
                    COUNT(u.id)::integer
                        AS nombre_utilisateurs

                FROM roles r

                LEFT JOIN utilisateurs u
                    ON u.role_id = r.id

                GROUP BY
                    r.id,
                    r.nom

                ORDER BY
                    r.nom;
            `);


        console.log("");
        console.log(
            "ROLES EXISTANTS"
        );

        console.table(
            roles.rows
        );


        const agents =
            await pool.query(`
                SELECT
                    a.id AS agent_id,
                    a.utilisateur_id,
                    a.statut AS agent_statut,
                    a.disponible,

                    u.actif AS utilisateur_actif,
                    u.organisation_id,

                    r.nom AS role_nom

                FROM agents a

                JOIN utilisateurs u
                    ON u.id = a.utilisateur_id

                LEFT JOIN roles r
                    ON r.id = u.role_id

                ORDER BY
                    r.nom,
                    a.statut;
            `);


        console.log("");
        console.log(
            "PROFILS AGENTS EXISTANTS"
        );

        console.table(
            agents.rows
        );


        const utilisateursRoleTerrain =
            await pool.query(`
                SELECT
                    u.id AS utilisateur_id,
                    u.actif AS utilisateur_actif,
                    u.organisation_id,
                    r.nom AS role_nom,

                    a.id AS agent_id,
                    a.statut AS agent_statut,
                    a.disponible

                FROM utilisateurs u

                JOIN roles r
                    ON r.id = u.role_id

                LEFT JOIN agents a
                    ON a.utilisateur_id = u.id

                WHERE LOWER(TRIM(r.nom))
                    LIKE '%agent%'

                ORDER BY
                    r.nom;
            `);


        console.log("");
        console.log(
            "UTILISATEURS AYANT UN ROLE CONTENANT AGENT"
        );

        console.table(
            utilisateursRoleTerrain.rows
        );


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "DIAGNOSTIC TERMINE"
        );

        console.log(
            "========================================"
        );

    } catch (erreur) {

        console.error("");
        console.error(
            "[ERREUR]",
            erreur.message
        );

    } finally {

        await pool.end();

    }

};


executer();