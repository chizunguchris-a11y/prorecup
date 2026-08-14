import tricycleService
    from "../services/TricycleService.js";

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

const obtenirNumeroTricycle = (
    tricycle
) => {

    return (
        tricycle.numero_interne ||
        tricycle.tricycle_numero ||
        tricycle.plaque_identification ||
        "Le tricycle"
    );

};

const statutEstIndisponible = (
    statut
) => {

    return [
        "indisponible",
        "maintenance",
        "en_panne",
        "hors_service"
    ].includes(
        statut
    );

};

const tricycleController = {

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

                const tricycle =
                    await tricycleService.creer(
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
                                "TRICYCLE_CREE",

                            ressource:
                                "tricycle",

                            ressource_id:
                                tricycle.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                tricycle,

                            contexte: {

                                numero:
                                    obtenirNumeroTricycle(
                                        tricycle
                                    ),

                                statut:
                                    tricycle.statut,

                                etat:
                                    tricycle.etat

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
                                "tricycle_cree",

                            titre:
                                "Nouveau tricycle enregistré",

                            message:
                                `${obtenirNumeroTricycle(tricycle)} a été ajouté au parc de tricycles.`,

                            ressource:
                                "tricycle",

                            ressource_id:
                                tricycle.id,

                            lien:
                                "./tricycles.html",

                            contexte: {

                                statut:
                                    tricycle.statut,

                                etat:
                                    tricycle.etat,

                                cree_par:
                                    utilisateurId

                            }
                        }
                    );

                return ApiResponse.created(
                    res,
                    "Tricycle créé avec succès.",
                    tricycle
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
                                "CREATION_TRICYCLE_ECHOUEE",

                            ressource:
                                "tricycle",

                            ancien_etat:
                                null,

                            nouvel_etat:
                                req.body,

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

            const tricycles =
                await tricycleService
                    .listerParOrganisation(
                        obtenirOrganisationId(
                            req
                        )
                    );

            return ApiResponse.success(
                res,
                "Tricycles récupérés avec succès.",
                tricycles
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

                const tricycle =
                    await tricycleService.modifier(
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
                                "TRICYCLE_MODIFIE",

                            ressource:
                                "tricycle",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                tricycle,

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
                    "Tricycle modifié avec succès.",
                    tricycle
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
                                "MODIFICATION_TRICYCLE_ECHOUEE",

                            ressource:
                                "tricycle",

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

                const tricycle =
                    await tricycleService
                        .modifierStatut(
                            req.params.id,
                            organisationId,
                            nouveauStatut
                        );

                const indisponible =
                    statutEstIndisponible(
                        nouveauStatut
                    );

                const action =
                    indisponible
                        ? "TRICYCLE_INDISPONIBLE"
                        : "TRICYCLE_REMIS_EN_SERVICE";

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
                                "tricycle",

                            ressource_id:
                                req.params.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                tricycle,

                            contexte: {

                                nouveau_statut:
                                    nouveauStatut,

                                etat:
                                    tricycle.etat

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
                                indisponible
                                    ? "alerte"
                                    : "succes",

                            categorie:
                                indisponible
                                    ? "tricycle_indisponible"
                                    : "tricycle_remis_en_service",

                            titre:
                                indisponible
                                    ? "Tricycle indisponible"
                                    : "Tricycle remis en service",

                            message:
                                indisponible
                                    ? `${obtenirNumeroTricycle(tricycle)} est maintenant indisponible. Statut : ${nouveauStatut}.`
                                    : `${obtenirNumeroTricycle(tricycle)} est de nouveau disponible.`,

                            ressource:
                                "tricycle",

                            ressource_id:
                                tricycle.id,

                            lien:
                                "./tricycles.html",

                            contexte: {

                                statut:
                                    tricycle.statut,

                                etat:
                                    tricycle.etat,

                                modifie_par:
                                    utilisateurId

                            }
                        }
                    );

                return ApiResponse.success(
                    res,
                    "Statut du tricycle modifié avec succès.",
                    tricycle
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
                                "MODIFICATION_STATUT_TRICYCLE_ECHOUEE",

                            ressource:
                                "tricycle",

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

export default tricycleController;