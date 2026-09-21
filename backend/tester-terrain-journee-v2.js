import "dotenv/config";

import http
    from "node:http";

import jwt
    from "jsonwebtoken";

import pool
    from "./src/config/db.js";


const appeler =
    (
        token,
        date
    ) => {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                const requete =
                    http.request(
                        {
                            hostname:
                                "127.0.0.1",

                            port:
                                5000,

                            path:
                                `/api/terrain/journee-v2?date=${encodeURIComponent(
                                    date
                                )}`,

                            method:
                                "GET",

                            headers: {

                                Authorization:
                                    `Bearer ${token}`

                            }

                        },
                        reponse => {

                            let texte = "";


                            reponse.on(
                                "data",
                                morceau => {

                                    texte +=
                                        morceau;

                                }
                            );


                            reponse.on(
                                "end",
                                () => {

                                    let corps =
                                        texte;


                                    try {

                                        corps =
                                            JSON.parse(
                                                texte
                                            );

                                    } catch {
                                        // Réponse non JSON.
                                    }


                                    resolve(
                                        {
                                            statut:
                                                reponse.statusCode,

                                            corps
                                        }
                                    );

                                }
                            );

                        }
                    );


                requete.on(
                    "error",
                    reject
                );


                requete.end();

            }
        );

    };


const ok =
    (
        titre,
        condition
    ) => {

        console.log(
            condition
                ? `[OK] ${titre}`
                : `[ECHEC] ${titre}`
        );

    };


