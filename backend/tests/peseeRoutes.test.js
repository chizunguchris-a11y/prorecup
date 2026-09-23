import request from "supertest";
import { strict as assert } from "assert";
import app from "../src/app.js";
import jwt from "jsonwebtoken";

describe("Routes Pesée V1", function () {
    const id = "11111111-1111-4111-8111-111111111111";
    const tokenAgent = jwt.sign({ id, organisationId: id, role: "agent" },
        process.env.JWT_SECRET || "votre_cle_secrete_temporaire");

    it("protège l'enregistrement d'une pesée terrain par JWT", async function () {
        const reponse = await request(app)
            .post(`/api/terrain/missions/${id}/collectes/${id}/pesees`)
            .send({});
        assert.equal(reponse.status, 401);
    });

    it("protège la liste des balances terrain par JWT", async function () {
        const reponse = await request(app).get("/api/terrain/balances");
        assert.equal(reponse.status, 401);
    });

    it("protège la pesée dépôt et la preuve back-office par JWT", async function () {
        const depot = await request(app).post(`/api/collectes/${id}/pesees`).send({});
        const preuve = await request(app).get(`/api/collectes/${id}/preuves/${id}/url`);
        assert.equal(depot.status, 401);
        assert.equal(preuve.status, 401);
    });

    it("réserve la pesée dépôt aux rôles back-office existants", async function () {
        const reponse = await request(app)
            .post(`/api/collectes/${id}/pesees`)
            .set("Authorization", `Bearer ${tokenAgent}`)
            .send({});
        assert.equal(reponse.status, 403);
    });

    it("réserve toute l'administration des balances aux managers et admins", async function () {
        const appels = [
            request(app).get("/api/balances"),
            request(app).post("/api/balances").send({}),
            request(app).put(`/api/balances/${id}`).send({}),
            request(app).patch(`/api/balances/${id}/statut`).send({ statut: "active" })
        ];
        for (const appel of appels) {
            const reponse = await appel.set("Authorization", `Bearer ${tokenAgent}`);
            assert.equal(reponse.status, 403);
        }
    });
});
