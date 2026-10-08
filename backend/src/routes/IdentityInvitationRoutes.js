import express from "express";
import { body, param } from "express-validator";
import { rateLimit } from "express-rate-limit";
import auth from "../middlewares/authMiddleware.js";
import role from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validationMiddleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import { limiterChampsCorps } from "../validators/authValidator.js";
import invitations from "../services/IdentityInvitationService.js";

const router=express.Router();
const limit=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:"draft-8",legacyHeaders:false});
const noStore=(req,res,next)=>{res.set("Cache-Control","no-store");next();};
router.use(noStore);
router.get("/",auth,role(["admin","manager"]),asyncHandler(async(req,res)=>{
    const {default:pool}=await import("../config/db.js");
    const r=await pool.query(`SELECT u.id,u.nom,u.email,
        CASE WHEN t.expire_le>CURRENT_TIMESTAMP THEN 'en_attente' ELSE 'expiree' END AS statut
        FROM utilisateurs u JOIN roles r ON r.id=u.role_id
        LEFT JOIN LATERAL (SELECT expire_le FROM identity_recovery_tokens WHERE utilisateur_id=u.id AND purpose='invitation' AND utilise_le IS NULL ORDER BY cree_le DESC LIMIT 1) t ON true
        WHERE u.organisation_id=$1 AND u.invitation_en_attente=true
          AND ($2='admin' OR r.nom='agent_valorisation_carbone') ORDER BY u.nom LIMIT 200`,[req.utilisateur.organisationId,req.utilisateur.role]);
    res.json({success:true,data:r.rows});
}));
router.post("/",auth,role(["admin","manager"]),limit,limiterChampsCorps(["nom","email","role","clientId"]),[
    body("nom").isString().trim().isLength({min:2,max:100}),
    body("email").isString().trim().isLength({max:254}).isEmail().customSanitizer(v=>v.toLowerCase()),
    body("role").isIn(["manager","agent_valorisation_carbone","client"]),
    body("clientId").if(body("role").equals("client")).isUUID()
],validate,asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await invitations.create(req.utilisateur,req.body)})));
router.post("/activate",limit,limiterChampsCorps(["token","nouveauMotDePasse","confirmationMotDePasse"]),[
    body("token").isString().matches(/^[a-f0-9]{64}$/),
    body("nouveauMotDePasse").isString().isLength({min:12,max:72}).custom(v=>Buffer.byteLength(v,"utf8")<=72),
    body("confirmationMotDePasse").custom((v,{req})=>v===req.body.nouveauMotDePasse)
],validate,asyncHandler(async(req,res)=>res.json(await invitations.activate(req.body.token,req.body.nouveauMotDePasse))));
for(const action of ["renew","cancel"]) router.post(`/:id/${action}`,auth,role(["admin","manager"]),limit,limiterChampsCorps([]),param("id").isUUID(),validate,asyncHandler(async(req,res)=>res.json({success:true,data:await invitations.manage(req.utilisateur,req.params.id,action==="cancel")})));
export default router;
