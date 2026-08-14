import {
    body
} from "express-validator";

const agentStatutValidator = [

    body("statut")
        .notEmpty()
        .withMessage(
            "Le statut est obligatoire."
        )
        .isIn([
            "actif",
            "inactif",
            "suspendu"
        ])
        .withMessage(
            "Le statut de l'agent est invalide."
        )

];

export default agentStatutValidator;
