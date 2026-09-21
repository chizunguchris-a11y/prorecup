import terrainRepository
    from "../repositories/TerrainRepository.js";


const normaliserRole = (
    role
) => {

    return String(
        role || ""
    )
        .trim()
        .toLowerCase();

};


const terrainContextMiddleware =
    async (
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


            const utilisateurId =
                req.utilisateur.id ||
                req.utilisateur.utilisateur_id ||
                req.utilisateur.user_id ||
                null;


            const organisationId =
                req.utilisateur.organisationId ||
                req.utilisateur.organisation_id ||
                req.utilisateur.organisation ||
                null;


            if (
                !utilisateurId ||
                !organisationId
            ) {

                return res.status(401).json({
                    success: false,
                    error:
                        "Contexte d'authentification incomplet."
                });

            }


            const contexte =
                await terrainRepository
                    .trouverContexteAgent(
                        utilisateurId,
                        organisationId
                    );


            if (!contexte) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Utilisateur terrain introuvable."
                });

            }


            if (
                contexte.utilisateur_actif !==
                true
            ) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Votre compte est désactivé."
                });

            }


            const role =
                normaliserRole(
                    contexte.role_nom
                );


            if (
                role !==
                "agent_valorisation_carbone"
            ) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Accès réservé aux agents de valorisation carbone."
                });

            }


            if (!contexte.agent_id) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Aucun profil agent n'est associé à ce compte."
                });

            }


            if (
                normaliserRole(
                    contexte.agent_statut
                ) !== "actif"
            ) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Votre profil agent n'est pas actif."
                });

            }


            req.agentTerrain = {

                utilisateur_id:
                    contexte.utilisateur_id,

                agent_id:
                    contexte.agent_id,

                organisation_id:
                    contexte.organisation_id,

                role,

                utilisateur_nom:
                    contexte.utilisateur_nom,

                utilisateur_email:
                    contexte.utilisateur_email,

                utilisateur_telephone:
                    contexte.utilisateur_telephone,

                utilisateur_photo_url:
                    contexte.utilisateur_photo_url,

                agent_telephone:
                    contexte.agent_telephone,

                agent_photo_url:
                    contexte.agent_photo_url,

                agent_statut:
                    contexte.agent_statut,

                disponible:
                    contexte.agent_disponible,

                date_embauche:
                    contexte.date_embauche

            };


            return next();

        } catch (erreur) {

            return next(
                erreur
            );

        }

    };


export default terrainContextMiddleware;