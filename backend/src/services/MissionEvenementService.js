import pool from "../config/db.js";

import missionEvenementRepository
    from "../repositories/MissionEvenementRepository.js";

import ApiError
    from "../utils/ApiError.js";

class MissionEvenementService {

    validerCoordonnees(
        latitude,
        longitude,
        precisionGps
    ) {

        if (
            latitude !== undefined &&
            (
                Number(latitude) < -90 ||
                Number(latitude) > 90
            )
        ) {
            throw new ApiError(
                400,
                "La latitude doit être comprise entre -90 et 90."
            );
        }

        if (
            longitude !== undefined &&
            (
                Number(longitude) < -180 ||
                Number(longitude) > 180
            )
        ) {
            throw new ApiError(
                400,
                "La longitude doit être comprise entre -180 et 180."
            );
        }

        if (
            precisionGps !== undefined &&
            Number(precisionGps) < 0
        ) {
            throw new ApiError(
                400,
                "La précision GPS ne peut pas être négative."
            );
        }

    }

    async creer(
        missionId,
        organisationId,
        utilisateurId,
        donnees
    ) {

        const typesAutorises = [
            "mission_demarree",
            "position_enregistree",
            "arrivee_site",
            "collecte_demarree",
            "collecte_terminee",
            "incident_signale",
            "mission_terminee"
        ];

        if (
            !typesAutorises.includes(
                donnees.type_evenement
            )
        ) {
            throw new ApiError(
                400,
                "Le type d'événement est invalide."
            );
        }

        this.validerCoordonnees(
            donnees.latitude,
            donnees.longitude,
            donnees.precision_gps
        );

        const connexion =
            await pool.connect();

        try {

            await connexion.query("BEGIN");

            const mission =
                await missionEvenementRepository
                    .trouverMissionParIdPourOrganisation(
                        missionId,
                        organisationId,
                        connexion
                    );

            if (!mission) {
                throw new ApiError(
                    404,
                    "Mission introuvable."
                );
            }

            const typesExigeantMissionEnCours = [
                "position_enregistree",
                "arrivee_site",
                "collecte_demarree",
                "collecte_terminee",
                "incident_signale"
            ];

            if (
                donnees.type_evenement ===
                    "mission_demarree" &&
                mission.statut !== "en_cours"
            ) {
                throw new ApiError(
                    409,
                    "La mission doit être en cours pour enregistrer son démarrage."
                );
            }

            if (
                donnees.type_evenement ===
                    "mission_terminee" &&
                mission.statut !== "terminee"
            ) {
                throw new ApiError(
                    409,
                    "La mission doit être terminée pour enregistrer cet événement."
                );
            }

            if (
                typesExigeantMissionEnCours.includes(
                    donnees.type_evenement
                ) &&
                mission.statut !== "en_cours"
            ) {
                throw new ApiError(
                    409,
                    "Cet événement ne peut être enregistré que pendant une mission en cours."
                );
            }

            const typesExigeantCollecte = [
                "arrivee_site",
                "collecte_demarree",
                "collecte_terminee"
            ];

            if (
                typesExigeantCollecte.includes(
                    donnees.type_evenement
                ) &&
                !donnees.collecte_id
            ) {
                throw new ApiError(
                    400,
                    "La collecte est obligatoire pour cet événement."
                );
            }

            if (donnees.collecte_id) {

                const collecte =
                    await missionEvenementRepository
                        .trouverCollecteAssociee(
                            missionId,
                            donnees.collecte_id,
                            organisationId,
                            connexion
                        );

                if (!collecte) {
                    throw new ApiError(
                        404,
                        "Cette collecte n'est pas associée à la mission."
                    );
                }

            }

            const typesExigeantPosition = [
                "position_enregistree",
                "arrivee_site"
            ];

            if (
                typesExigeantPosition.includes(
                    donnees.type_evenement
                ) &&
                (
                    donnees.latitude === undefined ||
                    donnees.longitude === undefined
                )
            ) {
                throw new ApiError(
                    400,
                    "La latitude et la longitude sont obligatoires pour cet événement."
                );
            }

            const typesUniquesMission = [
                "mission_demarree",
                "mission_terminee"
            ];

            if (
                typesUniquesMission.includes(
                    donnees.type_evenement
                )
            ) {

                const evenementExistant =
                    await missionEvenementRepository
                        .trouverEvenementMissionParType(
                            missionId,
                            donnees.type_evenement,
                            connexion
                        );

                if (evenementExistant) {
                    throw new ApiError(
                        409,
                        "Cet événement existe déjà pour la mission."
                    );
                }

            }

            const typesUniquesCollecte = [
                "arrivee_site",
                "collecte_demarree",
                "collecte_terminee"
            ];

            if (
                typesUniquesCollecte.includes(
                    donnees.type_evenement
                )
            ) {

                const evenementExistant =
                    await missionEvenementRepository
                        .trouverEvenementCollecteParType(
                            missionId,
                            donnees.collecte_id,
                            donnees.type_evenement,
                            connexion
                        );

                if (evenementExistant) {
                    throw new ApiError(
                        409,
                        "Cet événement existe déjà pour cette collecte."
                    );
                }

            }

            if (
                donnees.type_evenement ===
                "collecte_terminee"
            ) {

                const debutCollecte =
                    await missionEvenementRepository
                        .trouverEvenementCollecteParType(
                            missionId,
                            donnees.collecte_id,
                            "collecte_demarree",
                            connexion
                        );

                if (!debutCollecte) {
                    throw new ApiError(
                        409,
                        "La collecte doit être démarrée avant d'être terminée."
                    );
                }

            }

            const evenement =
                await missionEvenementRepository.creer(
                    {
                        mission_id:
                            missionId,

                        collecte_id:
                            donnees.collecte_id,

                        type_evenement:
                            donnees.type_evenement,

                        latitude:
                            donnees.latitude !== undefined
                                ? Number(
                                    donnees.latitude
                                )
                                : undefined,

                        longitude:
                            donnees.longitude !== undefined
                                ? Number(
                                    donnees.longitude
                                )
                                : undefined,

                        precision_gps:
                            donnees.precision_gps !== undefined
                                ? Number(
                                    donnees.precision_gps
                                )
                                : undefined,

                        observations:
                            donnees.observations,

                        cree_par:
                            utilisateurId
                    },
                    connexion
                );

            await connexion.query("COMMIT");

            return evenement;

        } catch (erreur) {

            await connexion.query("ROLLBACK");

            throw erreur;

        } finally {

            connexion.release();

        }

    }

    async lister(
        missionId,
        organisationId
    ) {

        const mission =
            await missionEvenementRepository
                .trouverMissionParIdPourOrganisation(
                    missionId,
                    organisationId
                );

        if (!mission) {
            throw new ApiError(
                404,
                "Mission introuvable."
            );
        }

        return await missionEvenementRepository
            .listerParMission(
                missionId,
                organisationId
            );

    }

}

export default new MissionEvenementService();