import pool from "../config/db.js";

class ClientCompteRepository {

    async trouverClientPourOrganisation(
        clientId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        id,
                        nom,
                        organisation_id
                    FROM clients
                    WHERE id = $1
                      AND organisation_id = $2
                    LIMIT 1
                    FOR KEY SHARE;
                `,
                [
                    clientId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async listerRolesClientGlobaux(
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        id,
                        nom,
                        organisation_id,
                        actif
                    FROM roles
                    WHERE LOWER(TRIM(nom)) = 'client'
                      AND organisation_id IS NULL
                      AND actif = TRUE
                    ORDER BY id
                    LIMIT 2;
                `
            );

        return resultat.rows;

    }

    async trouverUtilisateurParEmail(
        email,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        id,
                        email
                    FROM utilisateurs
                    WHERE LOWER(email) = LOWER($1)
                    LIMIT 1;
                `,
                [email]
            );

        return resultat.rows[0];

    }

    async creerUtilisateurClient(
        donnees,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    INSERT INTO utilisateurs (
                        nom,
                        email,
                        mot_de_passe,
                        telephone,
                        organisation_id,
                        role_id,
                        actif
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        TRUE
                    )
                    RETURNING
                        id,
                        nom,
                        email,
                        telephone,
                        organisation_id,
                        role_id,
                        actif,
                        cree_le;
                `,
                [
                    donnees.nom,
                    donnees.email,
                    donnees.mot_de_passe,
                    donnees.telephone || null,
                    donnees.organisation_id,
                    donnees.role_id
                ]
            );

        return resultat.rows[0];

    }

    async lierUtilisateurAuClient(
        donnees,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    INSERT INTO client_utilisateurs (
                        organisation_id,
                        client_id,
                        utilisateur_id,
                        actif
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        TRUE
                    )
                    RETURNING
                        id,
                        organisation_id,
                        client_id,
                        utilisateur_id,
                        actif,
                        cree_le,
                        modifie_le;
                `,
                [
                    donnees.organisation_id,
                    donnees.client_id,
                    donnees.utilisateur_id
                ]
            );

        return resultat.rows[0];

    }

}

export default new ClientCompteRepository();
