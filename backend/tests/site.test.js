import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";

describe("Sites de collecte", function () {

    this.timeout(30000);

    let token;
    let siteTestId;
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
         * on tente de supprimer le site temporaire.
         */
        if (
            token &&
            siteTestId
        ) {

            try {

                await request(app)
                    .delete(
                        `/api/sites/${siteTestId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    );

            } catch (erreur) {

                console.warn(
                    "Nettoyage du site de test impossible :",
                    erreur.message
                );

            }

        }

    });

    it(
        "POST /api/sites doit créer un nouveau site",
        async function () {

            const reponse =
                await request(app)
                    .post("/api/sites")
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        nom:
                            `Site CRUD Test ${numeroTest}`,

                        adresse:
                            "Kinshasa",

                        zone_geographique:
                            "Gombe",

                        responsable_nom:
                            "Jean Test"
                    })
                    .expect(201);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Site de collecte créé avec succès."
            );

            assert.ok(
                reponse.body.data
            );

            assert.ok(
                reponse.body.data.id
            );

            assert.ok(
                reponse.body.data.organisation_id
            );

            assert.equal(
                reponse.body.data.nom,
                `Site CRUD Test ${numeroTest}`
            );

            siteTestId =
                reponse.body.data.id;

        }
    );

    it(
        "PUT /api/sites/:id doit modifier le site créé",
        async function () {

            assert.ok(
                siteTestId,
                "Le site de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/sites/${siteTestId}`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        nom:
                            `Site CRUD Modifié ${numeroTest}`,

                        adresse:
                            "Bandalungwa",

                        zone_geographique:
                            "Bandal",

                        responsable_nom:
                            "Jeanine Test"
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Site de collecte modifié avec succès."
            );

            assert.equal(
                reponse.body.data.id,
                siteTestId
            );

            assert.equal(
                reponse.body.data.nom,
                `Site CRUD Modifié ${numeroTest}`
            );

            assert.equal(
                reponse.body.data.adresse,
                "Bandalungwa"
            );

            assert.equal(
                reponse.body.data.zone_geographique,
                "Bandal"
            );

            assert.equal(
                reponse.body.data.responsable_nom,
                "Jeanine Test"
            );

        }
    );

    it(
        "PUT /api/sites/:id doit refuser une requête sans token",
        async function () {

            assert.ok(
                siteTestId,
                "Le site de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .put(
                        `/api/sites/${siteTestId}`
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
        "DELETE /api/sites/:id doit refuser la suppression d'un site lié à une collecte",
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

            const collecteAvecSite =
                collectes.find(
                    (collecte) =>
                        collecte.site_id
                );

            /*
             * Si la base ne contient aucune collecte,
             * le test est ignoré sans faire échouer
             * toute la suite.
             */
            if (!collecteAvecSite) {

                this.skip();

                return;

            }

            const reponse =
                await request(app)
                    .delete(
                        `/api/sites/${collecteAvecSite.site_id}`
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
        "DELETE /api/sites/:id doit supprimer un site sans collecte liée",
        async function () {

            assert.ok(
                siteTestId,
                "Le site de test n'a pas été créé."
            );

            const reponse =
                await request(app)
                    .delete(
                        `/api/sites/${siteTestId}`
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
                "Site de collecte supprimé avec succès."
            );

            assert.equal(
                reponse.body.data.id,
                siteTestId
            );

            siteTestId = null;

        }
    );

    it(
        "POST /api/sites doit refuser une requête sans token",
        async function () {

            const reponse =
                await request(app)
                    .post("/api/sites")
                    .send({
                        nom:
                            "Site sans token"
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