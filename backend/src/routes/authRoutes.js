import express from "express";
import authController from "../controllers/authController.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Créer un nouvel utilisateur
 *     tags:
 *       - Authentification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - email
 *               - motDePasse
 *               - organisationId
 *             properties:
 *               nom:
 *                 type: string
 *                 example: Christian
 *               email:
 *                 type: string
 *                 example: christian3@prorecup.com
 *               motDePasse:
 *                 type: string
 *                 example: ProRecup2026!
 *               organisationId:
 *                 type: string
 *                 format: uuid
 *                 example: 04fbfede-8cf8-47fc-a9b2-599b766229e2
 *     responses:
 *       201:
 *         description: Utilisateur inscrit avec succès.
 *       400:
 *         description: Données invalides ou email déjà utilisé.
 */
router.post("/register", authController.inscription);

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
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Connexion réussie !
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIs...
 *                 utilisateur:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nom:
 *                       type: string
 *                       example: Christian
 *                     email:
 *                       type: string
 *                       example: christian2@prorecup.com
 *       400:
 *         description: Email ou mot de passe incorrect.
 */
router.post("/login", authController.connexion);

export default router;