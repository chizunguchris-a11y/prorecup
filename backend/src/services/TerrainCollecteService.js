import pool
    from "../config/db.js";

import terrainCollecteRepository
    from "../repositories/TerrainCollecteRepository.js";

import peseeRepository
    from "../repositories/PeseeRepository.js";

import ApiError
    from "../utils/ApiError.js";


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


const versRadians = (
    valeur
) => {

    return (
        Number(valeur) *
        Math.PI /
        180
    );

};


const calculerDistanceMetres = (
    latitude1,
    longitude1,
    latitude2,
    longitude2
) => {

    const rayonTerre =
        6371000;


    const deltaLatitude =
        versRadians(
            latitude2 -
            latitude1
        );


    const deltaLongitude =
        versRadians(
            longitude2 -
            longitude1
        );


    const a =
        Math.sin(
            deltaLatitude / 2
        ) ** 2 +

        Math.cos(
            versRadians(
                latitude1
            )
        ) *

        Math.cos(
            versRadians(
                latitude2
            )
        ) *

        Math.sin(
            deltaLongitude / 2
        ) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return Math.round(
        rayonTerre *
        c *
        10
    ) / 10;

};


class TerrainCollecteService {

    validerUuid(
        valeur,
        nom
    ) {

        if (
            !valeur ||
            !UUID_REGEX.test(
                String(valeur)
            )
        ) {

            throw new ApiError(
                400,
                `${nom} est invalide.`
            );

        }

    }


    validerGps(
        latitude,
        longitude,
        precisionGps
    ) {

        if (
            latitude === undefined ||
            latitude === null ||
            longitude === undefined ||
            longitude === null
        ) {

            throw new ApiError(
                400,
                "La latitude et la longitude sont obligatoires."
            );

        }


        if (
            Number.isNaN(
                Number(latitude)
            ) ||
            Number(latitude) < -90 ||
            Number(latitude) > 90
        ) {

            throw new ApiError(
                400,
                "Latitude invalide."
            );

        }


        if (
            Number.isNaN(
                Number(longitude)
            ) ||
            Number(longitude) < -180 ||
            Number(longitude) > 180
        ) {

            throw new ApiError(
                400,
                "Longitude invalide."
            );

        }


        if (
            precisionGps !== undefined &&
            precisionGps !== null &&
            (
                Number.isNaN(
                    Number(
                        precisionGps
                    )
                ) ||
                Number(
                    precisionGps
                ) < 0
            )
        ) {

            throw new ApiError(
                400,
                "Précision GPS invalide."
            );

        }

    }


