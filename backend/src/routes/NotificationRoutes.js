import express from "express";

import notificationController
    from "../controllers/NotificationController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

const router =
    express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Consulter les notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications récupérées avec succès.
 */
router.get(
    "/",
    authMiddleware,
    notificationController.lister
);

/**
 * @swagger
 * /api/notifications/non-lues/compteur:
 *   get:
 *     summary: Compter les notifications non lues
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compteur récupéré avec succès.
 */
router.get(
    "/non-lues/compteur",
    authMiddleware,
    notificationController
        .compterNonLues
);

/**
 * @swagger
 * /api/notifications/tout-lire:
 *   patch:
 *     summary: Marquer toutes les notifications comme lues
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications mises à jour.
 */
router.patch(
    "/tout-lire",
    authMiddleware,
    notificationController
        .marquerToutesCommeLues
);

/**
 * @swagger
 * /api/notifications/{id}/lire:
 *   patch:
 *     summary: Marquer une notification comme lue
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identifiant de la notification
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification marquée comme lue.
 *       401:
 *         description: Token manquant ou invalide.
 *       404:
 *         description: Notification introuvable.
 */
router.patch(
    "/:id/lire",
    authMiddleware,
    notificationController
        .marquerCommeLue
);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Supprimer une notification
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Identifiant de la notification
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Notification supprimée avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       404:
 *         description: Notification introuvable.
 */
router.delete(
    "/:id",
    authMiddleware,
    notificationController.supprimer
);

export default router;