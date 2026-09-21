import "dotenv/config";

import http from "node:http";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import pool from "./src/config/db.js";


const appeler = (
    token,
    missionId,
    collecteId,
    corps
) => {

    return new Promise(
        (resolve, reject) => {

            const contenu =
                JSON.stringify(corps);

            const requete =
                http.request(
                    {
                        hostname: "127.0.0.1",
                        port: 5000,

                        path:
                            `/api/terrain/missions/${missionId}/collectes/${collecteId}/terminer`,

                        method: "POST",

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
                                        reponse.statusCode,

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

        console.log("");
        console.log(
            "========================================"
        );
        console.log(
            "TEST FIN COLLECTE TERRAIN"
        );
        console.log(
            "========================================"
        );


        const resultat =
            await pool.query(`
                SELECT
                    m.id AS mission_id,
                    mc.collecte_id,
                    mc.ordre_collecte,
                    c.poids_estime,

                    u.id AS utilisateur_id,
                    u.email,
                    u.organisation_id,
                    u.role_id,
                    r.nom AS role_nom

                FROM missions m

                JOIN missions_collectes mc
                    ON mc.mission_id = m.id

                JOIN collectes c
                    ON c.id = mc.collecte_id

                JOIN agents a
                    ON a.id = m.agent_id

                JOIN utilisateurs u
                    ON u.id = a.utilisateur_id

                JOIN roles r
                    ON r.id = u.role_id

                WHERE m.statut = 'en_cours'

                  AND EXISTS (
                      SELECT 1
                      FROM mission_evenements me
                      WHERE me.mission_id = m.id
                        AND me.collecte_id =
                            mc.collecte_id
                        AND me.type_evenement =
                            'collecte_demarree'
                  )

                  AND NOT EXISTS (
                      SELECT 1
                      FROM mission_evenements me
                      WHERE me.mission_id = m.id
                        AND me.collecte_id =
                            mc.collecte_id
                        AND me.type_evenement =
                            'collecte_terminee'
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
                "Aucune collecte actuellement en cours."
            );

        }


        if (!process.env.JWT_SECRET) {

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

        console.log(
            "Ordre :",
            ligne.ordre_collecte
        );

        console.log(
            "Poids estimé :",
            ligne.poids_estime,
            "kg"
        );


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
                process.env.JWT_SECRET,
                {
                    expiresIn: "5m"
                }
            );


        const operationId =
            randomUUID();


        const poidsEstime =
            Number(
                ligne.poids_estime
            );


        const poidsReel =
            poidsEstime === 30
                ? 27.5
                : Math.max(
                    0.5,
                    poidsEstime - 2.5
                );


        const corps = {

            operation_id:
                operationId,

            survenu_le:
                new Date()
                    .toISOString(),

            resultat_terrain:
                "collectee",

            poids_reel:
                poidsReel,

            observations:
                "Test fin collecte Terrain.",

            mode:
                "online"

        };


        console.log("");
        console.log(
            "PREMIER ENVOI"
        );


        const premier =
            await appeler(
                token,
                ligne.mission_id,
                ligne.collecte_id,
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


        console.log(
            premier.statut === 200
                ? "[OK] Collecte terminée"
                : "[ECHEC] Fin collecte"
        );


        if (
            premier.statut !== 200
        ) {

            return;

        }


        console.log("");
        console.log(
            "DEUXIEME ENVOI IDENTIQUE"
        );


        const second =
            await appeler(
                token,
                ligne.mission_id,
                ligne.collecte_id,
                corps
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


        const verification =
            await pool.query(
                `
                SELECT
                    poids_estime,
                    poids_reel,
                    resultat_terrain,
                    motif_terrain,
                    poids_reel_saisi_le

                FROM collectes

                WHERE id = $1;
                `,
                [
                    ligne.collecte_id
                ]
            );


        const evenement =
            await pool.query(
                `
                SELECT COUNT(*)::integer
                    AS nombre

                FROM mission_evenements

                WHERE operation_id = $1;
                `,
                [
                    operationId
                ]
            );


        console.log("");
        console.log(
            "ETAT EN BASE"
        );

        console.table(
            verification.rows
        );


        console.log(
            Number(
                verification.rows[0]
                    .poids_reel
            ) === poidsReel

                ? "[OK] Poids réel enregistré"
                : "[ECHEC] Poids réel"
        );


        console.log(
            verification.rows[0]
                .resultat_terrain ===
                "collectee"

                ? "[OK] Résultat terrain enregistré"
                : "[ECHEC] Résultat terrain"
        );


        console.log(
            evenement.rows[0]
                .nombre === 1

                ? "[OK] Un seul événement malgré deux envois"
                : "[ECHEC] Doublon en base"
        );


        const ecart =
            poidsReel -
            poidsEstime;


        console.log("");
        console.log(
            "Poids estimé :",
            poidsEstime,
            "kg"
        );

        console.log(
            "Poids réel :",
            poidsReel,
            "kg"
        );

        console.log(
            "Écart :",
            ecart.toFixed(3),
            "kg"
        );


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