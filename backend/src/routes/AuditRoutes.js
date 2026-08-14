import express from "express";

import auditController
    from "../controllers/AuditController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

const router =
    express.Router();

/**
 * @swagger
 * /api/audits:
 *   get:
 *     summary: Consulter les journaux d'audit
 *     tags:
 *       - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: utilisateur_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: ressource
 *         schema:
 *           type: string
 *       - in: query
 *         name: recherche
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_debut
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: date_fin
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *     responses:
 *       200:
 *         description: Journaux récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 */
router.get(
    "/",
    authMiddleware,
    roleMiddleware([
        "admin",
        "manager"
    ]),
    auditController.lister
);

/**
 * @swagger
 * /api/audits/{id}:
 *   get:
 *     summary: Consulter un journal d'audit
 *     tags:
 *       - Audit
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
 *         description: Journal récupéré avec succès.
 *       404:
 *         description: Journal introuvable.
 */
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware([
        "admin",
        "manager"
    ]),
    auditController.consulter
);

export default router;