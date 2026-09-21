import "dotenv/config";

import http from "node:http";

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
                            `/api/terrain/missions/${missionId}/incidents`,

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


const ok = (
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
                "PRO RECUP - TEST INCIDENT TERRAIN"
            );

            console.log(
                "========================================"
            );


            /*
             * Trouver une vraie mission Terrain
             * actuellement en cours.
             */
            const resultat =
                await pool.query(`
                    SELECT
                        m.id
                            AS mission_id,

                        m.agent_id,

                        mc.collecte_id,

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

                    LEFT JOIN missions_collectes mc
                        ON mc.mission_id =
                            m.id

                    WHERE m.statut =
                        'en_cours'

                      AND LOWER(
                            TRIM(
                                r.nom
                            )
                          ) =
                        'agent_valorisation_carbone'

                    ORDER BY
                        m.cree_le DESC

                    LIMIT 1;
                `);


            const ligne =
                resultat.rows[0];


            if (!ligne) {

                throw new Error(
                    "Aucune mission Terrain en cours."
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
                ligne.mission_id
            );

            console.log(
                "Collecte :",
                ligne.collecte_id
            );


            const token =
                jwt.sign(
                    {

                        id:
                            ligne
                                .utilisateur_id,

                        email:
                            ligne.email,

                        organisationId:
                            ligne
                                .organisation_id,

                        organisation_id:
                            ligne
                                .organisation_id,

                        role:
                            ligne.role_nom,

                        roleId:
                            ligne.role_id

                    },
                    process.env.JWT_SECRET,
                    {
                        expiresIn:
                            "5m"
                    }
                );


            const operationId =
                randomUUID();


            /*
             * Premier scénario :
             *
             * client absent à l'arrivée.
             * Incident non bloquant.
             */
            const corps = {

                operation_id:
                    operationId,

                survenu_le:
                    new Date()
                        .toISOString(),

                collecte_id:
                    ligne.collecte_id,

                categorie:
                    "client_absent",

                gravite:
                    "moyenne",

                bloquant:
                    false,

                description:
                    "Client momentanément absent lors du passage de l'agent.",

                mode:
                    "online"

            };


            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "TEST 1 - SIGNALER INCIDENT"
            );


            const premier =
                await appeler(
                    token,
                    ligne.mission_id,
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


            ok(
                "Incident accepté",
                premier.statut ===
                    200
            );


            ok(
                "Premier envoi non doublon",
                premier.corps
                    ?.data
                    ?.deja_traitee ===
                    false
            );


            if (
                premier.statut !==
                200
            ) {

                return;

            }


            const incident =
                premier.corps
                    ?.data
                    ?.incident;


            if (!incident) {

                throw new Error(
                    "Incident absent de la réponse."
                );

            }


            /*
             * Deuxième envoi :
             * EXACTEMENT operation_id identique.
             */
            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "TEST 2 - MEME INCIDENT RENVOYE"
            );


            const second =
                await appeler(
                    token,
                    ligne.mission_id,
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


            ok(
                "Deuxième envoi accepté",
                second.statut ===
                    200
            );


            ok(
                "Doublon reconnu",
                second.corps
                    ?.data
                    ?.deja_traitee ===
                    true
            );


            /*
             * Vérification de l'événement.
             */
            const verificationEvenement =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::integer
                            AS nombre,

                        MIN(type_evenement)
                            AS type_evenement

                    FROM mission_evenements

                    WHERE operation_id = $1;
                    `,
                    [
                        operationId
                    ]
                );


            const evt =
                verificationEvenement
                    .rows[0];


            console.log("");
            console.log(
                "EVENEMENT"
            );


            console.table(
                [
                    evt
                ]
            );


            ok(
                "Un seul incident créé",
                evt.nombre ===
                    1
            );


            ok(
                "Type = incident_signale",
                evt.type_evenement ===
                    "incident_signale"
            );


            /*
             * Vérification notification.
             *
             * La notification contient l'id
             * de l'événement dans contexte.
             */
            const verificationNotification =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::integer
                            AS nombre,

                        MIN(categorie)
                            AS categorie,

                        MIN(titre)
                            AS titre

                    FROM notifications

                    WHERE organisation_id = $1

                      AND categorie =
                            'incident_signale'

                      AND contexte->>'evenement_id'
                            = $2;
                    `,
                    [
                        ligne.organisation_id,
                        incident.id
                    ]
                );


            const notification =
                verificationNotification
                    .rows[0];


            console.log("");
            console.log(
                "NOTIFICATION BACK-OFFICE"
            );


            console.table(
                [
                    notification
                ]
            );


            ok(
                "Une notification créée",
                notification.nombre ===
                    1
            );


            ok(
                "Notification catégorie incident_signale",
                notification.categorie ===
                    "incident_signale"
            );


            /*
             * Vérification du contexte métier.
             */
            const verificationContexte =
                await pool.query(
                    `
                    SELECT
                        contexte

                    FROM mission_evenements

                    WHERE operation_id = $1

                    LIMIT 1;
                    `,
                    [
                        operationId
                    ]
                );


            const contexte =
                verificationContexte
                    .rows[0]
                    ?.contexte ||
                {};


            console.log("");
            console.log(
                "CONTEXTE INCIDENT"
            );


            console.log(
                JSON.stringify(
                    contexte,
                    null,
                    2
                )
            );


            ok(
                "Catégorie conservée",
                contexte.categorie ===
                    "client_absent"
            );


            ok(
                "Gravité conservée",
                contexte.gravite ===
                    "moyenne"
            );


            ok(
                "Incident non bloquant conservé",
                contexte.bloquant ===
                    false
            );


            console.log("");
            console.log(
                "========================================"
            );

            console.log(
                "INCIDENT TERRAIN VALIDE"
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