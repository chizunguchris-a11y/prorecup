import "dotenv/config";

import http
    from "node:http";

import {
    randomUUID
} from "node:crypto";

import jwt
    from "jsonwebtoken";

import pool
    from "./src/config/db.js";


const appeler = (
    token,
    missionId,
    corps
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const contenu =
                JSON.stringify(
                    corps
                );


            const requete =
                http.request(
                    {
                        hostname:
                            "127.0.0.1",

                        port:
                            5000,

                        path:
                            `/api/terrain/missions/${missionId}/demarrer`,

                        method:
                            "POST",

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json",

                            "Content-Length":
                                Buffer.byteLength(
                                    contenu
                                )

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

                                let corpsReponse =
                                    texte;


                                try {

                                    corpsReponse =
                                        JSON.parse(
                                            texte
                                        );

                                } catch {
                                    // Réponse non JSON.
                                }


                                resolve({

                                    statut:
                                        reponse
                                            .statusCode,

                                    corps:
                                        corpsReponse

                                });

                            }
                        );

                    }
                );


            requete.on(
                "error",
                reject
            );


            requete.write(
                contenu
            );


            requete.end();

        }
    );

};


const creerToken = (
    utilisateur
) => {

    const secret =
        process.env.JWT_SECRET;


    if (!secret) {

        throw new Error(
            "JWT_SECRET absent."
        );

    }


    return jwt.sign(
        {
            id:
                utilisateur
                    .utilisateur_id,

            email:
                utilisateur.email,

            organisationId:
                utilisateur
                    .organisation_id,

            organisation_id:
                utilisateur
                    .organisation_id,

            role:
                utilisateur.role_nom,

            roleId:
                utilisateur.role_id
        },
        secret,
        {
            expiresIn:
                "5m"
        }
    );

};


const afficherTest = (
    titre,
    condition
) => {

    console.log(
        condition
            ? `[OK] ${titre}`
            : `[ECHEC] ${titre}`
    );

};


