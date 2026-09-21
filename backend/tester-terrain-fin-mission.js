import "dotenv/config";

import http from "node:http";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import pool from "./src/config/db.js";


const appeler = (
    token,
    missionId,
    corps
) => {

    return new Promise(
        (resolve, reject) => {

            const contenu =
                JSON.stringify(corps);


            const requete =
                http.request(
                    {
                        hostname:
                            "127.0.0.1",

                        port:
                            5000,

                        path:
                            `/api/terrain/missions/${missionId}/terminer`,

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


const ok = (
    texte,
    condition
) => {

    console.log(
        condition
            ? `[OK] ${texte}`
            : `[ECHEC] ${texte}`
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
                "TEST FIN MISSION TERRAIN"
            );

            console.log(
                "========================================"
            );


            /*
             * Chercher une mission en cours dont
             * toutes les collectes sont terminées.
             */
            const resultat =
                await pool.query(`
                    SELECT
                        m.id
                            AS mission_id,

                        m.agent_id,
                        m.tricycle_id,

                        u.id
                            AS utilisateur_id,

                        u.email,
                        u.organisation_id,
                        u.role_id,

                        r.nom
                            AS role_nom

                    FROM missions m

                    JOIN agents a
                        ON a.id = m.agent_id

                    JOIN utilisateurs u
                        ON u.id =
                            a.utilisateur_id

                    JOIN roles r
                        ON r.id =
                            u.role_id

                    WHERE m.statut =
                        'en_cours'

                      AND NOT EXISTS
                      (
                          SELECT 1

                          FROM missions_collectes mc

                          WHERE mc.mission_id =
                                m.id

                            AND NOT EXISTS
                            (
                                SELECT 1

                                FROM mission_evenements me

                                WHERE me.mission_id =
                                      m.id

                                  AND me.collecte_id =
                                      mc.collecte_id

                                  AND me.type_evenement =
                                      'collecte_terminee'
                            )
                      )

                    LIMIT 1;
                `);


            const ligne =
                resultat.rows[0];


            if (!ligne) {

                throw new Error(
                    "Aucune mission en cours prête à être terminée."
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
                    "Test fin complète de tournée Terrain.",

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
                "Mission terminée",
                premier.statut === 200 &&
                premier.corps?.data
                    ?.deja_traitee === false
            );


            console.log("");
            console.log(
                "DEUXIEME ENVOI IDENTIQUE"
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


            ok(
                "Doublon reconnu",
                second.statut === 200 &&
                second.corps?.data
                    ?.deja_traitee === true
            );


            /*
             * Vérifier l'état réel final.
             */
            const verification =
                await pool.query(
                    `
                    SELECT
                        m.statut
                            AS mission_statut,

                        m.heure_depart_reelle,
                        m.heure_retour_reelle,

                        a.disponible
                            AS agent_disponible,

                        t.statut
                            AS tricycle_statut,

                        t.etat
                            AS tricycle_etat

                    FROM missions m

                    JOIN agents a
                        ON a.id = m.agent_id

                    JOIN tricycles t
                        ON t.id =
                            m.tricycle_id

                    WHERE m.id = $1;
                    `,
                    [
                        ligne.mission_id
                    ]
                );


            const final =
                verification.rows[0];


            console.log("");
            console.log(
                "ETAT FINAL"
            );

            console.table(
                [
                    final
                ]
            );


            ok(
                "Mission = terminee",
                final.mission_statut ===
                    "terminee"
            );


            ok(
                "Heure retour réelle enregistrée",
                Boolean(
                    final
                        .heure_retour_reelle
                )
            );


            ok(
                "Agent à nouveau disponible",
                final.agent_disponible ===
                    true
            );


            const statutTricycleAttendu =
                final.tricycle_etat ===
                    "mauvais"
                    ? "en_panne"
                    : "disponible";


            ok(
                "Tricycle correctement libéré",
                final.tricycle_statut ===
                    statutTricycleAttendu
            );


            const evenement =
                await pool.query(
                    `
                    SELECT
                        COUNT(*)::integer
                            AS nombre,

                        MIN(type_evenement)
                            AS type_evenement,

                        MIN(cree_par::text)
                            AS cree_par

                    FROM mission_evenements

                    WHERE operation_id = $1;
                    `,
                    [
                        operationId
                    ]
                );


            const evt =
                evenement.rows[0];


            console.log("");
            console.log(
                "EVENEMENT FINAL"
            );

            console.table(
                [
                    evt
                ]
            );


            ok(
                "Un seul événement final",
                evt.nombre === 1
            );


            ok(
                "Evénement mission_terminee",
                evt.type_evenement ===
                    "mission_terminee"
            );


            ok(
                "Fin attribuée au vrai agent",
                evt.cree_par ===
                    String(
                        ligne.utilisateur_id
                    )
            );


            console.log("");
            console.log(
                "========================================"
            );

            console.log(
                "TOURNEE TERRAIN COMPLETE"
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