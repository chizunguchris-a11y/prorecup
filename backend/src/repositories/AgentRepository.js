import pool from "../config/db.js";

class AgentRepository {

    async trouverUtilisateurParIdPourOrganisation(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                nom,
                email,
                organisation_id,
                role_id
            FROM utilisateurs
            WHERE id = $1
              AND organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async trouverParUtilisateurId(
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM agents
            WHERE utilisateur_id = $1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [utilisateurId]
            );

        return resultat.rows[0];

    }

    async creer(
        agent,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO agents
            (
                utilisateur_id,
                telephone,
                photo_url,
                statut,
                disponible,
                date_embauche
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const valeurs = [
            agent.utilisateur_id,
            agent.telephone || null,
            agent.photo_url || null,
            agent.statut || "actif",
            agent.disponible !== undefined
                ? agent.disponible
                : true,
            agent.date_embauche || null
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
                a.id,
                a.utilisateur_id,
                a.telephone,
                a.photo_url,
                a.statut,
                a.disponible,
                a.date_embauche,
                a.cree_le,
                a.modifie_le,

                u.nom,
                u.email,
                u.organisation_id,
                u.role_id

            FROM agents a

            JOIN utilisateurs u
                ON u.id = a.utilisateur_id

            WHERE u.organisation_id = $1

            ORDER BY u.nom ASC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    }

    async trouverParIdPourOrganisation(
        agentId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                a.id,
                a.utilisateur_id,
                a.telephone,
                a.photo_url,
                a.statut,
                a.disponible,
                a.date_embauche,
                a.cree_le,
                a.modifie_le,

                u.nom,
                u.email,
                u.organisation_id,
                u.role_id

            FROM agents a

            JOIN utilisateurs u
                ON u.id = a.utilisateur_id

            WHERE a.id = $1
              AND u.organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    agentId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

    async modifier(
        agentId,
        organisationId,
        donnees,
        connexion = pool
    ) {

        const requete = `
            UPDATE agents a
            SET
                telephone = $1,
                photo_url = $2,
                disponible = $3,
                date_embauche = $4,
                modifie_le = CURRENT_TIMESTAMP

            FROM utilisateurs u

            WHERE a.id = $5
              AND u.id = a.utilisateur_id
              AND u.organisation_id = $6

            RETURNING a.*;
        `;

        const valeurs = [
            donnees.telephone || null,
            donnees.photo_url || null,
            donnees.disponible,
            donnees.date_embauche || null,
            agentId,
            organisationId
        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    async modifierStatut(
        agentId,
        organisationId,
        statut,
        disponible,
        connexion = pool
    ) {

        const requete = `
            UPDATE agents a
            SET
                statut = $1,
                disponible = $2,
                modifie_le = CURRENT_TIMESTAMP

            FROM utilisateurs u

            WHERE a.id = $3
              AND u.id = a.utilisateur_id
              AND u.organisation_id = $4

            RETURNING a.*;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    statut,
                    disponible,
                    agentId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }
async listerUtilisateursDisponibles(
    organisationId,
    connexion = pool
) {

    const requete = `
        SELECT
            u.id,
            u.nom,
            u.email,
            u.organisation_id,
            u.role_id
        FROM utilisateurs u

        LEFT JOIN agents a
            ON a.utilisateur_id = u.id

        WHERE u.organisation_id = $1
          AND a.id IS NULL

        ORDER BY u.nom ASC;
    `;

    const resultat =
        await connexion.query(
            requete,
            [organisationId]
        );

    return resultat.rows;

}

}

export default new AgentRepository();
