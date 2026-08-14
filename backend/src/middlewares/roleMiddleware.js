import pool from "../config/db.js";

const normaliserRole = (role) => {

    if (!role) {
        return null;
    }

    return String(role)
        .trim()
        .toLowerCase();

};

const roleMiddleware = (
    rolesAutorises = []
) => {

    const rolesNormalises =
        rolesAutorises.map(
            normaliserRole
        );

    return async (
        req,
        res,
        next
    ) => {

        try {

            if (!req.utilisateur) {

                return res.status(401).json({

                    success: false,

                    error:
                        "Utilisateur non authentifié."

                });

            }

            let roleUtilisateur =
                normaliserRole(
                    req.utilisateur.role ||
                    req.utilisateur.role_nom
                );

            /*
             * Compatibilité avec les anciens tokens
             * qui ne contiennent pas encore le rôle.
             */
            if (!roleUtilisateur) {

                const utilisateurId =
                    req.utilisateur.id ||
                    req.utilisateur.utilisateur_id ||
                    req.utilisateur.user_id;

                if (!utilisateurId) {

                    return res.status(401).json({

                        success: false,

                        error:
                            "Identifiant utilisateur absent du token."

                    });

                }

                const resultat =
                    await pool.query(
                        `
                            SELECT
                                r.nom AS role_nom

                            FROM utilisateurs u

                            JOIN roles r
                                ON r.id = u.role_id

                            WHERE u.id = $1

                            LIMIT 1;
                        `,
                        [utilisateurId]
                    );

                if (!resultat.rows[0]) {

                    return res.status(403).json({

                        success: false,

                        error:
                            "Aucun rôle attribué."

                    });

                }

                roleUtilisateur =
                    normaliserRole(
                        resultat.rows[0]
                            .role_nom
                    );

            }

            if (
                rolesNormalises.length > 0 &&
                !rolesNormalises.includes(
                    roleUtilisateur
                )
            ) {

                return res.status(403).json({

                    success: false,

                    error:
                        "Accès refusé."

                });

            }

            req.role =
                roleUtilisateur;

            req.utilisateur.role =
                roleUtilisateur;

            next();

        } catch (erreur) {

            console.error(
                "Erreur de vérification du rôle :",
                erreur
            );

            return res.status(500).json({

                success: false,

                error:
                    "Impossible de vérifier les autorisations de l'utilisateur."

            });

        }

    };

};

export default roleMiddleware;