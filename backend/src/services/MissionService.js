import pool
    from "../config/db.js";

import missionRepository
    from "../repositories/MissionRepository.js";

import missionEvenementRepository
    from "../repositories/MissionEvenementRepository.js";

import ApiError
    from "../utils/ApiError.js";

class MissionService {

    validerDonnees(
        mission
    ) {

        if (!mission.agent_id) {

            throw new ApiError(
                400,
                "L'agent est obligatoire."
            );

        }

        if (!mission.tricycle_id) {

            throw new ApiError(
                400,
                "Le tricycle est obligatoire."
            );

        }

        if (!mission.date_prevue) {

            throw new ApiError(
                400,
                "La date prévue est obligatoire."
            );

        }

        if (
            mission.heure_depart_prevue &&
            mission.heure_retour_prevue &&
            mission.heure_retour_prevue <=
                mission.heure_depart_prevue
        ) {

            throw new ApiError(
                400,
                "L'heure de retour prévue doit être postérieure à l'heure de départ."
            );

        }

    }

    verifierAgent(
        agent,
        verifierDisponibilite = true
    ) {

        if (!agent) {

            throw new ApiError(
                404,
                "Agent introuvable dans votre organisation."
            );

        }

        if (
            agent.statut !==
            "actif"
        ) {

            throw new ApiError(
                409,
                "Seul un agent actif peut être affecté à une mission."
            );

        }

        if (
            verifierDisponibilite &&
            agent.disponible !== true
        ) {

            throw new ApiError(
                409,
                "Cet agent n'est pas disponible."
            );

        }

    }

    verifierTricycle(
        tricycle,
        verifierDisponibilite = true
    ) {

        if (!tricycle) {

            throw new ApiError(
                404,
                "Tricycle introuvable dans votre organisation."
            );

        }

        if (
            tricycle.etat ===
            "mauvais"
        ) {

            throw new ApiError(
                409,
                "Un tricycle en mauvais état ne peut pas être affecté à une mission."
            );

        }

        if (
            verifierDisponibilite &&
            tricycle.statut !==
                "disponible"
        ) {

            throw new ApiError(
                409,
                "Ce tricycle n'est pas disponible."
            );

        }

    }

    async verifierConflits(
        agentId,
        tricycleId,
        datePrevue,
        missionIgnoreeId,
        connexion
    ) {

        const conflitAgent =
            await missionRepository
                .existeConflitAgent(
                    agentId,
                    datePrevue,
                    missionIgnoreeId,
                    connexion
                );

        if (conflitAgent) {

            throw new ApiError(
                409,
                "Cet agent possède déjà une mission planifiée à cette date."
            );

        }

        const conflitTricycle =
            await missionRepository
                .existeConflitTricycle(
                    tricycleId,
                    datePrevue,
                    missionIgnoreeId,
                    connexion
                );

        if (conflitTricycle) {

            throw new ApiError(
                409,
                "Ce tricycle est déjà affecté à une mission à cette date."
            );

        }

    }

    async creer(
        organisationId,
        utilisateurId,
        donnees
    ) {

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        if (!utilisateurId) {

            throw new ApiError(
                400,
                "L'utilisateur créateur est obligatoire."
            );

        }

        this.validerDonnees(
            donnees
        );

        const connexion =
            await pool.connect();

        try {

            await connexion.query(
                "BEGIN"
            );

            const agent =
                await missionRepository
                    .trouverAgentPourMiseAJour(
                        donnees.agent_id,
                        organisationId,
                        connexion
                    );

            this.verifierAgent(
                agent
            );

            const tricycle =
                await missionRepository
                    .trouverTricyclePourMiseAJour(
                        donnees.tricycle_id,
                        organisationId,
                        connexion
                    );

            this.verifierTricycle(
                tricycle
            );

            await this.verifierConflits(
                donnees.agent_id,
                donnees.tricycle_id,
                donnees.date_prevue,
                null,
                connexion
            );

            const mission =
                await missionRepository.creer(
                    {
                        organisation_id:
                            organisationId,

                        agent_id:
                            donnees.agent_id,

                        tricycle_id:
                            donnees.tricycle_id,

                        date_prevue:
                            donnees.date_prevue,

                        heure_depart_prevue:
                            donnees
                                .heure_depart_prevue,

                        heure_retour_prevue:
                            donnees
                                .heure_retour_prevue,

                        statut:
                            "planifiee",

                        observations:
                            donnees.observations,

                        cree_par:
                            utilisateurId
                    },
                    connexion
                );

            await connexion.query(
                "COMMIT"
            );

            return mission;

        } catch (erreur) {

            await connexion.query(
                "ROLLBACK"
            );

            throw erreur;

        } finally {

            connexion.release();

        }

    }

