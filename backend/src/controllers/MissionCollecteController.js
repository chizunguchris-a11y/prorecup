import missionCollecteService
    from "../services/MissionCollecteService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const missionCollecteController = {

    ajouter: asyncHandler(async (req, res) => {

        const association =
            await missionCollecteService.ajouter(
                req.params.id,
                req.utilisateur.organisationId,
                req.body
            );

        return ApiResponse.created(
            res,
            "Collecte ajoutée à la mission avec succès.",
            association
        );

    }),

    lister: asyncHandler(async (req, res) => {

        const collectes =
            await missionCollecteService.lister(
                req.params.id,
                req.utilisateur.organisationId
            );

        return ApiResponse.success(
            res,
            "Collectes de la mission récupérées avec succès.",
            collectes
        );

    }),

    modifierOrdre: asyncHandler(
        async (req, res) => {

            const association =
                await missionCollecteService
                    .modifierOrdre(
                        req.params.id,
                        req.params.collecteId,
                        req.utilisateur
                            .organisationId,
                        req.body.ordre_collecte
                    );

            return ApiResponse.success(
                res,
                "Ordre de collecte modifié avec succès.",
                association
            );

        }
    ),

    retirer: asyncHandler(async (req, res) => {

        const association =
            await missionCollecteService.retirer(
                req.params.id,
                req.params.collecteId,
                req.utilisateur.organisationId
            );

        return ApiResponse.success(
            res,
            "Collecte retirée de la mission avec succès.",
            association
        );

    })

};

export default missionCollecteController;