import {
    param
} from "express-validator";


export const collecteIdValidator = [

    param("id")
        .isUUID()
        .withMessage(
            "L'identifiant de la collecte est invalide."
        )

];


export const preuveCollecteIdsValidator = [

    param("id")
        .isUUID()
        .withMessage(
            "L'identifiant de la collecte est invalide."
        ),

    param("preuveId")
        .isUUID()
        .withMessage(
            "L'identifiant de la preuve est invalide."
        )

];