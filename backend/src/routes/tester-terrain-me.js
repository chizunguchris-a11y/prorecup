import "dotenv/config";

import http
    from "node:http";

import jwt
    from "jsonwebtoken";

import pool
    from "./src/config/db.js";


const appelerTerrainMe = (
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
                            "/api/terrain/me",

                        method:
                            "GET",

                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    },
                    (
                        reponse
                    ) => {

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

                                let corps =
                                    contenu;

                                try {

                                    corps =
                                        JSON.parse(
                                            contenu
                                        );

                                } catch {
                                    // Réponse non JSON.
                                }

                                resolve({
                                    statut:
                                        reponse.statusCode,

                                    corps
                                });

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


const creerToken = (
    utilisateur,
    organisationId
) => {

    const secret =
        process.env.JWT_SECRET;


    if (!secret) {

        throw new Error(
            "JWT_SECRET est absent. Test annulé."
        );

    }


    return jwt.sign(
        {
            id:
                utilisateur.id,

            email:
                utilisateur.email,

            organisationId,

            organisation_id:
                organisationId,

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


const afficherResultat = (
    titre,
    resultat,
    statutAttendu
) => {

    console.log("");
    console.log(
        "----------------------------------------"
    );

    console.log(titre);

    console.log(
        "Statut reçu :",
        resultat.statut
    );

    console.log(
        "Statut attendu :",
        statutAttendu
    );


    if (
        resultat.statut ===
        statutAttendu
    ) {

        console.log(
            "[OK] TEST REUSSI"
        );

    } else {

        console.log(
            "[ECHEC] TEST NON CONFORME"
        );

    }


    console.log(
        JSON.stringify(
            resultat.corps,
            null,
            2
        )
    );

};


const tester = async () => {

    try {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "PRO RECUP - TEST SECURITE TERRAIN"
        );

        console.log(
            "========================================"
        );


        /*
         * 1. Chercher un véritable agent terrain actif.
         */
        const resultatAgent =
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
            resultatAgent.rows[0];


        if (!agent) {

            throw new Error(
                "Aucun compte agent_valorisation_carbone actif avec profil Agent n'a été trouvé."
            );

        }


        const tokenAgent =
            creerToken(
                agent,
                agent.organisation_id
            );


        const reponseAgent =
            await appelerTerrainMe(
                tokenAgent
            );


        afficherResultat(
            "TEST 1 - AGENT TERRAIN AUTORISE",
            reponseAgent,
            200
        );


        /*
         * 2. Vérifier qu'un manager/admin
         * ne peut pas entrer dans l'espace Terrain.
         */
        const resultatResponsable =
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

                WHERE LOWER(TRIM(r.nom))
                    IN ('manager', 'admin')

                  AND u.actif = true

                LIMIT 1;
            `);


        const responsable =
            resultatResponsable.rows[0];


        if (responsable) {

            const tokenResponsable =
                creerToken(
                    responsable,
                    responsable
                        .organisation_id
                );


            const reponseResponsable =
                await appelerTerrainMe(
                    tokenResponsable
                );


            afficherResultat(
                "TEST 2 - MANAGER/ADMIN REFUSE",
                reponseResponsable,
                403
            );

        } else {

            console.log("");
            console.log(
                "[INFO] Aucun manager/admin actif trouvé : test 2 ignoré."
            );

        }


        /*
         * 3. Même agent, mais faux contexte organisation.
         */
        const mauvaiseOrganisation =
            "00000000-0000-0000-0000-000000000000";


        const fauxToken =
            creerToken(
                agent,
                mauvaiseOrganisation
            );


        const reponseOrganisation =
            await appelerTerrainMe(
                fauxToken
            );


        afficherResultat(
            "TEST 3 - MAUVAISE ORGANISATION REFUSEE",
            reponseOrganisation,
            403
        );


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "FIN DES TESTS"
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


tester();