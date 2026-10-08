import express
    from "express";

import {
    creerLimiteurConnexion
} from "../middlewares/httpSecurityMiddleware.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import identityRecoveryController
    from "../controllers/IdentityRecoveryController.js";

import {
    champsDemandePassword,
    demandePasswordValidator,
    champsResetPassword,
    resetPasswordValidator,
    champsAideAcces,
    aideAccesValidator,
    contactRecuperationObligatoire
} from "../validators/IdentityRecoveryValidator.js";


const router =
    express.Router();


const limiteur =
    creerLimiteurConnexion();


router.get(
    "/",
    (
        req,
        res
    ) => {

        res.set(
            "Cache-Control",
            "no-store"
        );

        return res.status(200).json({
            success: true,
            service:
                "Pro Récup Identity",
            status:
                "operational"
        });

    }
);


router.post(
    "/recovery/password/request",
    limiteur,
    champsDemandePassword,
    demandePasswordValidator,
    validationMiddleware,
    identityRecoveryController
        .demanderMotDePasse
);


router.post(
    "/recovery/password/reset",
    limiteur,
    champsResetPassword,
    resetPasswordValidator,
    validationMiddleware,
    identityRecoveryController
        .reinitialiserMotDePasse
);


router.post(
    "/recovery/help",
    limiteur,
    champsAideAcces,
    aideAccesValidator,
    validationMiddleware,
    contactRecuperationObligatoire,
    identityRecoveryController
        .demanderAssistance
);


export default router;
