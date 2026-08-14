import organisationService
    from "../services/organisationService.js";

import auditService
    from "../services/AuditService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const obtenirOrganisationId = (
    req
) => {

    return (
        req.utilisateur
            ?.organisationId ||
        req.utilisateur
            ?.organisation_id ||
        req.utilisateur
            ?.organisation ||
        null
    );

};

const obtenirUtilisateurId = (
    req
) => {

    return (
        req.utilisateur?.id ||
        req.utilisateur
            ?.utilisateur_id ||
        req.utilisateur?.user_id ||
        null
    );

};

const organisationController = {

    create: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisation =
                await organisationService
                    .createOrganisation(
                        req.body.nom
                    );

            return ApiResponse.created(
                res,
                "Organisation créée avec succès.",
                organisation
            );

        }
    ),

    getAll: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisations =
                await organisationService
                    .getAllOrganisations();

            return ApiResponse.success(
                res,
                "Organisations récupérées avec succès.",
                organisations
            );

        }
    ),

    consulterMonOrganisation:
        asyncHandler(
            async (
                req,
                res
            ) => {

                const organisation =
                    await organisationService
                        .consulter(
                            obtenirOrganisationId(
                                req
                            )
                        );

                return ApiResponse.success(
                    res,
                    "Organisation récupérée avec succès.",
                    organisation
                );

            }
        ),

    modifierMonOrganisation:
        asyncHandler(
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

                const resultat =
                    await organisationService
                        .modifier(
                            organisationId,
                            req.body
                        );

                await auditService
                    .enregistrerDepuisRequete(
                        req,
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                utilisateurId,

                            action:
                                "ORGANISATION_MODIFIEE",

                            ressource:
                                "organisation",

                            ressource_id:
                                organisationId,

                            ancien_etat:
                                resultat.ancienEtat,

                            nouvel_etat:
                                resultat.nouvelEtat,

                            contexte: {

                                champs_modifies:
                                    Object.keys(
                                        req.body
                                    )

                            },

                            succes:
                                true
                        }
                    );

                return ApiResponse.success(
                    res,
                    "Organisation modifiée avec succès.",
                    resultat.nouvelEtat
                );

            }
        )

};

export default organisationController;