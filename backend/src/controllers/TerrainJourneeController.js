import terrainJourneeService
    from "../services/TerrainJourneeService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";


const terrainJourneeController = {

    obtenir: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await terrainJourneeService
                    .obtenir(
                        req.agentTerrain,
                        req.query.date
                    );


            return ApiResponse.success(
                res,
                "Journée Terrain récupérée avec succès.",
                resultat
            );

        }
    )

};


export default terrainJourneeController;