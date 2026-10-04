import {
    body,
    param
} from "express-validator";


const chaineNonVide =
    (
        champ,
        libelle,
        max = 2000
    ) =>
        body(champ)
            .custom(
                valeur =>
                    typeof valeur === "string" &&
                    valeur.trim().length > 0
            )
            .withMessage(
                `${libelle} est obligatoire.`
            )
            .bail()
            .trim()
            .isLength({
                max
            })
            .withMessage(
                `${libelle} est trop long.`
            );


const uuidCorpsObligatoire =
    (
        champ,
        libelle
    ) =>
        body(champ)
            .custom(
                valeur =>
                    typeof valeur === "string" &&
                    valeur.trim().length > 0
            )
            .withMessage(
                `${libelle} est obligatoire.`
            )
            .bail()
            .isUUID()
            .withMessage(
                `${libelle} est invalide.`
            );


const instantObligatoire =
    body("survenu_le")
        .custom(
            valeur =>
                typeof valeur === "string" &&
                valeur.trim().length > 0
        )
        .withMessage(
            "La date reelle de l'action est obligatoire."
        )
        .bail()
        .isLength({
            max: 64
        })
        .withMessage(
            "La date reelle de l'action est invalide."
        )
        .bail()
        .custom(
            valeur =>
                !Number.isNaN(
                    Date.parse(
                        valeur
                    )
                )
        )
        .withMessage(
            "La date reelle de l'action est invalide."
        );


const operationObligatoire =
    uuidCorpsObligatoire(
        "operation_id",
        "L'identifiant de l'operation"
    );


const precisionGps =
    body("precision_gps")
        .optional({
            nullable: true
        })
        .isFloat({
            min: 0
        })
        .withMessage(
            "La precision GPS est invalide."
        );


const observations =
    body("observations")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "Les observations doivent etre du texte."
        )
        .bail()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Les observations ne doivent pas depasser 2000 caracteres."
        );


const mode =
    body("mode")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "Le mode doit etre du texte."
        )
        .bail()
        .isLength({
            max: 30
        })
        .withMessage(
            "Le mode est trop long."
        );


const verifierPaireGps =
    obligatoire =>
        body()
            .custom(
                (
                    valeur,
                    {
                        req
                    }
                ) => {

                    const donnees =
                        req.body || {};


                    const latitudePresente =
                        donnees.latitude !== undefined &&
                        donnees.latitude !== null &&
                        donnees.latitude !== "";


                    const longitudePresente =
                        donnees.longitude !== undefined &&
                        donnees.longitude !== null &&
                        donnees.longitude !== "";


                    if (
                        obligatoire &&
                        (
                            !latitudePresente ||
                            !longitudePresente
                        )
                    ) {

                        throw new Error(
                            "La latitude et la longitude sont obligatoires."
                        );
                    }


                    if (
                        latitudePresente !==
                        longitudePresente
                    ) {

                        throw new Error(
                            "La latitude et la longitude doivent etre fournies ensemble."
                        );
                    }


                    if (
                        latitudePresente
                    ) {

                        const latitude =
                            Number(
                                donnees.latitude
                            );

                        const longitude =
                            Number(
                                donnees.longitude
                            );


                        if (
                            !Number.isFinite(
                                latitude
                            ) ||
                            latitude < -90 ||
                            latitude > 90
                        ) {

                            throw new Error(
                                "Latitude invalide."
                            );
                        }


                        if (
                            !Number.isFinite(
                                longitude
                            ) ||
                            longitude < -180 ||
                            longitude > 180
                        ) {

                            throw new Error(
                                "Longitude invalide."
                            );
                        }
                    }


                    return true;
                }
            );


const gpsOptionnel = [
    verifierPaireGps(
        false
    ),
    precisionGps
];


const gpsObligatoire = [
    verifierPaireGps(
        true
    ),
    precisionGps
];


export const missionIdValidator = [

    param("id")
        .isUUID()
        .withMessage(
            "L'identifiant de la mission est invalide."
        )

];


export const missionCollecteIdsValidator = [

    param("id")
        .isUUID()
        .withMessage(
            "L'identifiant de la mission est invalide."
        ),

    param("collecteId")
        .isUUID()
        .withMessage(
            "L'identifiant de la collecte est invalide."
        )

];


