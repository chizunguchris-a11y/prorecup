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

                chiffre_affaires_total:
                    Number(
                        resume.chiffre_affaires_total
                    )

            },

            carbone: {

                co2e_estime_total:
                    Number(
                        resume.co2e_estime_total
                    )

            }

        };

    }

}

export default new DashboardService();