    async enregistrerArrivee(
        missionId,
        collecteId,
        agentTerrain,
        donnees
    ) {

        this.validerUuid(
            missionId,
            "L'identifiant de la mission"
        );


        this.validerUuid(
            collecteId,
            "L'identifiant de la collecte"
        );


        this.validerUuid(
            donnees.operation_id,
            "L'identifiant de l'opération"
        );


        if (!donnees.survenu_le) {

            throw new ApiError(
                400,
                "La date réelle de l'arrivée est obligatoire."
            );

        }


        const dateAction =
            new Date(
                donnees.survenu_le
            );


        if (
            Number.isNaN(
                dateAction.getTime()
            )
        ) {

            throw new ApiError(
                400,
                "La date réelle de l'arrivée est invalide."
            );

        }


        this.validerGps(
            donnees.latitude,
            donnees.longitude,
            donnees.precision_gps
        );


        const connexion =
            await pool.connect();


        try {

            await connexion.query(
                "BEGIN"
            );


            /*
             * Cette requête vérifie simultanément :
             *
             * - l'organisation ;
             * - l'agent ;
             * - la mission ;
             * - la collecte ;
             * - l'association mission/collecte.
             */
            const contexte =
                await terrainCollecteRepository
                    .trouverContexteArrivee(
                        missionId,
                        collecteId,
                        agentTerrain.agent_id,
                        agentTerrain
                            .organisation_id,
                        connexion
                    );


            if (!contexte) {

                throw new ApiError(
                    404,
                    "Mission ou collecte introuvable pour cet agent."
                );

            }


            const operationExistante =
                await terrainCollecteRepository
                    .trouverOperation(
                        donnees.operation_id,
                        agentTerrain
                            .organisation_id,
                        connexion
                    );


            if (operationExistante) {

                if (
                    operationExistante
                        .mission_id !==
                        missionId ||
                    operationExistante
                        .collecte_id !==
                        collecteId ||
                    operationExistante
                        .type_evenement !==
                        "arrivee_site" ||
                    operationExistante
                        .cree_par !==
                        agentTerrain
                            .utilisateur_id
                ) {

                    throw new ApiError(
                        409,
                        "Cet identifiant d'opération a déjà été utilisé."
                    );

                }


                await connexion.query(
                    "COMMIT"
                );


                return {

                    deja_traitee:
                        true,

                    arrivee:
                        operationExistante,

                    verification_site:
                        operationExistante
                            .contexte
                            ?.verification_site ||
                        null

                };

            }


            if (
                contexte.mission_statut !==
                "en_cours"
            ) {

                throw new ApiError(
                    409,
                    "La mission doit être en cours."
                );

            }


            const arriveeExistante =
                await terrainCollecteRepository
                    .trouverArriveeExistante(
                        missionId,
                        collecteId,
                        connexion
                    );


            if (arriveeExistante) {

                throw new ApiError(
                    409,
                    "L'arrivée sur ce site a déjà été enregistrée."
                );

            }


            const latitudeAgent =
                Number(
                    donnees.latitude
                );


            const longitudeAgent =
                Number(
                    donnees.longitude
                );


            const referenceDisponible =
                contexte.site_latitude !==
                    null &&
                contexte.site_longitude !==
                    null;


            let distanceSiteMetres =
                null;


            let verificationSite =
                "reference_site_absente";


            const rayonValidation =
                Number(
                    contexte
                        .site_rayon_validation_m ||
                    100
                );


            if (referenceDisponible) {

                distanceSiteMetres =
                    calculerDistanceMetres(
                        latitudeAgent,
                        longitudeAgent,
                        Number(
                            contexte
                                .site_latitude
                        ),
                        Number(
                            contexte
                                .site_longitude
                        )
                    );


                verificationSite =
                    distanceSiteMetres <=
                    rayonValidation
                        ? "dans_zone"
                        : "hors_zone";

            }


            const donneesContexte = {

                source:
                    "agent_pwa",

                action:
                    "arrivee_site",

                mode:
                    donnees.mode ||
                    "online",

                verification_site:
                    verificationSite,

                distance_site_m:
                    distanceSiteMetres,

                rayon_validation_m:
                    rayonValidation,

                reference_gps_site_disponible:
                    referenceDisponible,

                precision_gps_agent_m:
                    donnees.precision_gps !==
                        undefined &&
                    donnees.precision_gps !==
                        null
                        ? Number(
                            donnees
                                .precision_gps
                        )
                        : null

            };


            let arrivee =
                await terrainCollecteRepository
                    .creerArrivee(
                        {

                            mission_id:
                                missionId,

                            collecte_id:
                                collecteId,

                            latitude:
                                latitudeAgent,

                            longitude:
                                longitudeAgent,

                            precision_gps:
                                donnees
                                    .precision_gps !==
                                    undefined &&
                                donnees
                                    .precision_gps !==
                                    null
                                    ? Number(
                                        donnees
                                            .precision_gps
                                    )
                                    : null,

                            observations:
                                donnees
                                    .observations,

                            cree_par:
                                agentTerrain
                                    .utilisateur_id,

                            operation_id:
                                donnees
                                    .operation_id,

                            survenu_le:
                                donnees
                                    .survenu_le,

                            contexte:
                                donneesContexte

                        },
                        connexion
                    );


            /*
             * Cas rare :
             * la même operation_id arrive exactement
             * en parallèle.
             */
            if (!arrivee) {

                arrivee =
                    await terrainCollecteRepository
                        .trouverOperation(
                            donnees.operation_id,
                            agentTerrain
                                .organisation_id,
                            connexion
                        );


                await connexion.query(
                    "COMMIT"
                );


                return {

                    deja_traitee:
                        true,

                    arrivee,

                    verification_site:
                        verificationSite,

                    distance_site_m:
                        distanceSiteMetres

                };

            }


            await connexion.query(
                "COMMIT"
            );


            return {

                deja_traitee:
                    false,

                arrivee,

                verification_site:
                    verificationSite,

                distance_site_m:
                    distanceSiteMetres,

                rayon_validation_m:
                    rayonValidation

            };


        } catch (erreur) {

            await connexion.query(
                "ROLLBACK"
            );


            throw erreur;


        } finally {

            connexion.release();

        }

    }

