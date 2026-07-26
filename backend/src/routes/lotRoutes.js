import express from "express";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import lotValidator
    from "../validators/lotValidator.js";

import lotController
    from "../controllers/LotController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/lots:
 *   get:
 *     summary: Consulter les lots de l'organisation
 *     description: >
 *       Retourne uniquement les lots rattachés
 *       à l'organisation de l'utilisateur connecté.
 *     tags:
 *       - Lots
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lots récupérés avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lots récupérés avec succès.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       collecte_id:
 *                         type: string
 *                         format: uuid
 *                       poids_reel:
 *                         type: number
 *                         example: 38.5
 *                       statut_lot:
 *                         type: string
 *                         example: en_stock
 *                       type_dechet:
 *                         type: string
 *                         example: PET
 *                       client_nom:
 *                         type: string
 *                         example: Hôpital Central
 *                       site_nom:
 *                         type: string
 *                         example: Centre de collecte Gombe
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    lotController.lister
);

/**
 * @swagger
 * /api/lots:
 *   post:
 *     summary: Créer un nouveau lot
 *     description: >
 *       Crée un lot à partir d'une collecte validée.
 *       La création du lot met automatiquement à jour le stock
 *       et enregistre un mouvement de stock de type ENTREE.
 *       Une collecte ne peut produire qu'un seul lot.
 *     tags:
 *       - Lots
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - collecte_id
 *               - type_dechet_id
 *               - poids_reel
 *             properties:
 *               collecte_id:
 *                 type: string
 *                 format: uuid
 *                 example: e2b083ea-e8f7-414c-b227-7ca8b95c5df3
 *               type_dechet_id:
 *                 type: string
 *                 format: uuid
 *                 example: aca1e84d-bc23-45e2-b218-42e6b24aad98
 *               poids_reel:
 *                 type: number
 *                 example: 38.5
 *               statut_lot:
 *                 type: string
 *                 enum:
 *                   - en_stock
 *                   - vendu
 *                   - transforme
 *                 example: en_stock
 *     responses:
 *       201:
 *         description: Lot créé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lot créé avec succès.
 *                 data:
 *                   type: object
 *                   properties:
 *                     lot:
 *                       type: object
 *                     stock:
 *                       type: object
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé pour le rôle de l'utilisateur.
 *       404:
 *         description: Collecte introuvable.
 *       409:
 *         description: >
 *           Collecte non validée, type de déchet incompatible
 *           ou lot déjà existant.
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    lotValidator,
    validationMiddleware,
    lotController.creer
);

export default router;