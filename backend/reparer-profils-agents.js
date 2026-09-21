import "dotenv/config";

import pool
    from "./src/config/db.js";


const appliquer =
    process.argv.includes(
        "--apply"
    );


const executer = async () => {

    const connexion =
        await pool.connect();

    try {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "PRO RECUP - PROFILS AGENTS"
        );

        console.log(
            appliquer
                ? "MODE : APPLICATION"
                : "MODE : DIAGNOSTIC"
        );

        console.log(
            "========================================"
        );


        const manquants =
            await connexion.query(`
                SELECT
                    u.id AS utilisateur_id,
                    u.nom,
                    u.email,
                    u.telephone,
                    u.photo_url,
                    u.organisation_id,
                    u.actif,
                    r.nom AS role_nom

                FROM utilisateurs u

                JOIN roles r
                    ON r.id = u.role_id

                LEFT JOIN agents a
                    ON a.utilisateur_id = u.id

                WHERE LOWER(TRIM(r.nom)) =
                    'agent_valorisation_carbone'

                  AND a.id IS NULL

                ORDER BY u.nom;
            `);


        console.log("");
        console.log(
            "PROFILS AGENTS MANQUANTS :",
            manquants.rows.length
        );


        console.table(
            manquants.rows.map(
                ligne => ({
                    utilisateur_id:
                        ligne.utilisateur_id,

                    actif:
                        ligne.actif,

                    role:
                        ligne.role_nom,

                    organisation_id:
                        ligne.organisation_id
                })
            )
        );


        if (!appliquer) {

            console.log("");
            console.log(
                "Aucune modification effectuee."
            );

            console.log(
                "Pour appliquer :"
            );

            console.log(
                "node reparer-profils-agents.js --apply"
            );

            return;

        }


        await connexion.query(
            "BEGIN"
        );


        const insertion =
            await connexion.query(`
                INSERT INTO agents
                (
                    utilisateur_id,
                    telephone,
                    photo_url,
                    statut,
                    disponible,
                    date_embauche
                )

                SELECT
                    u.id,
                    u.telephone,
                    u.photo_url,
                    'actif',
                    true,
                    NULL

                FROM utilisateurs u

                JOIN roles r
                    ON r.id = u.role_id

                LEFT JOIN agents a
                    ON a.utilisateur_id = u.id

                WHERE LOWER(TRIM(r.nom)) =
                    'agent_valorisation_carbone'

                  AND a.id IS NULL

                RETURNING
                    id,
                    utilisateur_id,
                    statut,
                    disponible;
            `);


        await connexion.query(
            "COMMIT"
        );


        console.log("");
        console.log(
            "PROFILS CREES :",
            insertion.rows.length
        );

        console.table(
            insertion.rows
        );


        console.log("");
        console.log(
            "[OK] Reparation terminee."
        );


    } catch (erreur) {

        try {

            await connexion.query(
                "ROLLBACK"
            );

        } catch {
            // Rien à faire.
        }


        console.error("");
        console.error(
            "[ERREUR]",
            erreur.message
        );


    } finally {

        connexion.release();

        await pool.end();

    }

};


executer();