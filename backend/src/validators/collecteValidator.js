import { body } from "express-validator";

const collecteValidator = [

    body("site_id")
        .notEmpty()
        .withMessage("Le site de collecte est obligatoire.")
        .bail()
        .isUUID()
        .withMessage("L'identifiant du site est invalide."),

    body("client_id")
        .notEmpty()
        .withMessage("Le client est obligatoire.")
        .bail()
        .isUUID()
        .withMessage("L'identifiant du client est invalide."),

    body("type_dechet_id")
        .notEmpty()
        .withMessage("Le type de déchet est obligatoire.")
        .bail()
        .isUUID()
        .withMessage(
            "L'identifiant du type de déchet est invalide."
        ),

    body("poids_estime")
        .notEmpty()
        .withMessage("Le poids estimé est obligatoire.")
        .bail()
        .isFloat({ gt: 0 })
        .withMessage(
            "Le poids estimé doit être supérieur à zéro."
        )

];

export default collecteValidator;