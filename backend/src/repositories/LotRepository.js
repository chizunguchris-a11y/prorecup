import pool from "../config/db.js";

class LotRepository {

    async trouverParCollecteId(collecteId, client = pool) {

        const requete = `
            SELECT *
            FROM lots
            WHERE collecte_id = $1;
        `;

        const resultat = await client.query(
            requete,
            [collecteId]
        );

        return resultat.rows[0];
    }

    async creer(lot, client = pool) {

        const requete = `
            INSERT INTO lots
            (
                organisation_id,
                collecte_id,
                poids_reel,
                quantite_restante_kg,
                type_dechet_id,
                statut_lot,
                code_qr,
                site_courant_id,
                client_courant_id
            )
            VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;

        const valeurs = [
            lot.organisation_id,
            lot.collecte_id,
            lot.poids_reel,
            lot.type_dechet_id,
            lot.statut_lot || "en_stock",
            lot.code_qr,
            lot.site_courant_id,
            lot.client_courant_id
        ];

        const resultat = await client.query(
            requete,
            valeurs
        );

        return resultat.rows[0];
    }

    async trouverParIdPourEntree(
        lotId,
        organisationId,
        client = pool
    ) {
        const resultat = await client.query(`
            SELECT *
            FROM lots
            WHERE id = $1
              AND organisation_id = $2
            FOR UPDATE;
        `, [lotId, organisationId]);

        return resultat.rows[0] || null;
    }

    async listerDisponiblesFifoPourMiseAJour(
        organisationId,
        stockId,
        typeDechetId,
        client = pool
    ) {
        const resultat = await client.query(`
            SELECT
                l.*,
                entree.date_entree_stock
            FROM lots l
            JOIN LATERAL (
                SELECT MIN(ms.date_mouvement) AS date_entree_stock
                FROM mouvements_stock ms
                WHERE ms.lot_id = l.id
                  AND ms.stock_id = $2
                  AND ms.type_mouvement = 'ENTREE'
            ) entree ON entree.date_entree_stock IS NOT NULL
            WHERE l.organisation_id = $1
              AND l.type_dechet_id = $3
              AND l.quantite_restante_kg > 0
              AND l.statut_lot IN ('en_stock', 'partiellement_vendu')
            ORDER BY entree.date_entree_stock ASC, l.id ASC
            FOR UPDATE OF l;
        `, [organisationId, stockId, typeDechetId]);

        return resultat.rows;
    }

    async decrementerQuantiteRestante(
        lotId,
        organisationId,
        quantite,
        client = pool
    ) {
        const resultat = await client.query(`
            UPDATE lots
            SET quantite_restante_kg = quantite_restante_kg - $3,
                statut_lot = CASE
                    WHEN quantite_restante_kg - $3 = 0 THEN 'vendu'
                    WHEN quantite_restante_kg - $3 < poids_reel THEN 'partiellement_vendu'
                    ELSE 'en_stock'
                END,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $1
              AND organisation_id = $2
              AND quantite_restante_kg >= $3
              AND statut_lot IN ('en_stock', 'partiellement_vendu')
            RETURNING *;
        `, [lotId, organisationId, quantite]);

        return resultat.rows[0] || null;
    }

    async marquerQuantiteRestanteNonDeterminee(
        lotId,
        organisationId,
        client = pool
    ) {
        const resultat = await client.query(`
            UPDATE lots
            SET quantite_restante_kg = NULL,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $1
              AND organisation_id = $2
            RETURNING *;
        `, [lotId, organisationId]);

        return resultat.rows[0] || null;
    }

    async sommeQuantitesRestantes(
        organisationId,
        typeDechetId,
        client = pool
    ) {
        const resultat = await client.query(`
            SELECT
                COALESCE(SUM(quantite_restante_kg)
                    FILTER (WHERE statut_lot IN ('en_stock', 'partiellement_vendu', 'vendu')), 0) AS total,
                COUNT(*) FILTER (
                    WHERE statut_lot IS DISTINCT FROM 'transforme'
                      AND quantite_restante_kg IS NULL
                ) AS lots_non_initialises,
                COUNT(*) FILTER (
                    WHERE statut_lot IS NULL
                       OR statut_lot NOT IN ('en_stock', 'partiellement_vendu', 'vendu', 'transforme')
                ) AS lots_statuts_inconnus
            FROM lots
            WHERE organisation_id = $1
              AND type_dechet_id = $2;
        `, [organisationId, typeDechetId]);

        return resultat.rows[0];
    }
async listerParOrganisation(
    organisationId,
    connexion = pool
) {

    const requete = `
        SELECT

            l.id,
            l.code_qr,
            l.organisation_id,
            l.collecte_id,
            l.poids_reel,
            l.quantite_restante_kg,
            l.statut_lot,

            td.nom AS type_dechet,

            c.statut AS statut_collecte,

            cl.nom AS client_nom,

            s.nom AS site_nom

        FROM lots l

        LEFT JOIN collectes c
            ON c.id = l.collecte_id

        LEFT JOIN clients cl
            ON cl.id = COALESCE(l.client_courant_id, c.client_id)

        LEFT JOIN sites_de_collecte s
            ON s.id = COALESCE(l.site_courant_id, c.site_id)

        JOIN types_dechets td
            ON td.id = l.type_dechet_id

        WHERE l.organisation_id = $1

        ORDER BY l.id DESC;
    `;

    const resultat =
        await connexion.query(
            requete,
            [organisationId]
        );

    return resultat.rows;

}
}

export default new LotRepository();
