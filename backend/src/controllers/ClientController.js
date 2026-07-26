import clientService
    from "../services/ClientService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const clientController = {

    creer: asyncHandler(async (req, res) => {

        const donneesClient = {
            ...req.body,

            organisation_id:
                req.utilisateur.organisationId
        };

        const client =
            await clientService.creer(
                donneesClient
            );

        return ApiResponse.created(
            res,
            "Client créé avec succès.",
            client
        );

    }),

    lister: asyncHandler(async (req, res) => {

        const clients =
            await clientService
                .listerParOrganisation(
                    req.utilisateur
                        .organisationId
                );

        return ApiResponse.success(
            res,
            "Clients récupérés avec succès.",
            clients
        );

    }),

    modifier: asyncHandler(async (req, res) => {

        const client =
            await clientService.modifier(
                req.params.id,
                req.utilisateur
                    .organisationId,
                req.body
            );

        return ApiResponse.success(
            res,
            "Client modifié avec succès.",
            client
        );

    }),

    supprimer: asyncHandler(async (req, res) => {

        const client =
            await clientService.supprimer(
                req.params.id,
                req.utilisateur
                    .organisationId
            );

        return ApiResponse.success(
            res,
            "Client supprimé avec succès.",
            client
        );

    })

};

export default clientController;
