import { strict as assert } from "node:assert";
import { createHash, randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/config/db.js";
import emailService from "../src/services/RecoveryEmailService.js";

(process.env.RUN_LIVE_INTEGRATION === "1" ? describe : describe.skip)(
    "Product Finish A-Z [base TEST dédiée]",
    function () {
        this.timeout(120000);

        const suffixe = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const emailClient = `qa.client.az.${suffixe}@prorecup.test`;
        const motDePasseActivation = `${process.env.INTEGRATION_TEST_PASSWORD}A1!`;
        const motDePasseModifie = `${process.env.INTEGRATION_TEST_PASSWORD}B2!`;
        const motDePasseReset = `${process.env.INTEGRATION_TEST_PASSWORD}C3!`;
        let invitationUrl;
        let resetToken;
        let utilisateurId;
        let clientId;
        let demandeId;
        const envoyerTransactionOriginal = emailService.envoyerTransaction;
        const envoyerLienMotDePasseOriginal = emailService.envoyerLienMotDePasse;
        const resendKeyOriginal = process.env.RESEND_API_KEY;

        before(function () {
            process.env.RESEND_API_KEY = "test-only-provider-enabled";
            emailService.envoyerTransaction = async ({ lien }) => {
                invitationUrl = lien;
                return { sent: true, code: "EMAIL_SENT" };
            };
            emailService.envoyerLienMotDePasse = async ({ token }) => {
                resetToken = token;
                return { sent: true };
            };
        });

        after(async function () {
            emailService.envoyerTransaction = envoyerTransactionOriginal;
            emailService.envoyerLienMotDePasse = envoyerLienMotDePasseOriginal;
            process.env.RESEND_API_KEY = resendKeyOriginal;
            const connexion = await pool.connect();
            try {
                await connexion.query("BEGIN");
                const utilisateur = await connexion.query(
                    "SELECT id FROM utilisateurs WHERE LOWER(email)=LOWER($1)",
                    [emailClient]
                );
                utilisateurId ||= utilisateur.rows[0]?.id;
                const client = await connexion.query(
                    "SELECT id FROM clients WHERE LOWER(contact_email)=LOWER($1)",
                    [emailClient]
                );
                clientId ||= client.rows[0]?.id;
                await connexion.query(
                    "DELETE FROM journaux_audit WHERE utilisateur_id=$1 OR ressource_id=$1 OR ressource_id=$2",
                    [utilisateurId || null, clientId || null]
                );
                await connexion.query(
                    "DELETE FROM client_onboarding_requests WHERE LOWER(email_contact)=LOWER($1)",
                    [emailClient]
                );
                await connexion.query(`
                    DELETE FROM identity_recovery_tokens
                    WHERE purpose='email_verification'
                      AND utilisateur_id=(SELECT id FROM utilisateurs WHERE email='qa.manager@prorecup.test')
                `);
                await connexion.query(
                    "UPDATE utilisateurs SET actif=true WHERE email='qa.manager@prorecup.test'"
                );
                if (utilisateurId) {
                    await connexion.query("DELETE FROM refresh_tokens WHERE utilisateur_id=$1", [utilisateurId]);
                    await connexion.query("DELETE FROM identity_recovery_tokens WHERE utilisateur_id=$1", [utilisateurId]);
                    await connexion.query("DELETE FROM client_utilisateurs WHERE utilisateur_id=$1", [utilisateurId]);
                    await connexion.query("DELETE FROM utilisateurs WHERE id=$1", [utilisateurId]);
                }
                if (clientId) {
                    await connexion.query("DELETE FROM client_sites WHERE client_id=$1", [clientId]);
                    await connexion.query("DELETE FROM clients WHERE id=$1", [clientId]);
                }
                await connexion.query("COMMIT");
            } catch (erreur) {
                await connexion.query("ROLLBACK");
                throw erreur;
            } finally {
                connexion.release();
            }
        });

        it("provisionne, active et sécurise un client jusqu'au reset", async function () {
            const admin = await request(app)
                .post("/api/auth/login")
                .send({
                    email: process.env.INTEGRATION_TEST_EMAIL,
                    motDePasse: process.env.INTEGRATION_TEST_PASSWORD
                })
                .expect(200);
            const adminToken = admin.body.token;

            const demande = {
                organisationNom: `Client A-Z ${suffixe}`,
                nomContact: "Client Recette A-Z",
                emailContact: emailClient,
                telephoneContact: "+243900001234",
                pays: "RDC",
                ville: "Kinshasa",
                identifiantLegal: `TEST-${suffixe}`,
                message: "Recette synthétique Product Finish",
                consentement: "true"
            };
            await request(app).post("/api/onboarding/client").send(demande).expect(202);
            await request(app).post("/api/onboarding/client").send(demande).expect(202);

            const enBase = await pool.query(
                "SELECT id FROM client_onboarding_requests WHERE LOWER(email_contact)=LOWER($1)",
                [emailClient]
            );
            demandeId = enBase.rows[0]?.id;
            assert.ok(demandeId);

            await request(app)
                .patch(`/api/onboarding/client/${demandeId}/statut`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ statut: "en_attente_validation", notesInternes: "Contrôle TEST validé" })
                .expect(200);

            const provision = await request(app)
                .post(`/api/onboarding/client/${demandeId}/provision`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ typeClient: "entreprise" })
                .expect(201);
            clientId = provision.body.data.clientId;
            utilisateurId = provision.body.data.invitation.utilisateurId;
            assert.ok(invitationUrl?.startsWith("https://"));

            await request(app)
                .post(`/api/onboarding/client/${demandeId}/provision`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ typeClient: "entreprise" })
                .expect(409);

            const tokenInvitation = new URL(invitationUrl).hash.replace(/^#token=/, "");
            assert.match(tokenInvitation, /^[a-f0-9]{64}$/);
            await request(app)
                .post("/api/identity/invitations/activate")
                .send({
                    token: tokenInvitation,
                    nouveauMotDePasse: motDePasseActivation,
                    confirmationMotDePasse: motDePasseActivation
                })
                .expect(200);
            await request(app)
                .post("/api/identity/invitations/activate")
                .send({
                    token: tokenInvitation,
                    nouveauMotDePasse: motDePasseActivation,
                    confirmationMotDePasse: motDePasseActivation
                })
                .expect(400);

            const connexion1 = await request(app)
                .post("/api/auth/login")
                .send({ email: emailClient, motDePasse: motDePasseActivation })
                .expect(200);
            const connexion2 = await request(app)
                .post("/api/auth/login")
                .send({ email: emailClient, motDePasse: motDePasseActivation })
                .expect(200);
            const token1 = connexion1.body.token;
            const token2 = connexion2.body.token;

            await request(app)
                .get("/api/portail-client/me")
                .set("Authorization", `Bearer ${token1}`)
                .expect(200);
            const sessions = await request(app)
                .get("/api/sessions")
                .set("Authorization", `Bearer ${token1}`)
                .expect(200);
            assert.ok(sessions.body.data.length >= 2);
            assert.equal(sessions.body.data.filter((session) => session.actuelle).length, 1);

            await request(app)
                .post("/api/sessions/fermer-autres")
                .set("Authorization", `Bearer ${token1}`)
                .send({})
                .expect(200);
            await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token2}`)
                .expect(401);

            await request(app)
                .patch("/api/auth/me/password")
                .set("Authorization", `Bearer ${token1}`)
                .send({
                    ancienMotDePasse: motDePasseActivation,
                    nouveauMotDePasse: motDePasseModifie,
                    confirmationMotDePasse: motDePasseModifie
                })
                .expect(200);
            await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token1}`)
                .expect(401);

            const apresModification = await request(app)
                .post("/api/auth/login")
                .send({ email: emailClient, motDePasse: motDePasseModifie })
                .expect(200);
            await request(app)
                .post("/api/identity/recovery/password/request")
                .send({ email: emailClient })
                .expect(200);
            assert.match(resetToken, /^[a-f0-9]{64}$/);
            await request(app)
                .post("/api/identity/recovery/password/reset")
                .send({
                    token: resetToken,
                    nouveauMotDePasse: motDePasseReset,
                    confirmationMotDePasse: motDePasseReset
                })
                .expect(200);
            await request(app)
                .post("/api/identity/recovery/password/reset")
                .send({
                    token: resetToken,
                    nouveauMotDePasse: motDePasseReset,
                    confirmationMotDePasse: motDePasseReset
                })
                .expect(400);
            await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${apresModification.body.token}`)
                .expect(401);
            await request(app)
                .post("/api/auth/login")
                .send({ email: emailClient, motDePasse: motDePasseReset })
                .expect(200);

            const verification = await pool.query(
                "SELECT email_verifie_le,telephone_verifie_le FROM utilisateurs WHERE id=$1",
                [utilisateurId]
            );
            assert.ok(verification.rows[0].email_verifie_le);
            assert.equal(verification.rows[0].telephone_verifie_le, null);
        });

        it("applique le RBAC et l'authentification des trois produits", async function () {
            const connexion = async (email) => (await request(app)
                .post("/api/auth/login")
                .send({ email, motDePasse: process.env.INTEGRATION_TEST_PASSWORD })
                .expect(200)).body.token;
            const managerToken = await connexion("qa.manager@prorecup.test");
            const agentToken = await connexion("qa.agent@prorecup.test");
            const clientToken = await connexion("qa.client@prorecup.test");

            await request(app).get("/api/dashboard").set("Authorization", `Bearer ${managerToken}`).expect(200);
            await request(app).get("/api/terrain/me").set("Authorization", `Bearer ${agentToken}`).expect(200);
            await request(app).get("/api/portail-client/me").set("Authorization", `Bearer ${clientToken}`).expect(200);
            await request(app).get("/api/onboarding/client").set("Authorization", `Bearer ${managerToken}`).expect(403);
            await request(app).get("/api/utilisateurs").set("Authorization", `Bearer ${agentToken}`).expect(403);
            await request(app).get("/api/utilisateurs").set("Authorization", `Bearer ${clientToken}`).expect(403);
            await request(app).get("/api/utilisateurs").expect(401);
            await request(app)
                .post("/api/identity/invitations")
                .set("Authorization", `Bearer ${managerToken}`)
                .send({ nom: "Admin Interdit", email: `qa.admin.interdit.${suffixe}@prorecup.test`, role: "admin" })
                .expect(400);
        });

        it("vérifie réellement l'e-mail avec les états valide, utilisé, expiré et suspendu", async function () {
            const manager = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "qa.manager@prorecup.test",
                    motDePasse: process.env.INTEGRATION_TEST_PASSWORD
                })
                .expect(200);
            const managerId = manager.body.utilisateur.id;
            const auth = { Authorization: `Bearer ${manager.body.token}` };
            await pool.query("UPDATE utilisateurs SET email_verifie_le=NULL,actif=true WHERE id=$1", [managerId]);

            invitationUrl = null;
            await request(app).post("/api/identity/account/email/request").set(auth).send({}).expect(202);
            const valide = new URL(invitationUrl).hash.replace(/^#token=/, "");
            await request(app).post("/api/identity/account/email/confirm").send({ token: valide }).expect(200);
            await request(app).post("/api/identity/account/email/confirm").send({ token: valide }).expect(400);
            await request(app).post("/api/identity/account/email/confirm").send({ token: "0".repeat(64) }).expect(400);

            const insererToken = async (raw, expireLe) => {
                await pool.query(`
                    INSERT INTO identity_recovery_tokens
                        (id,utilisateur_id,purpose,channel,token_hash,destination_hint,expire_le)
                    VALUES($1,$2,'email_verification','email',$3,'qa.manager@prorecup.test',$4)
                `, [randomUUID(), managerId, createHash("sha256").update(raw).digest("hex"), expireLe]);
            };
            const expire = "1".repeat(64);
            await insererToken(expire, new Date(Date.now() - 60000));
            await request(app).post("/api/identity/account/email/confirm").send({ token: expire }).expect(400);

            const suspendu = "2".repeat(64);
            await insererToken(suspendu, new Date(Date.now() + 60000));
            await pool.query("UPDATE utilisateurs SET actif=false WHERE id=$1", [managerId]);
            await request(app).post("/api/identity/account/email/confirm").send({ token: suspendu }).expect(400);
            await pool.query("UPDATE utilisateurs SET actif=true WHERE id=$1", [managerId]);

            invitationUrl = null;
            await request(app).post("/api/identity/account/email/request").set(auth).send({}).expect(202);
            const renvoye = new URL(invitationUrl).hash.replace(/^#token=/, "");
            await request(app).post("/api/identity/account/email/confirm").send({ token: renvoye }).expect(200);
            const verification = await pool.query(
                "SELECT email_verifie_le,telephone_verifie_le FROM utilisateurs WHERE id=$1",
                [managerId]
            );
            assert.ok(verification.rows[0].email_verifie_le);
            assert.equal(verification.rows[0].telephone_verifie_le, null);
        });
    }
);
