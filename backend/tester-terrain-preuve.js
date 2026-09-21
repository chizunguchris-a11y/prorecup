import "dotenv/config";

import http
    from "node:http";

import https
    from "node:https";

import jwt
    from "jsonwebtoken";

import {
    randomUUID,
    createHash
} from "node:crypto";

import pool
    from "./src/config/db.js";


const ajouterChamp = (
    morceaux,
    boundary,
    nom,
    valeur
) => {

    morceaux.push(
        Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="${nom}"\r\n\r\n` +
            `${valeur}\r\n`
        )
    );

};


const construireMultipart = (
    champs,
    fichier
) => {

    const boundary =
        "----ProRecupTerrain" +
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

        ajouterChamp(
            morceaux,
            boundary,
            nom,
            valeur
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


const appelerApi = (
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


            requete.write(
                multipart.buffer
            );


            requete.end();

        }
    );

};


const verifierObjetStorage = (
    bucket,
    chemin
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const urlProjet =
                new URL(
                    process.env
                        .SUPABASE_URL
                );


            const cle =
                process.env
                    .SUPABASE_SECRET_KEY;


            const cheminEncode =
                String(
                    chemin
                )
                    .split("/")
                    .filter(Boolean)
                    .map(
                        partie =>
                            encodeURIComponent(
                                partie
                            )
                    )
                    .join("/");


            const headers = {

                apikey:
                    cle

            };


            if (
                !cle.startsWith(
                    "sb_secret_"
                )
            ) {

                headers.Authorization =
                    `Bearer ${cle}`;

            }


            const requete =
                https.request(
                    {
                        hostname:
                            urlProjet.hostname,

                        port:
                            443,

                        path:
                            `/storage/v1/object/${encodeURIComponent(
                                bucket
                            )}/${cheminEncode}`,

                        method:
                            "GET",

                        headers
                    },
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
                                            reponse.statusCode,

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
                "TEST PREUVE TERRAIN PRO RECUP"
            );

            console.log(
                "========================================"
            );


            /*
             * ------------------------------------------------
             * 1. Mission Terrain exploitable.
             * ------------------------------------------------
             */

            const resultat =
                await pool.query(`
                    SELECT
                        m.id
                            AS mission_id,

                        mc.collecte_id,
                        mc.ordre_collecte,

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

                    ORDER BY
                        m.cree_le DESC,
                        mc.ordre_collecte ASC

                    LIMIT 1;
                `);


            const ligne =
                resultat.rows[0];


            if (!ligne) {

                throw new Error(
                    "Aucune mission Terrain en cours avec collecte."
                );

            }


            if (
                !process.env.JWT_SECRET
            ) {

                throw new Error(
                    "JWT_SECRET absent."
                );

            }


            if (
                !process.env.SUPABASE_URL ||
                !process.env.SUPABASE_SECRET_KEY ||
                !process.env.SUPABASE_STORAGE_BUCKET
            ) {

                throw new Error(
                    "Configuration Supabase Storage incomplète."
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

            console.log(
                "Ordre :",
                ligne.ordre_collecte
            );


            /*
             * ------------------------------------------------
             * 2. JWT du véritable agent.
             * ------------------------------------------------
             */

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


            /*
             * ------------------------------------------------
             * 3. Vrai fichier PNG.
             *
             * Petit fichier pour notre recette.
             * ------------------------------------------------
             */

            const pngBase64 =
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";


            const fichier = {

                nom:
                    "preuve-terrain-test.png",

                mimeType:
                    "image/png",

                buffer:
                    Buffer.from(
                        pngBase64,
                        "base64"
                    )

            };


            const hashAttendu =
                createHash(
                    "sha256"
                )
                    .update(
                        fichier.buffer
                    )
                    .digest(
                        "hex"
                    );


            console.log(
                "Taille fichier :",
                fichier.buffer.length,
                "octets"
            );

            console.log(
                "SHA-256 attendu :",
                hashAttendu
            );


            const operationId =
                randomUUID();


            const champs = {

                operation_id:
                    operationId,

                type_preuve:
                    "avant_collecte",

                pris_le:
                    new Date()
                        .toISOString()

            };


            /*
             * ------------------------------------------------
             * 4. Premier envoi.
             * ------------------------------------------------
             */

            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "TEST 1 - PREMIER ENVOI"
            );


            const premier =
                await appelerApi(
                    token,
                    ligne.mission_id,
                    ligne.collecte_id,
                    champs,
                    fichier
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
                "API retourne 200",
                premier.statut ===
                    200
            );


            ok(
                "Première preuve non doublon",
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


            const preuve =
                premier.corps
                    ?.data
                    ?.preuve;


            if (!preuve) {

                throw new Error(
                    "La preuve est absente de la réponse."
                );

            }


            /*
             * ------------------------------------------------
             * 5. Deuxième envoi IDENTIQUE.
             * ------------------------------------------------
             */

            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "TEST 2 - DOUBLE ENVOI"
            );


            const second =
                await appelerApi(
                    token,
                    ligne.mission_id,
                    ligne.collecte_id,
                    champs,
                    fichier
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
                "Deuxième envoi retourne 200",
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
             * ------------------------------------------------
             * 6. Vérification PostgreSQL.
             * ------------------------------------------------
             */

            const verification =
                await pool.query(
                    `
                    SELECT
                        id,
                        organisation_id,
                        mission_id,
                        collecte_id,
                        type_preuve,
                        storage_bucket,
                        storage_path,
                        mime_type,
                        taille_octets,
                        hash_sha256,
                        pris_le,
                        recu_le,
                        cree_par,
                        operation_id

                    FROM preuves_collecte

                    WHERE operation_id = $1;
                    `,
                    [
                        operationId
                    ]
                );


            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "PREUVE EN BASE"
            );


            console.table(
                verification.rows
            );


            ok(
                "Une seule ligne PostgreSQL",
                verification.rows
                    .length === 1
            );


            const enBase =
                verification.rows[0];


            if (!enBase) {

                throw new Error(
                    "Preuve absente de PostgreSQL."
                );

            }


            ok(
                "Mission correcte",
                enBase.mission_id ===
                    ligne.mission_id
            );


            ok(
                "Collecte correcte",
                enBase.collecte_id ===
                    ligne.collecte_id
            );


            ok(
                "Agent réel enregistré",
                enBase.cree_par ===
                    ligne.utilisateur_id
            );


            ok(
                "Type preuve correct",
                enBase.type_preuve ===
                    "avant_collecte"
            );


            ok(
                "MIME correct",
                enBase.mime_type ===
                    "image/png"
            );


            ok(
                "Taille correcte",
                Number(
                    enBase
                        .taille_octets
                ) ===
                fichier.buffer.length
            );


            ok(
                "SHA-256 correct",
                enBase.hash_sha256 ===
                    hashAttendu
            );


            ok(
                "Bucket correct",
                enBase.storage_bucket ===
                    process.env
                        .SUPABASE_STORAGE_BUCKET
            );


            /*
             * ------------------------------------------------
             * 7. Vérifier que le fichier existe
             * réellement dans le bucket privé.
             * ------------------------------------------------
             */

            const stockage =
                await verifierObjetStorage(
                    enBase.storage_bucket,
                    enBase.storage_path
                );


            console.log("");
            console.log(
                "----------------------------------------"
            );

            console.log(
                "OBJET SUPABASE STORAGE"
            );


            console.log(
                "HTTP :",
                stockage.statut
            );

            console.log(
                "Octets reçus :",
                stockage.taille
            );


            ok(
                "Objet Storage accessible au backend",
                stockage.statut ===
                    200
            );


            ok(
                "Objet Storage non vide",
                stockage.taille >
                    0
            );


            /*
             * ------------------------------------------------
             * 8. Nombre de lignes avec cette opération.
             * ------------------------------------------------
             */

            const doublons =
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
                "Aucun doublon PostgreSQL",
                doublons.rows[0]
                    .nombre === 1
            );


            console.log("");
            console.log(
                "========================================"
            );

            console.log(
                "PREUVE TERRAIN VALIDEE"
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