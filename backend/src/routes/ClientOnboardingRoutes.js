import express from "express";
import {body,param} from "express-validator";
import provisioning from "../services/ClientProvisioningService.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import {limiterChampsCorps} from "../validators/authValidator.js";
import { creerLimiteurConnexion } from "../middlewares/httpSecurityMiddleware.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import internalAdminMiddleware from "../middlewares/internalAdminMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import clientOnboardingController from "../controllers/ClientOnboardingController.js";
import {
    champsDemandeClient, demandeClientValidator, listeDemandesValidator,
    champsStatutClient, statutClientValidator
} from "../validators/ClientOnboardingValidator.js";

const router = express.Router();
router.post("/client", creerLimiteurConnexion(), champsDemandeClient, demandeClientValidator, validationMiddleware, clientOnboardingController.creer);
router.get("/client", authMiddleware, roleMiddleware(["admin"]), internalAdminMiddleware, listeDemandesValidator, validationMiddleware, clientOnboardingController.lister);
router.patch("/client/:id/statut", authMiddleware, roleMiddleware(["admin"]), internalAdminMiddleware, champsStatutClient, statutClientValidator, validationMiddleware, asyncHandler(async(req,res)=>res.json({success:true,data:await provisioning.transition(req.utilisateur,req.params.id,req.body.statut,req.body.notesInternes)})));
router.post("/client/:id/provision",authMiddleware,roleMiddleware(["admin"]),internalAdminMiddleware,limiterChampsCorps(["typeClient"]),param("id").isUUID(),body("typeClient").isIn(["entreprise","institution","association","collectivite","menage"]),validationMiddleware,asyncHandler(async(req,res)=>res.status(201).set("Cache-Control","no-store").json({success:true,data:await provisioning.provision(req.utilisateur,req.params.id,req.body.typeClient)})));

export default router;
