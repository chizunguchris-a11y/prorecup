import "dotenv/config";

import http
    from "node:http";

import https
    from "node:https";

import jwt
    from "jsonwebtoken";

import {
    randomUUID
} from "node:crypto";

import pool
    from "./src/config/db.js";


const requeteJson = (
    token,
    chemin
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
                            chemin,

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
                                texte += morceau;
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


const telechargerUrl = (
    url
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const cible =
                new URL(
                    url
                );


            const moduleHttp =
                cible.protocol ===
                    "https:"
                    ? https
                    : http;


            const requete =
                moduleHttp.get(
                    cible,
                    reponse => {

                        let taille =
                            0;


                        reponse.on(
                            "data",
                            morceau => {

                                taille +=
                                    morceau.length;

                            }
                        );


                        reponse.on(
                            "end",
                            () => {

                                resolve(
                                    {
                                        statut:
                                            reponse
                                                .statusCode,

                                        taille
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

        }
    );

};


const construireMultipart = (
    champs,
    fichier
) => {

    const boundary =
        "----ProRecupSecurite" +
        Date.now() +
        Math.random()
            .toString(16)
            .slice(2);


    const morceaux = [];


    for (
        const [
            nom,
            valeur
        ] of Object.entries(
            champs
        )
    ) {

        morceaux.push(
            Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${nom}"\r\n\r\n` +
                `${valeur}\r\n`
            )
        );

    }


    morceaux.push(
        Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="fichier"; filename="${fichier.nom}"\r\n` +
            `Content-Type: ${fichier.mimeType}\r\n\r\n`
        )
    );


    morceaux.push(
        fichier.buffer
    );


    morceaux.push(
        Buffer.from(
            "\r\n"
        )
    );


    morceaux.push(
        Buffer.from(
            `--${boundary}--\r\n`
        )
    );


    return {

        boundary,

        buffer:
            Buffer.concat(
                morceaux
            )

    };

};


const envoyerFaussePreuve = (
    token,
    missionId,
    collecteId,
    champs,
    fichier
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const multipart =
                construireMultipart(
                    champs,
                    fichier
                );


            const requete =
                http.request(
                    {
                        hostname:
                            "127.0.0.1",

                        port:
                            5000,

                        path:
                            `/api/terrain/missions/${missionId}/collectes/${collecteId}/preuves`,

                        method:
                            "POST",

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                `multipart/form-data; boundary=${multipart.boundary}`,

                            "Content-Length":
                                multipart.buffer.length

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

                                let corps =
                                    texte;


                                try {

                                    corps =
                                        JSON.parse(
                                            texte
                                        );

                                } catch {
                                    // Rien.
                                }


                                resolve(
                                    {
                                        statut:
                                            reponse
                                                .statusCode,

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


            requete.write(
                multipart.buffer
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
                "SECURITE PREUVES TERRAIN"
            );

            console.log(
                "========================================"
            );


            /*
             * On récupère une vraie preuve
             * créée précédemment par un agent Terrain.
             */
            const resultat =
                await pool.query(`
                    SELECT
                        p.id
                            AS preuve_id,

                        p.mission_id,
                        p.collecte_id,
                        p.pris_le,

                        p.cree_par
                            AS utilisateur_id,

                        u.email,
                        u.organisation_id,
                        u.role_id,

                        r.nom
                            AS role_nom

                    FROM preuves_collecte p

                    JOIN utilisateurs u
                        ON u.id =
                            p.cree_par

                    JOIN roles r
                        ON r.id =
                            u.role_id

                    WHERE LOWER(
                            TRIM(
                                r.nom
                            )
                          ) =
                        'agent_valorisation_carbone'

                    ORDER BY
                        p.cree_le DESC

                    LIMIT 1;
                `);


            const ligne =
                resultat.rows[0];


            if (!ligne) {

                throw new Error(
                    "Aucune preuve Terrain disponible."
                );

            }


            if (
                !process.env.JWT_SECRET
            ) {

                throw new Error(
                    "JWT_SECRET absent."
                );

            }


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


            console.log(
                "Preuve :",
                ligne.preuve_id
            );

            console.log(
                "Mission :",
                ligne.mission_id
            );

            console.log(
                "Collecte :",
                ligne.collecte_id
            );


            /*
             * ================================================
             * TEST 1
             * URL SIGNEE
             * ================================================
             */

            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "TEST 1 - URL SIGNEE PRIVEE"
            );


            const reponseUrl =
                await requeteJson(
                    token,

                    `/api/terrain/missions/${ligne.mission_id}/collectes/${ligne.collecte_id}/preuves/${ligne.preuve_id}/url`
                );


            console.log(
                "Statut API :",
                reponseUrl.statut
            );


            ok(
                "API URL signée retourne 200",
                reponseUrl.statut ===
                    200
            );


            const urlSignee =
                reponseUrl.corps
                    ?.data
                    ?.url;


            const expiration =
                reponseUrl.corps
                    ?.data
                    ?.expire_dans_secondes;


            ok(
                "URL temporaire reçue",
                Boolean(
                    urlSignee
                )
            );


            ok(
                "Expiration = 300 secondes",
                expiration ===
                    300
            );


            /*
             * Ne surtout pas afficher l'URL complète
             * puisqu'elle contient un jeton temporaire.
             */
            console.log(
                "URL reçue :",
                urlSignee
                    ? "OUI"
                    : "NON"
            );


            if (
                !urlSignee
            ) {

                throw new Error(
                    "URL signée absente."
                );

            }


            const fichierPrive =
                await telechargerUrl(
                    urlSignee
                );


            console.log(
                "HTTP Storage :",
                fichierPrive.statut
            );

            console.log(
                "Octets reçus :",
                fichierPrive.taille
            );


            ok(
                "URL signée permet de lire la preuve",
                fichierPrive.statut ===
                    200
            );


            ok(
                "Fichier signé non vide",
                fichierPrive.taille >
                    0
            );


            /*
             * ================================================
             * TEST 2
             * FAUX PNG
             * ================================================
             */

            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "TEST 2 - FAUX FICHIER PNG"
            );


            const operationId =
                randomUUID();


            const fauxFichier = {

                nom:
                    "fausse-preuve.png",

                mimeType:
                    "image/png",

                /*
                 * Le navigateur prétend que c'est un PNG,
                 * mais le contenu est seulement du texte.
                 */
                buffer:
                    Buffer.from(
                        "CECI N'EST PAS UNE IMAGE PNG PRO RECUP",
                        "utf8"
                    )

            };


            const faussePreuve =
                await envoyerFaussePreuve(
                    token,
                    ligne.mission_id,
                    ligne.collecte_id,
                    {

                        operation_id:
                            operationId,

                        type_preuve:
                            "anomalie",

                        /*
                         * On réutilise une date déjà
                         * valide dans la tournée.
                         */
                        pris_le:
                            new Date(
                                ligne.pris_le
                            )
                                .toISOString()

                    },
                    fauxFichier
                );


            console.log(
                "Statut API :",
                faussePreuve.statut
            );


            console.log(
                "Message :",
                faussePreuve.corps
                    ?.message ||
                faussePreuve.corps
                    ?.error ||
                "non affiché"
            );


            ok(
                "Faux PNG refusé",
                faussePreuve.statut ===
                    400
            );


            /*
             * Vérifier que le rejet n'a
             * créé aucune preuve en base.
             */
            const verification =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::integer
                            AS nombre

                    FROM preuves_collecte

                    WHERE operation_id = $1;
                    `,
                    [
                        operationId
                    ]
                );


            ok(
                "Aucune ligne PostgreSQL créée",
                verification.rows[0]
                    .nombre === 0
            );


            console.log("");
            console.log(
                "========================================"
            );

            console.log(
                "SECURITE PREUVES VALIDEE"
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