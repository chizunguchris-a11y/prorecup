import express from "express";

import sessionController
    from "../controllers/SessionController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

const router =
    express.Router();

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Consulter les sessions actives
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/",
    authMiddleware,
    sessionController.lister
);

/**
 * @swagger
 * /api/sessions/fermer-autres:
 *   post:
 *     summary: Fermer toutes les autres sessions
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 */
router.post(
    "/fermer-autres",
    authMiddleware,
    sessionController.fermerAutres
);

/**
 * @swagger
 * /api/sessions/fermer-toutes:
 *   post:
 *     summary: Fermer toutes les sessions
 *     tags:
 *       - Sessions
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/fermer-toutes",
    authMiddleware,
    sessionController.fermerToutes
);

export default router;