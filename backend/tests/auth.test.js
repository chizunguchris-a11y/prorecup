import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";

describe("Authentification", function () {

    // On augmente le délai car Supabase peut répondre lentement
    this.timeout(15000);

    it("POST /api/auth/login doit connecter un utilisateur valide", async function () {

        const reponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: "christian2@prorecup.com",
                motDePasse: "ProRecup2026!"
            })
            .expect(200);

        assert.equal(reponse.body.success, true);
        assert.ok(reponse.body.token);

        assert.equal(
            reponse.body.utilisateur.email,
            "christian2@prorecup.com"
        );

    });

    it("POST /api/auth/login doit refuser un mauvais mot de passe", async function () {

        const reponse = await request(app)
            .post("/api/auth/login")
            .send({
                email: "christian2@prorecup.com",
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