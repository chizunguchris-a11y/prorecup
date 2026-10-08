import { randomBytes, randomUUID, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import tokens from "../repositories/IdentityRecoveryRepository.js";
import audit from "../repositories/AuditRepository.js";
import emailService from "./RecoveryEmailService.js";
import ApiError from "../utils/ApiError.js";

export const hashToken = value => createHash("sha256").update(value).digest("hex");
export const invitationRoles = actor => actor.role === "admin"
    ? ["manager", "agent_valorisation_carbone", "client"]
    : actor.role === "manager" ? ["agent_valorisation_carbone"] : [];

class IdentityInvitationService {
    async create(actor, data) {
        if (!invitationRoles(actor).includes(data.role)) throw new ApiError(403, "Ce rôle ne peut pas être invité par votre compte.");
        const connection = await pool.connect();
        const raw = randomBytes(32).toString("hex");
        let user;
        try {
            await connection.query("BEGIN");
            // Serialize email checks without requiring an unsafe global uniqueness migration.
            await connection.query("SELECT pg_advisory_xact_lock(hashtext($1))", [data.email.toLowerCase()]);
            const existing = await connection.query("SELECT id FROM utilisateurs WHERE LOWER(email)=LOWER($1) LIMIT 1", [data.email]);
            if (existing.rows.length) throw new ApiError(409, "Cette adresse est déjà utilisée. Consultez le compte existant.");
            const roles = await connection.query("SELECT id FROM roles WHERE LOWER(nom)=$1 AND actif=true AND (organisation_id IS NULL OR organisation_id=$2) ORDER BY organisation_id NULLS LAST", [data.role, actor.organisationId]);
            if (!roles.rows.length) throw new ApiError(409, "Le rôle demandé n'est pas configuré.");
            if (data.role === "client") {
                const client = await connection.query("SELECT id FROM clients WHERE id=$1 AND organisation_id=$2 FOR KEY SHARE", [data.clientId, actor.organisationId]);
                if (!client.rows.length) throw new ApiError(404, "Client introuvable dans votre organisation.");
            }
            const password = await bcrypt.hash(randomBytes(48).toString("hex"), 12);
            const result = await connection.query(`INSERT INTO utilisateurs (nom,email,mot_de_passe,organisation_id,role_id,actif,invitation_en_attente)
                VALUES ($1,$2,$3,$4,$5,false,true) RETURNING id,nom,email,organisation_id`, [data.nom, data.email, password, actor.organisationId, roles.rows[0].id]);
            user = result.rows[0];
            if (data.role === "client") await connection.query("INSERT INTO client_utilisateurs (organisation_id,client_id,utilisateur_id,actif) VALUES ($1,$2,$3,true)", [actor.organisationId, data.clientId, user.id]);
            await this.issue(user, raw, connection);
            await audit.creer({ organisation_id: actor.organisationId, utilisateur_id: actor.id, action: "INVITATION_CREEE", ressource: "utilisateur", ressource_id: user.id, contexte: { role: data.role } }, connection);
            await connection.query("COMMIT");
        } catch (error) { await connection.query("ROLLBACK"); throw error; }
        finally { connection.release(); }
        return this.deliver(user, raw);
    }

    async issue(user, raw, connection) {
        await tokens.invaliderTokens(user.id, "invitation", connection);
        await tokens.creerToken({ id: randomUUID(), utilisateurId: user.id, purpose: "invitation", channel: "email", tokenHash: hashToken(raw), expireLe: new Date(Date.now()+48*60*60*1000) }, connection);
    }

    async deliver(user, raw) {
        const link = emailService.lien("activer.html", raw);
        const delivery = await emailService.envoyerTransaction({email:user.email,nom:user.nom,lien:link,subject:"Activez votre accès Pro Récup",texte:"Vous avez été invité à rejoindre Pro Récup. Ce lien personnel expire dans 48 heures.",bouton:"Activer mon accès"});
        return { utilisateurId:user.id, statut:delivery.sent?"invitation_envoyee":"invitation_non_envoyee", code:delivery.code, expireDansHeures:48 };
    }

    async manage(actor, id, cancel = false) {
        const connection = await pool.connect();
        const raw = randomBytes(32).toString("hex");
        let user;
        try {
            await connection.query("BEGIN");
            const result = await connection.query(`SELECT u.*, r.nom AS role FROM utilisateurs u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 AND u.organisation_id=$2 FOR UPDATE OF u`, [id,actor.organisationId]);
            user=result.rows[0];
            if(!user || !invitationRoles(actor).includes(user.role)) throw new ApiError(403,"Invitation hors de votre périmètre.");
            if(!user.invitation_en_attente) throw new ApiError(409,"Compte déjà activé, suspendu ou invitation annulée.");
            await tokens.invaliderTokens(id,"invitation",connection);
            if(cancel) await connection.query("UPDATE utilisateurs SET invitation_en_attente=false,auth_epoch=auth_epoch+1 WHERE id=$1",[id]);
            else await this.issue(user,raw,connection);
            await audit.creer({organisation_id:actor.organisationId,utilisateur_id:actor.id,action:cancel?"INVITATION_ANNULEE":"INVITATION_RENOUVELEE",ressource:"utilisateur",ressource_id:id},connection);
            await connection.query("COMMIT");
        } catch(error){await connection.query("ROLLBACK");throw error;}
        finally{connection.release();}
        return cancel ? {statut:"invitation_annulee"} : this.deliver(user,raw);
    }

    async activate(raw,password) {
        const connection=await pool.connect();
        try {
            await connection.query("BEGIN");
            const token=await tokens.trouverTokenValide(hashToken(raw),"invitation",connection);
            if(!token) throw new ApiError(400,"Invitation invalide, expirée ou déjà utilisée. Demandez un nouveau lien à la personne qui vous a invité.");
            const user=await connection.query(`SELECT u.id,u.organisation_id,u.invitation_en_attente,r.nom AS role
                FROM utilisateurs u JOIN roles r ON r.id=u.role_id
                WHERE u.id=$1 FOR UPDATE OF u`,[token.utilisateur_id]);
            if(!user.rows[0]?.invitation_en_attente) throw new ApiError(400,"Cette invitation ne peut plus être utilisée.");
            const hash=await bcrypt.hash(password,12);
            await connection.query("UPDATE utilisateurs SET mot_de_passe=$1,actif=true,invitation_en_attente=false,email_verifie_le=CURRENT_TIMESTAMP,auth_epoch=auth_epoch+1,modifie_le=CURRENT_TIMESTAMP WHERE id=$2",[hash,token.utilisateur_id]);
            await tokens.invaliderTokens(token.utilisateur_id,"invitation",connection);
            await audit.creer({organisation_id:user.rows[0].organisation_id,utilisateur_id:token.utilisateur_id,action:"INVITATION_ACTIVEE",ressource:"utilisateur",ressource_id:token.utilisateur_id},connection);
            await connection.query("COMMIT");
            const role=String(user.rows[0].role||"").toLowerCase();
            const produit=role==="client"?"portail_client":role==="agent_valorisation_carbone"?"agent_terrain":"backoffice";
            return {success:true,message:"Votre accès est activé. Vous pouvez vous connecter.",produit};
        }catch(error){await connection.query("ROLLBACK");throw error;}
        finally{connection.release();}
    }
}
export default new IdentityInvitationService();
