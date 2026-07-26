import express from "express";

import siteController
    from "../controllers/SiteController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import siteValidator
    from "../validators/siteValidator.js";

const router = express.Router();

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: Consulter les sites de collecte de l'organisation
 *     tags:
 *       - Sites de collecte
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sites de collecte récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    siteController.lister
);

/**
 * @swagger
 * /api/sites:
 *   post:
 *     summary: Créer un site de collecte
 *     tags:
 *       - Sites de collecte
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
 *                 example: Centre de collecte Gombe
 *               adresse:
 *                 type: string
 *                 example: Boulevard du 30 Juin
 *               zone_geographique:
 *                 type: string
 *                 example: Gombe
 *               responsable_nom:
 *                 type: string
 *                 example: Jean Mukendi
 *     responses:
 *       201:
 *         description: Site créé avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.post(
    "/",
    authMiddleware,
    siteValidator,
    validationMiddleware,
    siteController.creer
);

/**
 * @swagger
 * /api/sites/{id}:
 *   put:
 *     summary: Modifier un site de collecte
 *     tags:
 *       - Sites de collecte
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *               adresse:
 *                 type: string
 *               zone_geographique:
 *                 type: string
 *               responsable_nom:
 *                 type: string
 *     responses:
 *       200:
 *         description: Site modifié avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       404:
 *         description: Site introuvable.
 */
router.put(
    "/:id",
    authMiddleware,
    siteValidator,
    validationMiddleware,
    siteController.modifier
);

/**
 * @swagger
 * /api/sites/{id}:
 *   delete:
 *     summary: Supprimer un site sans collecte liée
 *     tags:
 *       - Sites de collecte
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
 *         description: Site supprimé avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Site introuvable.
 *       409:
 *         description: Le site est lié à une ou plusieurs collectes.
 */
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    siteController.supprimer
);

export default router;