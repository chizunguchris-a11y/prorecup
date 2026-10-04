import dashboardRepository
    from "../repositories/DashboardRepository.js";

import ApiError
    from "../utils/ApiError.js";

class DashboardService {

    async obtenirResume(
        organisationId
    ) {

        if (!organisationId) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        const resume =
            await dashboardRepository
                .obtenirResume(
                    organisationId
                );

        const incidentsRecents =
            await dashboardRepository
                .obtenirIncidentsRecents(
                    organisationId
                );

        const chiffreAffairesParDevise =
            Object.fromEntries(
                Object.entries(
                    resume.chiffre_affaires_par_devise ||
                    {}
                ).map(
                    ([devise, montant]) => [
                        devise,
                        Number(montant)
                    ]
                )
            );

        return {

            activite: {

                nombre_clients:
                    Number(
                        resume.nombre_clients
                    ),

                nombre_sites:
                    Number(
                        resume.nombre_sites
                    ),

                nombre_collectes:
                    Number(
                        resume.nombre_collectes
                    ),

                nombre_lots:
                    Number(
                        resume.nombre_lots
                    )

            },

            stocks: {

                nombre_types:
                    Number(
                        resume.nombre_types_stock
                    ),

                quantite_totale:
                    Number(
                        resume.quantite_totale_stock
                    )

            },

            ventes: {

                nombre:
                    Number(
                        resume.nombre_ventes
                    ),

                chiffre_affaires_par_devise:
                    chiffreAffairesParDevise

            },

            carbone: {

                co2e_estime_total:
                    Number(
                        resume.co2e_estime_total
                    )

            },

            alertes_operationnelles:
                incidentsRecents.map(
                    incident => {

                        const contexte =
                            incident.contexte &&
                            typeof incident.contexte === "object"
                                ? incident.contexte
                                : {};

                        const gravite =
                            String(
                                contexte.gravite ||
                                "moyenne"
                            )
                                .trim()
                                .toLowerCase();

                        const categorie =
                            String(
                                contexte.categorie ||
                                "autre"
                            )
                                .trim()
                                .toLowerCase();

                        const bloquant =
                            contexte.bloquant === true;

                        let niveau =
                            "information";

                        if (
                            bloquant ||
                            gravite === "critique"
                        ) {

                            niveau =
                                "critique";

                        }
                        else if (
                            gravite === "elevee" ||
                            gravite === "moyenne"
                        ) {

                            niveau =
                                "vigilance";

                        }

                        return {

                            id:
                                incident.id,

                            type:
                                "incident_terrain",

                            niveau,

                            titre:
                                niveau === "critique"
                                    ? "Incident terrain critique"
                                    : "Incident terrain signale",

                            detail:
                                incident.observations ||
                                "Un incident terrain a ete signale.",

                            mission_id:
                                incident.mission_id,

                            collecte_id:
                                incident.collecte_id || null,

                            categorie,

                            gravite,

                            bloquant,

                            latitude:
                                incident.latitude ?? null,

                            longitude:
                                incident.longitude ?? null,

                            survenu_le:
                                incident.survenu_le ||
                                incident.recu_le || null,

                            lien:
                                "./carte.html"

                        };

                    }
                )

        };

    }

}

export default new DashboardService();