const executer =
    async () => {

        try {

            console.log("");
            console.log(
                "========================================"
            );

            console.log(
                "TEST JOURNEE TERRAIN V2"
            );

            console.log(
                "========================================"
            );


            /*
             * ------------------------------------------------
             * 1. Trouver une vraie mission Terrain récente.
             * ------------------------------------------------
             */

            const resultatMission =
                await pool.query(`
                    SELECT
                        m.id
                            AS mission_id,

                        m.statut
                            AS mission_statut,

                        TO_CHAR(
                            m.date_prevue,
                            'YYYY-MM-DD'
                        ) AS date_prevue,

                        a.id
                            AS agent_id,

                        u.id
                            AS utilisateur_id,

                        u.email,
                        u.organisation_id,
                        u.role_id,

                        r.nom
                            AS role_nom

                    FROM missions m

                    JOIN agents a
                        ON a.id =
                            m.agent_id

                    JOIN utilisateurs u
                        ON u.id =
                            a.utilisateur_id

                    JOIN roles r
                        ON r.id =
                            u.role_id

                    WHERE LOWER(
                            TRIM(
                                r.nom
                            )
                          ) =
                        'agent_valorisation_carbone'

                      AND m.statut <>
                            'annulee'

                    ORDER BY
                        m.date_prevue DESC,
                        m.cree_le DESC

                    LIMIT 1;
                `);


            const missionBase =
                resultatMission.rows[0];


            if (!missionBase) {

                throw new Error(
                    "Aucune mission Terrain disponible."
                );

            }


            if (
                !process.env.JWT_SECRET
            ) {

                throw new Error(
                    "JWT_SECRET absent."
                );

            }


            console.log(
                "Mission :",
                missionBase.mission_id
            );

            console.log(
                "Date :",
                missionBase.date_prevue
            );

            console.log(
                "Statut :",
                missionBase.mission_statut
            );


            /*
             * ------------------------------------------------
             * 2. Vérité PostgreSQL des collectes.
             * ------------------------------------------------
             */

            const resultatCollectes =
                await pool.query(
                    `
                    SELECT
                        mc.collecte_id,
                        mc.ordre_collecte,

                        EXISTS (
                            SELECT 1

                            FROM mission_evenements me

                            WHERE me.mission_id =
                                    mc.mission_id

                              AND me.collecte_id =
                                    mc.collecte_id

                              AND me.type_evenement =
                                    'arrivee_site'
                        ) AS arrivee,

                        EXISTS (
                            SELECT 1

                            FROM mission_evenements me

                            WHERE me.mission_id =
                                    mc.mission_id

                              AND me.collecte_id =
                                    mc.collecte_id

                              AND me.type_evenement =
                                    'collecte_demarree'
                        ) AS demarree,

                        EXISTS (
                            SELECT 1

                            FROM mission_evenements me

                            WHERE me.mission_id =
                                    mc.mission_id

                              AND me.collecte_id =
                                    mc.collecte_id

                              AND me.type_evenement =
                                    'collecte_terminee'
                        ) AS terminee,

                        (
                            SELECT
                                COUNT(*)::integer

                            FROM preuves_collecte p

                            WHERE p.mission_id =
                                    mc.mission_id

                              AND p.collecte_id =
                                    mc.collecte_id
                        ) AS nombre_preuves

                    FROM missions_collectes mc

                    WHERE mc.mission_id =
                            $1

                    ORDER BY
                        mc.ordre_collecte ASC;
                    `,
                    [
                        missionBase.mission_id
                    ]
                );


            const collectesBase =
                resultatCollectes.rows;


            console.log("");
            console.log(
                "VERITE POSTGRESQL"
            );


            console.table(
                collectesBase
            );


            /*
             * ------------------------------------------------
             * 3. Token du vrai agent.
             * ------------------------------------------------
             */

            const token =
                jwt.sign(
                    {

                        id:
                            missionBase
                                .utilisateur_id,

                        email:
                            missionBase.email,

                        organisationId:
                            missionBase
                                .organisation_id,

                        organisation_id:
                            missionBase
                                .organisation_id,

                        role:
                            missionBase
                                .role_nom,

                        roleId:
                            missionBase
                                .role_id

                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn:
                            "5m"
                    }
                );


            /*
             * ------------------------------------------------
             * 4. Appeler /journee-v2.
             * ------------------------------------------------
             */

            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "APPEL /JOURNEE-V2"
            );


            const reponse =
                await appeler(
                    token,
                    missionBase.date_prevue
                );


            console.log(
                "HTTP :",
                reponse.statut
            );


            ok(
                "API retourne 200",
                reponse.statut ===
                    200
            );


            if (
                reponse.statut !==
                200
            ) {

                console.log(
                    JSON.stringify(
                        reponse.corps,
                        null,
                        2
                    )
                );

                return;

            }


            const journee =
                reponse.corps
                    ?.data;


            ok(
                "Objet journée présent",
                Boolean(
                    journee
                )
            );


            ok(
                "Date correcte",
                journee?.date ===
                    missionBase
                        .date_prevue
            );


            ok(
                "Timezone présente",
                Boolean(
                    journee
                        ?.timezone
                )
            );


            ok(
                "Agent correct",
                journee
                    ?.agent
                    ?.agent_id ===
                    missionBase.agent_id
            );


            /*
             * ------------------------------------------------
             * 5. Mission retrouvée.
             * ------------------------------------------------
             */

            const mission =
                journee
                    ?.missions
                    ?.find(
                        element =>
                            element.id ===
                            missionBase.mission_id
                    );


            ok(
                "Mission présente dans la journée",
                Boolean(
                    mission
                )
            );


            if (!mission) {

                throw new Error(
                    "La mission attendue n'est pas dans /journee-v2."
                );

            }


            console.log("");
            console.log(
                "MISSION RECONSTRUITE"
            );


            console.log(
                "Statut :",
                mission.statut
            );

            console.log(
                "Action suivante :",
                mission.action_suivante
            );

            console.log(
                "Progression :",
                `${mission.progression?.pourcentage}%`
            );

            console.log(
                "Collectes :",
                mission.progression
                    ?.nombre_collectes
            );

            console.log(
                "Terminées :",
                mission.progression
                    ?.terminees
            );

            console.log(
                "Restantes :",
                mission.progression
                    ?.restantes
            );


            ok(
                "Statut mission correct",
                mission.statut ===
                    missionBase
                        .mission_statut
            );


            ok(
                "Nombre de collectes correct",
                mission.collectes
                    ?.length ===
                    collectesBase.length
            );


            /*
             * ------------------------------------------------
             * 6. Comparaison collecte par collecte.
             * ------------------------------------------------
             */

            for (
                const base of
                collectesBase
            ) {

                const collecte =
                    mission.collectes.find(
                        element =>
                            element.id ===
                            base.collecte_id
                    );


                console.log("");
                console.log(
                    "Collecte ordre",
                    base.ordre_collecte
                );


                ok(
                    "Collecte retrouvée",
                    Boolean(
                        collecte
                    )
                );


                if (!collecte) {
                    continue;
                }


                ok(
                    "Ordre correct",
                    collecte
                        .ordre_collecte ===
                        base.ordre_collecte
                );


                ok(
                    "Arrivée reconstruite",
                    collecte
                        .progression
                        .arrivee ===
                        base.arrivee
                );


                ok(
                    "Démarrage reconstruit",
                    collecte
                        .progression
                        .collecte_demarree ===
                        base.demarree
                );


                ok(
                    "Fin reconstruite",
                    collecte
                        .progression
                        .collecte_terminee ===
                        base.terminee
                );


                ok(
                    "Nombre de preuves correct",
                    collecte
                        .nombre_preuves ===
                        base.nombre_preuves
                );


                /*
                 * Sécurité :
                 * /journee ne doit jamais renvoyer
                 * le chemin privé Storage ni une
                 * URL signée permanente.
                 */
                const fuiteStorage =
                    (
                        collecte.preuves ||
                        []
                    ).some(
                        preuve =>
                            preuve.storage_path ||
                            preuve.storage_bucket ||
                            preuve.url
                    );


                ok(
                    "Aucun secret Storage exposé",
                    !fuiteStorage
                );


                console.log(
                    "Etat calculé :",
                    collecte.etat
                );


                console.log(
                    "Action :",
                    collecte
                        .action_suivante
                );

            }


            /*
             * ------------------------------------------------
             * 7. Vérifier l'action suivante de mission.
             * ------------------------------------------------
             */

            const nombreTerminees =
                collectesBase.filter(
                    collecte =>
                        collecte.terminee
                ).length;


            let actionAttendue =
                "aucune";


            if (
                missionBase
                    .mission_statut ===
                "planifiee"
            ) {

                actionAttendue =
                    "demarrer_mission";

            } else if (
                missionBase
                    .mission_statut ===
                    "en_cours" &&
                nombreTerminees <
                    collectesBase.length
            ) {

                const prochaine =
                    collectesBase.find(
                        collecte =>
                            !collecte.terminee
                    );


                if (
                    !prochaine.arrivee
                ) {

                    actionAttendue =
                        "arriver_site";

                } else if (
                    !prochaine.demarree
                ) {

                    actionAttendue =
                        "demarrer_collecte";

                } else {

                    actionAttendue =
                        "terminer_collecte";

                }

            } else if (
                missionBase
                    .mission_statut ===
                    "en_cours" &&
                collectesBase.length >
                    0 &&
                nombreTerminees ===
                    collectesBase.length
            ) {

                actionAttendue =
                    "terminer_mission";

            }


            console.log("");
            console.log(
                "ACTION ATTENDUE :",
                actionAttendue
            );

            console.log(
                "ACTION API      :",
                mission
                    .action_suivante
            );


            ok(
                "Action suivante correcte",
                mission
                    .action_suivante ===
                    actionAttendue
            );


            /*
             * ------------------------------------------------
             * 8. Date invalide.
             * ------------------------------------------------
             */

            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "TEST DATE INVALIDE"
            );


            const invalide =
                await appeler(
                    token,
                    "19-08-2026"
                );


            console.log(
                "HTTP :",
                invalide.statut
            );


            ok(
                "Date invalide refusée",
                invalide.statut ===
                    400
            );


            console.log("");
            console.log(
                "========================================"
            );

            console.log(
                "JOURNEE V2 VALIDEE"
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