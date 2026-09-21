import terrainCollecteService
    from "../services/TerrainCollecteService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";


const terrainCollecteController = {

    arrivee: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await terrainCollecteService
                    .enregistrerArrivee(
                        req.params.id,
                        req.params.collecteId,
                        req.agentTerrain,
                        req.body || {}
                    );


            return ApiResponse.success(
                res,
                resultat.deja_traitee
                    ? "Cette arrivée avait déjà été enregistrée."
                    : "Arrivée sur le site enregistrée avec succès.",
                resultat
            );

        }
    ),


    demarrer: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await terrainCollecteService
                    .demarrerCollecte(
                        req.params.id,
                        req.params.collecteId,
                        req.agentTerrain,
                        req.body || {}
                    );


            return ApiResponse.success(
                res,
                resultat.deja_traitee
                    ? "Ce démarrage avait déjà été enregistré."
                    : "Collecte démarrée avec succès.",
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
                await terrainCollecteService
                    .terminerCollecte(
                        req.params.id,
                        req.params.collecteId,
                        req.agentTerrain,
                        req.body || {}
                    );


            return ApiResponse.success(
                res,
                resultat.deja_traitee
                    ? "Cette fin de collecte avait déjà été enregistrée."
                    : "Collecte terminée avec succès.",
                resultat
            );

        }
    )

};


export default terrainCollecteController;