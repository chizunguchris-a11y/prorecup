import {randomBytes} from "node:crypto";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import invitations from "./IdentityInvitationService.js";
import audit from "../repositories/AuditRepository.js";
import ApiError from "../utils/ApiError.js";

export const onboardingTransitions={en_attente_verification:["en_attente_validation","refuse"],en_attente_validation:["en_attente_verification","refuse"],actif:["suspendu"],suspendu:["actif"],refuse:["en_attente_verification"]};

class ClientProvisioningService {
    async provision(actor,id,type) {
        const c=await pool.connect(),raw=randomBytes(32).toString("hex");let user,client;
        try {
            await c.query("BEGIN");
            const r=await c.query("SELECT * FROM client_onboarding_requests WHERE id=$1 FOR UPDATE",[id]);const d=r.rows[0];
            if(!d)throw new ApiError(404,"Demande introuvable.");
            if(d.statut!=="en_attente_validation"||d.client_id)throw new ApiError(409,"La demande doit être vérifiée avant la création de l'espace.");
            if(d.organisation_nom.length>150)throw new ApiError(409,"Le nom légal dépasse les 150 caractères du référentiel clients.");
            await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[d.email_contact.toLowerCase()]);
            const duplicate=await c.query("SELECT id FROM utilisateurs WHERE LOWER(email)=LOWER($1) UNION ALL SELECT id FROM clients WHERE organisation_id=$2 AND LOWER(contact_email)=LOWER($1)",[d.email_contact,actor.organisationId]);
            if(duplicate.rows.length)throw new ApiError(409,"Un compte ou client existe déjà pour cette adresse. Vérifiez le rapprochement manuellement.");
            const roles=await c.query("SELECT id FROM roles WHERE nom='client' AND organisation_id IS NULL AND actif=true");
            if(roles.rows.length!==1)throw new ApiError(409,"Le rôle client global doit être configuré.");
            const cr=await c.query("INSERT INTO clients(nom,type_client,contact_email,contact_telephone,adresse_siege,organisation_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[d.organisation_nom,type,d.email_contact,d.telephone_contact,[d.ville,d.pays].filter(Boolean).join(", "),actor.organisationId]);client=cr.rows[0];
            const ur=await c.query("INSERT INTO utilisateurs(nom,email,mot_de_passe,organisation_id,role_id,actif,invitation_en_attente,invitation_statut) VALUES($1,$2,$3,$4,$5,false,true,'en_attente') RETURNING id,nom,email,organisation_id",[d.nom_contact,d.email_contact,await bcrypt.hash(randomBytes(48).toString("hex"),12),actor.organisationId,roles.rows[0].id]);user=ur.rows[0];
            await c.query("INSERT INTO client_utilisateurs(organisation_id,client_id,utilisateur_id,actif) VALUES($1,$2,$3,true)",[actor.organisationId,client.id,user.id]);
            await invitations.issue(user,raw,c);
            await c.query("UPDATE client_onboarding_requests SET client_id=$1,premier_utilisateur_id=$2,organisation_operatrice_id=$3,statut='actif',traite_par=$4,modifie_le=CURRENT_TIMESTAMP WHERE id=$5",[client.id,user.id,actor.organisationId,actor.id,id]);
            await audit.creer({organisation_id:actor.organisationId,utilisateur_id:actor.id,action:"ESPACE_CLIENT_CREE",ressource:"client",ressource_id:client.id,contexte:{demande_id:id,premier_utilisateur_id:user.id}},c);
            await c.query("COMMIT");
        }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
        return {clientId:client.id,invitation:await invitations.deliver(user,raw)};
    }
    async transition(actor,id,status,notes) {
        const c=await pool.connect();
        try {
            await c.query("BEGIN");const r=await c.query("SELECT * FROM client_onboarding_requests WHERE id=$1 FOR UPDATE",[id]);const d=r.rows[0];
            if(!d)throw new ApiError(404,"Demande introuvable.");
            if(d.statut!==status&&!onboardingTransitions[d.statut]?.includes(status))throw new ApiError(409,"Transition non autorisée. Utilisez Créer l'espace client pour une première activation.");
            if(d.client_id&&d.organisation_operatrice_id!==actor.organisationId)throw new ApiError(403,"Espace client hors de votre organisation.");
            if(d.client_id && d.statut!==status && ["suspendu","actif"].includes(status)) {
                await c.query("UPDATE client_utilisateurs SET actif=$1,modifie_le=CURRENT_TIMESTAMP WHERE client_id=$2 AND organisation_id=$3",[status==="actif",d.client_id,actor.organisationId]);
                if(status==="suspendu") {
                    await c.query("UPDATE utilisateurs SET auth_epoch=auth_epoch+1 WHERE id IN (SELECT utilisateur_id FROM client_utilisateurs WHERE client_id=$1 AND organisation_id=$2)",[d.client_id,actor.organisationId]);
                    await c.query("UPDATE refresh_tokens SET revoque=true,revoque_le=CURRENT_TIMESTAMP WHERE utilisateur_id IN (SELECT utilisateur_id FROM client_utilisateurs WHERE client_id=$1 AND organisation_id=$2)",[d.client_id,actor.organisationId]);
                }
            }
            await c.query("UPDATE client_onboarding_requests SET statut=$1,notes_internes=$2,traite_par=$3,modifie_le=CURRENT_TIMESTAMP WHERE id=$4",[status,notes||null,actor.id,id]);
            await audit.creer({organisation_id:actor.organisationId,utilisateur_id:actor.id,action:"DEMANDE_CLIENT_TRAITEE",ressource:"onboarding",ressource_id:id,contexte:{ancien_statut:d.statut,statut:status}},c);
            await c.query("COMMIT");return {id,statut:status};
        }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
    }
}
export default new ClientProvisioningService();
