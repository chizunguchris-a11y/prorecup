import stockService from "../services/StockService.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const stockController = {

    ajouter: asyncHandler(async (req, res) => {

        const { type_dechet_id, quantite, lot_id } = req.body;

        const stock = await stockService.ajouterAuStock(
            req.utilisateur.organisationId,
            type_dechet_id,
            quantite,
            lot_id
        );

        return ApiResponse.success(
            res,
            "Stock mis à jour avec succès.",
            stock
        );

    }),

    lister: asyncHandler(async (req, res) => {

        const stocks =
            await stockService.listerParOrganisation(
                req.utilisateur.organisationId
            );

        return ApiResponse.success(
            res,
            "Stocks récupérés avec succès.",
            stocks
        );

    })

};

export default stockController;