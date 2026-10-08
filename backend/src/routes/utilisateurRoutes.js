import express from "express";

import utilisateurController
    from "../controllers/utilisateurController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

const router =
    express.Router();

/**
 * GET /api/utilisateurs
 * Admin + Manager :
 * consultation uniquement.
 */
router.get(
    "/",
    authMiddleware,
    roleMiddleware([
        "admin",
        "manager"
    ]),
    utilisateurController.lister
);

/**
 * POST /api/utilisateurs
 * Admin uniquement.
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware([
        "admin"
    ]),
    (req,res)=>res.status(409).json({success:false,error:"Créez une invitation depuis le module Invitations."})
);

/**
 * PUT /api/utilisateurs/:id
 * Admin uniquement.
 */
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware([
        "admin"
    ]),
    utilisateurController.modifier
);

/**
 * PATCH /api/utilisateurs/:id/statut
 * Admin uniquement.
 */
router.patch(
    "/:id/statut",
    authMiddleware,
    roleMiddleware([
        "admin"
    ]),
    utilisateurController.changerStatut
);

export default router;
