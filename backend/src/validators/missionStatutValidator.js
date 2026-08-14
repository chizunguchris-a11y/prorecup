import {
    body
} from "express-validator";

const missionStatutValidator = [

    body("statut")
        .notEmpty()
        .withMessage(
            "Le statut est obligatoire."
        )
        .isIn([
            "en_cours",
            "terminee",
            "annulee"
        ])
        .withMessage(
            "Le statut de la mission est invalide."
        )

];

export default missionStatutValidator;