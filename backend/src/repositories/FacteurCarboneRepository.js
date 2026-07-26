import pool from "../config/db.js";

class FacteurCarboneRepository {

    async trouverFacteurApplicable(
        typeDechetId,
        dateReference,
        client = pool
    ) {

        const requete = `
            SELECT *
            FROM facteurs_carbone
            WHERE type_dechet_id = $1
              AND statut IN ('provisoire', 'valide')
              AND date_debut_validite <= $2
              AND (
                    date_fin_validite IS NULL
                    OR date_fin_validite >= $2
                  )
            ORDER BY
                CASE
                    WHEN statut = 'valide' THEN 1
                    ELSE 2
                END,
                date_debut_validite DESC
            LIMIT 1;
        `;

        const resultat = await client.query(
            requete,
            [
                typeDechetId,
                dateReference
            ]
        );

        return resultat.rows[0];
    }

}

export default new FacteurCarboneRepository();