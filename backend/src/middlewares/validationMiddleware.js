import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

const validationMiddleware = (req, res, next) => {

    const erreurs = validationResult(req);

    if (erreurs.isEmpty()) {
        return next();
    }

    const messages = erreurs
        .array()
        .map((erreur) => erreur.msg);

    return next(
        new ApiError(
            400,
            messages.join(" ")
        )
    );

};

export default validationMiddleware;