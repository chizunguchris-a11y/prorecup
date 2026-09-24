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
                type_dechet_id,
                statut_lot,
                code_qr,
                site_courant_id,
                client_courant_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
