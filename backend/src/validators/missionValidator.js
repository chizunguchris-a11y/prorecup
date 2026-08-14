import {
    body
} from "express-validator";

const missionValidator = [

    body("agent_id")
        .notEmpty()
        .withMessage(
            "L'agent est obligatoire."
        )
        .isUUID()
        .withMessage(
            "L'identifiant de l'agent est invalide."
        ),

    body("tricycle_id")
        .notEmpty()
        .withMessage(
            "Le tricycle est obligatoire."
        )
        .isUUID()
        .withMessage(
            "L'identifiant du tricycle est invalide."
        ),

    body("date_prevue")
        .notEmpty()
        .withMessage(
            "La date prévue est obligatoire."
        )
        .isISO8601()
        .withMessage(
            "La date prévue est invalide."
        ),

    body("heure_depart_prevue")
        .optional({
            checkFalsy: true
        })
        .matches(
            /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
        )
        .withMessage(
            "L'heure de départ prévue est invalide."
        ),

    body("heure_retour_prevue")
        .optional({
            checkFalsy: true
        })
        .matches(
            /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
        )
        .withMessage(
            "L'heure de retour prévue est invalide."
        ),

    body("observations")
        .optional({
            checkFalsy: true
        })
        .isLength({
            max: 2000
        })
        .withMessage(
            "Les observations ne peuvent pas dépasser 2000 caractères."
        )

];

export default missionValidator;