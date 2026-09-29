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



/**
 * @swagger
 * /api/portail-client/sites:
 *   get:
 *     summary: Consulter les sites autorises du portail client
 *     tags:
 *       - Portail Client
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sites autorises recuperes avec succes.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Acces portail client refuse.
 */
router.get(
    "/sites",
    authMiddleware,
    portailClientContextMiddleware,
    portailClientController.sites
);

/**
 * @swagger
 * /api/portail-client/collectes:
 *   get:
 *     summary: Consulter les collectes autorisees du portail client
 *     tags:
 *       - Portail Client
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Collectes autorisees recuperees avec succes.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Acces portail client refuse.
 */
router.get(
    "/collectes",
    authMiddleware,
    portailClientContextMiddleware,
    portailClientController.collectes
);
export default router;
