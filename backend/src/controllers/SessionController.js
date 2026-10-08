import crypto from "crypto";

import refreshTokenRepository
    from "../repositories/RefreshTokenRepository.js";

import pool
    from "../config/db.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const obtenirUtilisateurId = (
    req
) => {

    return (
        req.utilisateur?.id ||
        req.utilisateur?.utilisateur_id ||
        req.utilisateur?.user_id ||
        null
    );

};

const hacherToken = (
    token
) => {

    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

};

const sessionController = {

    lister: asyncHandler(
        async (
            req,
            res
        ) => {

            const utilisateurId =
                obtenirUtilisateurId(
                    req
                );

            const sessions =
                await refreshTokenRepository
                    .listerActifsParUtilisateur(
                        utilisateurId
                    );

            const sessionId =
                String(
                    req.utilisateur?.sessionId ||
                    ""
                ).trim();

            let sessionCouranteId =
                null;

            if (sessionId) {

                const sessionCourante =
                    await refreshTokenRepository
                        .trouverValideParHash(
                            hacherToken(sessionId)
                        );

                if (
                    sessionCourante?.utilisateur_id ===
                    utilisateurId
                ) {

                    sessionCouranteId =
                        sessionCourante.id;

                }

            }

            return ApiResponse.success(
                res,
                "Sessions actives récupérées avec succès.",
                sessions.map(
                    session => ({
                        ...session,
                        actuelle:
                            session.id ===
                            sessionCouranteId
                    })
                )
            );

        }
    ),

    fermerAutres: asyncHandler(
        async (
            req,
            res
        ) => {

            const utilisateurId =
                obtenirUtilisateurId(
                    req
                );

            const sessionId =
                String(
                    req.utilisateur?.sessionId ||
                    ""
                ).trim();

            if (!sessionId) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Cette session ne permet pas la révocation individuelle. Reconnectez-vous."
                });

            }

            const tokenHash =
                hacherToken(
                    sessionId
                );

            const sessionCourante =
                await refreshTokenRepository
                    .trouverValideParHash(
                        tokenHash
                    );

            if (
                !sessionCourante ||
                sessionCourante
                    .utilisateur_id !==
                    utilisateurId
            ) {

                return res.status(401).json({
                    success: false,
                    error:
                        "Session courante invalide."
                });

            }

            const nombreFerme =
                await refreshTokenRepository
                    .revoquerTousSaufHash(
                        utilisateurId,
                        tokenHash
                    );

            return ApiResponse.success(
                res,
                "Les autres sessions ont été fermées.",
                {
                    sessions_fermees:
                        nombreFerme
                }
            );

        }
    ),

    fermerToutes: asyncHandler(
        async (
            req,
            res
        ) => {

            const utilisateurId =
                obtenirUtilisateurId(
                    req
                );

            const connexion =
                await pool.connect();

            let nombreFerme;

            try {

                await connexion.query("BEGIN");

                nombreFerme =
                    await refreshTokenRepository
                        .revoquerTousPourUtilisateur(
                            utilisateurId,
                            connexion
                        );

                await connexion.query(
                    `
                    UPDATE utilisateurs
                    SET auth_epoch = auth_epoch + 1,
                        modifie_le = CURRENT_TIMESTAMP
                    WHERE id = $1;
                    `,
                    [utilisateurId]
                );

                await connexion.query("COMMIT");

            } catch (erreur) {

                await connexion.query("ROLLBACK");
                throw erreur;

            } finally {

                connexion.release();

            }

            return ApiResponse.success(
                res,
                "Toutes les sessions ont été fermées.",
                {
                    sessions_fermees:
                        nombreFerme
                }
            );

        }
    )

};

export default sessionController;
