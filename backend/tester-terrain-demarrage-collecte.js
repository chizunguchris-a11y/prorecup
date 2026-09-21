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
    collecteId,
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
                            `/api/terrain/missions/${missionId}/collectes/${collecteId}/demarrer`,

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
                                texte += morceau;
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
                                    // Rien.
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


const executer = async () => {

    try {

        /*
         * Nous cherchons la première collecte
         * dont l'arrivée existe mais pas encore
         * le démarrage.
         */
        const resultat =
            await pool.query(`
                SELECT
                    m.id AS mission_id,
                    m.agent_id,

                    mc.collecte_id,
                    mc.ordre_collecte,

                    u.id AS utilisateur_id,
                    u.email,
                    u.organisation_id,
                    u.role_id,

                    r.nom AS role_nom

                FROM missions m

                JOIN missions_collectes mc
                    ON mc.mission_id =
                        m.id

                JOIN agents a
                    ON a.id =
                        m.agent_id

                JOIN utilisateurs u
                    ON u.id =
                        a.utilisateur_id

                JOIN roles r
                    ON r.id =
                        u.role_id

                WHERE m.statut =
                    'en_cours'

                  AND EXISTS
                  (
                      SELECT 1

                      FROM mission_evenements me

                      WHERE me.mission_id =
                            m.id

                        AND me.collecte_id =
                            mc.collecte_id

                        AND me.type_evenement =
                            'arrivee_site'
                  )

                  AND NOT EXISTS
                  (
                      SELECT 1

                      FROM mission_evenements me

                      WHERE me.mission_id =
                            m.id

                        AND me.collecte_id =
                            mc.collecte_id

                        AND me.type_evenement =
                            'collecte_demarree'
                  )

                ORDER BY
                    mc.ordre_collecte ASC
                    NULLS LAST,
                    mc.cree_le ASC

                LIMIT 1;
            `);


        const ligne =
            resultat.rows[0];


        if (!ligne) {

            throw new Error(
                "Aucune collecte prête à démarrer."
            );

        }


        const secret =
            process.env.JWT_SECRET;


        if (!secret) {

            throw new Error(
                "JWT_SECRET absent."
            );

        }


        const token =
            jwt.sign(
                {
                    id:
                        ligne.utilisateur_id,

                    email:
                        ligne.email,

                    organisationId:
                        ligne.organisation_id,

                    organisation_id:
                        ligne.organisation_id,

                    role:
                        ligne.role_nom,

                    roleId:
                        ligne.role_id
                },
                secret,
                {
                    expiresIn:
                        "5m"
                }
            );


        const operationId =
            randomUUID();


        const corps = {

            operation_id:
                operationId,

            survenu_le:
                new Date()
                    .toISOString(),

            observations:
                "Test automatique démarrage collecte.",

            mode:
                "online"

        };


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "TEST DEMARRAGE COLLECTE"
        );

        console.log(
            "========================================"
        );


        /*
         * PREMIER ENVOI
         */
        const premier =
            await appeler(
                token,
                ligne.mission_id,
                ligne.collecte_id,
                corps
            );


        console.log("");
        console.log(
            "PREMIER ENVOI"
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


        console.log(
            premier.statut === 200 &&
            premier.corps?.data
                ?.deja_traitee === false

                ? "[OK] Collecte démarrée"
                : "[ECHEC] Premier démarrage"
        );


        /*
         * MEME OPERATION
         */
        const second =
            await appeler(
                token,
                ligne.mission_id,
                ligne.collecte_id,
                corps
            );


        console.log("");
        console.log(
            "DEUXIEME ENVOI IDENTIQUE"
        );

        console.log(
            "Statut :",
            second.statut
        );


        console.log(
            second.statut === 200 &&
            second.corps?.data
                ?.deja_traitee === true

                ? "[OK] Doublon reconnu"
                : "[ECHEC] Idempotence"
        );


        /*
         * Vérifier l'unicité en base.
         */
        const verification =
            await pool.query(
                `
                SELECT
                    COUNT(*)::integer
                        AS nombre

                FROM mission_evenements

                WHERE operation_id = $1;
                `,
                [
                    operationId
                ]
            );


        console.log(
            verification.rows[0]
                .nombre === 1

                ? "[OK] Un seul événement"
                : "[ECHEC] Plusieurs événements"
        );


        /*
         * ESSAYER DE DEMARRER L'ARRET SUIVANT
         * AVANT DE TERMINER LE PREMIER.
         *
         * Il doit être refusé.
         */
        const suivante =
            await pool.query(
                `
                SELECT mc.collecte_id

                FROM missions_collectes mc

                WHERE mc.mission_id = $1
                  AND mc.collecte_id <> $2

                ORDER BY
                    mc.ordre_collecte ASC
                    NULLS LAST,
                    mc.cree_le ASC

                LIMIT 1;
                `,
                [
                    ligne.mission_id,
                    ligne.collecte_id
                ]
            );


        if (suivante.rows[0]) {

            const tentative =
                await appeler(
                    token,
                    ligne.mission_id,
                    suivante.rows[0]
                        .collecte_id,
                    {
                        operation_id:
                            randomUUID(),

                        survenu_le:
                            new Date()
                                .toISOString(),

                        observations:
                            "Test ordre tournée."
                    }
                );


            console.log("");
            console.log(
                "TEST ARRET SUIVANT"
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


            console.log(
                tentative.statut ===
                    409

                    ? "[OK] Ordre de tournée protégé"
                    : "[ECHEC] L'arrêt suivant a été ouvert trop tôt"
            );

        }


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "FIN TEST"
        );

        console.log(
            "========================================"
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