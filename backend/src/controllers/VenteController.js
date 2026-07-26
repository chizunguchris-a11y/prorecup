import venteService from "../services/VenteService.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const venteController = {

    creer: asyncHandler(async (req, res) => {

        const donneesVente = {
            ...req.body,
            organisation_id:
                req.utilisateur.organisationId,
            cree_par:
                req.utilisateur.id
        };

        const resultat =
            await venteService.creer(
                donneesVente
            );

        return ApiResponse.created(
            res,
            "Vente enregistrée avec succès.",
            resultat
        );

    }),

    lister: asyncHandler(async (req, res) => {

        const ventes =
            await venteService.listerParOrganisation(
                req.utilisateur.organisationId
            );

        return ApiResponse.success(
            res,
            "Ventes récupérées avec succès.",
            ventes
        );

    })

};

export default venteController;