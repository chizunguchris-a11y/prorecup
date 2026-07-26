import express from "express";

import venteController
    from "../controllers/VenteController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import venteValidator
    from "../validators/venteValidator.js";

const router = express.Router();

/**
 * @swagger
 * /api/ventes:
 *   get:
 *     summary: Consulter les ventes de l'organisation
 *     description: >
 *       Retourne uniquement les ventes liées à
 *       l'organisation de l'utilisateur connecté.
 *     tags:
 *       - Ventes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ventes récupérées avec succès.
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
 *                   example: Ventes récupérées avec succès.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       stock_id:
 *                         type: string
 *                         format: uuid
 *                       quantite:
 *                         type: number
 *                         example: 5
 *                       prix_unitaire:
 *                         type: number
 *                         example: 450
 *                       montant_total:
 *                         type: number
 *                         example: 2250
 *                       acheteur_nom:
 *                         type: string
 *                         example: Eco Plast RDC
 *                       reference_vente:
 *                         type: string
 *                         example: VTE-2026-003
 *                       statut:
 *                         type: string
 *                         example: confirmee
 *                       date_vente:
 *                         type: string
 *                         format: date-time
 *                       type_dechet:
 *                         type: string
 *                         example: PET
 *                       unite:
 *                         type: string
 *                         example: kg
 *                       cree_par_nom:
 *                         type: string
 *                         example: Christian
 *                       co2e_estime_kg:
 *                         type: number
 *                         example: 10.75
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    venteController.lister
);

/**
 * @swagger
 * /api/ventes:
 *   post:
 *     summary: Enregistrer une nouvelle vente
 *     description: >
 *       Enregistre une vente, diminue automatiquement le stock,
 *       crée un mouvement de stock de type SORTIE et calcule
 *       l'impact carbone estimé.
 *     tags:
 *       - Ventes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock_id
 *               - quantite
 *               - prix_unitaire
 *               - acheteur_nom
 *             properties:
 *               stock_id:
 *                 type: string
 *                 format: uuid
 *                 example: c51e4918-9457-4d9e-9ea7-86fe60823224
 *               quantite:
 *                 type: number
 *                 example: 5
 *               prix_unitaire:
 *                 type: number
 *                 example: 450
 *               acheteur_nom:
 *                 type: string
 *                 example: Eco Plast RDC
 *               reference_vente:
 *                 type: string
 *                 example: VTE-2026-003
 *     responses:
 *       201:
 *         description: Vente enregistrée avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé pour le rôle de l'utilisateur.
 *       404:
 *         description: Stock introuvable.
 *       409:
 *         description: Stock insuffisant.
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    venteValidator,
    validationMiddleware,
    venteController.creer
);

export default router;