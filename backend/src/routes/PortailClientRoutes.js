import express
    from "express";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import portailClientContextMiddleware
    from "../middlewares/portailClientContextMiddleware.js";

import portailClientController
    from "../controllers/PortailClientController.js";


const router =
    express.Router();


/**
 * @swagger
 * /api/portail-client/me:
 *   get:
 *     summary: Obtenir le contexte sécurisé du portail client
 *     tags:
 *       - Portail Client
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contexte portail récupéré avec succès.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Accès portail client refusé.
 */
router.get(
    "/me",
    authMiddleware,
    portailClientContextMiddleware,
    portailClientController.me
);


export default router;
