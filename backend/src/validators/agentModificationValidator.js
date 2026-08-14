import {
    body
} from "express-validator";

const agentModificationValidator = [

    body("telephone")
        .optional({
            checkFalsy: true
        })
        .isLength({
            max: 30
        })
        .withMessage(
            "Le téléphone ne peut pas dépasser 30 caractères."
        ),

    body("photo_url")
        .optional({
            checkFalsy: true
        })
        .isURL()
        .withMessage(
            "L'adresse de la photo est invalide."
        ),

    body("disponible")
        .optional()
        .isBoolean()
        .withMessage(
            "La disponibilité doit être une valeur booléenne."
        ),

    body("date_embauche")
        .optional({
            checkFalsy: true
        })
        .isISO8601()
        .withMessage(
            "La date d'embauche est invalide."
        )

];

export default agentModificationValidator;