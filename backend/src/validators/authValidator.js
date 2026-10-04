import {
    body
} from "express-validator";

import ApiError
    from "../utils/ApiError.js";


export const limiterChampsCorps =
    champsAutorises =>
        (
            req,
            res,
            next
        ) => {

            const corps =
                req.body;


            if (
                corps === null ||
                typeof corps !== "object" ||
                Array.isArray(corps)
            ) {

                return next(
                    new ApiError(
                        400,
                        "Le corps de la requete doit etre un objet JSON."
                    )
                );
            }


            const autorises =
                new Set(
                    champsAutorises
                );


            const inattendus =
                Object.keys(
                    corps
                ).filter(
                    champ =>
                        !autorises.has(
                            champ
                        )
                );


            if (
                inattendus.length
            ) {

                return next(
                    new ApiError(
                        400,
                        "Champ(s) non autorise(s) : " +
                        inattendus.join(", ") +
                        "."
                    )
                );
            }


            return next();
        };


export const champsConnexion =
    limiterChampsCorps([
        "email",
        "motDePasse"
    ]);


export const connexionValidator = [

    body("email")
        .custom(
            valeur =>
                typeof valeur === "string" &&
                valeur.trim().length > 0
        )
        .withMessage(
            "L'adresse e-mail est obligatoire."
        )
        .bail()
        .trim()
        .isLength({
            max: 254
        })
        .withMessage(
            "L'adresse e-mail est trop longue."
        )
        .bail()
        .isEmail()
        .withMessage(
            "L'adresse e-mail est invalide."
        )
        .normalizeEmail(),

    /*
     * Aucune longueur minimale ici afin de ne pas
     * rendre inaccessible un eventuel ancien compte.
     */
    body("motDePasse")
        .custom(
            valeur =>
                typeof valeur === "string" &&
                valeur.length > 0
        )
        .withMessage(
            "Le mot de passe est obligatoire."
        )
        .bail()
        .isLength({
            max: 256
        })
        .withMessage(
            "Le mot de passe est trop long."
        )

];


export const champsProfil =
    limiterChampsCorps([
        "nom",
        "email",
        "telephone",
        "photo_url"
    ]);


export const profilValidator = [

    body("nom")
        .optional({
            nullable: true
        })
        .custom(
            valeur =>
                typeof valeur === "string"
        )
        .withMessage(
            "Le nom doit etre du texte."
        )
        .bail()
        .trim()
        .notEmpty()
        .withMessage(
            "Le nom ne peut pas etre vide."
        )
        .bail()
        .isLength({
            max: 150
        })
        .withMessage(
            "Le nom ne doit pas depasser 150 caracteres."
        ),

    body("email")
        .optional({
            nullable: true
        })
        .custom(
            valeur =>
                typeof valeur === "string"
        )
        .withMessage(
            "L'adresse e-mail doit etre du texte."
        )
        .bail()
        .trim()
        .notEmpty()
        .withMessage(
            "L'adresse e-mail ne peut pas etre vide."
        )
        .bail()
        .isLength({
            max: 254
        })
        .withMessage(
            "L'adresse e-mail est trop longue."
        )
        .bail()
        .isEmail()
        .withMessage(
            "L'adresse e-mail est invalide."
        )
        .normalizeEmail(),

    /*
     * La chaine vide reste volontairement autorisee
     * pour permettre de retirer le numero.
     */
    body("telephone")
        .optional({
            nullable: true
        })
        .custom(
            valeur =>
                typeof valeur === "string"
        )
        .withMessage(
            "Le telephone doit etre du texte."
        )
        .bail()
        .trim()
        .isLength({
            max: 30
        })
        .withMessage(
            "Le telephone ne doit pas depasser 30 caracteres."
        ),

    /*
     * On conserve la compatibilite actuelle :
     * photo_url peut etre une reference interne et
     * n'est donc pas forcee en URL HTTP.
     */
    body("photo_url")
        .optional({
            nullable: true
        })
        .custom(
            valeur =>
                typeof valeur === "string"
        )
        .withMessage(
            "La reference de photo doit etre du texte."
        )
        .bail()
        .trim()
        .isLength({
            max: 2048
        })
        .withMessage(
            "La reference de photo est trop longue."
        )

];


export const champsMotDePasse =
    limiterChampsCorps([
        "ancienMotDePasse",
        "nouveauMotDePasse",
        "confirmationMotDePasse"
    ]);


const motDePasseObligatoire =
    (
        champ,
        libelle
    ) =>
        body(champ)
            .custom(
                valeur =>
                    typeof valeur === "string" &&
                    valeur.length > 0
            )
            .withMessage(
                `${libelle} est obligatoire.`
            )
            .bail()
            .isLength({
                max: 256
            })
            .withMessage(
                `${libelle} est trop long.`
            );


export const motDePasseValidator = [

    motDePasseObligatoire(
        "ancienMotDePasse",
        "L'ancien mot de passe"
    ),

    motDePasseObligatoire(
        "nouveauMotDePasse",
        "Le nouveau mot de passe"
    )
        .isLength({
            min: 8
        })
        .withMessage(
            "Le nouveau mot de passe doit contenir au moins 8 caracteres."
        )
        .bail()
        .custom(
            (
                valeur,
                {
                    req
                }
            ) =>
                valeur !==
                req.body.ancienMotDePasse
        )
        .withMessage(
            "Le nouveau mot de passe doit etre different de l'ancien."
        ),

    motDePasseObligatoire(
        "confirmationMotDePasse",
        "La confirmation du mot de passe"
    )
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