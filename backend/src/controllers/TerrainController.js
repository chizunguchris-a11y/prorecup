import terrainService
    from "../services/TerrainService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";


const terrainController = {

    me: asyncHandler(
        async (
            req,
            res
        ) => {

            const profil =
                terrainService
                    .obtenirProfil(
                        req.agentTerrain
                    );


            return ApiResponse.success(
                res,
                "Profil terrain récupéré avec succès.",
                profil
            );

        }
    ),


    journee: asyncHandler(
        async (
            req,
            res
        ) => {

            const dateDemandee =
                req.query.date ||
                null;


            const journee =
                await terrainService
                    .obtenirJournee(
                        req.agentTerrain,
                        dateDemandee
                    );


            return ApiResponse.success(
                res,
                "Journée terrain récupérée avec succès.",
                journee
            );

        }
    )

};


export default terrainController;