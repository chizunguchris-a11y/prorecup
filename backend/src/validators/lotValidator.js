import { body } from "express-validator";

const lotValidator = [

    body("collecte_id")
        .notEmpty()
        .withMessage("La collecte est obligatoire.")
        .bail()
        .isUUID()
        .withMessage("L'identifiant de la collecte est invalide."),

    body("type_dechet_id")
        .notEmpty()
        .withMessage("Le type de déchet est obligatoire.")
        .bail()
        .isUUID()
        .withMessage(
            "L'identifiant du type de déchet est invalide."
        ),

    body("poids_reel")
        .notEmpty()
        .withMessage("Le poids réel est obligatoire.")
        .bail()
        .isFloat({ gt: 0 })
        .withMessage(
            "Le poids réel doit être supérieur à zéro."
        ),

    body("statut_lot")
        .optional({ nullable: true, checkFalsy: true })
        .isIn(["en_stock", "vendu", "transforme"])
        .withMessage(
            "Le statut du lot doit être en_stock, vendu ou transforme."
        )

];

export default lotValidator;