import roleService
    from "../services/roleService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const roleController = {

    create: asyncHandler(
        async (
            req,
            res
        ) => {

            const role =
                await roleService.creer(
                    req.body
                );

            return ApiResponse.created(
                res,
                "Rôle créé avec succès.",
                role
            );

        }
    ),

    getAll: asyncHandler(
        async (
            req,
            res
        ) => {

            const roles =
                await roleService.lister();

            return ApiResponse.success(
                res,
                "Rôles récupérés avec succès.",
                roles
            );

        }
    )

};

export default roleController;