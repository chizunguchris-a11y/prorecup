import "dotenv/config";

import http
    from "node:http";

import jwt
    from "jsonwebtoken";

import pool
    from "./src/config/db.js";


const appeler = (
    token
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
                            "/api/terrain/journee",

                        method:
                            "GET",

                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    },
                    reponse => {

                        let contenu = "";


                        reponse.on(
                            "data",
                            morceau => {
                                contenu +=
                                    morceau;
                            }
                        );


                        reponse.on(
                            "end",
                            () => {

                                try {

                                    resolve({
                                        statut:
                                            reponse
                                                .statusCode,

                                        corps:
                                            JSON.parse(
                                                contenu
                                            )
                                    });

                                } catch {

                                    resolve({
                                        statut:
                                            reponse
                                                .statusCode,

                                        corps:
                                            contenu
                                    });

                                }

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


const executer = async () => {

    try {

        const resultat =
            await pool.query(`
                SELECT
                    u.id,
                    u.email,
                    u.organisation_id,
                    u.role_id,
                    r.nom AS role_nom

                FROM utilisateurs u

                JOIN roles r
                    ON r.id = u.role_id

                JOIN agents a
                    ON a.utilisateur_id = u.id

                WHERE LOWER(TRIM(r.nom)) =
                    'agent_valorisation_carbone'

                  AND u.actif = true

                  AND a.statut = 'actif'

                LIMIT 1;
            `);


        const agent =
            resultat.rows[0];


        if (!agent) {

            throw new Error(
                "Aucun agent terrain actif."
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
                        agent.id,

                    email:
                        agent.email,

                    organisationId:
                        agent
                            .organisation_id,

                    organisation_id:
                        agent
                            .organisation_id,

                    role:
                        agent.role_nom,

                    roleId:
                        agent.role_id
                },
                secret,
                {
                    expiresIn:
                        "5m"
                }
            );


        const reponse =
            await appeler(
                token
            );


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "TEST TERRAIN /JOURNEE"
        );

        console.log(
            "========================================"
        );

        console.log(
            "Statut :",
            reponse.statut
        );

        console.log(
            JSON.stringify(
                reponse.corps,
                null,
                2
            )
        );


        if (
            reponse.statut ===
            200
        ) {

            console.log("");
            console.log(
                "[OK] PACK JOURNEE ACCESSIBLE"
            );

        } else {

            console.log("");
            console.log(
                "[ECHEC] REPONSE INATTENDUE"
            );

        }


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