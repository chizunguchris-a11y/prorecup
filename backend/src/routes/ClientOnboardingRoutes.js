import express from "express";
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
router.patch("/client/:id/statut", authMiddleware, roleMiddleware(["admin"]), internalAdminMiddleware, champsStatutClient, statutClientValidator, validationMiddleware, clientOnboardingController.modifierStatut);

export default router;
