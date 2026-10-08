import { body, param, query } from "express-validator";

const limiterChamps = autorises => (req, res, next) => {
    const ensemble = new Set(autorises);
    const inconnus = Object.keys(req.body || {}).filter(cle => !ensemble.has(cle));
    if (inconnus.length) {
        return res.status(400).json({ success: false, error: "La requete contient des champs non autorises." });
    }
    return next();
};

export const champsDemandeClient = limiterChamps([
    "organisationNom", "nomContact", "emailContact", "telephoneContact",
    "pays", "ville", "identifiantLegal", "message", "consentement"
]);

export const demandeClientValidator = [
    body("organisationNom").isString().trim().isLength({ min: 2, max: 180 }),
    body("nomContact").isString().trim().isLength({ min: 2, max: 150 }),
    body("emailContact").isEmail().withMessage("L'adresse e-mail de contact est invalide.").normalizeEmail(),
    body("telephoneContact").optional({ checkFalsy: true }).isString().trim().isLength({ max: 40 }),
    body("pays").isString().trim().isLength({ min: 2, max: 100 }),
    body("ville").optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
    body("identifiantLegal").optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
    body("message").optional({ checkFalsy: true }).isString().trim().isLength({ max: 2000 }),
    body("consentement").equals("true").withMessage("Votre accord est necessaire pour traiter la demande.")
];

export const listeDemandesValidator = [
    query("statut").optional().isIn(["en_attente_verification", "en_attente_validation", "actif", "suspendu", "refuse"]),
    query("page").optional().isInt({ min: 1, max: 10000 }).toInt(),
    query("limite").optional().isInt({ min: 1, max: 100 }).toInt()
];

export const champsStatutClient = limiterChamps(["statut", "notesInternes"]);
export const statutClientValidator = [
    param("id").isUUID().withMessage("La demande est invalide."),
    body("statut").isIn(["en_attente_verification", "en_attente_validation", "actif", "suspendu", "refuse"]),
    body("notesInternes").optional({ nullable: true }).isString().trim().isLength({ max: 4000 })
];