    async listerParOrganisation(
        organisationId
    ) {

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        return missionRepository
            .listerParOrganisation(
                organisationId
            );

    }

    async trouverParId(
        missionId,
        organisationId
    ) {

        if (!missionId) {

            throw new ApiError(
                400,
                "L'identifiant de la mission est obligatoire."
            );

        }

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        return missionRepository
            .trouverParIdPourOrganisation(
                missionId,
                organisationId
            );

    }

    async modifier(
        missionId,
        organisationId,
        donnees
    ) {

        if (!missionId) {

            throw new ApiError(
                400,
                "L'identifiant de la mission est obligatoire."
            );

        }

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        const connexion =
            await pool.connect();

        try {

            await connexion.query(
                "BEGIN"
            );

            const missionExistante =
                await missionRepository
                    .trouverParIdPourOrganisation(
                        missionId,
                        organisationId,
                        connexion,
                        true
                    );

            if (!missionExistante) {

                throw new ApiError(
                    404,
                    "Mission introuvable."
                );

            }

            if (
                missionExistante.statut !==
                "planifiee"
            ) {

                throw new ApiError(
                    409,
                    "Seule une mission planifiée peut être modifiée."
                );

            }

            const missionModifiee = {

                agent_id:
                    donnees.agent_id ||
                    missionExistante.agent_id,

                tricycle_id:
                    donnees.tricycle_id ||
                    missionExistante
                        .tricycle_id,

                date_prevue:
                    donnees.date_prevue ||
                    missionExistante
                        .date_prevue,

                heure_depart_prevue:
                    donnees
                        .heure_depart_prevue !==
                    undefined
                        ? donnees
                            .heure_depart_prevue
                        : missionExistante
                            .heure_depart_prevue,

                heure_retour_prevue:
                    donnees
                        .heure_retour_prevue !==
                    undefined
                        ? donnees
                            .heure_retour_prevue
                        : missionExistante
                            .heure_retour_prevue,

                observations:
                    donnees.observations !==
                    undefined
                        ? donnees.observations
                        : missionExistante
                            .observations

            };

            this.validerDonnees(
                missionModifiee
            );

            const agent =
                await missionRepository
                    .trouverAgentPourMiseAJour(
                        missionModifiee
                            .agent_id,
                        organisationId,
                        connexion
                    );

            const changementAgent =
                missionModifiee.agent_id !==
                missionExistante.agent_id;

            this.verifierAgent(
                agent,
                changementAgent
            );

            const tricycle =
                await missionRepository
                    .trouverTricyclePourMiseAJour(
                        missionModifiee
                            .tricycle_id,
                        organisationId,
                        connexion
                    );

            const changementTricycle =
                missionModifiee
                    .tricycle_id !==
                missionExistante
                    .tricycle_id;

            this.verifierTricycle(
                tricycle,
                changementTricycle
            );

            await this.verifierConflits(
                missionModifiee.agent_id,
                missionModifiee.tricycle_id,
                missionModifiee.date_prevue,
                missionId,
                connexion
            );

            const mission =
                await missionRepository.modifier(
                    missionId,
                    organisationId,
                    missionModifiee,
                    connexion
                );

            if (!mission) {

                throw new ApiError(
                    404,
                    "Mission introuvable."
                );

            }

            await connexion.query(
                "COMMIT"
            );

            return mission;

        } catch (erreur) {

            await connexion.query(
                "ROLLBACK"
            );

            throw erreur;

        } finally {

            connexion.release();

        }

    }

