import jwt from "jsonwebtoken";
import crypto from "crypto";
import { obtenirJwtSecret } from "../config/security.js";
import pool from "../config/db.js";

const authMiddleware = async (
    req,
    res,
    next
) => {

    const authHeader =
        req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({
            success: false,
            error:
                "Token manquant."
        });

    }

    const parties =
        String(authHeader)
            .trim()
            .split(/\s+/);

    if (
        parties.length !== 2 ||
        parties[0].toLowerCase() !==
            "bearer" ||
        !parties[1]
    ) {

        return res.status(401).json({
            success: false,
            error:
                "Format du token invalide."
        });

    }

    try {

        const contenuToken =
            jwt.verify(
                parties[1],
                obtenirJwtSecret()
            );

        const utilisateurId =
            contenuToken.id ||
            contenuToken.utilisateur_id ||
            contenuToken.user_id;

        const organisationId =
            contenuToken.organisationId ||
            contenuToken.organisation_id;

        const role =
            String(
                contenuToken.role ||
                contenuToken.role_nom ||
                ""
            )
                .trim()
                .toLowerCase();

        if (!utilisateurId) {

            return res.status(401).json({
                success: false,
                error:
                    "Identifiant utilisateur absent du token."
            });

        }

        if (!organisationId) {

            return res.status(401).json({
                success: false,
                error:
                    "Organisation absente du token."
            });

        }

        if (!role) {

            return res.status(403).json({
                success: false,
                error:
                    "Rôle absent du token."
            });

        }

        const etatAuthentification =
            await pool.query(
                `
                SELECT actif, auth_epoch
                FROM utilisateurs
                WHERE id = $1
                  AND organisation_id = $2
                LIMIT 1;
                `,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        const utilisateurActuel =
            etatAuthentification.rows[0];

        const epochToken =
            Number(
                contenuToken.authEpoch ||
                contenuToken.auth_epoch ||
                1
            );

        if (
            !utilisateurActuel ||
            utilisateurActuel.actif === false ||
            Number(
                utilisateurActuel.auth_epoch ||
                1
            ) !== epochToken
        ) {

            return res.status(401).json({
                success: false,
                error:
                    "Votre session n'est plus valide. Reconnectez-vous."
            });

        }

        const sessionId =
            String(
                contenuToken.sessionId ||
                ""
            ).trim();

        if (sessionId) {

            const sessionHash =
                crypto
                    .createHash("sha256")
                    .update(sessionId)
                    .digest("hex");

            const session =
                await pool.query(
                    `
                    SELECT id
                    FROM refresh_tokens
                    WHERE utilisateur_id = $1
                      AND token_hash = $2
                      AND revoque = false
                      AND expire_le > CURRENT_TIMESTAMP
                    LIMIT 1;
                    `,
                    [
                        utilisateurId,
                        sessionHash
                    ]
                );

            if (!session.rows[0]) {

                return res.status(401).json({
                    success: false,
                    error:
                        "Cette session a été fermée. Reconnectez-vous."
                });

            }

        }

        req.utilisateur = {

            id:
                utilisateurId,

            utilisateur_id:
                utilisateurId,

            email:
                contenuToken.email ||
                null,

            organisationId,

            organisation_id:
                organisationId,

            role,

            role_nom:
                role,

            roleId:
                contenuToken.roleId ||
                contenuToken.role_id ||
                null,

            authEpoch:
                epochToken,

            sessionId:
                sessionId || null

        };

        req.token =
            contenuToken;

        return next();

    } catch (erreur) {

        if (
            erreur.name ===
            "TokenExpiredError"
        ) {

            return res.status(401).json({
                success: false,
                error:
                    "Votre session a expiré."
            });

        }

        return res.status(401).json({
            success: false,
            error:
                "Token invalide."
        });

    }

};

export default authMiddleware;
