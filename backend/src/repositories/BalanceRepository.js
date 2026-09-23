import pool from "../config/db.js";

class BalanceRepository {
    async lister(organisationId, connexion = pool) {
        const resultat = await connexion.query(`
            SELECT b.*, t.numero_interne AS tricycle_numero, s.nom AS site_nom
            FROM balances b
            LEFT JOIN tricycles t ON t.id = b.tricycle_id
            LEFT JOIN sites_de_collecte s ON s.id = b.site_id
            WHERE b.organisation_id = $1
            ORDER BY b.numero_interne;
        `, [organisationId]);
        return resultat.rows;
    }

    async trouver(id, organisationId, connexion = pool) {
        const resultat = await connexion.query(`
            SELECT * FROM balances WHERE id = $1 AND organisation_id = $2 LIMIT 1;
        `, [id, organisationId]);
        return resultat.rows[0] || null;
    }

    async affectationValide(tricycleId, siteId, organisationId, connexion = pool) {
        if (tricycleId) {
            const resultat = await connexion.query(
                "SELECT id FROM tricycles WHERE id = $1 AND organisation_id = $2",
                [tricycleId, organisationId]
            );
            return Boolean(resultat.rows[0]);
        }
        if (siteId) {
            const resultat = await connexion.query(
                "SELECT id FROM sites_de_collecte WHERE id = $1 AND organisation_id = $2",
                [siteId, organisationId]
            );
            return Boolean(resultat.rows[0]);
        }
        return true;
    }

    async creer(organisationId, donnees, connexion = pool) {
        const resultat = await connexion.query(`
            INSERT INTO balances
                (organisation_id, numero_interne, type, capacite_max_kg, precision_kg,
                 statut, date_calibrage, prochain_calibrage, tricycle_id, site_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `, [organisationId, donnees.numero_interne, donnees.type,
            donnees.capacite_max_kg, donnees.precision_kg, donnees.statut,
            donnees.date_calibrage, donnees.prochain_calibrage,
            donnees.tricycle_id, donnees.site_id]);
        return resultat.rows[0];
    }

    async modifier(id, organisationId, donnees, connexion = pool) {
        const resultat = await connexion.query(`
            UPDATE balances
            SET numero_interne = $1, type = $2, capacite_max_kg = $3,
                precision_kg = $4, date_calibrage = $5, prochain_calibrage = $6,
                tricycle_id = $7, site_id = $8, modifie_le = CURRENT_TIMESTAMP
            WHERE id = $9 AND organisation_id = $10
            RETURNING *;
        `, [donnees.numero_interne, donnees.type, donnees.capacite_max_kg,
            donnees.precision_kg, donnees.date_calibrage, donnees.prochain_calibrage,
            donnees.tricycle_id, donnees.site_id, id, organisationId]);
        return resultat.rows[0] || null;
    }

    async modifierStatut(id, organisationId, statut, connexion = pool) {
        const resultat = await connexion.query(`
            UPDATE balances SET statut = $1, modifie_le = CURRENT_TIMESTAMP
            WHERE id = $2 AND organisation_id = $3 RETURNING *;
        `, [statut, id, organisationId]);
        return resultat.rows[0] || null;
    }
}

export default new BalanceRepository();
