import collecteService
    from "../services/CollecteService.js";

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

const collecteController = {

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

            const donneesCollecte = {

                ...req.body,

                agent_id:
                    utilisateurId

            };

            try {

                const collecte =
                    await collecteService.creer(
                        donneesCollecte
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
                                "COLLECTE_CREEE",

                            ressource:
                                "collecte",

                            ressource_id:
                                collecte.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                collecte,

                            contexte: {

                                site_id:
                                    collecte.site_id,

                                client_id:
                                    collecte.client_id,

                                type_dechet_id:
                                    collecte.type_dechet_id,

                                poids_estime:
                                    collecte.poids_estime,

                                statut:
                                    collecte.statut

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
                                "alerte",

                            categorie:
                                "collecte_creee",

                            titre:
                                "Nouvelle collecte à planifier",

                            message:
                                "Une nouvelle collecte de " +
                                collecte.poids_estime +
                                " kg a été enregistrée et doit être planifiée.",

                            ressource:
                                "collecte",

                            ressource_id:
                                collecte.id,

                            lien:
                                "./collectes.html",

                            contexte: {

                                site_id:
                                    collecte.site_id,

                                client_id:
                                    collecte.client_id,

                                type_dechet_id:
                                    collecte.type_dechet_id,

                                poids_estime:
                                    collecte.poids_estime,

                                cree_par:
                                    utilisateurId

                            }
                        }
                    );

                return ApiResponse.created(
                    res,
                    "Collecte enregistrée avec succès.",
                    collecte
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
                                "CREATION_COLLECTE_ECHOUEE",

                            ressource:
                                "collecte",

                            ancien_etat:
                                null,

                            nouvel_etat:
                                donneesCollecte,

                            contexte: {

                                site_id:
                                    donneesCollecte
                                        .site_id ||
                                    null,

                                client_id:
                                    donneesCollecte
                                        .client_id ||
                                    null,

                                type_dechet_id:
                                    donneesCollecte
                                        .type_dechet_id ||
                                    null,

                                poids_estime:
                                    donneesCollecte
                                        .poids_estime ||
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

            const collectes =
                await collecteService
                    .listerParOrganisation(
                        organisationId
                    );

            return ApiResponse.success(
                res,
                "Collectes récupérées avec succès.",
                collectes
            );

        }
    ),

    valider: asyncHandler(
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
                    await collecteService
                        .trouverParIdPourOrganisation(
                            req.params.id,
                            organisationId
                        );

                const collecte =
                    await collecteService.valider(
                        req.params.id,
                        organisationId
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
                                "COLLECTE_VALIDEE",

                            ressource:
                                "collecte",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                ancienEtat,

                            nouvel_etat:
                                collecte,

                            contexte: {

                                ancien_statut:
                                    ancienEtat
                                        ?.statut ||
                                    null,

                                nouveau_statut:
                                    collecte.statut,

                                poids_estime:
                                    collecte.poids_estime,

                                site_id:
                                    collecte.site_id,

                                client_id:
                                    collecte.client_id

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
                                "succes",

                            categorie:
                                "collecte_validee",

                            titre:
                                "Collecte validée",

                            message:
                                "La collecte de " +
                                collecte.poids_estime +
                                " kg a été validée avec succès.",

                            ressource:
                                "collecte",

                            ressource_id:
                                collecte.id,

                            lien:
                                "./collectes.html",

                            contexte: {

                                ancien_statut:
                                    ancienEtat
                                        ?.statut ||
                                    null,

                                nouveau_statut:
                                    collecte.statut,

                                valide_par:
                                    utilisateurId

                            }
                        }
                    );

                return ApiResponse.success(
                    res,
                    "Collecte validée avec succès.",
                    collecte
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
                                "VALIDATION_COLLECTE_ECHOUEE",

                            ressource:
                                "collecte",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                ancienEtat,

                            nouvel_etat: {

                                statut:
                                    "valide"

                            },

                            contexte: {

                                ancien_statut:
                                    ancienEtat
                                        ?.statut ||
                                    null,

                                nouveau_statut:
                                    "valide"

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

export default collecteController;