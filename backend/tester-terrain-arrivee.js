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
                            `/api/terrain/missions/${missionId}/collectes/${collecteId}/arrivee`,

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

        const resultat =
            await pool.query(`
                SELECT
                    m.id AS mission_id,
                    m.agent_id,

                    mc.collecte_id,

                    s.latitude
                        AS site_latitude,

                    s.longitude
                        AS site_longitude,

                    u.id
                        AS utilisateur_id,

                    u.email,
                    u.organisation_id,
                    u.role_id,

                    r.nom
                        AS role_nom

                FROM missions m

                JOIN missions_collectes mc
                    ON mc.mission_id =
                        m.id

                JOIN collectes c
                    ON c.id =
                        mc.collecte_id

                LEFT JOIN sites_de_collecte s
                    ON s.id =
                        c.site_id

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

                  AND LOWER(
                    TRIM(
                        r.nom
                    )
                  ) =
                    'agent_valorisation_carbone'

                  AND NOT EXISTS
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

                ORDER BY
                    mc.ordre_collecte ASC
                    NULLS LAST

                LIMIT 1;
            `);


        const ligne =
            resultat.rows[0];


        if (!ligne) {

            throw new Error(
                "Aucune collecte en cours disponible pour tester l'arrivée."
            );

        }


        const secret =
            process.env.JWT_SECRET;


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


        /*
         * Si le site possède déjà une référence GPS,
         * on utilise exactement cette position :
         * distance attendue ≈ 0 m.
         *
         * Sinon, nous utilisons 0/0 UNIQUEMENT
         * pour cette mission technique de recette.
         */
        const referenceDisponible =
            ligne.site_latitude !==
                null &&
            ligne.site_longitude !==
                null;


        const latitude =
            referenceDisponible
                ? Number(
                    ligne.site_latitude
                )
                : 0;


        const longitude =
            referenceDisponible
                ? Number(
                    ligne.site_longitude
                )
                : 0;


        const operationId =
            randomUUID();


        const corps = {

            operation_id:
                operationId,

            survenu_le:
                new Date()
                    .toISOString(),

            latitude,

            longitude,

            precision_gps:
                10,

            observations:
                referenceDisponible
                    ? "Test arrivée Terrain sur référence GPS."
                    : "TEST TECHNIQUE - site sans référence GPS.",

            mode:
                "online"

        };


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "TEST ARRIVEE TERRAIN"
        );

        console.log(
            "========================================"
        );


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
            premier.statut === 200
                ? "[OK] Arrivée enregistrée"
                : "[ECHEC] Arrivée"
        );


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


        const dejaTraitee =
            second.corps &&
            second.corps.data &&
            second.corps.data
                .deja_traitee === true;


        console.log(
            second.statut === 200 &&
            dejaTraitee
                ? "[OK] Doublon reconnu"
                : "[ECHEC] Idempotence"
        );


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
                ? "[OK] Un seul événement en base"
                : "[ECHEC] Plusieurs événements"
        );


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "FIN TEST ARRIVEE"
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