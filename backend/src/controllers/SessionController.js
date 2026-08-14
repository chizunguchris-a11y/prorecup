import crypto from "crypto";

import refreshTokenRepository
    from "../repositories/RefreshTokenRepository.js";

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

            return ApiResponse.success(
                res,
                "Sessions actives récupérées avec succès.",
                sessions
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

            const refreshToken =
                String(
                    req.body.refreshToken ||
                    ""
                ).trim();

            if (!refreshToken) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Le refresh token courant est obligatoire."
                });

            }

            const tokenHash =
                hacherToken(
                    refreshToken
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

            const nombreFerme =
                await refreshTokenRepository
                    .revoquerTousPourUtilisateur(
                        utilisateurId
                    );

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