import express from "express";

import clientController
    from "../controllers/ClientController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import roleMiddleware
    from "../middlewares/roleMiddleware.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import clientValidator
    from "../validators/clientValidator.js";

const router = express.Router();

/**
 * @swagger
 * /api/clients:
 *   get:
 *     summary: Consulter les clients de l'organisation
 *     tags:
 *       - Clients
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Clients récupérés avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.get(
    "/",
    authMiddleware,
    clientController.lister
);

/**
 * @swagger
 * /api/clients:
 *   post:
 *     summary: Créer un nouveau client
 *     tags:
 *       - Clients
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
 *                 example: Hôpital Central
 *               type_client:
 *                 type: string
 *                 example: Hôpital
 *               contact_email:
 *                 type: string
 *                 example: contact@hopital.cd
 *               contact_telephone:
 *                 type: string
 *                 example: +243900000000
 *               adresse_siege:
 *                 type: string
 *                 example: Kinshasa
 *     responses:
 *       201:
 *         description: Client créé avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 */
router.post(
    "/",
    authMiddleware,
    clientValidator,
    validationMiddleware,
    clientController.creer
);

/**
 * @swagger
 * /api/clients/{id}:
 *   put:
 *     summary: Modifier un client
 *     tags:
 *       - Clients
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
 *               type_client:
 *                 type: string
 *               contact_email:
 *                 type: string
 *               contact_telephone:
 *                 type: string
 *               adresse_siege:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client modifié avec succès.
 *       400:
 *         description: Données invalides.
 *       401:
 *         description: Token manquant ou invalide.
 *       404:
 *         description: Client introuvable.
 */
router.put(
    "/:id",
    authMiddleware,
    clientValidator,
    validationMiddleware,
    clientController.modifier
);

/**
 * @swagger
 * /api/clients/{id}:
 *   delete:
 *     summary: Supprimer un client sans collecte liée
 *     tags:
 *       - Clients
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
 *         description: Client supprimé avec succès.
 *       401:
 *         description: Token manquant ou invalide.
 *       403:
 *         description: Accès refusé.
 *       404:
 *         description: Client introuvable.
 *       409:
 *         description: Le client est lié à une ou plusieurs collectes.
 */
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware([
        "manager",
        "admin"
    ]),
    clientController.supprimer
);

export default router;