import collecteService
    from "../services/CollecteService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const collecteController = {

    creer: asyncHandler(
        async (req, res) => {

            const donneesCollecte = {
                ...req.body,
                agent_id:
                    req.utilisateur.id
            };

            const collecte =
                await collecteService.creer(
                    donneesCollecte
                );

            return ApiResponse.created(
                res,
                "Collecte enregistrée avec succès.",
                collecte
            );

        }
    ),

    lister: asyncHandler(
        async (req, res) => {

            const collectes =
                await collecteService
                    .listerParOrganisation(
                        req.utilisateur
                            .organisationId
                    );

            return ApiResponse.success(
                res,
                "Collectes récupérées avec succès.",
                collectes
            );

        }
    ),

    valider: asyncHandler(
        async (req, res) => {

            const collecte =
                await collecteService.valider(
                    req.params.id,
                    req.utilisateur
                        .organisationId
                );

            return ApiResponse.success(
                res,
                "Collecte validée avec succès.",
                collecte
            );

        }
    )

};

export default collecteController;