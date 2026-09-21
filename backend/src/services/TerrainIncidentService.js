import pool
    from "../config/db.js";

import terrainIncidentRepository
    from "../repositories/TerrainIncidentRepository.js";

import ApiError
    from "../utils/ApiError.js";


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


const CATEGORIES = [
    "panne_tricycle",
    "accident",
    "client_absent",
    "acces_refuse",
    "dechets_non_conformes",
    "securite",
    "autre"
];


const GRAVITES = [
    "faible",
    "moyenne",
    "elevee",
    "critique"
];


class TerrainIncidentService {

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

        const latitudePresente =
            latitude !== undefined &&
            latitude !== null;


        const longitudePresente =
            longitude !== undefined &&
            longitude !== null;


        if (
            latitudePresente !==
            longitudePresente
        ) {

            throw new ApiError(
                400,
                "La latitude et la longitude doivent être fournies ensemble."
            );

        }


        if (
            latitudePresente &&
            (
                Number.isNaN(
                    Number(latitude)
                ) ||
                Number(latitude) < -90 ||
                Number(latitude) > 90
            )
        ) {

            throw new ApiError(
                400,
                "Latitude invalide."
            );

        }


        if (
            longitudePresente &&
            (
                Number.isNaN(
                    Number(longitude)
                ) ||
                Number(longitude) < -180 ||
                Number(longitude) > 180
            )
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


    async signaler(
        missionId,
        agentTerrain,
        donnees
    ) {

        this.validerUuid(
            missionId,
            "L'identifiant de la mission"
        );


        this.validerUuid(
            donnees.operation_id,
            "L'identifiant de l'opération"
        );


        if (
            donnees.collecte_id
        ) {

            this.validerUuid(
                donnees.collecte_id,
                "L'identifiant de la collecte"
            );

        }


        const categorie =
            String(
                donnees.categorie ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            !CATEGORIES.includes(
                categorie
            )
        ) {

            throw new ApiError(
                400,
                "La catégorie de l'incident est invalide."
            );

        }


        const gravite =
            String(
                donnees.gravite ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            !GRAVITES.includes(
                gravite
            )
        ) {

            throw new ApiError(
                400,
                "La gravité de l'incident est invalide."
            );

        }


        const description =
            String(
                donnees.description ||
                ""
            )
                .trim();


        if (
            description.length < 5
        ) {

            throw new ApiError(
                400,
                "La description de l'incident est obligatoire."
            );

        }


        if (!donnees.survenu_le) {

            throw new ApiError(
                400,
                "La date réelle de l'incident est obligatoire."
            );

        }


        const dateIncident =
            new Date(
                donnees.survenu_le
            );


        if (
            Number.isNaN(
                dateIncident.getTime()
            )
        ) {

            throw new ApiError(
                400,
                "La date réelle de l'incident est invalide."
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


            const mission =
                await terrainIncidentRepository
                    .trouverMission(
                        missionId,
                        agentTerrain.agent_id,
                        agentTerrain
                            .organisation_id,
                        connexion
                    );


            if (!mission) {

                throw new ApiError(
                    404,
                    "Mission introuvable ou non affectée à cet agent."
                );

            }


            /*
             * IDEMPOTENCE AVANT LE CONTROLE
             * DU STATUT.
             *
             * Si le téléphone renvoie plus tard
             * le même incident après la fin de
             * la mission, il doit toujours recevoir
             * un succès.
             */
            const operationExistante =
                await terrainIncidentRepository
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
                        .type_evenement !==
                        "incident_signale" ||
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

                    incident:
                        operationExistante

                };

            }


            if (
                mission.statut !==
                "en_cours"
            ) {

                throw new ApiError(
                    409,
                    "Un incident terrain ne peut être signalé que pendant une mission en cours."
                );

            }


            let collecte =
                null;


            if (
                donnees.collecte_id
            ) {

                collecte =
                    await terrainIncidentRepository
                        .trouverCollecteMission(
                            missionId,
                            donnees.collecte_id,
                            connexion
                        );


                if (!collecte) {

                    throw new ApiError(
                        404,
                        "Cette collecte n'appartient pas à la mission."
                    );

                }

            }


            const bloquant =
                donnees.bloquant === true;


            let incident =
                await terrainIncidentRepository
                    .creerIncident(
                        {

                            mission_id:
                                missionId,

                            collecte_id:
                                donnees.collecte_id ||
                                null,

                            latitude:
                                donnees.latitude !==
                                    undefined &&
                                donnees.latitude !==
                                    null
                                    ? Number(
                                        donnees.latitude
                                    )
                                    : null,

                            longitude:
                                donnees.longitude !==
                                    undefined &&
                                donnees.longitude !==
                                    null
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
                                        donnees
                                            .precision_gps
                                    )
                                    : null,

                            description,

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
                                    "signaler_incident",

                                mode:
                                    donnees.mode ||
                                    "online",

                                categorie,

                                gravite,

                                bloquant,

                                agent_id:
                                    agentTerrain
                                        .agent_id,

                                tricycle_id:
                                    mission
                                        .tricycle_id,

                                collecte_id:
                                    donnees
                                        .collecte_id ||
                                    null,

                                ordre_collecte:
                                    collecte
                                        ?.ordre_collecte ||
                                    null

                            }

                        },
                        connexion
                    );


            if (!incident) {

                incident =
                    await terrainIncidentRepository
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

                    incident

                };

            }


            await connexion.query(
                "COMMIT"
            );


            return {

                deja_traitee:
                    false,

                incident,

                alerte: {

                    categorie,

                    gravite,

                    bloquant

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


export default new TerrainIncidentService();