const executer = async () => {

    try {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "PRO RECUP - TEST DEMARRAGE TERRAIN"
        );

        console.log(
            "========================================"
        );


        /*
         * Trouver une vraie mission de recette :
         * - agent terrain actif
         * - mission planifiée
         * - au moins une collecte
         */
        const resultatMission =
            await pool.query(`
                SELECT
                    m.id
                        AS mission_id,

                    m.agent_id,
                    m.tricycle_id,
                    m.date_prevue,
                    m.statut,

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

                  AND u.actif = true

                  AND a.statut =
                    'actif'

                  AND m.statut =
                    'planifiee'

                  AND EXISTS
                  (
                      SELECT 1

                      FROM missions_collectes mc

                      WHERE mc.mission_id =
                          m.id
                  )

                ORDER BY
                    m.date_prevue DESC,
                    m.cree_le DESC

                LIMIT 1;
            `);


        const mission =
            resultatMission.rows[0];


        if (!mission) {

            throw new Error(
                "Aucune mission terrain planifiée avec collecte n'a été trouvée."
            );

        }


        console.log("");
        console.log(
            "Mission test :",
            mission.mission_id
        );

        console.log(
            "Date :",
            mission.date_prevue
        );


        const token =
            creerToken(
                mission
            );


        const operationId =
            randomUUID();


        const survenuLe =
            new Date()
                .toISOString();


        const corps = {

            operation_id:
                operationId,

            survenu_le:
                survenuLe,

            observations:
                "Test automatique de démarrage Terrain.",

            mode:
                "online"

        };


        /*
         * PREMIER ENVOI
         */
        console.log("");
        console.log(
            "----------------------------------------"
        );

        console.log(
            "TEST 1 - PREMIER DEMARRAGE"
        );


        const premier =
            await appeler(
                token,
                mission.mission_id,
                corps
            );


        console.log(
            "Statut :",
            premier.statut
        );

        console.log(
            JSON.stringify(
                premier.corps,
                null,
                2
            )
        );


        afficherTest(
            "Premier envoi retourne 200",
            premier.statut === 200
        );


        const premierDejaTraite =
            premier.corps &&
            premier.corps.data &&
            premier.corps.data
                .deja_traitee;


        afficherTest(
            "Premier envoi n'est pas un doublon",
            premierDejaTraite ===
                false
        );


        /*
         * DEUXIEME ENVOI :
         * exactement la même operation_id.
         */
        console.log("");
        console.log(
            "----------------------------------------"
        );

        console.log(
            "TEST 2 - MEME OPERATION RENVOYEE"
        );


        const second =
            await appeler(
                token,
                mission.mission_id,
                corps
            );


        console.log(
            "Statut :",
            second.statut
        );

        console.log(
            JSON.stringify(
                second.corps,
                null,
                2
            )
        );


        afficherTest(
            "Deuxième envoi retourne 200",
            second.statut === 200
        );


        const deuxiemeDejaTraite =
            second.corps &&
            second.corps.data &&
            second.corps.data
                .deja_traitee;


        afficherTest(
            "Deuxième envoi reconnu comme déjà traité",
            deuxiemeDejaTraite ===
                true
        );


        /*
         * VERIFICATION DE L'ETAT REEL
         * DE LA BASE.
         */
        const etat =
            await pool.query(
                `
                SELECT
                    m.statut
                        AS mission_statut,

                    m.heure_depart_reelle,

                    a.disponible
                        AS agent_disponible,

                    t.statut
                        AS tricycle_statut

                FROM missions m

                JOIN agents a
                    ON a.id =
                        m.agent_id

                JOIN tricycles t
                    ON t.id =
                        m.tricycle_id

                WHERE m.id = $1;
                `,
                [
                    mission.mission_id
                ]
            );


        const etatFinal =
            etat.rows[0];


        console.log("");
        console.log(
            "----------------------------------------"
        );

        console.log(
            "ETAT FINAL"
        );

        console.table(
            [
                etatFinal
            ]
        );


        afficherTest(
            "Mission en cours",
            etatFinal
                .mission_statut ===
                "en_cours"
        );


        afficherTest(
            "Heure de départ réelle enregistrée",
            Boolean(
                etatFinal
                    .heure_depart_reelle
            )
        );


        afficherTest(
            "Agent indisponible pendant la mission",
            etatFinal
                .agent_disponible ===
                false
        );


        afficherTest(
            "Tricycle en mission",
            etatFinal
                .tricycle_statut ===
                "en_mission"
        );


        /*
         * Vérifier qu'il n'existe qu'UN événement
         * pour cette operation_id.
         */
        const evenements =
            await pool.query(
                `
                SELECT
                    COUNT(*)::integer
                        AS nombre,

                    MIN(type_evenement)
                        AS type_evenement,

                    MIN(survenu_le)
                        AS survenu_le,

                    MIN(recu_le)
                        AS recu_le

                FROM mission_evenements

                WHERE operation_id = $1;
                `,
                [
                    operationId
                ]
            );


        const verificationEvenement =
            evenements.rows[0];


        console.log("");
        console.log(
            "EVENEMENT"
        );

        console.table(
            [
                verificationEvenement
            ]
        );


        afficherTest(
            "Un seul événement créé malgré deux envois",
            verificationEvenement
                .nombre === 1
        );


        afficherTest(
            "Evénement = mission_demarree",
            verificationEvenement
                .type_evenement ===
                "mission_demarree"
        );


        /*
         * TEST DE SECURITE :
         * un autre agent tente d'agir
         * sur cette mission.
         */
        const autreAgentResultat =
            await pool.query(
                `
                SELECT
                    u.id
                        AS utilisateur_id,

                    u.email,
                    u.organisation_id,
                    u.role_id,

                    r.nom
                        AS role_nom

                FROM utilisateurs u

                JOIN roles r
                    ON r.id =
                        u.role_id

                JOIN agents a
                    ON a.utilisateur_id =
                        u.id

                WHERE LOWER(
                    TRIM(
                        r.nom
                    )
                ) =
                    'agent_valorisation_carbone'

                  AND u.actif = true

                  AND a.statut =
                    'actif'

                  AND a.id <> $1

                  AND u.organisation_id =
                    $2

                LIMIT 1;
                `,
                [
                    mission.agent_id,
                    mission.organisation_id
                ]
            );


        const autreAgent =
            autreAgentResultat.rows[0];


        if (autreAgent) {

            const tokenAutreAgent =
                creerToken(
                    autreAgent
                );


            const tentative =
                await appeler(
                    tokenAutreAgent,
                    mission.mission_id,
                    {
                        operation_id:
                            randomUUID(),

                        survenu_le:
                            new Date()
                                .toISOString(),

                        observations:
                            "Tentative sécurité."
                    }
                );


            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "TEST 3 - AUTRE AGENT"
            );

            console.log(
                "Statut :",
                tentative.statut
            );

            console.log(
                JSON.stringify(
                    tentative.corps,
                    null,
                    2
                )
            );


            afficherTest(
                "Un autre agent ne peut pas démarrer cette mission",
                tentative.statut ===
                    404
            );

        } else {

            console.log("");
            console.log(
                "[INFO] Aucun second agent actif disponible pour le test de sécurité."
            );

        }


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "FIN DU TEST DEMARRAGE"
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