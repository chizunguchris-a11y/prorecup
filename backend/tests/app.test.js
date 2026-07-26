import request from "supertest";
import { strict as assert } from "assert";

import app from "../src/app.js";

describe("API Pro Récup", function () {

    it("GET / doit confirmer que le serveur est opérationnel", async function () {

        const reponse = await request(app)
            .get("/")
            .expect(200);

        assert.equal(
            reponse.text,
            "🚀 Serveur Pro Récup opérationnel et connecté !"
        );

    });

});