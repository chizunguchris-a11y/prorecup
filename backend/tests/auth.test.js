import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";

(process.env.RUN_LIVE_INTEGRATION === "1" ? describe : describe.skip)("Authentification [base dédiée et fixtures requises]", function () {

    // On augmente le délai car Supabase peut répondre lentement
    this.timeout(15000);

    it("POST /api/auth/login doit connecter un utilisateur valide", async function () {

        const reponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: process.env.INTEGRATION_TEST_EMAIL,
                motDePasse: process.env.INTEGRATION_TEST_PASSWORD
            })
            .expect(200);

        assert.equal(reponse.body.success, true);
        assert.ok(reponse.body.token);

        assert.equal(
            reponse.body.utilisateur.email,
            process.env.INTEGRATION_TEST_EMAIL
        );

    });

    it("POST /api/auth/login doit refuser un mauvais mot de passe", async function () {

        const reponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: process.env.INTEGRATION_TEST_EMAIL,
                motDePasse: "mauvais-mot-de-passe"
            })
            .expect(400);

        assert.equal(reponse.body.success, false);

        assert.equal(
            reponse.body.error,
            "Email ou mot de passe incorrect."
        );

    });

});