    async demarrerCollecte(
        missionId,
        collecteId,
        agentTerrain,
        donnees
    ) {

        this.validerUuid(
            missionId,
            "L'identifiant de la mission"
        );

        this.validerUuid(
            collecteId,
            "L'identifiant de la collecte"
        );

        this.validerUuid(
            donnees.operation_id,
            "L'identifiant de l'opération"
        );


        if (!donnees.survenu_le) {

            throw new ApiError(
                400,
                "La date réelle du démarrage est obligatoire."
            );

        }


        const dateAction =
            new Date(
                donnees.survenu_le
            );


        if (
            Number.isNaN(
                dateAction.getTime()
            )
        ) {

            throw new ApiError(
                400,
                "La date réelle du démarrage est invalide."
            );

        }


        const gpsFourni =
            donnees.latitude !== undefined ||
            donnees.longitude !== undefined;


        if (gpsFourni) {

            this.validerGps(
                donnees.latitude,
                donnees.longitude,
                donnees.precision_gps
            );

        }


        const connexion =
            await pool.connect();


        try {

            await connexion.query(
                "BEGIN"
            );


            const contexte =
                await terrainCollecteRepository
                    .trouverContexteArrivee(
                        missionId,
                        collecteId,
                        agentTerrain.agent_id,
                        agentTerrain.organisation_id,
                        connexion
                    );


            if (!contexte) {

                throw new ApiError(
                    404,
                    "Mission ou collecte introuvable pour cet agent."
                );

            }


            const operationExistante =
                await terrainCollecteRepository
                    .trouverOperation(
                        donnees.operation_id,
                        agentTerrain.organisation_id,
                        connexion
                    );


            if (operationExistante) {

                if (
                    operationExistante.mission_id !==
                        missionId ||
                    operationExistante.collecte_id !==
                        collecteId ||
                    operationExistante.type_evenement !==
                        "collecte_demarree" ||
                    operationExistante.cree_par !==
                        agentTerrain.utilisateur_id
                ) {

                    throw new ApiError(
                        409,
                        "Cet identifiant d'opération a déjà été utilisé."
                    );

                }


                await connexion.query(
                    "COMMIT"
                );


                return {

                    deja_traitee:
                        true,

                    evenement:
                        operationExistante

                };

            }


            if (
                contexte.mission_statut !==
                "en_cours"
            ) {

                throw new ApiError(
                    409,
                    "La mission doit être en cours."
                );

            }


            const precedente =
                await terrainCollecteRepository
                    .trouverCollectePrecedenteNonTerminee(
                        missionId,
                        collecteId,
                        connexion
                    );


            if (precedente) {

                throw new ApiError(
                    409,
                    "La collecte précédente doit être terminée avant de commencer cet arrêt."
                );

            }


            const arrivee =
                await terrainCollecteRepository
                    .trouverEvenementCollecte(
                        missionId,
                        collecteId,
                        "arrivee_site",
                        connexion
                    );


            if (!arrivee) {

                throw new ApiError(
                    409,
                    "L'arrivée sur le site doit être enregistrée avant de commencer la collecte."
                );

            }


            const autreActive =
                await terrainCollecteRepository
                    .trouverAutreCollecteActive(
                        missionId,
                        collecteId,
                        connexion
                    );


            if (autreActive) {

                throw new ApiError(
                    409,
                    "Une autre collecte de cette mission est encore en cours."
                );

            }


            const debutExistant =
                await terrainCollecteRepository
                    .trouverEvenementCollecte(
                        missionId,
                        collecteId,
                        "collecte_demarree",
                        connexion
                    );


            if (debutExistant) {

                throw new ApiError(
                    409,
                    "Cette collecte a déjà été démarrée."
                );

            }


            let evenement =
                await terrainCollecteRepository
                    .creerDemarrageCollecte(
                        {

                            mission_id:
                                missionId,

                            collecte_id:
                                collecteId,

                            latitude:
                                donnees.latitude !==
                                    undefined
                                    ? Number(
                                        donnees.latitude
                                    )
                                    : null,

                            longitude:
                                donnees.longitude !==
                                    undefined
                                    ? Number(
                                        donnees.longitude
                                    )
                                    : null,

                            precision_gps:
                                donnees.precision_gps !==
                                    undefined &&
                                donnees.precision_gps !==
                                    null
                                    ? Number(
                                        donnees.precision_gps
                                    )
                                    : null,

                            observations:
                                donnees.observations,

                            cree_par:
                                agentTerrain
                                    .utilisateur_id,

                            operation_id:
                                donnees.operation_id,

                            survenu_le:
                                donnees.survenu_le,

                            contexte: {

                                source:
                                    "agent_pwa",

                                action:
                                    "demarrer_collecte",

                                mode:
                                    donnees.mode ||
                                    "online",

                                ordre_collecte:
                                    contexte
                                        .ordre_collecte,

                                arrivee_operation_id:
                                    arrivee
                                        .operation_id ||
                                    null

                            }

                        },
                        connexion
                    );


            if (!evenement) {

                evenement =
                    await terrainCollecteRepository
                        .trouverOperation(
                            donnees.operation_id,
                            agentTerrain
                                .organisation_id,
                            connexion
                        );


                await connexion.query(
                    "COMMIT"
                );


                return {

                    deja_traitee:
                        true,

                    evenement

                };

            }


            await connexion.query(
                "COMMIT"
            );


            return {

                deja_traitee:
                    false,

                evenement

            };


        } catch (erreur) {

            await connexion.query(
                "ROLLBACK"
            );

            throw erreur;


        } finally {

            connexion.release();

        }

    }

