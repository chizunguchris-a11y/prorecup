import express from "express";

import agentController
    from "../controllers/AgentController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import agentValidator
    from "../validators/agentValidator.js";

import agentModificationValidator
    from "../validators/agentModificationValidator.js";

import agentStatutValidator
    from "../validators/agentStatutValidator.js";

const router = express.Router();

/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: Consulter les agents de l'organisation
 *     tags:
 *       - Agents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agents récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    agentController.lister
);

/**
 * @swagger
 * /api/agents:
 *   post:
 *     summary: Créer un profil agent
 *     description: >
 *       Associe un profil agent à un utilisateur existant
 *       de la même organisation.
 *     tags:
 *       - Agents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - utilisateur_id
 *             properties:
 *               utilisateur_id:
 *                 type: string
 *                 format: uuid
 *               telephone:
 *                 type: string
 *                 example: +243900000000
 *               photo_url:
 *                 type: string
 *                 example: https://example.com/photo.jpg
 *               statut:
 *                 type: string
 *                 enum:
 *                   - actif
 *                   - inactif
 *                   - suspendu
 *                 example: actif
 *               disponible:
 *                 type: boolean
 *                 example: true
 *               date_embauche:
 *                 type: string
 *                 format: date
 *                 example: 2026-07-26
 *     responses:
 *       201:
 *         description: Agent créé avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Utilisateur introuvable.
 *       409:
 *         description: L'utilisateur possède déjà un profil agent.
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    agentValidator,
    validationMiddleware,
    agentController.creer
);

/**
 * @swagger
 * /api/agents/{id}:
 *   put:
 *     summary: Modifier un profil agent
 *     description: >
 *       Modifie les informations métier d'un agent
 *       appartenant à l'organisation connectée.
 *     tags:
 *       - Agents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identifiant du profil agent
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
 *               telephone:
 *                 type: string
 *                 example: +243900000111
 *               photo_url:
 *                 type: string
 *                 example: https://example.com/christian-agent.jpg
 *               disponible:
 *                 type: boolean
 *                 example: false
 *               date_embauche:
 *                 type: string
 *                 format: date
 *                 example: 2026-07-26
 *     responses:
 *       200:
 *         description: Agent modifié avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Agent introuvable.
 */
/**
 * @swagger
 * /api/agents/utilisateurs-disponibles:
 *   get:
 *     summary: Consulter les utilisateurs sans profil agent
 *     tags:
 *       - Agents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Utilisateurs disponibles récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/utilisateurs-disponibles",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    agentController
        .listerUtilisateursDisponibles
);
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    agentModificationValidator,
    validationMiddleware,
    agentController.modifier
);

/**
 * @swagger
 * /api/agents/{id}/statut:
 *   patch:
 *     summary: Modifier le statut d'un agent
 *     tags:
 *       - Agents
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
 *                   - actif
 *                   - inactif
 *                   - suspendu
 *     responses:
 *       200:
 *         description: Statut modifié avec succès.
 *       404:
 *         description: Agent introuvable.
 */
router.patch(
    "/:id/statut",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    agentStatutValidator,
    validationMiddleware,
    agentController.modifierStatut
);

export default router;