import service from "../services/TraceabiliteMatiereService.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const organisation = req => req.utilisateur.organisationId;
const utilisateur = req => req.utilisateur.id;

export default {
    creerContenant: asyncHandler(async (req, res) => ApiResponse.created(res, "Contenant créé.",
        await service.creerContenant(organisation(req), utilisateur(req), req.body || {}))),
    lister: asyncHandler(async (req, res) => ApiResponse.success(res, "Unités de matière récupérées.",
        await service.lister(organisation(req)))),
    historique: asyncHandler(async (req, res) => ApiResponse.success(res, "Historique récupéré.",
        await service.historique(organisation(req), req.params.code))),
    etiquette: asyncHandler(async (req, res) => ApiResponse.success(res, "Étiquette QR générée.",
        await service.etiquette(organisation(req), req.params.code))),
    regrouper: asyncHandler(async (req, res) => ApiResponse.created(res, "Lot dépôt créé sans rupture de filiation.",
        await service.regrouper(organisation(req), utilisateur(req), req.body || {})))
};
