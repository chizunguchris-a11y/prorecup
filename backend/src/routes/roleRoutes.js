import express from "express";

import roleController
    from "../controllers/roleController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

const router =
    express.Router();

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Consulter les rôles disponibles
 *     tags:
 *       - Rôles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rôles récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    roleController.getAll
);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Créer un rôle système
 *     tags:
 *       - Rôles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *             properties:
 *               nom:
 *                 type: string
 *                 enum:
 *                   - admin
 *                   - manager
 *                   - agent
 *                 example: manager
 *               description:
 *                 type: string
 *                 example: Responsable des opérations.
 *     responses:
 *       201:
 *         description: Rôle créé avec succès.
 *       400:
 *         description: Données invalides.
 *       403:
 *         description: Accès refusé.
 *       409:
 *         description: Le rôle existe déjà.
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware([
        "admin"
    ]),
    roleController.create
);

export default router;