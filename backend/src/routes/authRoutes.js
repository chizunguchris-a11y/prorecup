import express from "express";

import authController
    from "../controllers/authController.js";

import authMiddleware
    from "../middlewares/authMiddleware.js";

import {
    creerLimiteurConnexion
} from "../middlewares/httpSecurityMiddleware.js";

const router =
    express.Router();

const limiteurConnexion =
    creerLimiteurConnexion();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connecter un utilisateur
 *     tags:
 *       - Authentification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - motDePasse
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: utilisateur@exemple.com
 *               motDePasse:
 *                 type: string
 *                 format: password
 *                 example: "********"
 *     responses:
 *       200:
 *         description: Connexion réussie.
 *       400:
 *         description: Identifiants incorrects.
 *       403:
 *         description: Compte désactivé ou rôle absent.
 */
router.post(
    "/login",
    limiteurConnexion,
    authController.connexion
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Consulter le profil connecté
 *     tags:
 *       - Profil
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré avec succès.
 *       401:
 *         description: Token manquant, invalide ou expiré.
 *       403:
 *         description: Rôle absent.
 */
router.get(
    "/me",
    authMiddleware,
    (
        req,
        res
    ) => {

        return res.status(200).json({
            success: true,

            message:
                "Profil récupéré avec succès.",

            data: {
                id:
                    req.utilisateur.id,

                email:
                    req.utilisateur.email,

                organisationId:
                    req.utilisateur
                        .organisationId,

                organisation_id:
                    req.utilisateur
                        .organisation_id,

                role:
                    req.utilisateur.role,

                role_nom:
                    req.utilisateur.role_nom,

                roleId:
                    req.utilisateur.roleId
            }
        });

    }
);

/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Modifier le profil connecté
 *     tags:
 *       - Profil
 *     security:
 *       - bearerAuth: []
 */
router.put(
    "/me",
    authMiddleware,
    authController.modifierProfil
);

/**
 * @swagger
 * /api/auth/me/password:
 *   patch:
 *     summary: Modifier son mot de passe
 *     tags:
 *       - Profil
 *     security:
 *       - bearerAuth: []
 */
router.patch(
    "/me/password",
    authMiddleware,
    authController.changerMotDePasse
);

export default router;