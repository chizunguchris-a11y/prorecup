import express from "express";

import impactCarboneController
    from "../controllers/ImpactCarboneController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/impacts-carbone:
 *   get:
 *     summary: Consulter les impacts carbone de l'organisation
 *     description: >
 *       Retourne les impacts carbone calculés à partir
 *       des ventes de l'organisation connectée.
 *     tags:
 *       - Impact carbone
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Impacts carbone récupérés avec succès.
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
 *                   example: Impacts carbone récupérés avec succès.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       vente_id:
 *                         type: string
 *                         format: uuid
 *                       quantite_kg:
 *                         type: number
 *                         example: 5
 *                       facteur_utilise:
 *                         type: number
 *                         example: 2.15
 *                       co2e_estime_kg:
 *                         type: number
 *                         example: 10.75
 *                       date_calcul:
 *                         type: string
 *                         format: date-time
 *                       reference_vente:
 *                         type: string
 *                         example: VTE-2026-003
 *                       acheteur_nom:
 *                         type: string
 *                         example: Eco Plast RDC
 *                       type_dechet:
 *                         type: string
 *                         example: PET
 *                       source_facteur:
 *                         type: string
 *                         example: Base interne Pro Récup
 *                       version_source:
 *                         type: string
 *                         example: v1.0
 *                       zone_geographique:
 *                         type: string
 *                         example: RDC
 *                       statut_facteur:
 *                         type: string
 *                         example: valide
 *                       cree_par_nom:
 *                         type: string
 *                         example: Christian
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    impactCarboneController.lister
);

export default router;