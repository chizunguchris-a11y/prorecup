import express
    from "express";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import portailClientContextMiddleware
    from "../middlewares/portailClientContextMiddleware.js";

import portailClientController
    from "../controllers/PortailClientController.js";

import validationMiddleware
    from "../middlewares/validationMiddleware.js";

import {
    collecteIdValidator,
    preuveCollecteIdsValidator
} from "../validators/portailClientValidator.js";


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

/**
 * @swagger
 * /api/portail-client/impact:
 *   get:
 *     summary: Consulter les indicateurs environnementaux autorises
 *     tags:
 *       - Portail Client
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Indicateurs environnementaux recuperes.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Acces portail client refuse.
 */
router.get(
    "/impact",
    authMiddleware,
    portailClientContextMiddleware,
    portailClientController.impact
);


/**
 * @swagger
 * /api/portail-client/collectes/{id}:
 *   get:
 *     summary: Consulter le detail d'une collecte autorisee
 *     tags:
 *       - Portail Client
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detail de collecte recupere.
 *       400:
 *         description: Identifiant invalide.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Acces portail client refuse.
 *       404:
 *         description: Collecte introuvable ou non autorisee.
 */
router.get(
    "/collectes/:id",
    authMiddleware,
    portailClientContextMiddleware,
    collecteIdValidator,
    validationMiddleware,
    portailClientController.detailCollecte
);


/**
 * @swagger
 * /api/portail-client/collectes/{id}/preuves/{preuveId}/url:
 *   get:
 *     summary: Generer une URL temporaire pour une preuve autorisee
 *     tags:
 *       - Portail Client
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: URL signee generee.
 *       400:
 *         description: Identifiant invalide.
 *       401:
 *         description: Authentification requise.
 *       403:
 *         description: Acces portail client refuse.
 *       404:
 *         description: Preuve introuvable ou non autorisee.
 */
router.get(
    "/collectes/:id/preuves/:preuveId/url",
    authMiddleware,
    portailClientContextMiddleware,
    preuveCollecteIdsValidator,
    validationMiddleware,
    portailClientController.urlPreuve
);
export default router;
