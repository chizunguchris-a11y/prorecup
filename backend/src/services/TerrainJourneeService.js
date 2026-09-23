import terrainJourneeRepository
    from "../repositories/TerrainJourneeRepository.js";

import ApiError
    from "../utils/ApiError.js";


const TIMEZONE =
    process.env.APP_TIMEZONE ||
    "Africa/Kinshasa";


const obtenirDateLocale =
    () => {

        const parties =
            new Intl.DateTimeFormat(
                "fr-CA",
                {
                    timeZone:
                        TIMEZONE,

                    year:
                        "numeric",

                    month:
                        "2-digit",

                    day:
                        "2-digit"
                }
            )
                .formatToParts(
                    new Date()
                );


        const valeurs = {};


        for (
            const partie of parties
        ) {

            valeurs[
                partie.type
            ] =
                partie.value;

        }


        return (
            valeurs.year +
            "-" +
            valeurs.month +
            "-" +
            valeurs.day
        );

    };


const DATE_REGEX =
    /^\d{4}-\d{2}-\d{2}$/;


const trouverEvenement =
    (
        collecte,
        type
    ) => {

        return (
            collecte.evenements ||
            []
        ).find(
            evenement =>
                evenement.type ===
                type
        ) || null;

    };


const construireCollecte =
    (
        collecte
    ) => {

        const arrivee =
            trouverEvenement(
                collecte,
                "arrivee_site"
            );


        const demarrage =
            trouverEvenement(
                collecte,
                "collecte_demarree"
            );


        const fin =
            trouverEvenement(
                collecte,
                "collecte_terminee"
            );


        let etat =
            "a_faire";


        let actionSuivante =
            "arriver_site";


        if (arrivee) {

            etat =
                "sur_site";

            actionSuivante =
                "demarrer_collecte";

        }


        if (demarrage) {

            etat =
                "en_collecte";

            actionSuivante =
                "terminer_collecte";

        }


        if (fin) {

            etat =
                "terminee";

            actionSuivante =
                "aucune";

        }


        return {

            id:
                collecte.id,

            ordre_collecte:
                collecte
                    .ordre_collecte,

            etat,

            action_suivante:
                actionSuivante,

            site: {

                id:
                    collecte.site_id,

                nom:
                    collecte.site_nom,

                adresse:
                    collecte
                        .site_adresse,

                zone_geographique:
                    collecte
                        .site_zone_geographique,

                responsable_nom:
                    collecte
                        .site_responsable_nom,

                latitude:
                    collecte
                        .site_latitude,

                longitude:
                    collecte
                        .site_longitude,

                precision_gps_reference:
                    collecte
                        .site_precision_gps_reference,

                rayon_validation_m:
                    collecte
                        .site_rayon_validation_m

            },

            client:
                collecte.client,

            type_dechet:
                collecte.type_dechet,

            poids: {

                estime_kg:
                    collecte
                        .poids_estime !==
                        null
                        ? Number(
                            collecte
                                .poids_estime
                        )
                        : null,

                reel_kg:
                    collecte
                        .poids_reel !==
                        null
                        ? Number(
                            collecte
                                .poids_reel
                        )
                        : null,

                reel_saisi_le:
                    collecte
                        .poids_reel_saisi_le

            },

            resultat_terrain:
                collecte
                    .resultat_terrain,

            motif_terrain:
                collecte
                    .motif_terrain,

            statut_administratif:
                collecte
                    .statut_administratif,

            progression: {

                arrivee:
                    Boolean(
                        arrivee
                    ),

                arrivee_le:
                    arrivee
                        ?.survenu_le ||
                    null,

                collecte_demarree:
                    Boolean(
                        demarrage
                    ),

                collecte_demarree_le:
                    demarrage
                        ?.survenu_le ||
                    null,

                collecte_terminee:
                    Boolean(
                        fin
                    ),

                collecte_terminee_le:
                    fin
                        ?.survenu_le ||
                    null

            },

            evenements:
                collecte.evenements ||
                [],

            preuves:
                collecte.preuves ||
                [],

            pesees:
                (collecte.pesees || []).map(pesee => ({
                    ...pesee,
                    poids_brut: Number(pesee.poids_brut),
                    tare: Number(pesee.tare),
                    poids_net: Number(pesee.poids_net)
                })),

            nombre_preuves:
                (
                    collecte.preuves ||
                    []
                ).length

        };

    };


class TerrainJourneeService {

