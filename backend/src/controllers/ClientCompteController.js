import clientCompteService
    from "../services/ClientCompteService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const clientCompteController = {

    creer: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await clientCompteService
                    .creer(
                        req.params.id,
                        req.utilisateur
                            .organisationId,
                        req.body
                    );

            return ApiResponse.created(
                res,
                "Compte client créé avec succès.",
                resultat
            );

        }
    )

};

export default clientCompteController;
