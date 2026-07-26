import logger from "../utils/logger.js";

const errorHandler = (erreur, req, res, next) => {

    const statut = erreur.statut || 500;

    logger.error(
        erreur.message,
        {
            statut,
            methode: req.method,
            route: req.originalUrl,
            utilisateur:
                req.utilisateur
                    ? req.utilisateur.id
                    : null,
            organisation:
                req.utilisateur
                    ? req.utilisateur.organisationId
                    : null
        }
    );

    return res.status(statut).json({

        success: false,

        error:
            statut === 500
                ? "Une erreur interne est survenue."
                : erreur.message

    });

};

export default errorHandler;