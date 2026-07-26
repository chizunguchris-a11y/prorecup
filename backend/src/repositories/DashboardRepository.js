import pool from "../config/db.js";

class DashboardRepository {

    async obtenirResume(
        organisationId,
        client = pool
    ) {

        const requete = `
            SELECT

                (
                    SELECT COUNT(*)
                    FROM clients
                    WHERE organisation_id = $1
                ) AS nombre_clients,

                (
                    SELECT COUNT(*)
                    FROM sites_de_collecte
                    WHERE organisation_id = $1
                ) AS nombre_sites,

                (
                    SELECT COUNT(*)
                    FROM collectes c
                    JOIN clients cl
                        ON cl.id = c.client_id
                    JOIN sites_de_collecte s
                        ON s.id = c.site_id
                    WHERE cl.organisation_id = $1
                      AND s.organisation_id = $1
                ) AS nombre_collectes,

                (
                    SELECT COUNT(*)
                    FROM lots l
                    JOIN collectes c
                        ON c.id = l.collecte_id
                    JOIN clients cl
                        ON cl.id = c.client_id
                    JOIN sites_de_collecte s
                        ON s.id = c.site_id
                    WHERE cl.organisation_id = $1
                      AND s.organisation_id = $1
                ) AS nombre_lots,

                (
                    SELECT COUNT(*)
                    FROM stocks
                    WHERE organisation_id = $1
                      AND quantite > 0
                ) AS nombre_types_stock,

                (
                    SELECT COALESCE(
                        SUM(quantite),
                        0
                    )
                    FROM stocks
                    WHERE organisation_id = $1
                ) AS quantite_totale_stock,

                (
                    SELECT COUNT(*)
                    FROM ventes
                    WHERE organisation_id = $1
                      AND statut = 'confirmee'
                ) AS nombre_ventes,

                (
                    SELECT COALESCE(
                        SUM(montant_total),
                        0
                    )
                    FROM ventes
                    WHERE organisation_id = $1
                      AND statut = 'confirmee'
                ) AS chiffre_affaires_total,

                (
                    SELECT COALESCE(
                        SUM(ic.co2e_estime_kg),
                        0
                    )
                    FROM impacts_carbone ic

                    JOIN ventes v
                        ON v.id = ic.vente_id

                    WHERE v.organisation_id = $1
                      AND v.statut = 'confirmee'
                ) AS co2e_estime_total;
        `;

        const resultat =
            await client.query(
                requete,
                [organisationId]
            );

        return resultat.rows[0];

    }

}

export default new DashboardRepository();