import missionService
    from "../services/MissionService.js";

import auditService
    from "../services/AuditService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";

const obtenirOrganisationId = (
    req
) => {

    return (
        req.utilisateur.organisationId ||
        req.utilisateur.organisation_id ||
        req.utilisateur.organisation ||
        null
    );

};

const obtenirUtilisateurId = (
    req
) => {

    return (
        req.utilisateur.id ||
        req.utilisateur.utilisateur_id ||
        req.utilisateur.user_id ||
        null
    );

};

const obtenirMessageErreur = (
    erreur
) => {

    return (
        erreur.message ||
        "Une erreur est survenue."
    );

};

const obtenirActionStatut = (
    statut
) => {

    const actions = {

        en_cours:
            "MISSION_DEMARREE",

        terminee:
            "MISSION_TERMINEE",

        annulee:
            "MISSION_ANNULEE"

    };

    return (
        actions[statut] ||
        "STATUT_MISSION_MODIFIE"
    );

};

const missionController = {

    creer: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisationId =
                obtenirOrganisationId(
                    req
                );

            const utilisateurId =
                obtenirUtilisateurId(
                    req
                );

            try {

                const mission =
                    await missionService.creer(
                        organisationId,
                        utilisateurId,
                        req.body
                    );

                await auditService
                    .enregistrerDepuisRequete(
                        req,
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                utilisateurId,

                            action:
                                "MISSION_CREEE",

                            ressource:
                                "mission",

                            ressource_id:
                                mission.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                mission,

                            contexte: {

                                agent_id:
                                    mission.agent_id,

                                tricycle_id:
                                    mission.tricycle_id,

                                date_prevue:
                                    mission.date_prevue

                            },

                            succes:
                                true
                        }
                    );

                return ApiResponse.created(
                    res,
                    "Mission créée avec succès.",
                    mission
                );

            } catch (erreur) {

                await auditService
                    .enregistrerDepuisRequete(
                        req,
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                utilisateurId,

                            action:
                                "CREATION_MISSION_ECHOUEE",

                            ressource:
                                "mission",

                            ancien_etat:
                                null,

                            nouvel_etat:
                                req.body,

                            contexte: {

                                agent_id:
                                    req.body.agent_id ||
                                    null,

                                tricycle_id:
                                    req.body.tricycle_id ||
                                    null,

                                date_prevue:
                                    req.body.date_prevue ||
                                    null

                            },

                            succes:
                                false,

                            message_erreur:
                                obtenirMessageErreur(
                                    erreur
                                )
                        }
                    );

                throw erreur;

            }

        }
    ),

    lister: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisationId =
                obtenirOrganisationId(
                    req
                );

            const missions =
                await missionService
                    .listerParOrganisation(
                        organisationId
                    );

            return ApiResponse.success(
                res,
                "Missions récupérées avec succès.",
                missions
            );

        }
    ),

    modifier: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisationId =
                obtenirOrganisationId(
                    req
                );

            const utilisateurId =
                obtenirUtilisateurId(
                    req
                );

            let ancienEtat = null;

            try {

                ancienEtat =
                    await missionService
                        .trouverParId(
                            req.params.id,
                            organisationId
                        );

                const mission =
                    await missionService.modifier(
                        req.params.id,
                        organisationId,
                        req.body
                    );

                await auditService
                    .enregistrerDepuisRequete(
                        req,
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                utilisateurId,

                            action:
                                "MISSION_MODIFIEE",

                            ressource:
                                "mission",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                ancienEtat,

                            nouvel_etat:
                                mission,

                            contexte: {

                                champs_modifies:
                                    Object.keys(
                                        req.body
                                    )

                            },

                            succes:
                                true
                        }
                    );

                return ApiResponse.success(
                    res,
                    "Mission modifiée avec succès.",
                    mission
                );

            } catch (erreur) {

                await auditService
                    .enregistrerDepuisRequete(
                        req,
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                utilisateurId,

                            action:
                                "MODIFICATION_MISSION_ECHOUEE",

                            ressource:
                                "mission",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                ancienEtat,

                            nouvel_etat:
                                req.body,

                            contexte: {

                                champs_tentes:
                                    Object.keys(
                                        req.body
                                    )

                            },

                            succes:
                                false,

                            message_erreur:
                                obtenirMessageErreur(
                                    erreur
                                )
                        }
                    );

                throw erreur;

            }

        }
    ),

    modifierStatut: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisationId =
                obtenirOrganisationId(
                    req
                );

            const utilisateurId =
                obtenirUtilisateurId(
                    req
                );

            const nouveauStatut =
                req.body.statut;

            let ancienEtat = null;

            try {

                ancienEtat =
                    await missionService
                        .trouverParId(
                            req.params.id,
                            organisationId
                        );

                const mission =
                    await missionService
                        .modifierStatut(
                            req.params.id,
                            organisationId,
                            nouveauStatut
                        );

                await auditService
                    .enregistrerDepuisRequete(
                        req,
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                utilisateurId,

                            action:
                                obtenirActionStatut(
                                    nouveauStatut
                                ),

                            ressource:
                                "mission",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                ancienEtat,

                            nouvel_etat:
                                mission,

                            contexte: {

                                ancien_statut:
                                    ancienEtat
                                        ?.statut ||
                                    null,

                                nouveau_statut:
                                    nouveauStatut,

                                agent_id:
                                    mission.agent_id,

                                tricycle_id:
                                    mission.tricycle_id

                            },

                            succes:
                                true
                        }
                    );

                return ApiResponse.success(
                    res,
                    "Statut de la mission modifié avec succès.",
                    mission
                );

            } catch (erreur) {

                await auditService
                    .enregistrerDepuisRequete(
                        req,
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                utilisateurId,

                            action:
                                "MODIFICATION_STATUT_MISSION_ECHOUEE",

                            ressource:
                                "mission",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                ancienEtat,

                            nouvel_etat: {

                                statut:
                                    nouveauStatut

                            },

                            contexte: {

                                ancien_statut:
                                    ancienEtat
                                        ?.statut ||
                                    null,

                                nouveau_statut:
                                    nouveauStatut

                            },

                            succes:
                                false,

                            message_erreur:
                                obtenirMessageErreur(
                                    erreur
                                )
                        }
                    );

                throw erreur;

            }

        }
    )

};

export default missionController;