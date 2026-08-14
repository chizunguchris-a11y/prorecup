import {
    body
} from "express-validator";

const missionEvenementValidator = [

    body("type_evenement")
        .notEmpty()
        .withMessage(
            "Le type d'événement est obligatoire."
        )
        .isIn([
            "mission_demarree",
            "position_enregistree",
            "arrivee_site",
            "collecte_demarree",
            "collecte_terminee",
            "incident_signale",
            "mission_terminee"
        ])
        .withMessage(
            "Le type d'événement est invalide."
        ),

    body("collecte_id")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isUUID()
        .withMessage(
            "L'identifiant de la collecte est invalide."
        ),

    body("latitude")
        .optional({
            nullable: true
        })
        .isFloat({
            min: -90,
            max: 90
        })
        .withMessage(
            "La latitude doit être comprise entre -90 et 90."
        ),

    body("longitude")
        .optional({
            nullable: true
        })
        .isFloat({
            min: -180,
            max: 180
        })
        .withMessage(
            "La longitude doit être comprise entre -180 et 180."
        ),

    body("precision_gps")
        .optional({
            nullable: true
        })
        .isFloat({
            min: 0
        })
        .withMessage(
            "La précision GPS ne peut pas être négative."
        ),

    body("observations")
        .optional({
            nullable: true
        })
        .isLength({
            max: 3000
        })
        .withMessage(
            "Les observations ne peuvent pas dépasser 3000 caractères."
        )

];

export default missionEvenementValidator;