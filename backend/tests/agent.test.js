import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";
import pool from "../src/config/db.js";

describe("Agents", function () {

    this.timeout(30000);

    let token;
    let utilisateurId;
    let agentId;

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

        utilisateurId =
            reponseConnexion.body.utilisateur?.id ||
            reponseConnexion.body.user?.id ||
            reponseConnexion.body.data?.utilisateur?.id ||
            reponseConnexion.body.data?.user?.id;

        if (!utilisateurId) {

            throw new Error(
                "Impossible de récupérer l'identifiant de l'utilisateur connecté depuis la réponse de connexion."
            );

        }

    });

    after(async function () {

        if (!agentId) {
            return;
        }

        try {

            await pool.query(
                `
                    UPDATE agents
                    SET
                        statut = 'actif',
                        disponible = true,
                        modifie_le = CURRENT_TIMESTAMP
                    WHERE id = $1;
                `,
                [agentId]
            );

        } catch (erreur) {

            console.warn(
                "Nettoyage de l'agent de test impossible :",
                erreur.message
            );

        }

    });

    it(
        "GET /api/agents doit retourner la liste des agents",
        async function () {

            const reponse =
                await request(app)
                    .get("/api/agents")
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
                "Agents récupérés avec succès."
            );

            assert.ok(
                Array.isArray(
                    reponse.body.data
                )
            );

            const agentExistant =
                reponse.body.data.find(
                    (agent) =>
                        agent.utilisateur_id ===
                        utilisateurId
                );

            if (agentExistant) {

                agentId =
                    agentExistant.id;

            }

        }
    );

    it(
        "POST /api/agents doit créer un profil agent si aucun profil n'existe",
        async function () {

            if (agentId) {

                this.skip();

                return;

            }

            const reponse =
                await request(app)
                    .post("/api/agents")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        utilisateur_id:
                            utilisateurId,

                        telephone:
                            "+243900000123",

                        photo_url:
                            "https://example.com/agent-test.jpg",

                        statut:
                            "actif",

                        disponible:
                            true,

                        date_embauche:
                            "2026-07-26"
                    })
                    .expect(201);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Agent créé avec succès."
            );

            assert.ok(
                reponse.body.data
            );

            assert.ok(
                reponse.body.data.id
            );

            assert.equal(
                reponse.body.data.utilisateur_id,
                utilisateurId
            );

            agentId =
                reponse.body.data.id;

        }
    );

    it(
        "POST /api/agents doit refuser un doublon pour le même utilisateur",
        async function () {

            assert.ok(
                utilisateurId,
                "L'identifiant utilisateur est absent."
            );

            const reponse =
                await request(app)
                    .post("/api/agents")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        utilisateur_id:
                            utilisateurId,

                        telephone:
                            "+243900000999",

                        statut:
                            "actif",

                        disponible:
                            true
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.ok(
                reponse.body.error
            );

            assert.match(
                reponse.body.error,
                /possède déjà un profil agent/i
            );

        }
    );

    it(
        "PUT /api/agents/:id doit modifier le profil agent",
        async function () {

            assert.ok(
                agentId,
                "Le profil agent de test est absent."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/agents/${agentId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        telephone:
                            "+243900000111",

                        photo_url:
                            "https://example.com/agent-modifie.jpg",

                        disponible:
                            false,

                        date_embauche:
                            "2026-07-26"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Agent modifié avec succès."
            );

            assert.equal(
                reponse.body.data.telephone,
                "+243900000111"
            );

            assert.equal(
                reponse.body.data.disponible,
                false
            );

        }
    );

    it(
        "PATCH /api/agents/:id/statut doit suspendre l'agent",
        async function () {

            assert.ok(
                agentId,
                "Le profil agent de test est absent."
            );

            const reponse =
                await request(app)
                    .patch(
                        `/api/agents/${agentId}/statut`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        statut:
                            "suspendu"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Statut de l'agent modifié avec succès."
            );

            assert.equal(
                reponse.body.data.statut,
                "suspendu"
            );

            assert.equal(
                reponse.body.data.disponible,
                false
            );

        }
    );

    it(
        "PATCH /api/agents/:id/statut doit réactiver l'agent",
        async function () {

            assert.ok(
                agentId,
                "Le profil agent de test est absent."
            );

            const reponse =
                await request(app)
                    .patch(
                        `/api/agents/${agentId}/statut`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        statut:
                            "actif"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.data.statut,
                "actif"
            );

        }
    );

    it(
        "GET /api/agents doit refuser une requête sans token",
        async function () {

            const reponse =
                await request(app)
                    .get("/api/agents")
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