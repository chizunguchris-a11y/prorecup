import terrainPreuveService
    from "../services/TerrainPreuveService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";


const terrainPreuveController = {

    creer: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await terrainPreuveService
                    .enregistrer(
                        req.params.id,
                        req.params.collecteId,
                        req.agentTerrain,
                        req.body || {},
                        req.file
                    );


            return ApiResponse.success(
                res,
                resultat.deja_traitee
                    ? "Cette preuve avait déjà été enregistrée."
                    : "Preuve terrain enregistrée avec succès.",
                resultat
            );

        }
    ),    url: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await terrainPreuveService
                    .obtenirUrl(
                        req.params.id,
                        req.params.collecteId,
                        req.params.preuveId,
                        req.agentTerrain
                    );


            return ApiResponse.success(
                res,
                "URL temporaire de la preuve générée avec succès.",
                resultat
            );

        }
    )

};


export default terrainPreuveController;