    async obtenir(
        agentTerrain,
        dateDemandee
    ) {

        const dateJour =
            dateDemandee ||
            obtenirDateLocale();


        if (
            !DATE_REGEX.test(
                dateJour
            )
        ) {

            throw new ApiError(
                400,
                "La date doit respecter le format AAAA-MM-JJ."
            );

        }


        const missionsBase =
            await terrainJourneeRepository
                .listerMissions(
                    agentTerrain.agent_id,
                    agentTerrain
                        .organisation_id,
                    dateJour
                );


        const missions = [];


        for (
            const mission of missionsBase
        ) {

            const collectesBase =
                await terrainJourneeRepository
                    .listerCollectes(
                        mission.id,
                        agentTerrain
                            .organisation_id
                    );


            const incidents =
                await terrainJourneeRepository
                    .listerIncidentsMission(
                        mission.id,
                        agentTerrain
                            .organisation_id
                    );


            const collectes =
                collectesBase.map(
                    construireCollecte
                );


            const terminees =
                collectes.filter(
                    collecte =>
                        collecte.progression
                            .collecte_terminee
                );


            const total =
                collectes.length;


            const pourcentage =
                total > 0
                    ? Math.round(
                        (
                            terminees.length /
                            total
                        ) *
                        100
                    )
                    : 0;


            const prochaine =
                collectes.find(
                    collecte =>
                        !collecte
                            .progression
                            .collecte_terminee
                ) ||
                null;


            let actionSuivante =
                "aucune";


            if (
                mission.statut ===
                "planifiee"
            ) {

                actionSuivante =
                    "demarrer_mission";

            } else if (
                mission.statut ===
                    "en_cours" &&
                prochaine
            ) {

                actionSuivante =
                    prochaine
                        .action_suivante;

            } else if (
                mission.statut ===
                    "en_cours" &&
                !prochaine &&
                total > 0
            ) {

                actionSuivante =
                    "terminer_mission";

            }


            missions.push(
                {

                    id:
                        mission.id,

                    statut:
                        mission.statut,

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

                    observations:
                        mission.observations,

                    tricycle: {

                        id:
                            mission
                                .tricycle_id,

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
                                .tricycle_capacite_kg !==
                                null
                                ? Number(
                                    mission
                                        .tricycle_capacite_kg
                                )
                                : null,

                        statut:
                            mission
                                .tricycle_statut,

                        etat:
                            mission
                                .tricycle_etat

                    },

                    progression: {

                        nombre_collectes:
                            total,

                        terminees:
                            terminees.length,

                        restantes:
                            total -
                            terminees.length,

                        pourcentage

                    },

                    action_suivante:
                        actionSuivante,

                    prochaine_collecte:
                        prochaine
                            ? {
                                id:
                                    prochaine.id,

                                ordre_collecte:
                                    prochaine
                                        .ordre_collecte,

                                site_nom:
                                    prochaine.site
                                        .nom,

                                action:
                                    prochaine
                                        .action_suivante
                            }
                            : null,

                    incidents,

                    nombre_incidents:
                        incidents.length,

                    collectes

                }
            );

        }


        const nombreCollectes =
            missions.reduce(
                (
                    total,
                    mission
                ) =>
                    total +
                    mission
                        .progression
                        .nombre_collectes,
                0
            );


        const nombreTerminees =
            missions.reduce(
                (
                    total,
                    mission
                ) =>
                    total +
                    mission
                        .progression
                        .terminees,
                0
            );

        const balances = await terrainJourneeRepository.listerBalances(
            agentTerrain.organisation_id
        );


        return {

            genere_le:
                new Date()
                    .toISOString(),

            timezone:
                TIMEZONE,

            date:
                dateJour,

            agent: {

                utilisateur_id:
                    agentTerrain
                        .utilisateur_id,

                agent_id:
                    agentTerrain
                        .agent_id,

                organisation_id:
                    agentTerrain
                        .organisation_id,

                nom:
                    agentTerrain.nom,

                email:
                    agentTerrain.email,

                telephone:
                    agentTerrain.telephone

            },

            resume: {

                nombre_missions:
                    missions.length,

                nombre_collectes:
                    nombreCollectes,

                collectes_terminees:
                    nombreTerminees,

                collectes_restantes:
                    nombreCollectes -
                    nombreTerminees

            },

            balances: balances.map(balance => ({
                ...balance,
                capacite_max_kg: Number(balance.capacite_max_kg),
                precision_kg: Number(balance.precision_kg)
            })),

            missions

        };

    }

}


export default new TerrainJourneeService();
