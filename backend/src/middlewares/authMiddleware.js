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
                SELECT
                    u.actif,
                    u.auth_epoch,
                    u.role_id,
                    r.nom AS role_nom,
                    r.actif AS role_actif,
                    r.organisation_id AS role_organisation_id
                FROM utilisateurs u
                JOIN roles r ON r.id = u.role_id
                WHERE u.id = $1
                  AND u.organisation_id = $2
                  AND u.supprime_le IS NULL
                  AND r.supprime_le IS NULL
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
                contenuToken.authEpoch ??
                contenuToken.auth_epoch ??
                1
            );

        // Privileges taken from the current DB, never from a stale JWT.
        const roleActuel = String(
            utilisateurActuel?.role_nom || ""
        ).trim().toLowerCase();
        const roleIdToken = String(
            contenuToken.roleId ||
            contenuToken.role_id || ""
        ).trim();
        const roleIdActuel = String(
            utilisateurActuel?.role_id || ""
        ).trim();

        if (
            !utilisateurActuel ||
            utilisateurActuel.actif !== true ||
            utilisateurActuel.role_actif !== true ||
            utilisateurActuel.role_organisation_id != null ||
            !roleActuel ||
            roleActuel !== role ||
            !roleIdToken ||
            !roleIdActuel ||
            roleIdToken !== roleIdActuel ||
            !Number.isSafeInteger(epochToken) ||
            Number(utilisateurActuel.auth_epoch ?? 1) !== epochToken
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

            role: roleActuel,

            role_nom: roleActuel,

            roleId: roleIdActuel,

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
