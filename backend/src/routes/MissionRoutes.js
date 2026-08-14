import express from "express";

import missionEvenementController
    from "../controllers/MissionEvenementController.js";

import missionEvenementValidator
    from "../validators/missionEvenementValidator.js";

import missionController
    from "../controllers/MissionController.js";

import missionCollecteController
    from "../controllers/MissionCollecteController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import missionValidator
    from "../validators/missionValidator.js";

import missionModificationValidator
    from "../validators/missionModificationValidator.js";

import missionStatutValidator
    from "../validators/missionStatutValidator.js";

import missionCollecteValidator
    from "../validators/missionCollecteValidator.js";

import ordreCollecteValidator
    from "../validators/ordreCollecteValidator.js";

const router = express.Router();

/**
 * @swagger
 * /api/missions:
 *   get:
 *     summary: Consulter les missions de l'organisation
 *     tags:
 *       - Missions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Missions récupérées avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    missionController.lister
);

/**
 * @swagger
 * /api/missions:
 *   post:
 *     summary: Créer une mission
 *     tags:
 *       - Missions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *               - tricycle_id
 *               - date_prevue
 *             properties:
 *               agent_id:
 *                 type: string
 *                 format: uuid
 *               tricycle_id:
 *                 type: string
 *                 format: uuid
 *               date_prevue:
 *                 type: string
 *                 format: date
 *                 example: 2026-07-28
 *               heure_depart_prevue:
 *                 type: string
 *                 example: "08:00"
 *               heure_retour_prevue:
 *                 type: string
 *                 example: "16:00"
 *               observations:
 *                 type: string
 *                 example: Mission de collecte dans la zone de Gombe.
 *     responses:
 *       201:
 *         description: Mission créée avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Agent ou tricycle introuvable.
 *       409:
 *         description: Ressource indisponible ou conflit de planning.
 */
router.post(
    "/",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    missionValidator,
    validationMiddleware,
    missionController.creer
);

/**
 * @swagger
 * /api/missions/{id}:
 *   put:
 *     summary: Modifier une mission planifiée
 *     tags:
 *       - Missions
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
 *               agent_id:
 *                 type: string
 *                 format: uuid
 *               tricycle_id:
 *                 type: string
 *                 format: uuid
 *               date_prevue:
 *                 type: string
 *                 format: date
 *               heure_depart_prevue:
 *                 type: string
 *                 example: "09:00"
 *               heure_retour_prevue:
 *                 type: string
 *                 example: "17:00"
 *               observations:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mission modifiée avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Mission introuvable.
 *       409:
 *         description: Mission non modifiable ou conflit de planning.
 */
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    missionModificationValidator,
    validationMiddleware,
    missionController.modifier
);

/**
 * @swagger
 * /api/missions/{id}/statut:
 *   patch:
 *     summary: Modifier le statut d'une mission
 *     tags:
 *       - Missions
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
 *                   - en_cours
 *                   - terminee
 *                   - annulee
 *                 example: en_cours
 *     responses:
 *       200:
 *         description: Statut modifié avec succès.
 *       400:
 *         description: Statut invalide.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Mission introuvable.
 *       409:
 *         description: Transition interdite ou ressource indisponible.
 */
router.patch(
    "/:id/statut",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    missionStatutValidator,
    validationMiddleware,
    missionController.modifierStatut
);

/**
 * @swagger
 * /api/missions/{id}/collectes:
 *   get:
 *     summary: Consulter les collectes d'une mission
 *     tags:
 *       - Missions
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
 *         description: Collectes récupérées avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       404:
 *         description: Mission introuvable.
 */
router.get(
    "/:id/collectes",
    authMiddleware,
    missionCollecteController.lister
);

/**
 * @swagger
 * /api/missions/{id}/collectes:
 *   post:
 *     summary: Ajouter une collecte à une mission
 *     tags:
 *       - Missions
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
 *               - collecte_id
 *             properties:
 *               collecte_id:
 *                 type: string
 *                 format: uuid
 *               ordre_collecte:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Collecte ajoutée à la mission avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Mission ou collecte introuvable.
 *       409:
 *         description: Collecte déjà affectée ou mission non modifiable.
 */
router.post(
    "/:id/collectes",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    missionCollecteValidator,
    validationMiddleware,
    missionCollecteController.ajouter
);

/**
 * @swagger
 * /api/missions/{id}/collectes/{collecteId}/ordre:
 *   patch:
 *     summary: Modifier l'ordre d'une collecte dans une mission
 *     tags:
 *       - Missions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identifiant de la mission
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: collecteId
 *         required: true
 *         description: Identifiant de la collecte
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
 *               - ordre_collecte
 *             properties:
 *               ordre_collecte:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       200:
 *         description: Ordre de collecte modifié avec succès.
 *       400:
 *         description: Ordre de collecte invalide.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Mission ou association introuvable.
 *       409:
 *         description: Mission non modifiable.
 */
router.patch(
    "/:id/collectes/:collecteId/ordre",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    ordreCollecteValidator,
    validationMiddleware,
    missionCollecteController.modifierOrdre
);

/**
 * @swagger
 * /api/missions/{id}/collectes/{collecteId}:
 *   delete:
 *     summary: Retirer une collecte d'une mission
 *     tags:
 *       - Missions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identifiant de la mission
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: collecteId
 *         required: true
 *         description: Identifiant de la collecte
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Collecte retirée de la mission avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Mission ou association introuvable.
 *       409:
 *         description: Mission non modifiable.
 */
router.delete(
    "/:id/collectes/:collecteId",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    missionCollecteController.retirer
);

/**
 * @swagger
 * /api/missions/{id}/evenements:
 *   get:
 *     summary: Consulter les événements terrain d'une mission
 *     tags:
 *       - Missions
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
 *         description: Événements récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       404:
 *         description: Mission introuvable.
 */
router.get(
    "/:id/evenements",
    authMiddleware,
    missionEvenementController.lister
);

/**
 * @swagger
 * /api/missions/{id}/evenements:
 *   post:
 *     summary: Enregistrer un événement terrain
 *     tags:
 *       - Missions
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
 *               - type_evenement
 *             properties:
 *               type_evenement:
 *                 type: string
 *                 enum:
 *                   - mission_demarree
 *                   - position_enregistree
 *                   - arrivee_site
 *                   - collecte_demarree
 *                   - collecte_terminee
 *                   - incident_signale
 *                   - mission_terminee
 *                 example: position_enregistree
 *               collecte_id:
 *                 type: string
 *                 format: uuid
 *               latitude:
 *                 type: number
 *                 example: -4.325
 *               longitude:
 *                 type: number
 *                 example: 15.322
 *               precision_gps:
 *                 type: number
 *                 example: 8.5
 *               observations:
 *                 type: string
 *                 example: Position GPS enregistrée pendant la tournée.
 *     responses:
 *       201:
 *         description: Événement enregistré avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       404:
 *         description: Mission ou collecte introuvable.
 *       409:
 *         description: État de mission incompatible ou événement déjà enregistré.
 */
router.post(
    "/:id/evenements",
    authMiddleware,
    missionEvenementValidator,
    validationMiddleware,
    missionEvenementController.creer
);
export default router;