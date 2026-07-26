import pool from "../config/db.js";

class StockRepository {

    async trouverParTypeDechet(
        organisationId,
        typeDechetId,
        client = pool
    ) {

        const requete = `
            SELECT *
            FROM stocks
            WHERE organisation_id = $1
              AND type_dechet_id = $2;
        `;

        const resultat = await client.query(
            requete,
            [
                organisationId,
                typeDechetId
            ]
        );

        return resultat.rows[0];
    }

    async trouverParIdPourMiseAJour(
        stockId,
        organisationId,
        client = pool
    ) {

        const requete = `
            SELECT *
            FROM stocks
            WHERE id = $1
              AND organisation_id = $2
            FOR UPDATE;
        `;

        const resultat = await client.query(
            requete,
            [
                stockId,
                organisationId
            ]
        );

        return resultat.rows[0];
    }

    async creer(
        organisationId,
        typeDechetId,
        quantite,
        client = pool
    ) {

        const requete = `
            INSERT INTO stocks
            (
                organisation_id,
                type_dechet_id,
                quantite
            )
            VALUES ($1, $2, $3)
            RETURNING *;
        `;

        const resultat = await client.query(
            requete,
            [
                organisationId,
                typeDechetId,
                quantite
            ]
        );

        return resultat.rows[0];
    }

    async mettreAJour(
        id,
        nouvelleQuantite,
        client = pool
    ) {

        const requete = `
            UPDATE stocks
            SET
                quantite = $1,
                date_mise_a_jour = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *;
        `;

        const resultat = await client.query(
            requete,
            [
                nouvelleQuantite,
                id
            ]
        );

        return resultat.rows[0];
    }

    async listerParOrganisation(
        organisationId,
        client = pool
    ) {

        const requete = `
            SELECT
                s.id,
                s.organisation_id,
                s.type_dechet_id,
                td.nom AS type_dechet,
                s.quantite,
                s.unite,
                s.date_mise_a_jour
            FROM stocks s
            JOIN types_dechets td
                ON td.id = s.type_dechet_id
            WHERE s.organisation_id = $1
            ORDER BY td.nom ASC;
        `;

        const resultat = await client.query(
            requete,
            [organisationId]
        );

        return resultat.rows;
    }

}

export default new StockRepository();