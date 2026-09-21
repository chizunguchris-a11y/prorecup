import terrainRepository
    from "../repositories/TerrainRepository.js";

const TIMEZONE_TERRAIN =
    process.env.APP_TIMEZONE ||
    "Africa/Kinshasa";


const obtenirDateLocale = (
    date = new Date()
) => {

    const morceaux =
        new Intl.DateTimeFormat(
            "fr-CA",
            {
                timeZone:
                    TIMEZONE_TERRAIN,

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        )
            .formatToParts(
                date
            );


    const valeurs = {};

    for (
        const morceau
        of morceaux
    ) {

        if (
            morceau.type !==
            "literal"
        ) {

            valeurs[
                morceau.type
            ] =
                morceau.value;

        }

    }


    return (
        valeurs.year +
        "-" +
        valeurs.month +
        "-" +
        valeurs.day
    );

};


const dateISOValide = (
    valeur
) => {

    if (
        !/^\d{4}-\d{2}-\d{2}$/
            .test(
                String(
                    valeur || ""
                )
            )
    ) {

        return false;

    }


    const [
        annee,
        mois,
        jour
    ] =
        String(valeur)
            .split("-")
            .map(Number);


    const date =
        new Date(
            Date.UTC(
                annee,
                mois - 1,
                jour
            )
        );


    return (
        date.getUTCFullYear() ===
            annee &&
        date.getUTCMonth() ===
            mois - 1 &&
        date.getUTCDate() ===
            jour
    );

};

class TerrainService {

    obtenirProfil(
        agentTerrain
    ) {

        return {

            utilisateur: {

                id:
                    agentTerrain
                        .utilisateur_id,

                nom:
                    agentTerrain
                        .utilisateur_nom,

                email:
                    agentTerrain
                        .utilisateur_email,

                telephone:
                    agentTerrain
                        .utilisateur_telephone,

                photo_url:
                    agentTerrain
                        .utilisateur_photo_url,

                role:
                    agentTerrain.role

            },

            agent: {

                id:
                    agentTerrain.agent_id,

                telephone:
                    agentTerrain
                        .agent_telephone,

                photo_url:
                    agentTerrain
                        .agent_photo_url,

                statut:
                    agentTerrain
                        .agent_statut,

                disponible:
                    agentTerrain
                        .disponible,

                date_embauche:
                    agentTerrain
                        .date_embauche

            },

            organisation: {

                id:
                    agentTerrain
                        .organisation_id

            }

        };

    }


    async obtenirJournee(
        agentTerrain,
        dateDemandee = null
    ) {

        const maintenant =
    new Date();


if (
    dateDemandee &&
    !dateISOValide(
        dateDemandee
    )
) {

    const erreur =
        new Error(
            "La date doit être au format AAAA-MM-JJ."
        );

    erreur.statusCode = 400;

    throw erreur;

}


const dateJour =
    dateDemandee ||
    obtenirDateLocale(
        maintenant
    );


        const missions =
            await terrainRepository
                .listerMissionsJournee(
                    agentTerrain.agent_id,
                    agentTerrain.organisation_id,
                    dateJour
                );


        const missionsCompletes = [];


        for (
            const mission
            of missions
        ) {

            const collectes =
                await terrainRepository
                    .listerCollectesMissionTerrain(
                        mission.id,
                        agentTerrain
                            .organisation_id
                    );


            missionsCompletes.push({

                id:
                    mission.id,

                date_prevue:
                    mission.date_prevue,

                heure_depart_prevue:
                    mission
                        .heure_depart_prevue,

                heure_retour_prevue:
                    mission
                        .heure_retour_prevue,

                heure_depart_reelle:
                    mission
                        .heure_depart_reelle,

                heure_retour_reelle:
                    mission
                        .heure_retour_reelle,

                statut:
                    mission.statut,

                observations:
                    mission.observations,

                tricycle: {

                    id:
                        mission.tricycle_id,

                    numero:
                        mission
                            .tricycle_numero,

                    plaque:
                        mission
                            .tricycle_plaque,

                    marque:
                        mission
                            .tricycle_marque,

                    modele:
                        mission
                            .tricycle_modele,

                    capacite_kg:
                        mission
                            .tricycle_capacite_kg,

                    statut:
                        mission
                            .tricycle_statut,

                    etat:
                        mission
                            .tricycle_etat

                },

                nombre_collectes:
                    collectes.length,

                collectes:
                    collectes.map(
                        (
                            collecte,
                            index
                        ) => {

                            return {

                                id:
                                    collecte
                                        .collecte_id,

                                ordre:
                                    collecte
                                        .ordre_collecte ||
                                    index + 1,

                                client_id:
                                    collecte
                                        .client_id,

                                type_dechet_id:
                                    collecte
                                        .type_dechet_id,

                                statut:
                                    collecte.statut,

                                poids_estime:
                                    collecte
                                        .poids_estime ==
                                    null
                                        ? null
                                        : Number(
                                            collecte
                                                .poids_estime
                                        ),

                                poids_reel:
                                    collecte
                                        .poids_reel ==
                                    null
                                        ? null
                                        : Number(
                                            collecte
                                                .poids_reel
                                        ),

                                poids_reel_saisi_le:
                                    collecte
                                        .poids_reel_saisi_le,

                                site: {

                                    id:
                                        collecte
                                            .site_id,

                                    nom:
                                        collecte
                                            .site_nom,

                                    adresse:
                                        collecte
                                            .site_adresse,

                                    zone:
                                        collecte
                                            .site_zone_geographique,

                                    responsable:
                                        collecte
                                            .site_responsable_nom,

                                    latitude:
                                        collecte
                                            .site_latitude ==
                                        null
                                            ? null
                                            : Number(
                                                collecte
                                                    .site_latitude
                                            ),

                                    longitude:
                                        collecte
                                            .site_longitude ==
                                        null
                                            ? null
                                            : Number(
                                                collecte
                                                    .site_longitude
                                            ),

                                    precision_gps_reference:
                                        collecte
                                            .site_precision_gps_reference ==
                                        null
                                            ? null
                                            : Number(
                                                collecte
                                                    .site_precision_gps_reference
                                            ),

                                    rayon_validation_m:
                                        collecte
                                            .site_rayon_validation_m

                                }

                            };

                        }
                    )

            });

        }


        const nombreCollectes =
            missionsCompletes.reduce(
                (
                    total,
                    mission
                ) => {

                    return (
                        total +
                        mission
                            .collectes
                            .length
                    );

                },
                0
            );


        const poidsEstimeTotal =
            missionsCompletes.reduce(
                (
                    totalMissions,
                    mission
                ) => {

                    const poidsMission =
                        mission.collectes
                            .reduce(
                                (
                                    total,
                                    collecte
                                ) => {

                                    return (
                                        total +
                                        (
                                            collecte
                                                .poids_estime ||
                                            0
                                        )
                                    );

                                },
                                0
                            );


                    return (
                        totalMissions +
                        poidsMission
                    );

                },
                0
            );


        return {

            genere_le:
                maintenant
                    .toISOString(),

            date:
                dateJour,

            agent: {

                id:
                    agentTerrain.agent_id,

                nom:
                    agentTerrain
                        .utilisateur_nom,

                disponible:
                    agentTerrain
                        .disponible

            },

            resume: {

                nombre_missions:
                    missionsCompletes.length,

                nombre_collectes:
                    nombreCollectes,

                poids_estime_total_kg:
                    poidsEstimeTotal

            },

            missions:
                missionsCompletes

        };

    }

}


export default new TerrainService();