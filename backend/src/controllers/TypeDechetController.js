import typeDechetService
    from "../services/TypeDechetService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const typeDechetController = {

    lister: asyncHandler(async (req, res) => {

        const typesDechets =
            await typeDechetService.lister();

        return ApiResponse.success(
            res,
            "Types de déchets récupérés avec succès.",
            typesDechets
        );

    })

};

export default typeDechetController;
