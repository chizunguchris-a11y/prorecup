import express from "express";

import collecteController
    from "../controllers/CollecteController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import collecteValidator
    from "../validators/collecteValidator.js";

const router = express.Router();

/**
 * @swagger
 * /api/collectes:
 *   get:
 *     summary: Consulter les collectes de l'organisation
 *     tags:
 *       - Collectes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Collectes récupérées avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    collecteController.lister
);

/**
 * @swagger
 * /api/collectes:
 *   post:
 *     summary: Enregistrer une nouvelle collecte
 *     description: >
 *       Crée une collecte avec le statut en_attente.
 *       L'agent est récupéré automatiquement depuis le JWT.
 *     tags:
 *       - Collectes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - site_id
 *               - client_id
 *               - type_dechet_id
 *               - poids_estime
 *             properties:
 *               site_id:
 *                 type: string
 *                 format: uuid
 *               client_id:
 *                 type: string
 *                 format: uuid
 *               type_dechet_id:
 *                 type: string
 *                 format: uuid
 *               poids_estime:
 *                 type: number
 *                 example: 40
 *     responses:
 *       201:
 *         description: Collecte enregistrée avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.post(
    "/",
    authMiddleware,
    collecteValidator,
    validationMiddleware,
    collecteController.creer
);

/**
 * @swagger
 * /api/collectes/{id}/valider:
 *   patch:
 *     summary: Valider une collecte
 *     tags:
 *       - Collectes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Collecte validée avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Collecte introuvable.
 *       409:
 *         description: Collecte déjà validée.
 */
router.patch(
    "/:id/valider",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    collecteController.valider
);

export default router;