import pool from "../config/db.js";

class VenteRepository {

    async creer(
        vente,
        client = pool
    ) {

        const requete = `
            INSERT INTO ventes
            (
                organisation_id,
                stock_id,
                quantite,
                prix_unitaire,
                montant_total,
                acheteur_nom,
                reference_vente,
                statut,
                cree_par
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *;
        `;

        const valeurs = [
            vente.organisation_id,
            vente.stock_id,
            vente.quantite,
            vente.prix_unitaire,
            vente.montant_total,
            vente.acheteur_nom,
            vente.reference_vente || null,
            vente.statut || "confirmee",
            vente.cree_par || null
        ];

        const resultat =
            await client.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    async trouverParId(
        id,
        client = pool
    ) {

        const requete = `
            SELECT *
            FROM ventes
            WHERE id = $1;
        `;

        const resultat =
            await client.query(
                requete,
                [id]
            );

        return resultat.rows[0];

    }

    async listerParOrganisation(
        organisationId,
        client = pool
    ) {

        const requete = `
            SELECT
                v.id,
                v.organisation_id,
                v.stock_id,
                v.quantite,
                v.prix_unitaire,
                v.montant_total,
                v.acheteur_nom,
                v.reference_vente,
                v.statut,
                v.cree_par,
                v.date_vente,

                td.nom AS type_dechet,

                s.unite,

                u.nom AS cree_par_nom,

                ic.co2e_estime_kg

            FROM ventes v

            JOIN stocks s
                ON s.id = v.stock_id

            JOIN types_dechets td
                ON td.id = s.type_dechet_id

            LEFT JOIN utilisateurs u
                ON u.id = v.cree_par

            LEFT JOIN impacts_carbone ic
                ON ic.vente_id = v.id

            WHERE v.organisation_id = $1

            ORDER BY v.date_vente DESC;
        `;

        const resultat =
            await client.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    }

}

export default new VenteRepository();