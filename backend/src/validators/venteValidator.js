import { body } from "express-validator";

const venteValidator = [

    body("stock_id")
        .notEmpty()
        .withMessage("Le stock est obligatoire.")
        .bail()
        .isUUID()
        .withMessage("L'identifiant du stock est invalide."),

    body("quantite")
        .notEmpty()
        .withMessage("La quantité est obligatoire.")
        .bail()
        .isFloat({ gt: 0 })
        .withMessage(
            "La quantité doit être supérieure à zéro."
        ),

    body("prix_unitaire")
        .notEmpty()
        .withMessage("Le prix unitaire est obligatoire.")
        .bail()
        .isFloat({ min: 0 })
        .withMessage(
            "Le prix unitaire doit être supérieur ou égal à zéro."
        ),

    body("acheteur_nom")
        .trim()
        .notEmpty()
        .withMessage("Le nom de l'acheteur est obligatoire.")
        .bail()
        .isLength({ min: 2, max: 150 })
        .withMessage(
            "Le nom de l'acheteur doit contenir entre 2 et 150 caractères."
        ),

    body("reference_vente")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage(
            "La référence de vente ne doit pas dépasser 100 caractères."
        )

];

export default venteValidator;