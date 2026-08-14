import carteService
    from "../services/CarteService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const obtenirOrganisationId = (
    req
) => {

    return (
        req.utilisateur.organisationId ||
        req.utilisateur.organisation_id ||
        req.utilisateur.organisation ||
        null
    );

};

const carteController = {

    obtenirPositions: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await carteService
                    .obtenirPositions(
                        obtenirOrganisationId(
                            req
                        )
                    );

            return ApiResponse.success(
                res,
                "Positions GPS récupérées avec succès.",
                resultat
            );

        }
    )

};

export default carteController;