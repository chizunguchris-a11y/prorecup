import { strict as assert } from "node:assert";
import express from "express";
import request from "supertest";

import {
    creerHeadersSecurite,
    creerLimiteurConnexion
} from "../src/middlewares/httpSecurityMiddleware.js";

const creerApplication = ({ succes = false } = {}) => {
    const app = express();
    app.use(creerLimiteurConnexion());
    app.get("/connexion", (_req, res) => {
        res.status(succes ? 200 : 401).json({ success: succes });
    });
    return app;
};

describe("Sécurité HTTP", () => {
    it("limite les échecs de connexion successifs", async () => {
        const app = creerApplication();

        for (let tentative = 0; tentative < 10; tentative += 1) {
            await request(app).get("/connexion").expect(401);
        }

        const reponse = await request(app).get("/connexion").expect(429);
        assert.equal(reponse.body.code, "TROP_DE_REQUETES");
    });

    it("ne pénalise pas les connexions réussies", async () => {
        const app = creerApplication({ succes: true });

        for (let tentative = 0; tentative < 11; tentative += 1) {
            await request(app).get("/connexion").expect(200);
        }
    });

    it("active HSTS uniquement en production", async () => {
        const creerAppHeaders = production => {
            const app = express();
            app.use(creerHeadersSecurite({ production }));
            app.get("/", (_req, res) => res.sendStatus(204));
            return app;
        };

        const developpement = await request(creerAppHeaders(false)).get("/").expect(204);
        const production = await request(creerAppHeaders(true)).get("/").expect(204);

        assert.equal(developpement.headers["strict-transport-security"], undefined);
        assert.match(production.headers["strict-transport-security"], /max-age=31536000/);
    });
});
