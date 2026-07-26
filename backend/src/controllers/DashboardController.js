import dashboardService from "../services/DashboardService.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const dashboardController = {

    obtenirResume: asyncHandler(async (req, res) => {

        const resume =
            await dashboardService.obtenirResume(
                req.utilisateur.organisationId
            );

        return ApiResponse.success(
            res,
            "Tableau de bord récupéré avec succès.",
            resume
        );

    })

};

export default dashboardController;