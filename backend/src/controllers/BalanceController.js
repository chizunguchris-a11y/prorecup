import balanceService from "../services/BalanceService.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const organisationId = req => req.utilisateur.organisationId || req.utilisateur.organisation_id;

const balanceController = {
    lister: asyncHandler(async (req, res) => ApiResponse.success(
        res, "Balances récupérées avec succès.", await balanceService.lister(organisationId(req)))),
    creer: asyncHandler(async (req, res) => ApiResponse.created(
        res, "Balance créée avec succès.", await balanceService.creer(organisationId(req), req.body))),
    modifier: asyncHandler(async (req, res) => ApiResponse.success(
        res, "Balance modifiée avec succès.",
        await balanceService.modifier(req.params.id, organisationId(req), req.body))),
    modifierStatut: asyncHandler(async (req, res) => ApiResponse.success(
        res, "Statut de la balance modifié avec succès.",
        await balanceService.modifierStatut(req.params.id, organisationId(req), req.body?.statut)))
};

export default balanceController;
