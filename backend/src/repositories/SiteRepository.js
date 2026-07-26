import pool from "../config/db.js";

class SiteRepository {

    async creer(
        site,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO sites_de_collecte
            (
                nom,
                adresse,
                zone_geographique,
                responsable_nom,
                organisation_id
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const valeurs = [
            site.nom,
            site.adresse || null,
            site.zone_geographique || null,
            site.responsable_nom || null,
            site.organisation_id
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
                id,
                nom,
                adresse,
                zone_geographique,
                responsable_nom,
                organisation_id
            FROM sites_de_collecte
            WHERE organisation_id = $1
            ORDER BY nom ASC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    }

    async trouverParIdPourOrganisation(
        id,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                nom,
                adresse,
                zone_geographique,
                responsable_nom,
                organisation_id
            FROM sites_de_collecte
            WHERE id = $1
              AND organisation_id = $2;
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

    async modifier(
        id,
        organisationId,
        site,
        connexion = pool
    ) {

        const requete = `
            UPDATE sites_de_collecte
            SET
                nom = $1,
                adresse = $2,
                zone_geographique = $3,
                responsable_nom = $4
            WHERE id = $5
              AND organisation_id = $6
            RETURNING *;
        `;

        const valeurs = [
            site.nom,
            site.adresse || null,
            site.zone_geographique || null,
            site.responsable_nom || null,
            id,
            organisationId
        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    async compterCollectesLiees(
        siteId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT COUNT(*)::integer AS nombre
            FROM collectes c

            JOIN sites_de_collecte s
                ON s.id = c.site_id

            WHERE c.site_id = $1
              AND s.organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    siteId,
                    organisationId
                ]
            );

        return Number(
            resultat.rows[0]?.nombre || 0
        );

    }

    async supprimer(
        id,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            DELETE FROM sites_de_collecte
            WHERE id = $1
              AND organisation_id = $2
            RETURNING *;
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

}

export default new SiteRepository();