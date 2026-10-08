import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";

(process.env.RUN_LIVE_INTEGRATION === "1" ? describe : describe.skip)("Tableau de bord [base dédiée et fixtures requises]", function () {

    this.timeout(20000);

    let token;

    before(async function () {

        const reponseConnexion = await request(app)
            .post("/api/auth/login")
            .send({
                email: process.env.INTEGRATION_TEST_EMAIL,
                motDePasse: process.env.INTEGRATION_TEST_PASSWORD
            })
            .expect(200);

        token = reponseConnexion.body.token;

    });

    it("GET /api/dashboard doit retourner les indicateurs de l'organisation", async function () {

        const reponse = await request(app)
            .get("/api/dashboard")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .expect(200);

        assert.equal(reponse.body.success, true);
        assert.ok(reponse.body.data);
        assert.ok(reponse.body.data.stocks);
        assert.ok(reponse.body.data.ventes);
        assert.ok(reponse.body.data.carbone);

        assert.equal(
            typeof reponse.body.data.stocks.nombre_types,
            "number"
        );

        assert.equal(
            typeof reponse.body.data.ventes.nombre,
            "number"
        );

        assert.equal(
            typeof reponse.body.data.carbone.co2e_estime_total,
            "number"
        );

    });

    it("GET /api/dashboard doit refuser une requête sans token", async function () {

        const reponse = await request(app)
            .get("/api/dashboard")
            .expect(401);

        assert.equal(reponse.body.success, false);
        assert.equal(
            reponse.body.error,
            "Token manquant."
        );

    });

});
