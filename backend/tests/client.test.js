import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";

describe("Clients", function () {

    this.timeout(30000);

    let token;
    let clientTestId;
    let numeroTest;

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

        numeroTest = Date.now();

    });

    after(async function () {

        /*
         * Nettoyage de sécurité :
         * si un test échoue avant la suppression,
         * on tente de supprimer le client temporaire.
         */
        if (
            token &&
            clientTestId
        ) {

            try {

                await request(app)
                    .delete(
                        `/api/clients/${clientTestId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    );

            } catch (erreur) {

                console.warn(
                    "Nettoyage du client de test impossible :",
                    erreur.message
                );

            }

        }

    });

    it(
        "POST /api/clients doit créer un nouveau client",
        async function () {

            const reponse =
                await request(app)
                    .post("/api/clients")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        nom:
                            `Client CRUD Test ${numeroTest}`,

                        type_client:
                            "Entreprise",

                        contact_email:
                            `client-crud-${numeroTest}@test.com`,

                        contact_telephone:
                            "0999999999",

                        adresse_siege:
                            "Kinshasa"
                    })
                    .expect(201);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Client créé avec succès."
            );

            assert.ok(
                reponse.body.data
            );

            assert.ok(
                reponse.body.data.id
            );

            assert.equal(
                reponse.body.data.nom,
                `Client CRUD Test ${numeroTest}`
            );

            clientTestId =
                reponse.body.data.id;

        }
    );

    it(
        "PUT /api/clients/:id doit modifier le client créé",
        async function () {

            assert.ok(
                clientTestId,
                "Le client de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/clients/${clientTestId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        nom:
                            `Client CRUD Modifié ${numeroTest}`,

                        type_client:
                            "Société",

                        contact_email:
                            `client-modifie-${numeroTest}@test.com`,

                        contact_telephone:
                            "+243900000001",

                        adresse_siege:
                            "Bandalungwa"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Client modifié avec succès."
            );

            assert.equal(
                reponse.body.data.id,
                clientTestId
            );

            assert.equal(
                reponse.body.data.nom,
                `Client CRUD Modifié ${numeroTest}`
            );

            assert.equal(
                reponse.body.data.type_client,
                "Société"
            );

            assert.equal(
                reponse.body.data.contact_email,
                `client-modifie-${numeroTest}@test.com`
            );

            assert.equal(
                reponse.body.data.contact_telephone,
                "+243900000001"
            );

            assert.equal(
                reponse.body.data.adresse_siege,
                "Bandalungwa"
            );

        }
    );

    it(
        "PUT /api/clients/:id doit refuser une requête sans token",
        async function () {

            assert.ok(
                clientTestId,
                "Le client de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/clients/${clientTestId}`
                    )
                    .send({
                        nom:
                            "Modification sans token"
                    })
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

    it(
        "DELETE /api/clients/:id doit refuser la suppression d'un client lié à une collecte",
        async function () {

            const reponseCollectes =
                await request(app)
                    .get("/api/collectes")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .expect(200);

            const collectes =
                Array.isArray(
                    reponseCollectes.body.data
                )
                    ? reponseCollectes.body.data
                    : [];

            const collecteAvecClient =
                collectes.find(
                    (collecte) =>
                        collecte.client_id
                );

            /*
             * Si la base ne contient aucune collecte,
             * ce test est ignoré sans faire échouer
             * toute la suite.
             */
            if (!collecteAvecClient) {

                this.skip();

                return;

            }

            const reponse =
                await request(app)
                    .delete(
                        `/api/clients/${collecteAvecClient.client_id}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
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
                /ne peut pas être supprimé/i
            );

            assert.match(
                reponse.body.error,
                /collecte/i
            );

        }
    );

    it(
        "DELETE /api/clients/:id doit supprimer un client sans collecte liée",
        async function () {

            assert.ok(
                clientTestId,
                "Le client de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .delete(
                        `/api/clients/${clientTestId}`
                    )
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
                "Client supprimé avec succès."
            );

            assert.equal(
                reponse.body.data.id,
                clientTestId
            );

            /*
             * Le nettoyage automatique ne doit plus
             * essayer de supprimer ce client.
             */
            clientTestId = null;

        }
    );

    it(
        "POST /api/clients doit refuser une requête sans token",
        async function () {

            const reponse =
                await request(app)
                    .post("/api/clients")
                    .send({
                        nom:
                            "Client sans token"
                    })
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