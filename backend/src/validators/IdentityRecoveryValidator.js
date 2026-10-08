import {
    body
} from "express-validator";


const limiterChamps = (
    autorises
) => {

    const ensemble =
        new Set(
            autorises
        );


    return (
        req,
        res,
        next
    ) => {

        const inconnus =
            Object.keys(
                req.body || {}
            )
                .filter(
                    cle =>
                        !ensemble.has(
                            cle
                        )
                );


        if (
            inconnus.length
        ) {

            return res.status(
                400
            ).json({
                success: false,
                error:
                    "La requete contient des champs non autorises."
            });

        }


        return next();

    };

};


export const champsDemandePassword =
    limiterChamps([
        "email"
    ]);


export const demandePasswordValidator = [

    body("email")
        .isString()
        .bail()
        .trim()
        .isLength({
            min: 3,
            max: 254
        })
        .bail()
        .isEmail()
        .withMessage(
            "L'adresse e-mail est invalide."
        )
        .normalizeEmail()

];


export const champsResetPassword =
    limiterChamps([
        "token",
        "nouveauMotDePasse",
        "confirmationMotDePasse"
    ]);


export const resetPasswordValidator = [

    body("token")
        .isString()
        .bail()
        .trim()
        .matches(
            /^[a-f0-9]{64}$/i
        )
        .withMessage(
            "Le lien de recuperation est invalide."
        ),

    body("nouveauMotDePasse")
        .isString()
        .bail()
        .isLength({
            min: 8,
            max: 256
        })
        .withMessage(
            "Le nouveau mot de passe doit contenir entre 8 et 256 caracteres."
        ),

    body("confirmationMotDePasse")
        .isString()
        .bail()
        .custom(
            (
                valeur,
                {
                    req
                }
            ) =>
                valeur ===
                req.body.nouveauMotDePasse
        )
        .withMessage(
            "La confirmation du mot de passe ne correspond pas."
        )

];


export const champsAideAcces =
    limiterChamps([
        "type",
        "identifiantConnu",
        "nom",
        "organisation",
        "telephoneContact",
        "emailContact",
        "message",
        "produitSource"
    ]);


export const aideAccesValidator = [

    body("type")
        .isIn([
            "identifiant_oublie",
            "email_inaccessible",
            "telephone_inaccessible",
            "acces_total_perdu",
            "compte_bloque",
            "compte_compromis"
        ])
        .withMessage(
            "Le type de probleme d'acces est invalide."
        ),

    body("identifiantConnu")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isString()
        .trim()
        .isLength({
            max: 254
        }),

    body("nom")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isString()
        .trim()
        .isLength({
            max: 150
        }),

    body("organisation")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isString()
        .trim()
        .isLength({
            max: 180
        }),

    body("telephoneContact")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isString()
        .trim()
        .isLength({
            max: 40
        }),

    body("emailContact")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isEmail()
        .withMessage(
            "L'adresse e-mail de contact est invalide."
        )
        .normalizeEmail(),

    body("message")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isString()
        .trim()
        .isLength({
            max: 2000
        }),

    body("produitSource")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isIn([
            "backoffice",
            "portail_client",
            "agent_terrain",
            "inconnu"
        ])

];


export const contactRecuperationObligatoire =
    (
        req,
        res,
        next
    ) => {

        const telephone =
            String(
                req.body?.telephoneContact ||
                ""
            ).trim();


        const email =
            String(
                req.body?.emailContact ||
                ""
            ).trim();


        if (
            !telephone &&
            !email
        ) {

            return res.status(
                400
            ).json({
                success: false,
                error:
                    "Indiquez au moins un moyen permettant a Pro Recup de vous recontacter."
            });

        }


        return next();

    };