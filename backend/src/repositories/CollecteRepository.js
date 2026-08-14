import pool from "../config/db.js";

class CollecteRepository {

    async creer(
        collecte,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO collectes
            (
                site_id,
                client_id,
                agent_id,
                type_dechet_id,
                poids_estime,
                statut
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const valeurs = [
            collecte.site_id,
            collecte.client_id,
            collecte.agent_id || null,
            collecte.type_dechet_id,
            collecte.poids_estime,
            collecte.statut || "en_attente"
        ];

        const resultat =
            await connexion.query(
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
                c.id,
                c.site_id,
                c.client_id,
                c.agent_id,
                c.type_dechet_id,
		c.date_collecte,
                c.poids_estime,
                c.statut,

                s.nom AS site_nom,
                s.adresse AS site_adresse,

                cl.nom AS client_nom,
                cl.type_client,

                td.nom AS type_dechet,

                u.nom AS agent_nom

            FROM collectes c

            JOIN sites_de_collecte s
                ON s.id = c.site_id

            JOIN clients cl
                ON cl.id = c.client_id

            JOIN types_dechets td
                ON td.id = c.type_dechet_id

            LEFT JOIN utilisateurs u
                ON u.id = c.agent_id

            WHERE cl.organisation_id = $1
              AND s.organisation_id = $1

            ORDER BY c.id DESC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    }

    // Utilisé notamment par LotService
    async trouverParId(
        id,
        connexion = pool
    ) {

        const requete = `
            SELECT
                c.*,
                cl.organisation_id
            FROM collectes c

            JOIN clients cl
                ON cl.id = c.client_id

            WHERE c.id = $1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [id]
            );

        return resultat.rows[0];

    }

    async trouverParIdPourOrganisation(
        id,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                c.*,
                cl.organisation_id
            FROM collectes c

            JOIN clients cl
                ON cl.id = c.client_id

            JOIN sites_de_collecte s
                ON s.id = c.site_id

            WHERE c.id = $1
              AND cl.organisation_id = $2
              AND s.organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    id,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async validerCollecte(
        id,
        connexion = pool
    ) {

        const requete = `
            UPDATE collectes
            SET statut = 'valide'
            WHERE id = $1
            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [id]
            );

        return resultat.rows[0];

    }

}

export default new CollecteRepository();