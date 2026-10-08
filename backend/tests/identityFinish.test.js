import {strict as assert} from "node:assert";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app from "../src/app.js";
import pool from "../src/config/db.js";
import invitations,{invitationRoles,hashToken} from "../src/services/IdentityInvitationService.js";
import tokens from "../src/repositories/IdentityRecoveryRepository.js";
import audit from "../src/repositories/AuditRepository.js";
import mail from "../src/services/RecoveryEmailService.js";
import onboarding from "../src/repositories/ClientOnboardingRepository.js";
import provisioning from "../src/services/ClientProvisioningService.js";
import recovery from "../src/services/IdentityRecoveryService.js";
import refresh from "../src/repositories/RefreshTokenRepository.js";

const id="11111111-1111-4111-8111-111111111111";
const actor={id,organisationId:id,role:"admin"};
const raw="a".repeat(64);
describe("Product Finish — invitations, activation et permissions",function(){
    this.timeout(10000);
    let restore,state;
    const replace=(object,key,value)=>{const previous=object[key];restore.push(()=>object[key]=previous);object[key]=value;};
    beforeEach(()=>{
        restore=[];state={commands:[],pending:true,used:false,duplicate:false,token:null,audits:[]};
        replace(pool,"query",async()=>({rows:[{actif:true,auth_epoch:1}]}));
        replace(pool,"connect",async()=>({release(){},async query(sql,values=[]){state.commands.push({sql,values});
            if(sql.includes("SELECT id FROM utilisateurs WHERE LOWER"))return {rows:state.duplicate?[{id}]:[]};
            if(sql.includes("SELECT id FROM roles"))return {rows:[{id}]};
            if(sql.includes("INSERT INTO utilisateurs"))return {rows:[{id,nom:"Invité",email:"invite@example.com",organisation_id:id}]};
            if(sql.includes("SELECT u.*, r.nom AS role"))return {rows:[{id,nom:"Invité",email:"invite@example.com",organisation_id:id,invitation_en_attente:state.pending,invitation_statut:state.pending?"en_attente":"annulee",actif:false,role:"manager"}]};
            if(sql.includes("SELECT u.id,u.organisation_id,u.invitation_en_attente"))return {rows:[{id,organisation_id:id,invitation_en_attente:state.pending,role:"manager"}]};
            if(sql.includes("UPDATE utilisateurs u SET email_verifie_le"))return {rows:[{organisation_id:id,role:"manager"}]};
            if(sql.includes("UPDATE utilisateurs SET mot_de_passe")){state.pending=false;state.password=values[0];}
            return {rows:[],rowCount:1};
        }}));
        replace(tokens,"creerToken",async data=>{state.token=data;});
        replace(tokens,"invaliderTokens",async()=>{state.used=true;});
        replace(tokens,"trouverTokenValide",async hash=>hash===hashToken(raw)&&!state.used?{id,utilisateur_id:id}:null);
        replace(audit,"creer",async data=>state.audits.push(data));
        replace(mail,"envoyerTransaction",async data=>{state.delivery=data;return {sent:false,code:"EMAIL_PROVIDER_NOT_CONFIGURED"};});
    });
    afterEach(()=>restore.reverse().forEach(fn=>fn()));
    it("expose un statut public neutre pour le domaine identité",async()=>{const r=await request(app).get("/api/identity");assert.equal(r.status,200);assert.equal(r.body.status,"operational");assert.equal(r.headers["cache-control"],"no-store");});
    it("le Manager ne peut inviter ni Admin ni Client",()=>{assert.deepEqual(invitationRoles({...actor,role:"manager"}),["agent_valorisation_carbone"]);});
    it("une invitation valide stocke uniquement un hash et un mot de passe aléatoire",async()=>{
        const result=await invitations.create(actor,{nom:"Invité",email:"invite@example.com",role:"manager"});
        assert.equal(result.code,"EMAIL_PROVIDER_NOT_CONFIGURED");
        const linkToken=new URLSearchParams(new URL(state.delivery.lien).hash.slice(1)).get("token");
        assert.equal(state.token.tokenHash,hashToken(linkToken));assert.equal(state.token.purpose,"invitation");assert.ok(state.token.expireLe>Date.now());assert.equal(state.token.token,undefined);
        assert.equal(result.lienInvitation,undefined);
        assert.ok(state.commands.some(c=>c.sql.includes("false,true")));assert.ok(state.audits.some(a=>a.action==="INVITATION_CREEE"));
    });
    it("refuse l'adresse d'un compte existant et rollback",async()=>{state.duplicate=true;await assert.rejects(()=>invitations.create(actor,{nom:"Test",email:"existing@example.com",role:"manager"}),/déjà utilisée/);assert.equal(state.token,null);assert.ok(state.commands.some(c=>c.sql==="ROLLBACK"));});
    it("un Manager ne peut créer Admin même par appel direct",async()=>{await assert.rejects(()=>invitations.create({...actor,role:"manager"},{role:"admin"}),e=>e.statut===403);});
    it("une personne publique ne peut s'auto-inviter",async()=>{const r=await request(app).post("/api/identity/invitations").send({role:"admin"});assert.equal(r.status,401);});
    it("aucun rôle ni organisation du navigateur n'est accepté lors de l'activation",async()=>{const r=await request(app).post("/api/identity/invitations/activate").send({token:raw,nouveauMotDePasse:"Activation2026!",confirmationMotDePasse:"Activation2026!",role:"admin",organisationId:id});assert.equal(r.status,400);});
    for(const reason of ["invalide","expiré","déjà utilisé"]){it(`refuse un token ${reason}`,async()=>{replace(tokens,"trouverTokenValide",async()=>null);await assert.rejects(()=>invitations.activate(raw,"Activation2026!"),e=>e.statut===400);assert.ok(!state.password);});}
    it("active une seule fois, vérifie l'e-mail et définit un hash bcrypt",async()=>{await invitations.activate(raw,"Activation2026!");assert.ok(await bcrypt.compare("Activation2026!",state.password));assert.ok(state.commands.some(c=>c.sql.includes("email_verifie_le=CURRENT_TIMESTAMP")));assert.ok(state.audits.some(a=>a.action==="INVITATION_ACTIVEE"));await assert.rejects(()=>invitations.activate(raw,"Activation2026!"),e=>e.statut===400);});
    it("une invitation annulée ou un compte suspendu n'est pas activable",async()=>{state.pending=false;await assert.rejects(()=>invitations.activate(raw,"Activation2026!"),e=>e.statut===400);});
    it("annule une invitation et invalide son jeton",async()=>{const resultat=await invitations.manage(actor,id,true);assert.equal(resultat.statut,"invitation_annulee");assert.equal(state.used,true);assert.ok(state.commands.some(c=>c.sql.includes("auth_epoch=auth_epoch+1")));assert.ok(state.audits.some(a=>a.action==="INVITATION_ANNULEE"));});
    it("renouvelle une invitation en invalidant la précédente",async()=>{const resultat=await invitations.manage(actor,id,false);assert.equal(resultat.code,"EMAIL_PROVIDER_NOT_CONFIGURED");assert.equal(state.used,true);assert.ok(state.token?.tokenHash);assert.ok(state.audits.some(a=>a.action==="INVITATION_RENOUVELEE"));});
    it("permet de renouveler une invitation précédemment annulée",async()=>{state.pending=false;const resultat=await invitations.manage(actor,id,false);assert.equal(resultat.code,"EMAIL_PROVIDER_NOT_CONFIGURED");assert.ok(state.commands.some(c=>c.sql.includes("invitation_statut='en_attente'")));});
    it("vérifie l'e-mail une seule fois avec un jeton hashé",async()=>{const premier=await request(app).post("/api/identity/account/email/confirm").send({token:raw});assert.equal(premier.status,200);assert.equal(premier.body.produit,"backoffice");const second=await request(app).post("/api/identity/account/email/confirm").send({token:raw});assert.equal(second.status,400);assert.ok(state.audits.some(a=>a.action==="EMAIL_VERIFIE"));});
    it("un non-admin ne peut pas gérer les demandes clients",async()=>{const token=jwt.sign({id,organisationId:id,role:"manager"},process.env.JWT_SECRET);const r=await request(app).get("/api/onboarding/client").set("Authorization","Bearer "+token);assert.equal(r.status,403);});
    it("l'Agent de valorisation carbone ne peut administrer le Back-office",async()=>{const token=jwt.sign({id,organisationId:id,role:"agent_valorisation_carbone"},process.env.JWT_SECRET);const r=await request(app).get("/api/utilisateurs").set("Authorization","Bearer "+token);assert.equal(r.status,403);});
    it("un ancien auth_epoch est inutilisable",async()=>{replace(pool,"query",async()=>({rows:[{actif:true,auth_epoch:2}]}));const token=jwt.sign({id,organisationId:id,role:"admin",authEpoch:1},process.env.JWT_SECRET);assert.equal((await request(app).get("/api/auth/me").set("Authorization","Bearer "+token)).status,401);});
    it("fermer toutes les sessions révoque les jetons et incrémente auth_epoch",async()=>{replace(refresh,"revoquerTousPourUtilisateur",async()=>{state.revoked=true;return 2;});const token=jwt.sign({id,organisationId:id,role:"admin",authEpoch:1},process.env.JWT_SECRET);const r=await request(app).post("/api/sessions/fermer-toutes").set("Authorization","Bearer "+token).send({});assert.equal(r.status,200);assert.equal(state.revoked,true);assert.ok(state.commands.some(c=>c.sql.includes("auth_epoch = auth_epoch + 1")));});
    it("l'onboarding valide ne crée aucun compte interne",async()=>{replace(onboarding,"creer",async()=>({id}));const r=await request(app).post("/api/onboarding/client").send({organisationNom:"Entreprise",nomContact:"Contact",emailContact:"contact@example.com",pays:"France",consentement:"true"});assert.equal(r.status,202);assert.equal(state.token,null);});
    for(const key of ["email_contact","identifiant_legal"]){it(`doublon ${key} : réponse publique neutre`,async()=>{replace(onboarding,"creer",async()=>{const e=new Error(key);e.code="23505";throw e;});const r=await request(app).post("/api/onboarding/client").send({organisationNom:"Entreprise",nomContact:"Contact",emailContact:"contact@example.com",pays:"France",consentement:"true"});assert.equal(r.status,202);assert.ok(!r.body.reference);});}
    it("la validation ne peut sauter directement à actif",async()=>{replace(pool,"connect",async()=>({release(){},async query(sql){return {rows:sql.includes("SELECT * FROM client_onboarding")?[{id,statut:"en_attente_verification"}]:[]};}}));await assert.rejects(()=>provisioning.transition(actor,id,"actif",""),e=>e.statut===409);});
    it("une demande vérifiée peut être refusée avec audit",async()=>{replace(pool,"connect",async()=>({release(){},async query(sql){return {rows:sql.includes("SELECT * FROM client_onboarding")?[{id,statut:"en_attente_validation"}]:[]};}}));assert.equal((await provisioning.transition(actor,id,"refuse","Vérification incomplète")).statut,"refuse");assert.ok(state.audits.some(a=>a.action==="DEMANDE_CLIENT_TRAITEE"));});
    it("la récupération retourne la même réponse pour compte absent ou envoi indisponible",async()=>{replace(recovery,"demanderResetMotDePasse",async()=>({accepted:true}));const a=await request(app).post("/api/identity/recovery/password/request").send({email:"absent@example.com"});replace(recovery,"demanderResetMotDePasse",async()=>{throw new Error("Provider unavailable");});const b=await request(app).post("/api/identity/recovery/password/request").send({email:"present@example.com"});assert.equal(a.status,b.status);assert.deepEqual(a.body,b.body);});
    it("reset : révoque les sessions, invalide les tokens et incrémente auth_epoch",async()=>{state.used=false;replace(tokens,"verrouillerUtilisateur",async()=>({id,actif:true,organisation_id:id,mot_de_passe:await bcrypt.hash("Ancien2026!",4)}));replace(tokens,"modifierMotDePasse",async()=>{state.epochIncremented=true;});replace(refresh,"revoquerTousPourUtilisateur",async()=>{state.revoked=true;return 3;});await recovery.reinitialiserMotDePasse(raw,"Nouveau2026!");assert.equal(state.revoked,true);assert.equal(state.epochIncremented,true);assert.equal(state.used,true);assert.equal((await recovery.reinitialiserMotDePasse(raw,"Encore2026!")).success,false);});
});
