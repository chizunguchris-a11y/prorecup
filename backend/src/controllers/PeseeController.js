import peseeService from "../services/PeseeService.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const organisationId = req => req.utilisateur.organisationId || req.utilisateur.organisation_id;
const utilisateurId = req => req.utilisateur.id || req.utilisateur.utilisateur_id || req.utilisateur.user_id;

const peseeController = {
    creerDepot: asyncHandler(async (req, res) => {
        const resultat = await peseeService.enregistrer(
            req.body.mission_id,
            req.params.id,
            { organisation_id: organisationId(req), utilisateur_id: utilisateurId(req), agent_id: null },
            req.body || {},
            "depot"
        );
        return ApiResponse.success(res, resultat.deja_traitee
            ? "Cette pesée avait déjà été enregistrée."
            : "Pesée dépôt enregistrée avec succès.", resultat);
    }),
    listerBalances: asyncHandler(async (req, res) => ApiResponse.success(
        res, "Balances récupérées avec succès.",
        await peseeService.listerBalances(organisationId(req), "depot")
    ))
};

export default peseeController;
