import pool from "../config/db.js";

class CarteRepository {

    async listerPositionsParOrganisation(
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                me.id,
                me.mission_id,
                me.collecte_id,
                me.type_evenement,
                me.latitude,
                me.longitude,
                me.precision_gps,
                me.observations,
                me.cree_le,

                m.date_prevue,
                m.statut AS mission_statut,
                m.agent_id,
                m.tricycle_id,

                u.nom AS agent_nom,
                u.email AS agent_email,

                t.numero_interne AS tricycle_numero,
                t.plaque_identification,

                cl.nom AS client_nom,

                s.nom AS site_nom,
                s.adresse AS site_adresse,
                s.zone_geographique

            FROM mission_evenements me

            JOIN missions m
                ON m.id = me.mission_id

            JOIN agents a
                ON a.id = m.agent_id

            JOIN utilisateurs u
                ON u.id = a.utilisateur_id

            JOIN tricycles t
                ON t.id = m.tricycle_id

            LEFT JOIN collectes c
                ON c.id = me.collecte_id

            LEFT JOIN clients cl
                ON cl.id = c.client_id

            LEFT JOIN sites_de_collecte s
                ON s.id = c.site_id

            WHERE m.organisation_id = $1
              AND me.latitude IS NOT NULL
              AND me.longitude IS NOT NULL

            ORDER BY me.cree_le DESC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    }

    async obtenirResumeParOrganisation(
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                (
                    SELECT COUNT(*)::integer
                    FROM missions
                    WHERE organisation_id = $1
                ) AS nombre_missions,

                (
                    SELECT COUNT(*)::integer
                    FROM missions
                    WHERE organisation_id = $1
                      AND statut = 'en_cours'
                ) AS nombre_missions_en_cours,

                (
                    SELECT COUNT(*)::integer
                    FROM mission_evenements me
                    JOIN missions m
                        ON m.id = me.mission_id
                    WHERE m.organisation_id = $1
                      AND me.latitude IS NOT NULL
                      AND me.longitude IS NOT NULL
                ) AS nombre_positions,

                (
                    SELECT COUNT(
                        DISTINCT m.agent_id
                    )::integer
                    FROM mission_evenements me
                    JOIN missions m
                        ON m.id = me.mission_id
                    WHERE m.organisation_id = $1
                      AND me.latitude IS NOT NULL
                      AND me.longitude IS NOT NULL
                ) AS nombre_agents_localises;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows[0];

    }

}

export default new CarteRepository();