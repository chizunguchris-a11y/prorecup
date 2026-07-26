import pool from "../config/db.js";

class ClientRepository {

    async creer(
        client,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO clients
            (
                nom,
                type_client,
                contact_email,
                contact_telephone,
                adresse_siege,
                organisation_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const valeurs = [
            client.nom,
            client.type_client || null,
            client.contact_email || null,
            client.contact_telephone || null,
            client.adresse_siege || null,
            client.organisation_id
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
                type_client,
                contact_email,
                contact_telephone,
                adresse_siege,
                organisation_id
            FROM clients
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
                type_client,
                contact_email,
                contact_telephone,
                adresse_siege,
                organisation_id
            FROM clients
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
        client,
        connexion = pool
    ) {

        const requete = `
            UPDATE clients
            SET
                nom = $1,
                type_client = $2,
                contact_email = $3,
                contact_telephone = $4,
                adresse_siege = $5
            WHERE id = $6
              AND organisation_id = $7
            RETURNING *;
        `;

        const valeurs = [
            client.nom,
            client.type_client || null,
            client.contact_email || null,
            client.contact_telephone || null,
            client.adresse_siege || null,
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
        clientId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT COUNT(*)::integer AS nombre
            FROM collectes c
            JOIN clients cl
                ON cl.id = c.client_id
            WHERE c.client_id = $1
              AND cl.organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    clientId,
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
            DELETE FROM clients
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

export default new ClientRepository();