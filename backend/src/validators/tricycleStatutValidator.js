import {
    body
} from "express-validator";

const tricycleStatutValidator = [

    body("statut")
        .notEmpty()
        .withMessage(
            "Le statut est obligatoire."
        )
        .isIn([
            "disponible",
            "en_mission",
            "en_panne",
            "maintenance",
            "hors_service"
        ])
        .withMessage(
            "Le statut du tricycle est invalide."
        )

];

export default tricycleStatutValidator;