import pool from "../config/db.js";

class ImpactCarboneRepository {

    async creer(
        impact,
        client = pool
    ) {

        const requete = `
            INSERT INTO impacts_carbone
            (
                vente_id,
                facteur_carbone_id,
                quantite_kg,
                facteur_utilise,
                co2e_estime_kg
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const valeurs = [
            impact.vente_id,
            impact.facteur_carbone_id,
            impact.quantite_kg,
            impact.facteur_utilise,
            impact.co2e_estime_kg
        ];

        const resultat =
            await client.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    async trouverParVenteId(
        venteId,
        client = pool
    ) {

        const requete = `
            SELECT *
            FROM impacts_carbone
            WHERE vente_id = $1;
        `;

        const resultat =
            await client.query(
                requete,
                [venteId]
            );

        return resultat.rows[0];

    }

    async listerParOrganisation(
        organisationId,
        client = pool
    ) {

        const requete = `
            SELECT
                ic.id,
                ic.vente_id,
                ic.facteur_carbone_id,
                ic.quantite_kg,
                ic.facteur_utilise,
                ic.co2e_estime_kg,
                ic.date_calcul,

                v.reference_vente,
                v.acheteur_nom,
                v.date_vente,
                v.statut AS statut_vente,

                td.nom AS type_dechet,

                s.unite,

                fc.source AS source_facteur,
                fc.version_source,
                fc.zone_geographique,
                fc.statut AS statut_facteur,

                u.nom AS cree_par_nom

            FROM impacts_carbone ic

            JOIN ventes v
                ON v.id = ic.vente_id

            JOIN stocks s
                ON s.id = v.stock_id

            JOIN types_dechets td
                ON td.id = s.type_dechet_id

            JOIN facteurs_carbone fc
                ON fc.id = ic.facteur_carbone_id

            LEFT JOIN utilisateurs u
                ON u.id = v.cree_par

            WHERE v.organisation_id = $1

            ORDER BY ic.date_calcul DESC;
        `;

        const resultat =
            await client.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    }

}

export default new ImpactCarboneRepository();