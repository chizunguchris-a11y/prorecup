import agentService
    from "../services/AgentService.js";

import auditService
    from "../services/AuditService.js";

import notificationService
    from "../services/NotificationService.js";

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

const obtenirNomAgent = (
    agent
) => {

    return (
        agent.nom ||
        agent.agent_nom ||
        agent.email ||
        "L’agent"
    );

};

const agentController = {

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

                const agent =
                    await agentService.creer(
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
                                "AGENT_CREE",

                            ressource:
                                "agent",

                            ressource_id:
                                agent.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                agent,

                            contexte: {

                                utilisateur_id_agent:
                                    agent.utilisateur_id ||
                                    req.body.utilisateur_id ||
                                    null,

                                statut:
                                    agent.statut,

                                disponible:
                                    agent.disponible

                            },

                            succes:
                                true
                        }
                    );

                await notificationService
                    .creerSilencieusement(
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                null,

                            type:
                                "information",

                            categorie:
                                "agent_cree",

                            titre:
                                "Nouvel agent créé",

                            message:
                                `${obtenirNomAgent(agent)} a été ajouté aux agents de l’organisation.`,

                            ressource:
                                "agent",

                            ressource_id:
                                agent.id,

                            lien:
                                "./agents.html",

                            contexte: {

                                utilisateur_id_agent:
                                    agent.utilisateur_id ||
                                    null,

                                statut:
                                    agent.statut,

                                cree_par:
                                    utilisateurId

                            }
                        }
                    );

                return ApiResponse.created(
                    res,
                    "Agent créé avec succès.",
                    agent
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
                                "CREATION_AGENT_ECHOUEE",

                            ressource:
                                "agent",

                            ancien_etat:
                                null,

                            nouvel_etat:
                                req.body,

                            contexte: {

                                utilisateur_id_agent:
                                    req.body.utilisateur_id ||
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

            const agents =
                await agentService
                    .listerParOrganisation(
                        obtenirOrganisationId(
                            req
                        )
                    );

            return ApiResponse.success(
                res,
                "Agents récupérés avec succès.",
                agents
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

            try {

                const agent =
                    await agentService.modifier(
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
                                "AGENT_MODIFIE",

                            ressource:
                                "agent",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                agent,

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
                    "Agent modifié avec succès.",
                    agent
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
                                "MODIFICATION_AGENT_ECHOUEE",

                            ressource:
                                "agent",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                null,

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

    listerUtilisateursDisponibles:
        asyncHandler(
            async (
                req,
                res
            ) => {

                const utilisateurs =
                    await agentService
                        .listerUtilisateursDisponibles(
                            obtenirOrganisationId(
                                req
                            )
                        );

                return ApiResponse.success(
                    res,
                    "Utilisateurs disponibles récupérés avec succès.",
                    utilisateurs
                );

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

            try {

                const agent =
                    await agentService
                        .modifierStatut(
                            req.params.id,
                            organisationId,
                            nouveauStatut
                        );

                const action =
                    nouveauStatut ===
                    "suspendu"
                        ? "AGENT_SUSPENDU"
                        : "AGENT_REACTIVE";

                await auditService
                    .enregistrerDepuisRequete(
                        req,
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                utilisateurId,

                            action,

                            ressource:
                                "agent",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                agent,

                            contexte: {

                                nouveau_statut:
                                    nouveauStatut,

                                disponible:
                                    agent.disponible

                            },

                            succes:
                                true
                        }
                    );

                const estSuspendu =
                    nouveauStatut ===
                    "suspendu";

                await notificationService
                    .creerSilencieusement(
                        {
                            organisation_id:
                                organisationId,

                            utilisateur_id:
                                null,

                            type:
                                estSuspendu
                                    ? "alerte"
                                    : "succes",

                            categorie:
                                estSuspendu
                                    ? "agent_suspendu"
                                    : "agent_reactive",

                            titre:
                                estSuspendu
                                    ? "Agent suspendu"
                                    : "Agent réactivé",

                            message:
                                estSuspendu
                                    ? `${obtenirNomAgent(agent)} a été suspendu et n’est plus disponible pour les missions.`
                                    : `${obtenirNomAgent(agent)} a été réactivé.`,

                            ressource:
                                "agent",

                            ressource_id:
                                agent.id,

                            lien:
                                "./agents.html",

                            contexte: {

                                statut:
                                    agent.statut,

                                disponible:
                                    agent.disponible,

                                modifie_par:
                                    utilisateurId

                            }
                        }
                    );

                return ApiResponse.success(
                    res,
                    "Statut de l'agent modifié avec succès.",
                    agent
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
                                "MODIFICATION_STATUT_AGENT_ECHOUEE",

                            ressource:
                                "agent",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                null,

                            nouvel_etat: {

                                statut:
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

export default agentController;