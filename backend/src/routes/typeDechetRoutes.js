import express from "express";

import typeDechetController
    from "../controllers/TypeDechetController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/types-dechets:
 *   get:
 *     summary: Consulter les types de déchets
 *     tags:
 *       - Types de déchets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Types de déchets récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    typeDechetController.lister
);

export default router;