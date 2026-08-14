import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";
import pool from "../src/config/db.js";

describe("Tricycles", function () {

    this.timeout(30000);

    let token;
    let tricycleId;
    let numeroTest;
    let plaqueTest;

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

        const suffixe =
            Date.now();

        numeroTest =
            `TRI-TEST-${suffixe}`;

        plaqueTest =
            `PR-TEST-${suffixe}`;

    });

    after(async function () {

        /*
         * Nettoyage du tricycle temporaire.
         * Cette suppression directe est réservée
         * au contexte des tests automatisés.
         */
        if (tricycleId) {

            try {

                await pool.query(
                    `
                        DELETE FROM tricycles
                        WHERE id = $1;
                    `,
                    [tricycleId]
                );

            } catch (erreur) {

                console.warn(
                    "Nettoyage du tricycle de test impossible :",
                    erreur.message
                );

            }

        }

    });

    it(
        "GET /api/tricycles doit retourner la liste des tricycles",
        async function () {

            const reponse =
                await request(app)
                    .get("/api/tricycles")
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
                "Tricycles récupérés avec succès."
            );

            assert.ok(
                Array.isArray(
                    reponse.body.data
                )
            );

        }
    );

    it(
        "POST /api/tricycles doit créer un nouveau tricycle",
        async function () {

            const reponse =
                await request(app)
                    .post("/api/tricycles")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        numero_interne:
                            numeroTest,

                        plaque_identification:
                            plaqueTest,

                        marque:
                            "TVS",

                        modele:
                            "King Cargo Test",

                        capacite_kg:
                            350,

                        statut:
                            "disponible",

                        etat:
                            "bon",

                        date_mise_en_service:
                            "2026-07-27",

                        observations:
                            "Tricycle temporaire créé par les tests."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Tricycle créé avec succès."
            );

            assert.ok(
                reponse.body.data
            );

            assert.ok(
                reponse.body.data.id
            );

            assert.equal(
                reponse.body.data.numero_interne,
                numeroTest
            );

            assert.equal(
                reponse.body.data.plaque_identification,
                plaqueTest
            );

            assert.equal(
                Number(
                    reponse.body.data.capacite_kg
                ),
                350
            );

            assert.equal(
                reponse.body.data.statut,
                "disponible"
            );

            assert.equal(
                reponse.body.data.etat,
                "bon"
            );

            tricycleId =
                reponse.body.data.id;

        }
    );

    it(
        "POST /api/tricycles doit refuser un numéro interne déjà utilisé",
        async function () {

            assert.ok(
                tricycleId,
                "Le tricycle de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .post("/api/tricycles")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        numero_interne:
                            numeroTest,

                        plaque_identification:
                            `AUTRE-${Date.now()}`,

                        capacite_kg:
                            300,

                        statut:
                            "disponible",

                        etat:
                            "bon"
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.match(
                reponse.body.error,
                /numéro interne.*déjà utilisé/i
            );

        }
    );

    it(
        "POST /api/tricycles doit refuser une plaque déjà utilisée",
        async function () {

            assert.ok(
                tricycleId,
                "Le tricycle de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .post("/api/tricycles")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        numero_interne:
                            `AUTRE-${Date.now()}`,

                        plaque_identification:
                            plaqueTest,

                        capacite_kg:
                            300,

                        statut:
                            "disponible",

                        etat:
                            "bon"
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.match(
                reponse.body.error,
                /plaque.*déjà utilisée/i
            );

        }
    );

    it(
        "PUT /api/tricycles/:id doit modifier le tricycle",
        async function () {

            assert.ok(
                tricycleId,
                "Le tricycle de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/tricycles/${tricycleId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        marque:
                            "Bajaj",

                        modele:
                            "Maxima Cargo",

                        capacite_kg:
                            400,

                        etat:
                            "moyen",

                        observations:
                            "Tricycle modifié par les tests."
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Tricycle modifié avec succès."
            );

            assert.equal(
                reponse.body.data.id,
                tricycleId
            );

            assert.equal(
                reponse.body.data.marque,
                "Bajaj"
            );

            assert.equal(
                reponse.body.data.modele,
                "Maxima Cargo"
            );

            assert.equal(
                Number(
                    reponse.body.data.capacite_kg
                ),
                400
            );

            assert.equal(
                reponse.body.data.etat,
                "moyen"
            );

        }
    );

    it(
        "PATCH /api/tricycles/:id/statut doit mettre le tricycle en maintenance",
        async function () {

            assert.ok(
                tricycleId,
                "Le tricycle de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .patch(
                        `/api/tricycles/${tricycleId}/statut`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        statut:
                            "maintenance"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Statut du tricycle modifié avec succès."
            );

            assert.equal(
                reponse.body.data.statut,
                "maintenance"
            );

        }
    );

    it(
        "PUT /api/tricycles/:id doit permettre de déclarer le tricycle en mauvais état",
        async function () {

            assert.ok(
                tricycleId,
                "Le tricycle de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/tricycles/${tricycleId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        etat:
                            "mauvais"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.data.etat,
                "mauvais"
            );

        }
    );

    it(
        "PATCH /api/tricycles/:id/statut doit refuser de rendre disponible un tricycle en mauvais état",
        async function () {

            assert.ok(
                tricycleId,
                "Le tricycle de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .patch(
                        `/api/tricycles/${tricycleId}/statut`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        statut:
                            "disponible"
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.match(
                reponse.body.error,
                /mauvais état.*disponible/i
            );

        }
    );

    it(
        "PUT /api/tricycles/:id doit remettre le tricycle en bon état",
        async function () {

            assert.ok(
                tricycleId,
                "Le tricycle de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/tricycles/${tricycleId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        etat:
                            "bon",

                        observations:
                            "Réparation terminée."
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.data.etat,
                "bon"
            );

        }
    );

    it(
        "PATCH /api/tricycles/:id/statut doit remettre le tricycle disponible",
        async function () {

            assert.ok(
                tricycleId,
                "Le tricycle de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .patch(
                        `/api/tricycles/${tricycleId}/statut`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        statut:
                            "disponible"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.data.statut,
                "disponible"
            );

        }
    );

    it(
        "POST /api/tricycles doit refuser une capacité négative",
        async function () {

            const reponse =
                await request(app)
                    .post("/api/tricycles")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        numero_interne:
                            `TRI-INVALIDE-${Date.now()}`,

                        capacite_kg:
                            -10
                    })
                    .expect(400);

            assert.equal(
                reponse.body.success,
                false
            );

        }
    );

    it(
        "GET /api/tricycles doit refuser une requête sans token",
        async function () {

            const reponse =
                await request(app)
                    .get("/api/tricycles")
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