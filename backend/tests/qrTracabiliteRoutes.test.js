import request from "supertest";
import { strict as assert } from "node:assert";
import jwt from "jsonwebtoken";
import app from "../src/app.js";

describe("Routes QR et traçabilité matière V1", function () {
    const id = "11111111-1111-4111-8111-111111111111";
    const tokenAgent = jwt.sign({ id, organisationId: id, role: "agent" },
        process.env.JWT_SECRET || "votre_cle_secrete_temporaire");

    it("protège listes, historique, étiquette et mutations par JWT", async function () {
        for (const appel of [request(app).get("/api/lots/unites"),
            request(app).get("/api/lots/tracabilite/PR-C-ABCDEF"),
            request(app).get("/api/lots/etiquette/PR-C-ABCDEF"),
            request(app).post("/api/lots/contenants"), request(app).post("/api/lots/regroupements")]) {
            const reponse = await appel; assert.equal(reponse.status, 401);
        }
    });

    it("réserve création et regroupement au back-office", async function () {
        for (const chemin of ["/api/lots/contenants", "/api/lots/regroupements"]) {
            const reponse = await request(app).post(chemin).set("Authorization", `Bearer ${tokenAgent}`).send({});
            assert.equal(reponse.status, 403);
        }
    });
});
