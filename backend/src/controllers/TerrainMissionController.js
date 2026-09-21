import terrainMissionService
    from "../services/TerrainMissionService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";


const terrainMissionController = {

    demarrer: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await terrainMissionService
                    .demarrer(
                        req.params.id,
                        req.agentTerrain,
                        req.body || {}
                    );


            return ApiResponse.success(
                res,
                resultat.deja_traitee
                    ? "Cette opération avait déjà été enregistrée."
                    : "Mission démarrée avec succès.",
                resultat
            );

        }
    ),


    terminer: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await terrainMissionService
                    .terminer(
                        req.params.id,
                        req.agentTerrain,
                        req.body || {}
                    );


            return ApiResponse.success(
                res,
                resultat.deja_traitee
                    ? "Cette fin de mission avait déjà été enregistrée."
                    : "Mission terminée avec succès.",
                resultat
            );

        }
    )

};


export default terrainMissionController;