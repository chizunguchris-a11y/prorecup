import express from "express";
import stockController from "../controllers/StockController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/stocks:
 *   get:
 *     summary: Consulter les stocks de l'organisation connectée
 *     tags:
 *       - Stocks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des stocks récupérée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stock'
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    stockController.lister
);

/**
 * @swagger
 * /api/stocks:
 *   post:
 *     summary: Ajouter manuellement une quantité au stock
 *     description: Route réservée aux managers et administrateurs. Dans le fonctionnement normal, le stock est alimenté automatiquement lors de la création d'un lot.
 *     tags:
 *       - Stocks
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type_dechet_id
 *               - quantite
 *               - lot_id
 *             properties:
 *               type_dechet_id:
 *                 type: string
 *                 format: uuid
 *                 example: aca1e84d-bc23-45e2-b218-42e6b24aad98
 *               quantite:
 *                 type: number
 *                 example: 25
 *               lot_id:
 *                 type: string
 *                 format: uuid
 *                 example: 9882f185-5017-4ae9-86cf-2a894987e95d
 *     responses:
 *       200:
 *         description: Stock mis à jour avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé pour le rôle de l'utilisateur.
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware(["manager", "admin"]),
    stockController.ajouter
);

export default router;