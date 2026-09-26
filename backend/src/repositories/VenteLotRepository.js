import pool from "../config/db.js";

class VenteLotRepository {
    async creer(allocation, client = pool) {
        const resultat = await client.query(`
            INSERT INTO vente_lots
                (organisation_id, vente_id, lot_id, quantite_kg)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `, [
            allocation.organisation_id,
            allocation.vente_id,
            allocation.lot_id,
            allocation.quantite_kg
        ]);

        return resultat.rows[0];
    }

    async sommeParVente(venteId, organisationId, client = pool) {
        const resultat = await client.query(`
            SELECT COALESCE(SUM(quantite_kg), 0) AS total
            FROM vente_lots
            WHERE vente_id = $1
              AND organisation_id = $2;
        `, [venteId, organisationId]);

        return Number(resultat.rows[0].total);
    }

    async listerParLot(lotId, organisationId, client = pool) {
        const resultat = await client.query(`
            SELECT
                vl.id,
                vl.vente_id,
                vl.lot_id,
                vl.quantite_kg,
                vl.cree_le,
                v.reference_vente,
                v.acheteur_nom,
                v.date_vente,
                v.statut AS statut_vente
            FROM vente_lots vl
            JOIN ventes v
              ON v.id = vl.vente_id
             AND v.organisation_id = vl.organisation_id
            WHERE vl.lot_id = $1
              AND vl.organisation_id = $2
            ORDER BY v.date_vente ASC, vl.id ASC;
        `, [lotId, organisationId]);

        return resultat.rows;
    }
}

export default new VenteLotRepository();
