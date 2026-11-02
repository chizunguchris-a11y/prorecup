import pool from '../config/db.js';
class VenteOperationRepository {
    async reserver(organisationId, operationId, auteurId, demande, empreinte, client) {
        const result = await client.query(`INSERT INTO vente_operations
            (organisation_id,operation_id,auteur_id,demande,empreinte)
            VALUES ($1,$2,$3,$4::jsonb,$5)
            ON CONFLICT (organisation_id,operation_id) DO NOTHING RETURNING operation_id`,
            [organisationId,operationId,auteurId,JSON.stringify(demande),empreinte]);
        return result.rowCount === 1;
    }
    async trouver(organisationId, operationId, client = pool, verrouiller = false) {
        const result = await client.query(`SELECT * FROM vente_operations
            WHERE organisation_id=$1 AND operation_id=$2 ${verrouiller ? 'FOR UPDATE' : ''}`, [organisationId,operationId]);
        return result.rows[0] || null;
    }
    async terminer(organisationId, operationId, auteurId, venteId, reponse, client) {
        const result = await client.query(`UPDATE vente_operations SET vente_id=$4,reponse=$5::jsonb,terminee_le=CURRENT_TIMESTAMP
            WHERE organisation_id=$1 AND operation_id=$2 AND auteur_id=$3 AND reponse IS NULL RETURNING reponse`,
            [organisationId,operationId,auteurId,venteId,JSON.stringify(reponse)]);
        if (result.rowCount !== 1) throw new Error('Réservation de vente non acquittable.');
        return result.rows[0].reponse;
    }
}
export default new VenteOperationRepository();
