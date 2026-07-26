import pool from "../config/db.js";

class MouvementStockRepository {

    async creer(mouvement, client = pool) {

        const requete = `
            INSERT INTO mouvements_stock
            (
                stock_id,
                lot_id,
                vente_id,
                type_mouvement,
                quantite
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const valeurs = [
            mouvement.stock_id,
            mouvement.lot_id || null,
            mouvement.vente_id || null,
            mouvement.type_mouvement,
            mouvement.quantite
        ];

        const resultat = await client.query(
            requete,
            valeurs
        );

        return resultat.rows[0];
    }

    async listerParStock(stockId) {

        const requete = `
            SELECT
                ms.id,
                ms.stock_id,
                ms.lot_id,
                ms.vente_id,
                ms.type_mouvement,
                ms.quantite,
                ms.date_mouvement
            FROM mouvements_stock ms
            WHERE ms.stock_id = $1
            ORDER BY ms.date_mouvement DESC;
        `;

        const resultat = await pool.query(
            requete,
            [stockId]
        );

        return resultat.rows;
    }

}

export default new MouvementStockRepository();