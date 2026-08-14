import express from "express";

import tricycleController
    from "../controllers/TricycleController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import tricycleValidator
    from "../validators/tricycleValidator.js";

import tricycleModificationValidator
    from "../validators/tricycleModificationValidator.js";

import tricycleStatutValidator
    from "../validators/tricycleStatutValidator.js";

const router = express.Router();

/**
 * @swagger
 * /api/tricycles:
 *   get:
 *     summary: Consulter les tricycles de l'organisation
 *     tags:
 *       - Tricycles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tricycles récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    tricycleController.lister
);

/**
 * @swagger
 * /api/tricycles:
 *   post:
 *     summary: Enregistrer un nouveau tricycle
 *     tags:
 *       - Tricycles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numero_interne
 *               - capacite_kg
 *             properties:
 *               numero_interne:
 *                 type: string
 *                 example: TRI-001
 *               plaque_identification:
 *                 type: string
 *                 example: PR-001
 *               marque:
 *                 type: string
 *                 example: TVS
 *               modele:
 *                 type: string
 *                 example: King Cargo
 *               capacite_kg:
 *                 type: number
 *                 example: 350
 *               statut:
 *                 type: string
 *                 enum:
 *                   - disponible
 *                   - en_mission
 *                   - en_panne
 *                   - maintenance
 *                   - hors_service
 *                 example: disponible
 *               etat:
 *                 type: string
 *                 enum:
 *                   - bon
 *                   - moyen
 *                   - mauvais
 *                 example: bon
 *               date_mise_en_service:
 *                 type: string
 *                 format: date
 *                 example: 2026-07-27
 *               observations:
 *                 type: string
 *                 example: Tricycle affecté aux opérations de Gombe.
 *     responses:
 *       201:
 *         description: Tricycle créé avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       409:
 *         description: Numéro interne ou plaque déjà utilisé.
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    tricycleValidator,
    validationMiddleware,
    tricycleController.creer
);

/**
 * @swagger
 * /api/tricycles/{id}:
 *   put:
 *     summary: Modifier un tricycle
 *     tags:
 *       - Tricycles
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
 *             properties:
 *               numero_interne:
 *                 type: string
 *                 example: TRI-001
 *               plaque_identification:
 *                 type: string
 *                 example: PR-001
 *               marque:
 *                 type: string
 *                 example: TVS
 *               modele:
 *                 type: string
 *                 example: King Cargo
 *               capacite_kg:
 *                 type: number
 *                 example: 400
 *               etat:
 *                 type: string
 *                 enum:
 *                   - bon
 *                   - moyen
 *                   - mauvais
 *               date_mise_en_service:
 *                 type: string
 *                 format: date
 *               observations:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tricycle modifié avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Tricycle introuvable.
 *       409:
 *         description: Numéro ou plaque déjà utilisé.
 */
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    tricycleModificationValidator,
    validationMiddleware,
    tricycleController.modifier
);

/**
 * @swagger
 * /api/tricycles/{id}/statut:
 *   patch:
 *     summary: Modifier le statut d'un tricycle
 *     tags:
 *       - Tricycles
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
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum:
 *                   - disponible
 *                   - en_mission
 *                   - en_panne
 *                   - maintenance
 *                   - hors_service
 *                 example: maintenance
 *     responses:
 *       200:
 *         description: Statut du tricycle modifié avec succès.
 *       400:
 *         description: Statut invalide.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Tricycle introuvable.
 *       409:
 *         description: État incompatible avec le statut demandé.
 */
router.patch(
    "/:id/statut",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    tricycleStatutValidator,
    validationMiddleware,
    tricycleController.modifierStatut
);

export default router;