import notificationService
    from "../services/NotificationService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const obtenirOrganisationId = (
    req
) => {

    return (
        req.utilisateur.organisationId ||
        req.utilisateur.organisation_id ||
        req.utilisateur.organisation ||
        null
    );

};

const obtenirUtilisateurId = (
    req
) => {

    return (
        req.utilisateur.id ||
        req.utilisateur.utilisateur_id ||
        req.utilisateur.user_id ||
        null
    );

};

const notificationController = {

    lister: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisationId =
                obtenirOrganisationId(
                    req
                );

            const utilisateurId =
                obtenirUtilisateurId(
                    req
                );

            const filtres = {

                organisation_id:
                    organisationId,

                utilisateur_id:
                    utilisateurId,

                type:
                    req.query.type ||
                    null,

                categorie:
                    req.query.categorie ||
                    null,

                recherche:
                    req.query.recherche ||
                    null,

                page:
                    req.query.page ||
                    1,

                limite:
                    req.query.limite ||
                    50

            };

            if (
                req.query.lue !==
                undefined
            ) {

                filtres.lue =
                    req.query.lue ===
                    "true";

            }

            const resultat =
                await notificationService
                    .lister(
                        filtres
                    );

            const limite =
                Number(
                    filtres.limite
                );

            return res.status(200).json({

                success: true,

                message:
                    "Notifications récupérées avec succès.",

                data:
                    resultat.notifications,

                pagination: {

                    total:
                        resultat.total,

                    page:
                        Number(
                            filtres.page
                        ),

                    limite,

                    nombre_pages:
                        Math.ceil(
                            resultat.total /
                            limite
                        )

                }

            });

        }
    ),

    compterNonLues: asyncHandler(
        async (
            req,
            res
        ) => {

            const total =
                await notificationService
                    .compterNonLues(
                        obtenirOrganisationId(
                            req
                        ),
                        obtenirUtilisateurId(
                            req
                        )
                    );

            return ApiResponse.success(
                res,
                "Compteur des notifications récupéré avec succès.",
                {
                    total
                }
            );

        }
    ),

    marquerCommeLue: asyncHandler(
        async (
            req,
            res
        ) => {

            const notification =
                await notificationService
                    .marquerCommeLue(
                        req.params.id,
                        obtenirOrganisationId(
                            req
                        ),
                        obtenirUtilisateurId(
                            req
                        )
                    );

            return ApiResponse.success(
                res,
                "Notification marquée comme lue.",
                notification
            );

        }
    ),

    marquerToutesCommeLues: asyncHandler(
        async (
            req,
            res
        ) => {

            const nombreModifie =
                await notificationService
                    .marquerToutesCommeLues(
                        obtenirOrganisationId(
                            req
                        ),
                        obtenirUtilisateurId(
                            req
                        )
                    );

            return ApiResponse.success(
                res,
                "Toutes les notifications ont été marquées comme lues.",
                {
                    nombre_modifie:
                        nombreModifie
                }
            );

        }
    ),

    supprimer: asyncHandler(
        async (
            req,
            res
        ) => {

            const notification =
                await notificationService
                    .supprimer(
                        req.params.id,
                        obtenirOrganisationId(
                            req
                        ),
                        obtenirUtilisateurId(
                            req
                        )
                    );

            return ApiResponse.success(
                res,
                "Notification supprimée avec succès.",
                notification
            );

        }
    )

};

export default notificationController;