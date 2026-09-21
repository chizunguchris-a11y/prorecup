import pool
    from "../config/db.js";

import terrainMissionRepository
    from "../repositories/TerrainMissionRepository.js";

import ApiError
    from "../utils/ApiError.js";


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


class TerrainMissionService {

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


    async demarrer(
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


        if (!donnees.survenu_le) {

            throw new ApiError(
                400,
                "La date réelle de l'action est obligatoire."
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
                "La date réelle de l'action est invalide."
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
             * Verrouillage de la mission,
             * de l'agent et du tricycle.
             *
             * La requête impose aussi :
             * mission.agent_id =
             * agent actuellement connecté.
             */
            const mission =
                await terrainMissionRepository
                    .trouverMissionPourDemarrage(
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
             * Vérification idempotente APRÈS
             * le verrouillage.
             *
             * Cela protège aussi contre deux
             * requêtes simultanées identiques.
             */
            const operationExistante =
                await terrainMissionRepository
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

                    mission,

                    evenement:
                        operationExistante

                };

            }


            if (
                mission.statut !==
                "planifiee"
            ) {

                throw new ApiError(
                    409,
                    "Seule une mission planifiée peut être démarrée."
                );

            }


            if (
                mission.agent_statut !==
                "actif"
            ) {

                throw new ApiError(
                    409,
                    "Le profil Agent n'est pas actif."
                );

            }


            if (
                mission.agent_disponible !==
                true
            ) {

                throw new ApiError(
                    409,
                    "L'agent n'est pas disponible."
                );

            }


            if (
                mission.tricycle_etat ===
                "mauvais"
            ) {

                throw new ApiError(
                    409,
                    "Le tricycle affecté est en mauvais état."
                );

            }


            if (
                mission.tricycle_statut !==
                "disponible"
            ) {

                throw new ApiError(
                    409,
                    "Le tricycle affecté n'est pas disponible."
                );

            }


            const nombreCollectes =
                await terrainMissionRepository
                    .compterCollectesMission(
                        missionId,
                        connexion
                    );


            if (
                nombreCollectes <= 0
            ) {

                throw new ApiError(
                    409,
                    "La mission ne contient aucune collecte."
                );

            }


            await terrainMissionRepository
                .rendreAgentIndisponible(
                    agentTerrain.agent_id,
                    connexion
                );


            await terrainMissionRepository
                .mettreTricycleEnMission(
                    mission.tricycle_id,
                    connexion
                );


            const missionDemarree =
                await terrainMissionRepository
                    .demarrerMission(
                        missionId,
                        agentTerrain
                            .organisation_id,
                        donnees.survenu_le,
                        connexion
                    );


            const evenement =
                await terrainMissionRepository
                    .creerEvenementDemarrage(
                        {

                            mission_id:
                                missionId,

                            latitude:
                                donnees.latitude,

                            longitude:
                                donnees.longitude,

                            precision_gps:
                                donnees
                                    .precision_gps,

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

                            contexte: {

                                source:
                                    "agent_pwa",

                                action:
                                    "demarrer_mission",

                                mode:
                                    donnees.mode ||
                                    "online"

                            }

                        },
                        connexion
                    );


            await connexion.query(
                "COMMIT"
            );


            return {

                deja_traitee:
                    false,

                mission:
                    missionDemarree,

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

    async terminer(
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


        if (!donnees.survenu_le) {

            throw new ApiError(
                400,
                "La date réelle de fin de mission est obligatoire."
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
                "La date réelle de fin de mission est invalide."
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


            /*
             * Verrouillage :
             * mission + agent + tricycle.
             *
             * Et surtout la mission doit appartenir
             * à l'agent connecté.
             */
            const mission =
                await terrainMissionRepository
                    .trouverMissionPourFin(
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
             * IDEMPOTENCE.
             *
             * Important : nous testons ceci AVANT
             * de rejeter une mission déjà terminée.
             *
             * Ainsi un téléphone qui renvoie exactement
             * la même opération après perte réseau
             * reçoit bien un succès.
             */
            const operationExistante =
                await terrainMissionRepository
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
                        "mission_terminee" ||
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

                    mission,

                    evenement:
                        operationExistante

                };

            }


            if (
                mission.statut !==
                "en_cours"
            ) {

                throw new ApiError(
                    409,
                    "Seule une mission en cours peut être terminée."
                );

            }


            /*
             * La mission doit réellement avoir démarré.
             */
            if (
                !mission.heure_depart_reelle
            ) {

                throw new ApiError(
                    409,
                    "La mission ne possède aucune heure réelle de départ."
                );

            }


            const dateDepart =
                new Date(
                    mission
                        .heure_depart_reelle
                );


            if (
                dateFin.getTime() <
                dateDepart.getTime()
            ) {

                throw new ApiError(
                    409,
                    "La fin de mission ne peut pas être antérieure à son départ."
                );

            }


            /*
             * Aucune collecte ne peut rester ouverte.
             */
            const nombreNonTerminees =
                await terrainMissionRepository
                    .compterCollectesNonTerminees(
                        missionId,
                        connexion
                    );


            if (
                nombreNonTerminees > 0
            ) {

                throw new ApiError(
                    409,
                    `Impossible de terminer la mission : ${nombreNonTerminees} collecte(s) ne sont pas encore terminée(s).`
                );

            }


            /*
             * Libérer les ressources.
             */
            const agent =
                await terrainMissionRepository
                    .rendreAgentDisponible(
                        agentTerrain.agent_id,
                        connexion
                    );


            if (!agent) {

                throw new ApiError(
                    409,
                    "L'agent ne peut pas être rendu disponible."
                );

            }


            const tricycle =
                await terrainMissionRepository
                    .libererTricycle(
                        mission.tricycle_id,
                        mission.tricycle_etat,
                        connexion
                    );


            if (!tricycle) {

                throw new ApiError(
                    409,
                    "Le tricycle ne peut pas être libéré."
                );

            }


            const missionTerminee =
                await terrainMissionRepository
                    .terminerMission(
                        missionId,
                        agentTerrain
                            .organisation_id,
                        donnees.survenu_le,
                        connexion
                    );


            if (!missionTerminee) {

                throw new ApiError(
                    404,
                    "Mission introuvable."
                );

            }


            let evenement =
                await terrainMissionRepository
                    .creerEvenementFinMission(
                        {

                            mission_id:
                                missionId,

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
                                    "terminer_mission",

                                mode:
                                    donnees.mode ||
                                    "online",

                                agent_id:
                                    agentTerrain
                                        .agent_id,

                                tricycle_id:
                                    mission
                                        .tricycle_id,

                                tricycle_statut_apres:
                                    tricycle
                                        .statut

                            }

                        },
                        connexion
                    );


            /*
             * Protection contre deux requêtes
             * strictement simultanées.
             */
            if (!evenement) {

                evenement =
                    await terrainMissionRepository
                        .trouverOperation(
                            donnees.operation_id,
                            agentTerrain
                                .organisation_id,
                            connexion
                        );

            }


            await connexion.query(
                "COMMIT"
            );


            return {

                deja_traitee:
                    false,

                mission:
                    missionTerminee,

                agent: {

                    id:
                        agent.id,

                    disponible:
                        agent.disponible,

                    statut:
                        agent.statut

                },

                tricycle: {

                    id:
                        tricycle.id,

                    statut:
                        tricycle.statut,

                    etat:
                        tricycle.etat

                },

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

}


export default new TerrainMissionService();