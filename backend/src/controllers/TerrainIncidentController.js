import terrainIncidentService
    from "../services/TerrainIncidentService.js";

import notificationService
    from "../services/NotificationService.js";

import asyncHandler
    from "../middlewares/asyncHandler.js";

import ApiResponse
    from "../utils/ApiResponse.js";


const terrainIncidentController = {

    signaler: asyncHandler(
        async (
            req,
            res
        ) => {

            const resultat =
                await terrainIncidentService
                    .signaler(
                        req.params.id,
                        req.agentTerrain,
                        req.body || {}
                    );


            /*
             * Ne pas recréer une notification
             * lors d'un double envoi offline.
             */
            if (
                !resultat.deja_traitee
            ) {

                const incident =
                    resultat.incident;


                const categorie =
                    incident.contexte
                        ?.categorie ||
                    "autre";


                const gravite =
                    incident.contexte
                        ?.gravite ||
                    "moyenne";


                await notificationService
                    .creerSilencieusement(
                        {

                            organisation_id:
                                req.agentTerrain
                                    .organisation_id,

                            utilisateur_id:
                                null,

                            type:
                                "alerte",

                            categorie:
                                "incident_signale",

                            titre:
                                gravite ===
                                    "critique"
                                    ? "Incident terrain critique"
                                    : "Incident terrain signalé",

                            message:
                                incident
                                    .observations ||
                                "Un incident a été signalé par un agent terrain.",

                            ressource:
                                "mission",

                            ressource_id:
                                req.params.id,

                            lien:
                                "./carte.html",

                            contexte: {

                                evenement_id:
                                    incident.id,

                                mission_id:
                                    req.params.id,

                                collecte_id:
                                    incident
                                        .collecte_id ||
                                    null,

                                categorie,

                                gravite,

                                bloquant:
                                    incident.contexte
                                        ?.bloquant ===
                                        true,

                                latitude:
                                    incident
                                        .latitude ||
                                    null,

                                longitude:
                                    incident
                                        .longitude ||
                                    null,

                                signale_par:
                                    req.agentTerrain
                                        .utilisateur_id

                            }

                        }
                    );

            }


            return ApiResponse.success(
                res,
                resultat.deja_traitee
                    ? "Cet incident avait déjà été enregistré."
                    : "Incident terrain signalé avec succès.",
                resultat
            );

        }
    )

};


export default terrainIncidentController;