import impactCarboneService
    from "../services/ImpactCarboneService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const impactCarboneController = {

    lister: asyncHandler(async (req, res) => {

        const impacts =
            await impactCarboneService
                .listerParOrganisation(
                    req.utilisateur.organisationId
                );

        return ApiResponse.success(
            res,
            "Impacts carbone récupérés avec succès.",
            impacts
        );

    })

};

export default impactCarboneController;