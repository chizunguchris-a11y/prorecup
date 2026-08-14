import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";
import pool from "../src/config/db.js";

describe("Missions", function () {

    this.timeout(30000);

    let token;
    let agentId;
    let tricycleId;
    let missionId;

    before(async function () {

        const reponseConnexion =
            await request(app)
                .post("/api/auth/login")
                .send({
                    email:
                        "christian2@prorecup.com",

                    motDePasse:
                        "ProRecup2026!"
                })
                .expect(200);

        token =
            reponseConnexion.body.token;

        assert.ok(
            token,
            "Le token de connexion est absent."
        );

        const reponseAgents =
            await request(app)
                .get("/api/agents")
                .set(
                    "Authorization",
                    `Bearer ${token}`
                )
                .expect(200);

        const agentDisponible =
            reponseAgents.body.data.find(
                (agent) =>
                    agent.statut === "actif" &&
                    agent.disponible === true
            );

        if (!agentDisponible) {
            throw new Error(
                "Aucun agent actif et disponible n'a été trouvé pour les tests."
            );
        }

        agentId =
            agentDisponible.id;

        const reponseTricycles =
            await request(app)
                .get("/api/tricycles")
                .set(
                    "Authorization",
                    `Bearer ${token}`
                )
                .expect(200);

        const tricycleDisponible =
            reponseTricycles.body.data.find(
                (tricycle) =>
                    tricycle.statut ===
                        "disponible" &&
                    tricycle.etat !==
                        "mauvais"
            );

        if (!tricycleDisponible) {
            throw new Error(
                "Aucun tricycle disponible n'a été trouvé pour les tests."
            );
        }

        tricycleId =
            tricycleDisponible.id;

    });

    after(async function () {

        if (missionId) {

            try {

                await pool.query(
                    `
                        DELETE FROM missions
                        WHERE id = $1;
                    `,
                    [missionId]
                );

            } catch (erreur) {

                console.warn(
                    "Nettoyage de la mission de test impossible :",
                    erreur.message
                );

            }

        }

        if (agentId) {

            await pool.query(
                `
                    UPDATE agents
                    SET disponible = true
                    WHERE id = $1;
                `,
                [agentId]
            );

        }

        if (tricycleId) {

            await pool.query(
                `
                    UPDATE tricycles
                    SET statut = 'disponible'
                    WHERE id = $1;
                `,
                [tricycleId]
            );

        }

    });

    it(
        "GET /api/missions doit retourner la liste des missions",
        async function () {

            const reponse =
                await request(app)
                    .get("/api/missions")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Missions récupérées avec succès."
            );

            assert.ok(
                Array.isArray(
                    reponse.body.data
                )
            );

        }
    );

    it(
        "POST /api/missions doit créer une mission planifiée",
        async function () {

            const dateFuture =
                new Date(
                    Date.now() +
                    7 * 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .slice(0, 10);

            const reponse =
                await request(app)
                    .post("/api/missions")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        agent_id:
                            agentId,

                        tricycle_id:
                            tricycleId,

                        date_prevue:
                            dateFuture,

                        heure_depart_prevue:
                            "08:00",

                        heure_retour_prevue:
                            "16:00",

                        observations:
                            "Mission temporaire créée par les tests."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Mission créée avec succès."
            );

            assert.ok(
                reponse.body.data.id
            );

            assert.equal(
                reponse.body.data.statut,
                "planifiee"
            );

            missionId =
                reponse.body.data.id;

        }
    );

    it(
        "POST /api/missions doit refuser un conflit de planning",
        async function () {

            assert.ok(
                missionId,
                "La mission de test n'a pas été créée."
            );

            const datePrevue =
    new Date(
        Date.now() +
        7 * 24 * 60 * 60 * 1000
    )
        .toISOString()
        .slice(0, 10);

            const reponse =
                await request(app)
                    .post("/api/missions")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        agent_id:
                            agentId,

                        tricycle_id:
                            tricycleId,

                        date_prevue:
                            datePrevue,

                        heure_depart_prevue:
                            "09:00",

                        heure_retour_prevue:
                            "17:00"
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.match(
                reponse.body.error,
                /mission planifiée à cette date|déjà affecté/i
            );

        }
    );

    it(
        "PUT /api/missions/:id doit modifier une mission planifiée",
        async function () {

            assert.ok(
                missionId,
                "La mission de test n'a pas été créée."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/missions/${missionId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        heure_depart_prevue:
                            "09:00",

                        heure_retour_prevue:
                            "17:00",

                        observations:
                            "Mission modifiée par les tests."
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Mission modifiée avec succès."
            );

            assert.equal(
                reponse.body.data
                    .heure_depart_prevue,
                "09:00:00"
            );

        }
    );

    it(
        "PATCH /api/missions/:id/statut doit démarrer la mission",
        async function () {

            const reponse =
                await request(app)
                    .patch(
                        `/api/missions/${missionId}/statut`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        statut:
                            "en_cours"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.data.statut,
                "en_cours"
            );

            const agent =
                await pool.query(
                    `
                        SELECT disponible
                        FROM agents
                        WHERE id = $1;
                    `,
                    [agentId]
                );

            assert.equal(
                agent.rows[0].disponible,
                false
            );

            const tricycle =
                await pool.query(
                    `
                        SELECT statut
                        FROM tricycles
                        WHERE id = $1;
                    `,
                    [tricycleId]
                );

            assert.equal(
                tricycle.rows[0].statut,
                "en_mission"
            );

        }
    );

    it(
        "PUT /api/missions/:id doit refuser la modification d'une mission en cours",
        async function () {

            const reponse =
                await request(app)
                    .put(
                        `/api/missions/${missionId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        observations:
                            "Modification interdite."
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.match(
                reponse.body.error,
                /mission planifiée/i
            );

        }
    );

    it(
        "PATCH /api/missions/:id/statut doit terminer la mission",
        async function () {

            const reponse =
                await request(app)
                    .patch(
                        `/api/missions/${missionId}/statut`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        statut:
                            "terminee"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.data.statut,
                "terminee"
            );

            const agent =
                await pool.query(
                    `
                        SELECT disponible
                        FROM agents
                        WHERE id = $1;
                    `,
                    [agentId]
                );

            assert.equal(
                agent.rows[0].disponible,
                true
            );

            const tricycle =
                await pool.query(
                    `
                        SELECT statut
                        FROM tricycles
                        WHERE id = $1;
                    `,
                    [tricycleId]
                );

            assert.equal(
                tricycle.rows[0].statut,
                "disponible"
            );

        }
    );

    it(
        "PATCH /api/missions/:id/statut doit refuser une transition après terminaison",
        async function () {

            const reponse =
                await request(app)
                    .patch(
                        `/api/missions/${missionId}/statut`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        statut:
                            "annulee"
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.match(
                reponse.body.error,
                /transition/i
            );

        }
    );

    it(
        "GET /api/missions doit refuser une requête sans token",
        async function () {

            const reponse =
                await request(app)
                    .get("/api/missions")
                    .expect(401);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.equal(
                reponse.body.error,
                "Token manquant."
            );

        }
    );

});