import portailClientRepository
    from "../repositories/PortailClientRepository.js";


const normaliserRole = (
    role
) => {

    return String(
        role || ""
    )
        .trim()
        .toLowerCase();

};


const portailClientContextMiddleware =
    async (
        req,
        res,
        next
    ) => {

        try {

            if (!req.utilisateur) {

                return res
                    .status(401)
                    .json({
                        success: false,

                        error:
                            "Utilisateur non authentifié."
                    });

            }


            const utilisateurId =
                req.utilisateur.id ||
                req.utilisateur
                    .utilisateur_id ||
                req.utilisateur.user_id ||
                null;


            const organisationId =
                req.utilisateur
                    .organisationId ||
                req.utilisateur
                    .organisation_id ||
                req.utilisateur
                    .organisation ||
                null;


            if (
                !utilisateurId ||
                !organisationId
            ) {

                return res
                    .status(401)
                    .json({
                        success: false,

                        error:
                            "Contexte d'authentification incomplet."
                    });

            }


            /*
             * IMPORTANT :
             *
             * Le rôle provenant du JWT n'est pas
             * considéré comme suffisant.
             *
             * Nous rechargeons l'utilisateur
             * et son rôle directement depuis
             * PostgreSQL.
             */

            const utilisateur =
                await portailClientRepository
                    .trouverUtilisateur(
                        utilisateurId,
                        organisationId
                    );


            if (!utilisateur) {

                return res
                    .status(403)
                    .json({
                        success: false,

                        error:
                            "Compte portail client introuvable."
                    });

            }


            if (
                utilisateur
                    .utilisateur_actif !==
                true
            ) {

                return res
                    .status(403)
                    .json({
                        success: false,

                        error:
                            "Votre compte est désactivé."
                    });

            }


            if (
                utilisateur.role_actif !==
                true
            ) {

                return res
                    .status(403)
                    .json({
                        success: false,

                        error:
                            "Le rôle de ce compte est désactivé."
                    });

            }


            const role =
                normaliserRole(
                    utilisateur.role_nom
                );


            if (role !== "client") {

                return res
                    .status(403)
                    .json({
                        success: false,

                        error:
                            "Accès réservé au portail client."
                    });

            }


            /*
             * Les clients accessibles sont
             * TOUJOURS dérivés de
             * client_utilisateurs.
             *
             * Aucun client_id provenant
             * de req.body, req.query ou
             * req.params n'est utilisé ici.
             */

            const clients =
                await portailClientRepository
                    .listerClientsAutorises(
                        utilisateurId,
                        organisationId
                    );


            if (clients.length === 0) {

                return res
                    .status(403)
                    .json({
                        success: false,

                        error:
                            "Aucun client actif n'est associé à ce compte."
                    });

            }


            req.portailClient = {

                utilisateur_id:
                    utilisateur
                        .utilisateur_id,

                organisation_id:
                    utilisateur
                        .organisation_id,

                role,

                utilisateur_nom:
                    utilisateur
                        .utilisateur_nom,

                utilisateur_email:
                    utilisateur
                        .utilisateur_email,

                utilisateur_telephone:
                    utilisateur
                        .utilisateur_telephone,

                utilisateur_photo_url:
                    utilisateur
                        .utilisateur_photo_url,

                clients:
                    clients.map(
                        client => ({
                            id:
                                client
                                    .client_id,

                            liaison_id:
                                client
                                    .liaison_id,

                            nom:
                                client
                                    .client_nom,

                            type_client:
                                client
                                    .type_client,

                            secteur_activite:
                                client
                                    .secteur_activite,

                            contact_email:
                                client
                                    .contact_email,

                            contact_telephone:
                                client
                                    .contact_telephone,

                            adresse_siege:
                                client
                                    .adresse_siege
                        })
                    )

            };


            return next();

        }
        catch (erreur) {

            return next(
                erreur
            );

        }

    };


export default portailClientContextMiddleware;
