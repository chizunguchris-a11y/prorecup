import { body } from "express-validator";

const siteValidator = [

    body("nom")
        .trim()
        .notEmpty()
        .withMessage("Le nom du site est obligatoire.")
        .bail()
        .isLength({ min: 2, max: 150 })
        .withMessage(
            "Le nom du site doit contenir entre 2 et 150 caractères."
        ),

    body("adresse")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 })
        .withMessage(
            "L'adresse du site ne doit pas dépasser 255 caractères."
        ),

    body("zone_geographique")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 150 })
        .withMessage(
            "La zone géographique ne doit pas dépasser 150 caractères."
        ),

    body("responsable_nom")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage(
            "Le nom du responsable doit contenir entre 2 et 150 caractères."
        )

];

export default siteValidator;