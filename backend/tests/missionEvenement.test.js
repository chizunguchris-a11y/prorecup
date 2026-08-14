import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";
import pool from "../src/config/db.js";

describe("Événements terrain d'une mission", function () {

    this.timeout(50000);

    const emailTest =
        "christian2@prorecup.com";

    const motDePasseTest =
        "ProRecup2026!";

    let token;
    let utilisateurId;
    let organisationId;

    let agentId;
    let tricycleId;
    let missionId;
    let collecteId;

    let clientId;
    let siteId;
    let typeDechetId;

    const suffixe =
        Date.now();

    const numeroTricycle =
        `TRI-EVT-${suffixe}`;

    const plaqueTricycle =
        `PR-EVT-${suffixe}`;

    before(async function () {

        /*
         * Connexion.
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
         * Récupération de l'utilisateur
         * et de son organisation.
         */
        const resultatUtilisateur =
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
            resultatUtilisateur.rows[0];

        assert.ok(
            utilisateur,
            "L'utilisateur de test est introuvable."
        );

        utilisateurId =
            utilisateur.id;

        organisationId =
            utilisateur.organisation_id;

        /*
         * Recherche d'un agent actif.
         */
        const resultatAgent =
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
            resultatAgent.rows[0];

        assert.ok(
            agent,
            "Aucun agent actif n'a été trouvé."
        );

        agentId =
            agent.id;

        /*
         * On ne modifie pas un agent qui possède
         * déjà une vraie mission en cours.
         */
        const resultatMissionEnCours =
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

        if (
            resultatMissionEnCours.rows[0]
        ) {

            throw new Error(
                "L'agent sélectionné possède déjà une mission en cours."
            );

        }

        await pool.query(
            `
                UPDATE agents
                SET
                    disponible = true,
                    modifie_le =
                        CURRENT_TIMESTAMP
                WHERE id = $1;
            `,
            [agentId]
        );

        /*
         * Données nécessaires à la collecte.
         */
        const resultatClient =
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
            resultatClient.rows[0],
            "Aucun client n'a été trouvé."
        );

        clientId =
            resultatClient.rows[0].id;

        const resultatSite =
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
            resultatSite.rows[0],
            "Aucun site n'a été trouvé."
        );

        siteId =
            resultatSite.rows[0].id;

        const resultatTypeDechet =
            await pool.query(
                `
                    SELECT id
                    FROM types_dechets
                    ORDER BY nom ASC
                    LIMIT 1;
                `
            );

        assert.ok(
            resultatTypeDechet.rows[0],
            "Aucun type de déchet n'a été trouvé."
        );

        typeDechetId =
            resultatTypeDechet.rows[0].id;

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
                        "Événements terrain",

                    capacite_kg:
                        300,

                    statut:
                        "disponible",

                    etat:
                        "bon",

                    observations:
                        "Tricycle temporaire pour les tests d'événements."
                })
                .expect(201);

        tricycleId =
            reponseTricycle.body.data.id;

        assert.ok(
            tricycleId,
            "Le tricycle temporaire n'a pas été créé."
        );

        /*
         * Création d'une collecte temporaire.
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
                        18.5
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
         * Recherche d'une date sans conflit
         * pour l'agent.
         */
        let dateMission = null;

        for (
            let nombreJours = 60;
            nombreJours <= 450;
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

            const resultatConflit =
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

            if (
                !resultatConflit.rows[0]
            ) {

                dateMission =
                    dateCandidate;

                break;

            }

        }

        assert.ok(
            dateMission,
            "Aucune date libre n'a été trouvée."
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
                        "Mission temporaire pour les événements terrain."
                })
                .expect(201);

        missionId =
            reponseMission.body.data.id;

        assert.ok(
            missionId,
            "La mission temporaire n'a pas été créée."
        );

        /*
         * Association de la collecte à la mission.
         */
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

    });

    after(async function () {

        try {

            /*
             * Nettoyage dans l'ordre
             * des dépendances.
             */
            if (missionId) {

                await pool.query(
                    `
                        DELETE FROM mission_evenements
                        WHERE mission_id = $1;
                    `,
                    [missionId]
                );

                await pool.query(
                    `
                        DELETE FROM missions_collectes
                        WHERE mission_id = $1;
                    `,
                    [missionId]
                );

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
                            modifie_le =
                                CURRENT_TIMESTAMP
                        WHERE id = $1;
                    `,
                    [agentId]
                );

            }

        } catch (erreur) {

            console.warn(
                "Nettoyage des événements de mission impossible :",
                erreur.message
            );

        }

    });

    it(
        "GET /api/missions/:id/evenements doit retourner une liste vide",
        async function () {

            const reponse =
                await request(app)
                    .get(
                        `/api/missions/${missionId}/evenements`
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
        "POST position doit être refusé lorsque la mission est planifiée",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "position_enregistree",

                        latitude:
                            -4.325,

                        longitude:
                            15.322
                    })
                    .expect(409);

            assert.equal(
                reponse.body.success,
                false
            );

            assert.match(
                reponse.body.error,
                /mission en cours/i
            );

        }
    );

    it(
        "PATCH statut doit démarrer la mission",
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
                reponse.body.data.statut,
                "en_cours"
            );

        }
    );

    it(
        "POST doit enregistrer le démarrage de la mission",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "mission_demarree",

                        latitude:
                            -4.325,

                        longitude:
                            15.322,

                        precision_gps:
                            8.5,

                        observations:
                            "Départ de la mission."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.success,
                true
            );

            assert.equal(
                reponse.body.data.type_evenement,
                "mission_demarree"
            );

        }
    );

    it(
        "POST doit refuser un second démarrage de mission",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "mission_demarree"
                    })
                    .expect(409);

            assert.match(
                reponse.body.error,
                /existe déjà/i
            );

        }
    );

    it(
        "POST doit enregistrer une position GPS",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "position_enregistree",

                        latitude:
                            -4.325,

                        longitude:
                            15.322,

                        precision_gps:
                            6.2,

                        observations:
                            "Position pendant la tournée."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.data.type_evenement,
                "position_enregistree"
            );

            assert.equal(
                Number(
                    reponse.body.data.latitude
                ),
                -4.325
            );

        }
    );

    it(
        "POST doit refuser une latitude invalide",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "position_enregistree",

                        latitude:
                            95,

                        longitude:
                            15.322
                    })
                    .expect(400);

            assert.equal(
                reponse.body.success,
                false
            );

        }
    );

    it(
        "POST doit enregistrer l'arrivée sur le site",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "arrivee_site",

                        collecte_id:
                            collecteId,

                        latitude:
                            -4.326,

                        longitude:
                            15.323,

                        precision_gps:
                            5.5,

                        observations:
                            "Arrivée sur le site."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.data.type_evenement,
                "arrivee_site"
            );

            assert.equal(
                reponse.body.data.collecte_id,
                collecteId
            );

        }
    );

    it(
        "POST doit refuser de terminer une collecte non démarrée",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "collecte_terminee",

                        collecte_id:
                            collecteId
                    })
                    .expect(409);

            assert.match(
                reponse.body.error,
                /doit être démarrée/i
            );

        }
    );

    it(
        "POST doit enregistrer le début de la collecte",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "collecte_demarree",

                        collecte_id:
                            collecteId,

                        observations:
                            "Début du chargement."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.data.type_evenement,
                "collecte_demarree"
            );

        }
    );

    it(
        "POST doit enregistrer la fin de la collecte",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "collecte_terminee",

                        collecte_id:
                            collecteId,

                        observations:
                            "Collecte terminée."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.data.type_evenement,
                "collecte_terminee"
            );

        }
    );

    it(
        "POST doit enregistrer un incident",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "incident_signale",

                        latitude:
                            -4.327,

                        longitude:
                            15.324,

                        observations:
                            "Incident fictif créé par le test."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.data.type_evenement,
                "incident_signale"
            );

        }
    );

    it(
        "GET doit retourner l'historique des événements",
        async function () {

            const reponse =
                await request(app)
                    .get(
                        `/api/missions/${missionId}/evenements`
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
                reponse.body.data.length >= 6
            );

            const types =
                reponse.body.data.map(
                    (evenement) =>
                        evenement.type_evenement
                );

            assert.ok(
                types.includes(
                    "mission_demarree"
                )
            );

            assert.ok(
                types.includes(
                    "position_enregistree"
                )
            );

            assert.ok(
                types.includes(
                    "collecte_terminee"
                )
            );

        }
    );

    it(
        "PATCH statut doit terminer la mission",
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
                reponse.body.data.statut,
                "terminee"
            );

        }
    );

    it(
        "POST doit enregistrer la fin de mission",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "mission_terminee",

                        latitude:
                            -4.328,

                        longitude:
                            15.325,

                        precision_gps:
                            7,

                        observations:
                            "Mission terminée."
                    })
                    .expect(201);

            assert.equal(
                reponse.body.data.type_evenement,
                "mission_terminee"
            );

        }
    );

    it(
        "POST doit refuser une seconde fin de mission",
        async function () {

            const reponse =
                await request(app)
                    .post(
                        `/api/missions/${missionId}/evenements`
                    )
                    .set(
                        "Authorization",
                        `Bearer ${token}`
                    )
                    .send({
                        type_evenement:
                            "mission_terminee"
                    })
                    .expect(409);

            assert.match(
                reponse.body.error,
                /existe déjà/i
            );

        }
    );

    it(
        "GET événements doit refuser une requête sans token",
        async function () {

            const reponse =
                await request(app)
                    .get(
                        `/api/missions/${missionId}/evenements`
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