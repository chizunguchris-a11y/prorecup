import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";
import pool from "../src/config/db.js";

describe("Collectes d'une mission", function () {

    this.timeout(40000);

    let token;
    let organisationId;
    let utilisateurId;

    let agentId;
    let tricycleId;
    let missionId;
    let collecteId;

    let clientId;
    let siteId;
    let typeDechetId;

    const emailTest =
        "christian2@prorecup.com";

    const motDePasseTest =
        "ProRecup2026!";

    const suffixe =
        Date.now();

    const numeroTricycle =
        `TRI-MC-${suffixe}`;

    const plaqueTricycle =
        `PR-MC-${suffixe}`;

    before(async function () {

        /*
         * Connexion
         */
        const reponseConnexion =
            await request(app)
                .post("/api/auth/login")
                .send({
                    email:
                        emailTest,

                    motDePasse:
                        motDePasseTest
                })
                .expect(200);

        token =
            reponseConnexion.body.token;

        assert.ok(
            token,
            "Le token de connexion est absent."
        );

        /*
         * Récupération directe de l'utilisateur
         * afin de rendre le test indépendant
         * du format exact de la réponse de connexion.
         */
        const utilisateurResultat =
            await pool.query(
                `
                    SELECT
                        id,
                        organisation_id
                    FROM utilisateurs
                    WHERE email = $1;
                `,
                [emailTest]
            );

        const utilisateur =
            utilisateurResultat.rows[0];

        assert.ok(
            utilisateur,
            "L'utilisateur de test est introuvable."
        );

        utilisateurId =
            utilisateur.id;

        organisationId =
            utilisateur.organisation_id;

        assert.ok(
            organisationId,
            "L'organisation de l'utilisateur est absente."
        );

        /*
         * Recherche d'un agent actif.
         */
        const agentResultat =
            await pool.query(
                `
                    SELECT
                        a.id
                    FROM agents a

                    JOIN utilisateurs u
                        ON u.id = a.utilisateur_id

                    WHERE u.organisation_id = $1
                      AND a.statut = 'actif'

                    ORDER BY a.cree_le ASC

                    LIMIT 1;
                `,
                [organisationId]
            );

        const agent =
            agentResultat.rows[0];

        assert.ok(
            agent,
            "Aucun agent actif n'a été trouvé pour les tests."
        );

        agentId =
            agent.id;

        /*
         * On refuse d'altérer un agent ayant
         * réellement une mission en cours.
         */
        const missionEnCoursResultat =
            await pool.query(
                `
                    SELECT id
                    FROM missions
                    WHERE agent_id = $1
                      AND statut = 'en_cours'
                    LIMIT 1;
                `,
                [agentId]
            );

        if (missionEnCoursResultat.rows[0]) {

            throw new Error(
                "L'agent sélectionné possède déjà une mission en cours."
            );

        }

        await pool.query(
            `
                UPDATE agents
                SET
                    disponible = true,
                    modifie_le = CURRENT_TIMESTAMP
                WHERE id = $1;
            `,
            [agentId]
        );

        /*
         * Données nécessaires pour créer
         * une collecte temporaire.
         */
        const clientResultat =
            await pool.query(
                `
                    SELECT id
                    FROM clients
                    WHERE organisation_id = $1
                    ORDER BY nom ASC
                    LIMIT 1;
                `,
                [organisationId]
            );

        assert.ok(
            clientResultat.rows[0],
            "Aucun client n'a été trouvé pour les tests."
        );

        clientId =
            clientResultat.rows[0].id;

        const siteResultat =
            await pool.query(
                `
                    SELECT id
                    FROM sites_de_collecte
                    WHERE organisation_id = $1
                    ORDER BY nom ASC
                    LIMIT 1;
                `,
                [organisationId]
            );

        assert.ok(
            siteResultat.rows[0],
            "Aucun site de collecte n'a été trouvé pour les tests."
        );

        siteId =
            siteResultat.rows[0].id;

        const typeDechetResultat =
            await pool.query(
                `
                    SELECT id
                    FROM types_dechets
                    ORDER BY nom ASC
                    LIMIT 1;
                `
            );

        assert.ok(
            typeDechetResultat.rows[0],
            "Aucun type de déchet n'a été trouvé pour les tests."
        );

        typeDechetId =
            typeDechetResultat.rows[0].id;

        /*
         * Création d'un tricycle temporaire.
         */
        const reponseTricycle =
            await request(app)
                .post("/api/tricycles")
                .set(
                    "Authorization",
                    `Bearer ${token}`
                )
                .send({
                    numero_interne:
                        numeroTricycle,

                    plaque_identification:
                        plaqueTricycle,

                    marque:
                        "Test",

                    modele:
                        "Mission Collecte",

                    capacite_kg:
                        300,

                    statut:
                        "disponible",

                    etat:
                        "bon",

                    observations:
                        "Tricycle temporaire pour missionCollecte.test.js"
                })
                .expect(201);

        tricycleId =
            reponseTricycle.body.data.id;

        assert.ok(
            tricycleId,
            "Le tricycle temporaire n'a pas été créé."
        );

        /*
         * Création d'une collecte temporaire
         * avec le statut en_attente.
         */
        const reponseCollecte =
            await request(app)
                .post("/api/collectes")
                .set(
                    "Authorization",
                    `Bearer ${token}`
                )
                .send({
                    site_id:
                        siteId,

                    client_id:
                        clientId,

                    type_dechet_id:
                        typeDechetId,

                    poids_estime:
                        22.5
                })
                .expect(201);

        collecteId =
            reponseCollecte.body.data.id;

        assert.ok(
            collecteId,
            "La collecte temporaire n'a pas été créée."
        );

        assert.equal(
            reponseCollecte.body.data.statut,
            "en_attente"
        );

        /*
         * Recherche d'une date libre pour l'agent.
         */
        let dateMission = null;

        for (
            let nombreJours = 30;
            nombreJours <= 365;
            nombreJours += 1
        ) {

            const dateCandidate =
                new Date(
                    Date.now() +
                    nombreJours *
                    24 *
                    60 *
                    60 *
                    1000
                )
                    .toISOString()
                    .slice(0, 10);

            const conflitResultat =
                await pool.query(
                    `
                        SELECT id
                        FROM missions
                        WHERE agent_id = $1
                          AND date_prevue = $2
                          AND statut IN (
                              'planifiee',
                              'en_cours'
                          )
                        LIMIT 1;
                    `,
                    [
                        agentId,
                        dateCandidate
                    ]
                );

            if (!conflitResultat.rows[0]) {

                dateMission =
                    dateCandidate;

                break;

            }

        }

        assert.ok(
            dateMission,
            "Aucune date libre n'a été trouvée pour la mission de test."
        );

        /*
         * Création de la mission temporaire.
         */
        const reponseMission =
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
                        dateMission,

                    heure_depart_prevue:
                        "08:00",

                    heure_retour_prevue:
                        "16:00",

                    observations:
                        "Mission temporaire pour missionCollecte.test.js"
                })
                .expect(201);

        missionId =
            reponseMission.body.data.id;

        assert.ok(
            missionId,
            "La mission temporaire n'a pas été créée."
        );

    });

    after(async function () {

        /*
         * Nettoyage dans l'ordre des dépendances.
         */
        try {

            if (
                missionId &&
                collecteId
            ) {

                await pool.query(
                    `
                        DELETE FROM missions_collectes
                        WHERE mission_id = $1
                          AND collecte_id = $2;
                    `,
                    [
                        missionId,
                        collecteId
                    ]
                );

            }

            if (missionId) {

                await pool.query(
                    `
                        DELETE FROM missions
                        WHERE id = $1;
                    `,
                    [missionId]
                );

            }

            if (collecteId) {

                await pool.query(
                    `
                        DELETE FROM collectes
                        WHERE id = $1;
                    `,
                    [collecteId]
                );

            }

            if (tricycleId) {

                await pool.query(
                    `
                        DELETE FROM tricycles
                        WHERE id = $1;
                    `,
                    [tricycleId]
                );

            }

            if (agentId) {

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

            }

        } catch (erreur) {

            console.warn(
                "Nettoyage du test MissionCollecte impossible :",
                erreur.message
            );

        }

    });

    it(
        "GET /api/missions/:id/collectes doit retourner une liste vide",
        async function () {

            const reponse =
                await request(app)
                    .get(
                        `/api/missions/${missionId}/collectes`
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

            assert.ok(
                Array.isArray(
                    reponse.body.data
                )
            );

            assert.equal(
                reponse.body.data.length,
                0
            );

        }
    );

    it(
        "POST /api/missions/:id/collectes doit ajouter une collecte",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/collectes`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        collecte_id:
                            collecteId,

                        ordre_collecte:
                            1
                    })
                    .expect(201);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Collecte ajoutée à la mission avec succès."
            );

            assert.equal(
                reponse.body.data.mission_id,
                missionId
            );

            assert.equal(
                reponse.body.data.collecte_id,
                collecteId
            );

            assert.equal(
                reponse.body.data.ordre_collecte,
                1
            );

        }
    );

    it(
        "GET /api/missions/:id/collectes doit retourner la collecte associée",
        async function () {

            const reponse =
                await request(app)
                    .get(
                        `/api/missions/${missionId}/collectes`
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
                "Collectes de la mission récupérées avec succès."
            );

            assert.ok(
                Array.isArray(
                    reponse.body.data
                )
            );

            assert.equal(
                reponse.body.data.length,
                1
            );

            assert.equal(
                reponse.body.data[0].collecte_id,
                collecteId
            );

            assert.equal(
                reponse.body.data[0].statut_collecte,
                "en_attente"
            );

        }
    );

    it(
        "POST /api/missions/:id/collectes doit refuser un doublon",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/collectes`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        collecte_id:
                            collecteId,

                        ordre_collecte:
                            1
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.match(
                reponse.body.error,
                /déjà associée à cette mission/i
            );

        }
    );

    it(
        "PATCH /api/missions/:id/collectes/:collecteId/ordre doit modifier l'ordre",
        async function () {

            const reponse =
                await request(app)
                    .patch(
                        `/api/missions/${missionId}/collectes/${collecteId}/ordre`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        ordre_collecte:
                            2
                    })
                    .expect(200);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.message,
                "Ordre de collecte modifié avec succès."
            );

            assert.equal(
                reponse.body.data.ordre_collecte,
                2
            );

        }
    );

    it(
        "PATCH ordre doit refuser une valeur inférieure à 1",
        async function () {

            const reponse =
                await request(app)
                    .patch(
                        `/api/missions/${missionId}/collectes/${collecteId}/ordre`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        ordre_collecte:
                            0
                    })
                    .expect(400);

            assert.equal(
                reponse.body.success,
                false
            );

        }
    );

    it(
        "DELETE /api/missions/:id/collectes/:collecteId doit retirer la collecte",
        async function () {

            const reponse =
                await request(app)
                    .delete(
                        `/api/missions/${missionId}/collectes/${collecteId}`
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
                "Collecte retirée de la mission avec succès."
            );

            assert.equal(
                reponse.body.data.collecte_id,
                collecteId
            );

        }
    );

    it(
        "GET /api/missions/:id/collectes doit être vide après le retrait",
        async function () {

            const reponse =
                await request(app)
                    .get(
                        `/api/missions/${missionId}/collectes`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .expect(200);

            assert.equal(
                reponse.body.data.length,
                0
            );

        }
    );

    it(
        "GET /api/missions/:id/collectes doit refuser une requête sans token",
        async function () {

            const reponse =
                await request(app)
                    .get(
                        `/api/missions/${missionId}/collectes`
                    )
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