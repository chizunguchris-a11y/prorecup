import express from "express";

import organisationController
    from "../controllers/organisationController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

const router =
    express.Router();

/**
 * @swagger
 * /api/organisations/me:
 *   get:
 *     summary: Consulter les paramètres de son organisation
 *     tags:
 *       - Organisations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organisation récupérée avec succès.
 */
router.get(
    "/me",
    authMiddleware,
    organisationController
        .consulterMonOrganisation
);

/**
 * @swagger
 * /api/organisations/me:
 *   put:
 *     summary: Modifier les paramètres de son organisation
 *     tags:
 *       - Organisations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 example: Pro Récup RDC
 *               pays:
 *                 type: string
 *                 example: RDC
 *               ville:
 *                 type: string
 *                 example: Kinshasa
 *               adresse:
 *                 type: string
 *                 example: Boulevard du 30 Juin
 *               telephone:
 *                 type: string
 *                 example: "+243900000111"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: contact@prorecup.com
 *               logo_url:
 *                 type: string
 *                 example: https://example.com/logo.png
 *               devise:
 *                 type: string
 *                 example: USD
 *               fuseau_horaire:
 *                 type: string
 *                 example: Africa/Kinshasa
 *               numero_identification:
 *                 type: string
 *                 example: RCCM-CD-KIN-2026
 *               site_web:
 *                 type: string
 *                 example: https://prorecup.com
 *               description:
 *                 type: string
 *                 example: Gestion environnementale et valorisation des déchets.
 *     responses:
 *       200:
 *         description: Organisation modifiée avec succès.
 *       403:
 *         description: Accès refusé.
 */
router.put(
    "/me",
    authMiddleware,
    roleMiddleware([
        "admin",
        "manager"
    ]),
    organisationController
        .modifierMonOrganisation
);

export default router;