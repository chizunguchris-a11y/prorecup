import pool from "../config/db.js";

const roleMiddleware = (rolesAutorises = []) => {

    return async (req, res, next) => {

        try {

            // Vérifier que l'utilisateur est authentifié
            if (!req.utilisateur) {
                return res.status(401).json({
                    success: false,
                    error: "Utilisateur non authentifié."
                });
            }

            // Récupérer le rôle de l'utilisateur
            const resultat = await pool.query(
                `
                SELECT r.nom
                FROM utilisateurs u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = $1
                `,
                [req.utilisateur.id]
            );

            if (resultat.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: "Aucun rôle attribué."
                });
            }

            const roleUtilisateur = resultat.rows[0].nom;

            // Vérifier si le rôle est autorisé
            if (!rolesAutorises.includes(roleUtilisateur)) {
                return res.status(403).json({
                    success: false,
                    error: "Accès refusé."
                });
            }

            // On conserve le rôle pour les contrôleurs
            req.role = roleUtilisateur;

            next();

        } catch (erreur) {

            return res.status(500).json({
                success: false,
                error: erreur.message
            });

        }

    };

};

export default roleMiddleware;