    async terminerCollecte(
        missionId,
        collecteId,
        agentTerrain,
        donnees
    ) {

        this.validerUuid(
            missionId,
            "L'identifiant de la mission"
        );


        this.validerUuid(
            collecteId,
            "L'identifiant de la collecte"
        );


        this.validerUuid(
            donnees.operation_id,
            "L'identifiant de l'opération"
        );


        if (!donnees.survenu_le) {

            throw new ApiError(
                400,
                "La date réelle de fin est obligatoire."
            );

        }


        const dateFin =
            new Date(
                donnees.survenu_le
            );


        if (
            Number.isNaN(
                dateFin.getTime()
            )
        ) {

            throw new ApiError(
                400,
                "La date réelle de fin est invalide."
            );

        }


        const resultatsAutorises = [
            "collectee",
            "partielle",
            "aucune_matiere",
            "non_collectee"
        ];


        const resultatTerrain =
            String(
                donnees.resultat_terrain ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            !resultatsAutorises.includes(
                resultatTerrain
            )
        ) {

            throw new ApiError(
                400,
                "Le résultat terrain est invalide."
            );

        }


        let poidsReel =
            Number(
                donnees.poids_reel
            );


        if (
            donnees.poids_reel ===
                undefined ||
            donnees.poids_reel ===
                null ||
            donnees.poids_reel ===
                "" ||
            Number.isNaN(
                poidsReel
            ) ||
            poidsReel < 0
        ) {

            throw new ApiError(
                400,
                "Le poids réel doit être un nombre supérieur ou égal à zéro."
            );

        }


        if (
            (
                resultatTerrain ===
                    "collectee" ||
                resultatTerrain ===
                    "partielle"
            ) &&
            poidsReel <= 0
        ) {

            throw new ApiError(
                400,
                "Une collecte réalisée doit avoir un poids réel supérieur à zéro."
            );

        }


        if (
            (
                resultatTerrain ===
                    "aucune_matiere" ||
                resultatTerrain ===
                    "non_collectee"
            ) &&
            poidsReel !== 0
        ) {

            throw new ApiError(
                400,
                "Le poids réel doit être égal à zéro pour ce résultat terrain."
            );

        }


        const motif =
            donnees.motif_terrain
                ? String(
                    donnees.motif_terrain
                ).trim()
                : null;


        if (
            resultatTerrain ===
                "non_collectee" &&
            !motif
        ) {

            throw new ApiError(
                400,
                "Le motif est obligatoire lorsqu'une collecte n'a pas pu être réalisée."
            );

        }


        const gpsFourni =
            donnees.latitude !==
                undefined ||
            donnees.longitude !==
                undefined;


        if (gpsFourni) {

            this.validerGps(
                donnees.latitude,
                donnees.longitude,
                donnees.precision_gps
            );

        }


        const connexion =
            await pool.connect();


        try {

            await connexion.query(
                "BEGIN"
            );


            const contexte =
                await terrainCollecteRepository
                    .trouverContexteArrivee(
                        missionId,
                        collecteId,
                        agentTerrain.agent_id,
                        agentTerrain
                            .organisation_id,
                        connexion
                    );


            if (!contexte) {

                throw new ApiError(
                    404,
                    "Mission ou collecte introuvable pour cet agent."
                );

            }


            const operationExistante =
                await terrainCollecteRepository
                    .trouverOperation(
                        donnees.operation_id,
                        agentTerrain
                            .organisation_id,
                        connexion
                    );


            if (operationExistante) {

                if (
                    operationExistante
                        .mission_id !==
                        missionId ||
                    operationExistante
                        .collecte_id !==
                        collecteId ||
                    operationExistante
                        .type_evenement !==
                        "collecte_terminee" ||
                    operationExistante
                        .cree_par !==
                        agentTerrain
                            .utilisateur_id
                ) {

                    throw new ApiError(
                        409,
                        "Cet identifiant d'opération a déjà été utilisé."
                    );

                }


                await connexion.query(
                    "COMMIT"
                );


                return {

                    deja_traitee:
                        true,

                    evenement:
                        operationExistante

                };

            }


            if (
                contexte.mission_statut !==
                "en_cours"
            ) {

                throw new ApiError(
                    409,
                    "La mission doit être en cours."
                );

            }


            const debut =
                await terrainCollecteRepository
                    .trouverEvenementCollecte(
                        missionId,
                        collecteId,
                        "collecte_demarree",
                        connexion
                    );


            if (!debut) {

                throw new ApiError(
                    409,
                    "La collecte doit être démarrée avant d'être terminée."
                );

            }


            const finExistante =
                await terrainCollecteRepository
                    .trouverEvenementCollecte(
                        missionId,
                        collecteId,
                        "collecte_terminee",
                        connexion
                    );


            if (finExistante) {

                throw new ApiError(
                    409,
                    "Cette collecte est déjà terminée."
                );

            }


            const debutLe =
                new Date(
                    debut.survenu_le ||
                    debut.cree_le
                );


            if (
                dateFin.getTime() <
                debutLe.getTime()
            ) {

                throw new ApiError(
                    409,
                    "La fin de collecte ne peut pas être antérieure à son démarrage."
                );

            }


            const dernierePeseeTerrain =
                await peseeRepository.trouverDerniere(
                    collecteId,
                    agentTerrain.organisation_id,
                    "terrain",
                    connexion
                );


            if (dernierePeseeTerrain) {

                const poidsPese =
                    Number(
                        dernierePeseeTerrain.poids_net
                    );

                if (
                    Math.abs(
                        poidsPese - poidsReel
                    ) > 0.0005
                ) {

                    throw new ApiError(
                        409,
                        "Le poids réel doit correspondre à la dernière pesée terrain. Actualisez la tournée."
                    );

                }

                poidsReel =
                    poidsPese;

            }


            const poidsEstime =
                contexte.poids_estime !==
                    null
                    ? Number(
                        contexte.poids_estime
                    )
                    : null;


            const ecartKg =
                poidsEstime !== null
                    ? Math.round(
                        (
                            poidsReel -
                            poidsEstime
                        ) *
                        1000
                    ) / 1000
                    : null;


            const ecartPourcentage =
                poidsEstime &&
                poidsEstime > 0
                    ? Math.round(
                        (
                            (
                                poidsReel -
                                poidsEstime
                            ) /
                            poidsEstime
                        ) *
                        10000
                    ) / 100
                    : null;


            const collecteMiseAJour =
                await terrainCollecteRepository
                    .enregistrerResultatTerrain(
                        collecteId,
                        poidsReel,
                        resultatTerrain,
                        motif,
                        agentTerrain
                            .utilisateur_id,
                        donnees.survenu_le,
                        connexion
                    );


            if (!collecteMiseAJour) {

                throw new ApiError(
                    404,
                    "Collecte introuvable."
                );

            }


            let evenement =
                await terrainCollecteRepository
                    .creerFinCollecte(
                        {

                            mission_id:
                                missionId,

                            collecte_id:
                                collecteId,

                            latitude:
                                gpsFourni
                                    ? Number(
                                        donnees.latitude
                                    )
                                    : null,

                            longitude:
                                gpsFourni
                                    ? Number(
                                        donnees.longitude
                                    )
                                    : null,

                            precision_gps:
                                donnees
                                    .precision_gps !==
                                    undefined &&
                                donnees
                                    .precision_gps !==
                                    null
                                    ? Number(
                                        donnees
                                            .precision_gps
                                    )
                                    : null,

                            observations:
                                donnees.observations,

                            cree_par:
                                agentTerrain
                                    .utilisateur_id,

                            operation_id:
                                donnees.operation_id,

                            survenu_le:
                                donnees.survenu_le,

                            contexte: {

                                source:
                                    "agent_pwa",

                                action:
                                    "terminer_collecte",

                                mode:
                                    donnees.mode ||
                                    "online",

                                resultat_terrain:
                                    resultatTerrain,

                                motif_terrain:
                                    motif,

                                poids_estime_kg:
                                    poidsEstime,

                                poids_reel_kg:
                                    poidsReel,

                                ecart_kg:
                                    ecartKg,

                                ecart_pourcentage:
                                    ecartPourcentage,

                                ordre_collecte:
                                    contexte
                                        .ordre_collecte,

                                demarrage_operation_id:
                                    debut
                                        .operation_id ||
                                    null

                            }

                        },
                        connexion
                    );


            if (!evenement) {

                evenement =
                    await terrainCollecteRepository
                        .trouverOperation(
                            donnees.operation_id,
                            agentTerrain
                                .organisation_id,
                            connexion
                        );


                await connexion.query(
                    "COMMIT"
                );


                return {

                    deja_traitee:
                        true,

                    evenement

                };

            }


            await connexion.query(
                "COMMIT"
            );


            return {

                deja_traitee:
                    false,

                collecte:
                    collecteMiseAJour,

                evenement,

                analyse: {

                    poids_estime_kg:
                        poidsEstime,

                    poids_reel_kg:
                        poidsReel,

                    ecart_kg:
                        ecartKg,

                    ecart_pourcentage:
                        ecartPourcentage

                }

            };


        } catch (erreur) {

            await connexion.query(
                "ROLLBACK"
            );

            throw erreur;


        } finally {

            connexion.release();

        }

    }

}


export default new TerrainCollecteService();
