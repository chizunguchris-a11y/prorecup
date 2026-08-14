import { body } from "express-validator";

const missionCollecteValidator = [

    body("collecte_id")
        .notEmpty()
        .withMessage(
            "La collecte est obligatoire."
        )
        .isUUID()
        .withMessage(
            "L'identifiant de la collecte est invalide."
        ),

    body("ordre_collecte")
        .optional({
            nullable: true
        })
        .isInt({
            gt: 0
        })
        .withMessage(
            "L'ordre de collecte doit être supérieur à zéro."
        )

];

export default missionCollecteValidator;