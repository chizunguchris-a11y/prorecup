import jwt from "jsonwebtoken";

const authMiddleware = (
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
                process.env.JWT_SECRET ||
                "votre_cle_secrete_temporaire"
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
                null

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