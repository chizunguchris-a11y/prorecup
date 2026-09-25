import "dotenv/config";

import http from "node:http";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import pool from "./src/config/db.js";


const appeler = (
    token,
    path,
    corps
) => {

    return new Promise(
        (resolve, reject) => {

            const contenu =
                JSON.stringify(corps);

            const req =
                http.request(
                    {
                        hostname: "127.0.0.1",
                        port: 5000,
                        path,
                        method: "POST",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                            "Content-Type":
                                "application/json",
                            "Content-Length":
                                Buffer.byteLength(contenu)
                        }
                    },
                    res => {

                        let texte = "";

                        res.on(
                            "data",
                            morceau => {
                                texte += morceau;
                            }
                        );

                        res.on(
                            "end",
                            () => {

                                let corpsReponse =
                                    texte;

                                try {
                                    corpsReponse =
                                        JSON.parse(texte);
                                } catch {
                                    // Rien.
                                }

                                resolve({
                                    statut:
                                        res.statusCode,
                                    corps:
                                        corpsReponse
                                });

                            }
                        );

                    }
                );

            req.on(
                "error",
                reject
            );

            req.write(contenu);
            req.end();

        }
    );

};


const executer = async () => {

    try {

        const resultat =
            await pool.query(`
                SELECT
                    m.id AS mission_id,

                    mc.collecte_id,
                    mc.ordre_collecte,

                    s.latitude AS site_latitude,
                    s.longitude AS site_longitude,

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

                LEFT JOIN sites_de_collecte s
                    ON s.id = c.site_id

                JOIN agents a
                    ON a.id = m.agent_id

                JOIN utilisateurs u
                    ON u.id = a.utilisateur_id

                JOIN roles r
                    ON r.id = u.role_id

                WHERE m.statut = 'en_cours'

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
                "Aucun arrêt restant."
            );

        }


        if (!process.env.JWT_SECRET) {

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
                process.env.JWT_SECRET,
                {
                    expiresIn: "5m"
                }
            );


        console.log("");
        console.log(
            "ARRET A TRAITER :",
            ligne.ordre_collecte
        );


        /*
         * Vérifie d'abord si l'arrivée
         * existe déjà.
         */
        const arriveeExistante =
            await pool.query(
                `
                SELECT id
                FROM mission_evenements
                WHERE mission_id = $1
                  AND collecte_id = $2
                  AND type_evenement =
                    'arrivee_site'
                LIMIT 1;
                `,
                [
                    ligne.mission_id,
                    ligne.collecte_id
                ]
            );


        if (
            arriveeExistante.rows.length ===
            0
        ) {

            const latitude =
                ligne.site_latitude !== null
                    ? Number(
                        ligne.site_latitude
                    )
                    : 0;

            const longitude =
                ligne.site_longitude !== null
                    ? Number(
                        ligne.site_longitude
                    )
                    : 0;


            const arrivee =
                await appeler(
                    token,

                    `/api/terrain/missions/${ligne.mission_id}/collectes/${ligne.collecte_id}/arrivee`,

                    {
                        operation_id:
                            randomUUID(),

                        survenu_le:
                            new Date()
                                .toISOString(),

                        latitude,
                        longitude,

                        precision_gps:
                            10,

                        observations:
                            "Test arrivée arrêt suivant.",

                        mode:
                            "online"
                    }
                );


            console.log(
                "Arrivée :",
                arrivee.statut
            );


            if (
                arrivee.statut !== 200
            ) {

                console.log(
                    arrivee.corps
                );

                return;

            }

            console.log(
                "[OK] Arrivée enregistrée"
            );

        } else {

            console.log(
                "[OK] Arrivée déjà présente"
            );

        }


        /*
         * Vérifie le démarrage.
         */
        const debutExistant =
            await pool.query(
                `
                SELECT id
                FROM mission_evenements
                WHERE mission_id = $1
                  AND collecte_id = $2
                  AND type_evenement =
                    'collecte_demarree'
                LIMIT 1;
                `,
                [
                    ligne.mission_id,
                    ligne.collecte_id
                ]
            );


        if (
            debutExistant.rows.length ===
            0
        ) {

            const demarrage =
                await appeler(
                    token,

                    `/api/terrain/missions/${ligne.mission_id}/collectes/${ligne.collecte_id}/demarrer`,

                    {
                        operation_id:
                            randomUUID(),

                        survenu_le:
                            new Date()
                                .toISOString(),

                        observations:
                            "Test démarrage arrêt suivant.",

                        mode:
                            "online"
                    }
                );


            console.log(
                "Démarrage :",
                demarrage.statut
            );


            if (
                demarrage.statut !== 200
            ) {

                console.log(
                    demarrage.corps
                );

                return;

            }

            console.log(
                "[OK] Collecte démarrée"
            );

        } else {

            console.log(
                "[OK] Collecte déjà démarrée"
            );

        }


        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "[OK] ARRET PRET A ETRE TERMINE"
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