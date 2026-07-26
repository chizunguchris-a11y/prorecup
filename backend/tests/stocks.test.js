import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";

describe("Stocks", function () {

    this.timeout(20000);

    let token;

    before(async function () {

        const reponseConnexion = await request(app)
            .post("/api/auth/login")
            .send({
                email: "christian2@prorecup.com",
                motDePasse: "ProRecup2026!"
            })
            .expect(200);

        token = reponseConnexion.body.token;

    });

    it("GET /api/stocks doit retourner les stocks de l'organisation", async function () {

        const reponse = await request(app)
            .get("/api/stocks")
            .set(
                "Authorization",
                `Bearer ${token}`
            )
            .expect(200);

        assert.equal(reponse.body.success, true);
        assert.ok(Array.isArray(reponse.body.data));

        if (reponse.body.data.length > 0) {

            const stock = reponse.body.data[0];

            assert.ok(stock.id);
            assert.ok(stock.organisation_id);
            assert.ok(stock.type_dechet_id);
            assert.equal(
                typeof Number(stock.quantite),
                "number"
            );

        }

    });

    it("GET /api/stocks doit refuser une requête sans token", async function () {

        const reponse = await request(app)
            .get("/api/stocks")
            .expect(401);

        assert.equal(reponse.body.success, false);

        assert.equal(
            reponse.body.error,
            "Token manquant."
        );

    });

});