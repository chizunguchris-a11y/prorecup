import pool from "../config/db.js";

class PeseeRepository {
    async listerBalances(organisationId, connexion = pool) {
        const resultat = await connexion.query(`
            SELECT id, numero_interne, type, capacite_max_kg, precision_kg,
                   statut, date_calibrage, prochain_calibrage, tricycle_id, site_id
            FROM balances
            WHERE organisation_id = $1 AND statut = 'active'
            ORDER BY numero_interne;
        `, [organisationId]);
        return resultat.rows;
    }

    async trouverContexte(missionId, collecteId, organisationId, agentId, connexion = pool) {
        const valeurs = [missionId, collecteId, organisationId];
        let filtreAgent = "";
        if (agentId) {
            valeurs.push(agentId);
            filtreAgent = "AND m.agent_id = $4";
        }
        const resultat = await connexion.query(`
            SELECT m.id AS mission_id, m.agent_id, m.tricycle_id, m.statut AS mission_statut,
                   c.id AS collecte_id, c.site_id,
                   (
                       SELECT MIN(me.survenu_le)
                       FROM mission_evenements me
                       WHERE me.mission_id = m.id
                         AND me.collecte_id = c.id
                         AND me.type_evenement = 'collecte_demarree'
                   ) AS collecte_demarree_le
            FROM missions m
            JOIN missions_collectes mc ON mc.mission_id = m.id
            JOIN collectes c ON c.id = mc.collecte_id
            WHERE m.id = $1 AND c.id = $2 AND m.organisation_id = $3
              ${filtreAgent}
            FOR UPDATE OF m, mc;
        `, valeurs);
        return resultat.rows[0] || null;
    }

    async trouverBalance(balanceId, organisationId, connexion = pool) {
        const resultat = await connexion.query(`
            SELECT * FROM balances
            WHERE id = $1 AND organisation_id = $2
            LIMIT 1;
        `, [balanceId, organisationId]);
        return resultat.rows[0] || null;
    }

    async trouverParOperation(operationId, organisationId, connexion = pool) {
        const resultat = await connexion.query(`
            SELECT p.*, b.numero_interne AS balance_numero
            FROM pesees p
            JOIN balances b ON b.id = p.balance_id
            WHERE p.operation_id = $1 AND p.organisation_id = $2
            LIMIT 1;
        `, [operationId, organisationId]);
        return resultat.rows[0] || null;
    }

    async trouverDerniere(collecteId, organisationId, type, connexion = pool) {
        const resultat = await connexion.query(`
            SELECT * FROM pesees
            WHERE collecte_id = $1 AND organisation_id = $2 AND type = $3
            ORDER BY date_heure DESC, cree_le DESC, id DESC
            LIMIT 1;
        `, [collecteId, organisationId, type]);
        return resultat.rows[0] || null;
    }

    async creer(donnees, connexion = pool) {
        const resultat = await connexion.query(`
            INSERT INTO pesees
                (organisation_id, collecte_id, mission_id, agent_id, utilisateur_id,
                 balance_id, poids_brut, tare, date_heure, latitude, longitude,
                 precision_gps, operation_id, type, remplace_pesee_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz,
                    $10, $11, $12, $13, $14, $15)
            ON CONFLICT (operation_id) DO NOTHING
            RETURNING *;
        `, [
            donnees.organisation_id, donnees.collecte_id, donnees.mission_id,
            donnees.agent_id, donnees.utilisateur_id, donnees.balance_id,
            donnees.poids_brut, donnees.tare, donnees.date_heure,
            donnees.latitude, donnees.longitude, donnees.precision_gps,
            donnees.operation_id, donnees.type, donnees.remplace_pesee_id
        ]);
        return resultat.rows[0] || null;
    }

    async mettreAJourPoidsCompatible(collecteId, poidsNet, utilisateurId, dateHeure, connexion = pool) {
        await connexion.query(`
            UPDATE collectes
            SET poids_reel = $1, poids_reel_saisi_par = $2,
                poids_reel_saisi_le = $3::timestamptz
            WHERE id = $4;
        `, [poidsNet, utilisateurId, dateHeure, collecteId]);
    }

    async lierPreuveParOperation(operationId, preuveId, organisationId, missionId, collecteId, utilisateurId, connexion = pool) {
        const resultat = await connexion.query(`
            UPDATE pesees
            SET preuve_id = $1
            WHERE operation_id = $2
              AND organisation_id = $3
              AND mission_id = $4
              AND collecte_id = $5
              AND utilisateur_id = $6
              AND preuve_id IS NULL
            RETURNING id;
        `, [preuveId, operationId, organisationId, missionId, collecteId, utilisateurId]);
        return resultat.rows[0] || null;
    }
}

export default new PeseeRepository();
