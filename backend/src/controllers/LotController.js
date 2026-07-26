import lotService
    from "../services/LotService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const lotController = {

    creer: asyncHandler(async (req, res) => {

        const donneesLot = {
            ...req.body,

            organisation_id:
                req.utilisateur.organisationId
        };

        const resultat =
            await lotService.creer(
                donneesLot
            );

        return ApiResponse.created(
            res,
            "Lot créé avec succès.",
            resultat
        );

    }),

    lister: asyncHandler(async (req, res) => {

        const lots =
            await lotService
                .listerParOrganisation(
                    req.utilisateur
                        .organisationId
                );

        return ApiResponse.success(
            res,
            "Lots récupérés avec succès.",
            lots
        );

    })

};

export default lotController;