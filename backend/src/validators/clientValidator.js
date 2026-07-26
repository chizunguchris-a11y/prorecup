import { body } from "express-validator";

const clientValidator = [

    body("nom")
        .trim()
        .notEmpty()
        .withMessage("Le nom du client est obligatoire.")
        .bail()
        .isLength({ min: 2, max: 150 })
        .withMessage(
            "Le nom du client doit contenir entre 2 et 150 caractères."
        ),

    body("type_client")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage(
            "Le type de client ne doit pas dépasser 100 caractères."
        ),

    body("contact_email")
        .optional({ nullable: true, checkFalsy: true })
        .isEmail()
        .withMessage("L'adresse email du client est invalide.")
        .normalizeEmail(),

    body("contact_telephone")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ min: 6, max: 30 })
        .withMessage(
            "Le numéro de téléphone doit contenir entre 6 et 30 caractères."
        ),

    body("adresse_siege")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage(
            "L'adresse du siège ne doit pas dépasser 255 caractères."
        )

];

export default clientValidator;