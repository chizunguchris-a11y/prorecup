import missionEvenementService
    from "../services/MissionEvenementService.js";

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

const obtenirActionEvenement = (
    typeEvenement
) => {

    const actions = {

        mission_demarree:
            "EVENEMENT_MISSION_DEMARREE",

        mission_terminee:
            "EVENEMENT_MISSION_TERMINEE",

        position_enregistree:
            "POSITION_GPS_ENREGISTREE",

        arrivee_site:
            "ARRIVEE_SITE_ENREGISTREE",

        collecte_demarree:
            "EVENEMENT_COLLECTE_DEMARREE",

        collecte_terminee:
            "EVENEMENT_COLLECTE_TERMINEE",

        incident_signale:
            "INCIDENT_SIGNALE"

    };

    return (
        actions[typeEvenement] ||
        "EVENEMENT_MISSION_CREE"
    );

};

const missionEvenementController = {

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

            const typeEvenement =
                req.body.type_evenement;

            try {

                const evenement =
                    await missionEvenementService
                        .creer(
                            req.params.id,
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
                                obtenirActionEvenement(
                                    typeEvenement
                                ),

                            ressource:
                                "mission_evenement",

                            ressource_id:
                                evenement.id,

                            ancien_etat:
                                null,

                            nouvel_etat:
                                evenement,

                            contexte: {

                                mission_id:
                                    req.params.id,

                                collecte_id:
                                    evenement.collecte_id ||
                                    req.body.collecte_id ||
                                    null,

                                type_evenement:
                                    typeEvenement,

                                latitude:
                                    evenement.latitude ||
                                    req.body.latitude ||
                                    null,

                                longitude:
                                    evenement.longitude ||
                                    req.body.longitude ||
                                    null

                            },

                            succes:
                                true
                        }
                    );

                if (
                    typeEvenement ===
                    "incident_signale"
                ) {

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
                                    "incident_signale",

                                titre:
                                    "Incident signalé sur une mission",

                                message:
                                    evenement.observations ||
                                    req.body.observations ||
                                    "Un incident a été signalé pendant une mission.",

                                ressource:
                                    "mission",

                                ressource_id:
                                    req.params.id,

                                lien:
                                    "./carte.html",

                                contexte: {

                                    evenement_id:
                                        evenement.id,

                                    mission_id:
                                        req.params.id,

                                    collecte_id:
                                        evenement.collecte_id ||
                                        null,

                                    latitude:
                                        evenement.latitude ||
                                        null,

                                    longitude:
                                        evenement.longitude ||
                                        null,

                                    signale_par:
                                        utilisateurId

                                }
                            }
                        );

                }

                return ApiResponse.created(
                    res,
                    "Événement de mission enregistré avec succès.",
                    evenement
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
                                "CREATION_EVENEMENT_MISSION_ECHOUEE",

                            ressource:
                                "mission_evenement",

                            ancien_etat:
                                null,

                            nouvel_etat:
                                req.body,

                            contexte: {

                                mission_id:
                                    req.params.id,

                                collecte_id:
                                    req.body.collecte_id ||
                                    null,

                                type_evenement:
                                    typeEvenement ||
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

            const evenements =
                await missionEvenementService
                    .lister(
                        req.params.id,
                        obtenirOrganisationId(
                            req
                        )
                    );

            return ApiResponse.success(
                res,
                "Événements de la mission récupérés avec succès.",
                evenements
            );

        }
    )

};

export default missionEvenementController;