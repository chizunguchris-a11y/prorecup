import express from "express";

import carteController
    from "../controllers/CarteController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

const router =
    express.Router();

/**
 * @swagger
 * /api/carte/positions:
 *   get:
 *     summary: Consulter les positions GPS des missions
 *     tags:
 *       - Carte GPS
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Positions GPS récupérées avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 */
router.get(
    "/positions",
    authMiddleware,
    roleMiddleware([
        "admin",
        "manager",
        "agent",
        "agent_valorisation_carbone"
    ]),
    carteController.obtenirPositions
);

export default router;