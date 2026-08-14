import {
    body
} from "express-validator";

const ordreCollecteValidator = [

    body("ordre_collecte")
        .notEmpty()
        .withMessage(
            "L'ordre de collecte est obligatoire."
        )
        .isInt({
            gt: 0
        })
        .withMessage(
            "L'ordre de collecte doit être supérieur à zéro."
        )

];

export default ordreCollecteValidator;