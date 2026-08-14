import express from "express";
import dashboardController from "../controllers/DashboardController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Tableau de bord de l'organisation connectée
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tableau de bord récupéré avec succès.
 *       401:
 *         description: Non authentifié.
 */
router.get(
    "/",
    authMiddleware,
    dashboardController.obtenirResume
);

export default router;