export const preuveIdsValidator = [

    ...missionCollecteIdsValidator,

    param("preuveId")
        .isUUID()
        .withMessage(
            "L'identifiant de la preuve est invalide."
        )

];


export const actionMissionValidator = [

    operationObligatoire,

    instantObligatoire,

    ...gpsOptionnel,

    observations,

    mode

];


export const arriveeCollecteValidator = [

    operationObligatoire,

    instantObligatoire,

    ...gpsObligatoire,

    observations,

    mode

];


export const actionCollecteValidator = [

    operationObligatoire,

    instantObligatoire,

    ...gpsOptionnel,

    observations,

    mode

];


export const finCollecteValidator = [

    ...actionCollecteValidator,

    body("poids_reel")
        .optional({
            nullable: true
        })
        .isFloat({
            min: 0
        })
        .withMessage(
            "Le poids reel doit etre un nombre superieur ou egal a zero."
        ),

    body("resultat_terrain")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "Le resultat terrain doit etre du texte."
        )
        .bail()
        .trim()
        .isLength({
            max: 50
        })
        .withMessage(
            "Le resultat terrain est trop long."
        ),

    body("motif_terrain")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "Le motif terrain doit etre du texte."
        )
        .bail()
        .trim()
        .isLength({
            max: 1000
        })
        .withMessage(
            "Le motif terrain ne doit pas depasser 1000 caracteres."
        )

];


export const peseeTerrainValidator = [

    operationObligatoire,

    uuidCorpsObligatoire(
        "balance_id",
        "L'identifiant de la balance"
    ),

    instantObligatoire,

    body("poids_brut")
        .custom(
            valeur =>
                valeur !== undefined &&
                valeur !== null &&
                valeur !== ""
        )
        .withMessage(
            "Le poids brut est obligatoire."
        )
        .bail()
        .isFloat({
            min: 0
        })
        .withMessage(
            "Le poids brut est invalide."
        ),

    body("tare")
        .optional({
            nullable: true
        })
        .isFloat({
            min: 0
        })
        .withMessage(
            "La tare est invalide."
        ),

    ...gpsObligatoire

];


export const incidentTerrainValidator = [

    operationObligatoire,

    instantObligatoire,

    body("collecte_id")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isUUID()
        .withMessage(
            "L'identifiant de la collecte est invalide."
        ),

    chaineNonVide(
        "description",
        "La description de l'incident",
        2000
    )
        .isLength({
            min: 5
        })
        .withMessage(
            "La description de l'incident doit contenir au moins 5 caracteres."
        ),

    body("categorie")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "La categorie doit etre du texte."
        )
        .bail()
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "La categorie est trop longue."
        ),

    body("gravite")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "La gravite doit etre du texte."
        )
        .bail()
        .trim()
        .isLength({
            max: 50
        })
        .withMessage(
            "La gravite est trop longue."
        ),

    body("bloquant")
        .optional({
            nullable: true
        })
        .isBoolean()
        .withMessage(
            "Le champ bloquant doit etre booleen."
        ),

    ...gpsOptionnel,

    observations,

    mode

];


export const preuveTerrainValidator = [

    /*
     * Les champs multipart sont produits par Multer.
     * On ne rend obligatoire ici que ce dont la
     * frontiere peut verifier le format sans dupliquer
     * les regles metier du service.
     */

    body("operation_id")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isUUID()
        .withMessage(
            "L'identifiant de l'operation est invalide."
        ),

    body("type_preuve")
        .optional({
            nullable: true
        })
        .isString()
        .withMessage(
            "Le type de preuve doit etre du texte."
        )
        .bail()
        .trim()
        .isLength({
            max: 50
        })
        .withMessage(
            "Le type de preuve est trop long."
        ),

    body("survenu_le")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isLength({
            max: 64
        })
        .withMessage(
            "La date de la preuve est invalide."
        )
        .bail()
        .custom(
            valeur =>
                !Number.isNaN(
                    Date.parse(
                        valeur
                    )
                )
        )
        .withMessage(
            "La date de la preuve est invalide."
        ),

    ...gpsOptionnel,

    observations,

    mode

];