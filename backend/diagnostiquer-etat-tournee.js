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
            "ETAT DES TOURNEES TERRAIN"
        );
        console.log(
            "========================================"
        );


        const missions =
            await pool.query(`
                SELECT
                    m.id,
                    m.statut,
                    m.date_prevue,
                    m.heure_depart_reelle,
                    m.heure_retour_reelle,
                    u.nom AS agent_nom

                FROM missions m

                JOIN agents a
                    ON a.id = m.agent_id

                JOIN utilisateurs u
                    ON u.id = a.utilisateur_id

                WHERE m.statut IN
                (
                    'planifiee',
                    'en_cours',
                    'terminee'
                )

                ORDER BY
                    m.cree_le DESC

                LIMIT 10;
            `);


        console.log("");
        console.log(
            "MISSIONS RECENTES"
        );

        console.table(
            missions.rows
        );


        const collectes =
            await pool.query(`
                SELECT
                    m.id AS mission_id,
                    m.statut AS mission_statut,

                    mc.collecte_id,
                    mc.ordre_collecte,

                    c.poids_estime,
                    c.poids_reel,
                    c.resultat_terrain,

                    EXISTS
                    (
                        SELECT 1
                        FROM mission_evenements me
                        WHERE me.mission_id = m.id
                          AND me.collecte_id =
                              mc.collecte_id
                          AND me.type_evenement =
                              'arrivee_site'
                    ) AS arrivee,

                    EXISTS
                    (
                        SELECT 1
                        FROM mission_evenements me
                        WHERE me.mission_id = m.id
                          AND me.collecte_id =
                              mc.collecte_id
                          AND me.type_evenement =
                              'collecte_demarree'
                    ) AS demarree,

                    EXISTS
                    (
                        SELECT 1
                        FROM mission_evenements me
                        WHERE me.mission_id = m.id
                          AND me.collecte_id =
                              mc.collecte_id
                          AND me.type_evenement =
                              'collecte_terminee'
                    ) AS terminee

                FROM missions m

                JOIN missions_collectes mc
                    ON mc.mission_id = m.id

                JOIN collectes c
                    ON c.id = mc.collecte_id

                WHERE m.statut = 'en_cours'

                ORDER BY
                    m.cree_le DESC,
                    mc.ordre_collecte ASC;
            `);


        console.log("");
        console.log(
            "COLLECTES DES MISSIONS EN COURS"
        );

        console.table(
            collectes.rows
        );


    } catch (erreur) {

        console.error(
            "[ERREUR]",
            erreur.message
        );

    } finally {

        await pool.end();

    }

};


executer();