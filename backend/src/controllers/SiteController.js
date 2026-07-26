import siteService
    from "../services/SiteService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const siteController = {

    creer: asyncHandler(async (req, res) => {

        const donneesSite = {
            ...req.body,

            organisation_id:
                req.utilisateur.organisationId
        };

        const site =
            await siteService.creer(
                donneesSite
            );

        return ApiResponse.created(
            res,
            "Site de collecte créé avec succès.",
            site
        );

    }),

    lister: asyncHandler(async (req, res) => {

        const sites =
            await siteService
                .listerParOrganisation(
                    req.utilisateur
                        .organisationId
                );

        return ApiResponse.success(
            res,
            "Sites de collecte récupérés avec succès.",
            sites
        );

    }),

    modifier: asyncHandler(async (req, res) => {

        const site =
            await siteService.modifier(
                req.params.id,
                req.utilisateur
                    .organisationId,
                req.body
            );

        return ApiResponse.success(
            res,
            "Site de collecte modifié avec succès.",
            site
        );

    }),

    supprimer: asyncHandler(async (req, res) => {

        const site =
            await siteService.supprimer(
                req.params.id,
                req.utilisateur
                    .organisationId
            );

        return ApiResponse.success(
            res,
            "Site de collecte supprimé avec succès.",
            site
        );

    })

};

export default siteController;