    async modifierStatut(
        missionId,
        organisationId,
        nouveauStatut
    ) {

        if (!missionId) {

            throw new ApiError(
                400,
                "L'identifiant de la mission est obligatoire."
            );

        }

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        const statutsAutorises = [
            "en_cours",
            "terminee",
            "annulee"
        ];

        if (
            !statutsAutorises.includes(
                nouveauStatut
            )
        ) {

            throw new ApiError(
                400,
                "Le nouveau statut de la mission est invalide."
            );

        }

        const connexion =
            await pool.connect();

        try {

            await connexion.query(
                "BEGIN"
            );

            const mission =
                await missionRepository
                    .trouverParIdPourOrganisation(
                        missionId,
                        organisationId,
                        connexion,
                        true
                    );

            if (!mission) {

                throw new ApiError(
                    404,
                    "Mission introuvable."
                );

            }

            const transitions = {

                planifiee: [
                    "en_cours",
                    "annulee"
                ],

                en_cours: [
                    "terminee",
                    "annulee"
                ],

                terminee: [],

                annulee: []

            };

            const transitionsAutorisees =
                transitions[
                    mission.statut
                ] || [];

            if (
                !transitionsAutorisees
                    .includes(
                        nouveauStatut
                    )
            ) {

                throw new ApiError(
                    409,
                    `La transition de ${mission.statut} vers ${nouveauStatut} n'est pas autorisée.`
                );

            }

            const agent =
                await missionRepository
                    .trouverAgentPourMiseAJour(
                        mission.agent_id,
                        organisationId,
                        connexion
                    );

            if (!agent) {

                throw new ApiError(
                    404,
                    "Agent associé à la mission introuvable."
                );

            }

            const tricycle =
                await missionRepository
                    .trouverTricyclePourMiseAJour(
                        mission.tricycle_id,
                        organisationId,
                        connexion
                    );

            if (!tricycle) {

                throw new ApiError(
                    404,
                    "Tricycle associé à la mission introuvable."
                );

            }

            if (
                nouveauStatut ===
                "en_cours"
            ) {

                this.verifierAgent(
                    agent
                );

                this.verifierTricycle(
                    tricycle
                );

                await missionRepository
                    .modifierDisponibiliteAgent(
                        agent.id,
                        false,
                        connexion
                    );

                await missionRepository
                    .modifierStatutTricycle(
                        tricycle.id,
                        "en_mission",
                        connexion
                    );

            }

            if (
                nouveauStatut ===
                    "terminee" ||
                nouveauStatut ===
                    "annulee"
            ) {

                const agentDisponible =
                    agent.statut ===
                    "actif";

                await missionRepository
                    .modifierDisponibiliteAgent(
                        agent.id,
                        agentDisponible,
                        connexion
                    );

                const statutTricycle =
                    tricycle.etat ===
                    "mauvais"
                        ? "en_panne"
                        : "disponible";

                await missionRepository
                    .modifierStatutTricycle(
                        tricycle.id,
                        statutTricycle,
                        connexion
                    );

            }

            const missionMiseAJour =
                await missionRepository
                    .modifierStatut(
                        missionId,
                        organisationId,
                        nouveauStatut,
                        connexion
                    );

            if (!missionMiseAJour) {

                throw new ApiError(
                    404,
                    "Mission introuvable."
                );

            }

if (nouveauStatut === "terminee") {

    await missionEvenementRepository.creer(
        {
            mission_id: missionId,
            collecte_id: null,
            type_evenement: "mission_terminee",
            observations: "Mission terminée",
            cree_par: mission.cree_par
        },
        connexion
    );

}

            await connexion.query(
                "COMMIT"
            );

            return missionMiseAJour;

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

export default new MissionService();