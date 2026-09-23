import peseeService from "../services/PeseeService.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const terrainPeseeController = {
    listerBalances: asyncHandler(async (req, res) => ApiResponse.success(
        res, "Balances disponibles récupérées avec succès.",
        await peseeService.listerBalances(req.agentTerrain.organisation_id, "terrain")
    )),
    creer: asyncHandler(async (req, res) => {
        const donnees = { ...(req.body || {}), date_heure: req.body?.survenu_le };
        const resultat = await peseeService.enregistrer(
            req.params.id, req.params.collecteId, req.agentTerrain, donnees, "terrain");
        return ApiResponse.success(res, resultat.deja_traitee
            ? "Cette pesée avait déjà été enregistrée."
            : "Pesée terrain enregistrée avec succès.", resultat);
    })
};

export default terrainPeseeController;
