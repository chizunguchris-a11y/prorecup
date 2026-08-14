import {
    body
} from "express-validator";

const tricycleValidator = [

    body("numero_interne")
        .trim()
        .notEmpty()
        .withMessage(
            "Le numéro interne est obligatoire."
        )
        .isLength({
            max: 50
        })
        .withMessage(
            "Le numéro interne ne peut pas dépasser 50 caractères."
        ),

    body("plaque_identification")
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 50
        })
        .withMessage(
            "La plaque ne peut pas dépasser 50 caractères."
        ),

    body("marque")
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "La marque ne peut pas dépasser 100 caractères."
        ),

    body("modele")
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "Le modèle ne peut pas dépasser 100 caractères."
        ),

    body("capacite_kg")
        .notEmpty()
        .withMessage(
            "La capacité est obligatoire."
        )
        .isFloat({
            gt: 0
        })
        .withMessage(
            "La capacité doit être supérieure à zéro."
        ),

    body("statut")
        .optional()
        .isIn([
            "disponible",
            "en_mission",
            "en_panne",
            "maintenance",
            "hors_service"
        ])
        .withMessage(
            "Le statut du tricycle est invalide."
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
            checkFalsy: true
        })
        .isISO8601()
        .withMessage(
            "La date de mise en service est invalide."
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

export default tricycleValidator;