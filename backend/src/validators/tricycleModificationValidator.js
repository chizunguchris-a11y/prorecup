import {
    body
} from "express-validator";

const tricycleModificationValidator = [

    body("numero_interne")
        .optional()
        .trim()
        .notEmpty()
        .withMessage(
            "Le numéro interne ne peut pas être vide."
        )
        .isLength({
            max: 50
        })
        .withMessage(
            "Le numéro interne ne peut pas dépasser 50 caractères."
        ),

    body("plaque_identification")
        .optional({
            nullable: true
        })
        .isLength({
            max: 50
        })
        .withMessage(
            "La plaque ne peut pas dépasser 50 caractères."
        ),

    body("marque")
        .optional({
            nullable: true
        })
        .isLength({
            max: 100
        })
        .withMessage(
            "La marque ne peut pas dépasser 100 caractères."
        ),

    body("modele")
        .optional({
            nullable: true
        })
        .isLength({
            max: 100
        })
        .withMessage(
            "Le modèle ne peut pas dépasser 100 caractères."
        ),

    body("capacite_kg")
        .optional()
        .isFloat({
            gt: 0
        })
        .withMessage(
            "La capacité doit être supérieure à zéro."
        ),

    body("etat")
        .optional()
        .isIn([
            "bon",
            "moyen",
            "mauvais"
        ])
        .withMessage(
            "L'état du tricycle est invalide."
        ),

    body("date_mise_en_service")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isISO8601()
        .withMessage(
            "La date de mise en service est invalide."
        ),

    body("observations")
        .optional({
            nullable: true
        })
        .isLength({
            max: 2000
        })
        .withMessage(
            "Les observations ne peuvent pas dépasser 2000 caractères."
        )

];

export default tricycleModificationValidator;