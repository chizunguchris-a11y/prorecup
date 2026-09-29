import pool
    from "../config/db.js";

class PortailClientRepository {

    async trouverUtilisateur(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        u.id AS utilisateur_id,
                        u.nom AS utilisateur_nom,
                        u.email AS utilisateur_email,
                        u.telephone
                            AS utilisateur_telephone,
                        u.photo_url
                            AS utilisateur_photo_url,
                        u.organisation_id,
                        u.actif
                            AS utilisateur_actif,

                        r.id AS role_id,
                        r.nom AS role_nom,
                        r.actif AS role_actif

                    FROM utilisateurs u

                    JOIN roles r
                      ON r.id = u.role_id

                    WHERE u.id = $1
                      AND u.organisation_id = $2

                    LIMIT 1;
                `,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }


    async listerClientsAutorises(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                    SELECT
                        cu.id AS liaison_id,
                        cu.actif AS liaison_active,

                        c.id AS client_id,
                        c.nom AS client_nom,
                        c.type_client,
                        c.secteur_activite,
                        c.contact_email,
                        c.contact_telephone,
                        c.adresse_siege,
                        c.organisation_id

                    FROM client_utilisateurs cu

                    JOIN clients c
                      ON c.id = cu.client_id
                     AND c.organisation_id =
                         cu.organisation_id

                    WHERE cu.utilisateur_id = $1
                      AND cu.organisation_id = $2
                      AND cu.actif = TRUE

                    ORDER BY
                        c.nom ASC,
                        c.id ASC;
                `,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows;

    }

}

export default new PortailClientRepository();
