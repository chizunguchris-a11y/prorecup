import express from "express";
import {randomBytes,randomUUID} from "node:crypto";
import {body} from "express-validator";
import {rateLimit} from "express-rate-limit";
import auth from "../middlewares/authMiddleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import validate from "../middlewares/validationMiddleware.js";
import pool from "../config/db.js";
import tokens from "../repositories/IdentityRecoveryRepository.js";
import email from "../services/RecoveryEmailService.js";
import {hashToken} from "../services/IdentityInvitationService.js";
import {limiterChampsCorps} from "../validators/authValidator.js";
import audit from "../repositories/AuditRepository.js";

const router=express.Router();
const limit=rateLimit({windowMs:15*60*1000,limit:process.env.NODE_ENV==="test"?100:5,standardHeaders:"draft-8",legacyHeaders:false});
router.use((req,res,next)=>{res.set("Cache-Control","no-store");next();});
router.get("/security",auth,asyncHandler(async(req,res)=>{
    const r=await pool.query("SELECT email,telephone,email_verifie_le,telephone_verifie_le FROM utilisateurs WHERE id=$1",[req.utilisateur.id]);
    res.json({success:true,data:{...r.rows[0],email_provider_configured:!!process.env.RESEND_API_KEY,phone_provider_configured:false,sessions_individuelles_disponibles:false}});
}));
router.post("/email/request",auth,limit,limiterChampsCorps([]),asyncHandler(async(req,res)=>{
    if(!process.env.RESEND_API_KEY)return res.status(503).json({success:false,code:"EMAIL_PROVIDER_NOT_CONFIGURED",error:"L'envoi des e-mails de vérification doit être configuré."});
    const raw=randomBytes(32).toString("hex");
    const c=await pool.connect();let user;
    try{
        await c.query("BEGIN");const r=await c.query("SELECT id,nom,email FROM utilisateurs WHERE id=$1 FOR UPDATE",[req.utilisateur.id]);user=r.rows[0];
        await tokens.invaliderTokens(user.id,"email_verification",c);
        await tokens.creerToken({id:randomUUID(),utilisateurId:user.id,purpose:"email_verification",channel:"email",tokenHash:hashToken(raw),destinationHint:user.email,expireLe:new Date(Date.now()+30*60*1000)},c);
        await c.query("COMMIT");
    }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
    const delivery=await email.envoyerTransaction({email:user.email,nom:user.nom,lien:email.lien("verifier-email.html",raw),subject:"Vérifiez votre e-mail Pro Récup",texte:"Confirmez votre adresse e-mail. Le lien expire dans 30 minutes.",bouton:"Vérifier mon e-mail"});
    res.status(delivery.sent?202:503).json({success:delivery.sent,code:delivery.code,message:delivery.sent?"Un lien de vérification a été envoyé.":"L'envoi est temporairement indisponible."});
}));
router.post("/email/confirm",limit,limiterChampsCorps(["token"]),body("token").isString().matches(/^[a-f0-9]{64}$/),validate,asyncHandler(async(req,res)=>{
    const c=await pool.connect();
    try{
        await c.query("BEGIN");const t=await tokens.trouverTokenValide(hashToken(req.body.token),"email_verification",c);
        if(!t){await c.query("ROLLBACK");return res.status(400).json({success:false,error:"Lien invalide, expiré ou déjà utilisé."});}
        // Bind the proof to the address for which the token was issued.
        const result=await c.query(`UPDATE utilisateurs u SET email_verifie_le=CURRENT_TIMESTAMP
            FROM roles r WHERE u.id=$1 AND u.actif=true AND u.role_id=r.id
              AND u.email=(SELECT destination_hint FROM identity_recovery_tokens WHERE id=$2)
            RETURNING u.organisation_id,r.nom AS role`,[t.utilisateur_id,t.id]);
        if(!result.rows.length){await c.query("ROLLBACK");return res.status(400).json({success:false,error:"L'adresse a changé. Demandez un nouveau lien."});}
        await tokens.invaliderTokens(t.utilisateur_id,"email_verification",c);
        await audit.creer({organisation_id:result.rows[0].organisation_id,utilisateur_id:t.utilisateur_id,action:"EMAIL_VERIFIE",ressource:"utilisateur",ressource_id:t.utilisateur_id},c);
        const role=String(result.rows[0].role||"").toLowerCase();
        const produit=role==="client"?"portail_client":role==="agent_valorisation_carbone"?"agent_terrain":"backoffice";
        await c.query("COMMIT");res.json({success:true,message:"Votre adresse e-mail est vérifiée.",produit});
    }catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();}
}));
export default router;
