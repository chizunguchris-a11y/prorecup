import utilisateurService
    from "../services/utilisateurService.js";

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
        req.utilisateur?.organisationId ||
        req.utilisateur?.organisation_id ||
        req.utilisateur?.organisation ||
        null
    );

};

const obtenirUtilisateurId = (
    req
) => {

    return (
        req.utilisateur?.id ||
        req.utilisateur?.utilisateur_id ||
        req.utilisateur?.user_id ||
        null
    );

};

const utilisateurController = {

    lister: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisationId =
                obtenirOrganisationId(
                    req
                );

            const utilisateurs =
                await utilisateurService
                    .listerParOrganisation(
                        organisationId
                    );

            return ApiResponse.success(
                res,
                "Utilisateurs récupérés avec succès.",
                utilisateurs
            );

        }
    ),

    creer: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisationId =
                obtenirOrganisationId(
                    req
                );

            const utilisateurConnecteId =
                obtenirUtilisateurId(
                    req
                );

            const utilisateur =
                await utilisateurService
                    .creerPourOrganisation(
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
                            utilisateurConnecteId,

                        action:
                            "UTILISATEUR_CREE",

                        ressource:
                            "utilisateur",

                        ressource_id:
                            utilisateur.id,

                        ancien_etat:
                            null,

                        nouvel_etat:
                            utilisateur,

                        contexte: {
                            role_id:
                                utilisateur.role_id
                        },

                        succes:
                            true
                    }
                );

            return ApiResponse.created(
                res,
                "Utilisateur créé avec succès.",
                utilisateur
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

            const utilisateurConnecteId =
                obtenirUtilisateurId(
                    req
                );

            const resultat =
                await utilisateurService
                    .modifierPourOrganisation(
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
                            utilisateurConnecteId,

                        action:
                            "UTILISATEUR_MODIFIE",

                        ressource:
                            "utilisateur",

                        ressource_id:
                            req.params.id,

                        ancien_etat:
                            resultat.ancienEtat,

                        nouvel_etat:
                            resultat.nouvelEtat,

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
                "Utilisateur modifié avec succès.",
                resultat.nouvelEtat
            );

        }
    ),

    changerStatut: asyncHandler(
        async (
            req,
            res
        ) => {

            const organisationId =
                obtenirOrganisationId(
                    req
                );

            const utilisateurConnecteId =
                obtenirUtilisateurId(
                    req
                );

            const resultat =
                await utilisateurService
                    .changerStatut(
                        req.params.id,
                        organisationId,
                        req.body.actif,
                        utilisateurConnecteId
                    );

            await auditService
                .enregistrerDepuisRequete(
                    req,
                    {
                        organisation_id:
                            organisationId,

                        utilisateur_id:
                            utilisateurConnecteId,

                        action:
                            resultat.nouvelEtat
                                .actif
                                ? "UTILISATEUR_ACTIVE"
                                : "UTILISATEUR_DESACTIVE",

                        ressource:
                            "utilisateur",

                        ressource_id:
                            req.params.id,

                        ancien_etat:
                            resultat.ancienEtat,

                        nouvel_etat:
                            resultat.nouvelEtat,

                        contexte: {
                            actif:
                                resultat.nouvelEtat
                                    .actif
                        },

                        succes:
                            true
                    }
                );

            return ApiResponse.success(
                res,
                resultat.nouvelEtat.actif
                    ? "Utilisateur activé avec succès."
                    : "Utilisateur désactivé avec succès.",
                resultat.nouvelEtat
            );

        }
    )

};

export default utilisateurController;