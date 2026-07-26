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
                collecte_id,
                poids_reel,
                type_dechet_id,
                statut_lot
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;

        const valeurs = [
            lot.collecte_id,
            lot.poids_reel,
            lot.type_dechet_id,
            lot.statut_lot || "en_stock"
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
            l.collecte_id,
            l.poids_reel,
            l.statut_lot,

            td.nom AS type_dechet,

            c.statut AS statut_collecte,

            cl.nom AS client_nom,

            s.nom AS site_nom

        FROM lots l

        JOIN collectes c
            ON c.id = l.collecte_id

        JOIN clients cl
            ON cl.id = c.client_id

        JOIN sites_de_collecte s
            ON s.id = c.site_id

        JOIN types_dechets td
            ON td.id = l.type_dechet_id

        WHERE cl.organisation_id = $1
          AND s.organisation_id = $1

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