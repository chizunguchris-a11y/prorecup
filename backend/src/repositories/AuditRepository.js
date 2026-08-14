import pool from "../config/db.js";

class AuditRepository {

    async creer(
        audit,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO journaux_audit
            (
                organisation_id,
                utilisateur_id,
                action,
                ressource,
                ressource_id,
                methode_http,
                route,
                adresse_ip,
                navigateur,
                ancien_etat,
                nouvel_etat,
                contexte,
                succes,
                message_erreur
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14
            )
            RETURNING *;
        `;

        const valeurs = [

            audit.organisation_id || null,

            audit.utilisateur_id || null,

            audit.action,

            audit.ressource,

            audit.ressource_id || null,

            audit.methode_http || null,

            audit.route || null,

            audit.adresse_ip || null,

            audit.navigateur || null,

            audit.ancien_etat || null,

            audit.nouvel_etat || null,

            audit.contexte || null,

            audit.succes !== false,

            audit.message_erreur || null

        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    async lister(
        filtres,
        connexion = pool
    ) {

        const conditions = [];
        const valeurs = [];

        let index = 1;

        conditions.push(
            `organisation_id = $${index}`
        );

        valeurs.push(
            filtres.organisation_id
        );

        index += 1;

        if (filtres.utilisateur_id) {

            conditions.push(
                `utilisateur_id = $${index}`
            );

            valeurs.push(
                filtres.utilisateur_id
            );

            index += 1;

        }

        if (filtres.action) {

            conditions.push(
                `action = $${index}`
            );

            valeurs.push(
                filtres.action
            );

            index += 1;

        }

        if (filtres.ressource) {

            conditions.push(
                `ressource = $${index}`
            );

            valeurs.push(
                filtres.ressource
            );

            index += 1;

        }

        if (filtres.ressource_id) {

            conditions.push(
                `ressource_id = $${index}`
            );

            valeurs.push(
                filtres.ressource_id
            );

            index += 1;

        }

        if (filtres.succes !== undefined) {

            conditions.push(
                `succes = $${index}`
            );

            valeurs.push(
                filtres.succes
            );

            index += 1;

        }

        if (filtres.date_debut) {

            conditions.push(
                `cree_le >= $${index}`
            );

            valeurs.push(
                filtres.date_debut
            );

            index += 1;

        }

        if (filtres.date_fin) {

            conditions.push(
                `cree_le <= $${index}`
            );

            valeurs.push(
                filtres.date_fin
            );

            index += 1;

        }

        if (filtres.recherche) {

            conditions.push(`
                (
                    action ILIKE $${index}
                    OR ressource ILIKE $${index}
                    OR route ILIKE $${index}
                    OR message_erreur ILIKE $${index}
                    OR contexte::text ILIKE $${index}
                )
            `);

            valeurs.push(
                `%${filtres.recherche}%`
            );

            index += 1;

        }

        const limite =
            Math.min(
                Math.max(
                    Number(
                        filtres.limite || 50
                    ),
                    1
                ),
                200
            );

        const page =
            Math.max(
                Number(
                    filtres.page || 1
                ),
                1
            );

        const offset =
            (page - 1) * limite;

        const requete = `
            SELECT
                id,
                organisation_id,
                utilisateur_id,
                action,
                ressource,
                ressource_id,
                methode_http,
                route,
                adresse_ip,
                navigateur,
                ancien_etat,
                nouvel_etat,
                contexte,
                succes,
                message_erreur,
                cree_le

            FROM journaux_audit

            WHERE
                ${conditions.join(" AND ")}

            ORDER BY cree_le DESC

            LIMIT $${index}
            OFFSET $${index + 1};
        `;

        valeurs.push(
            limite,
            offset
        );

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows;

    }

    async compter(
        filtres,
        connexion = pool
    ) {

        const conditions = [
            "organisation_id = $1"
        ];

        const valeurs = [
            filtres.organisation_id
        ];

        let index = 2;

        if (filtres.utilisateur_id) {

            conditions.push(
                `utilisateur_id = $${index}`
            );

            valeurs.push(
                filtres.utilisateur_id
            );

            index += 1;

        }

        if (filtres.action) {

            conditions.push(
                `action = $${index}`
            );

            valeurs.push(
                filtres.action
            );

            index += 1;

        }

        if (filtres.ressource) {

            conditions.push(
                `ressource = $${index}`
            );

            valeurs.push(
                filtres.ressource
            );

            index += 1;

        }

        if (filtres.succes !== undefined) {

            conditions.push(
                `succes = $${index}`
            );

            valeurs.push(
                filtres.succes
            );

            index += 1;

        }

        if (filtres.date_debut) {

            conditions.push(
                `cree_le >= $${index}`
            );

            valeurs.push(
                filtres.date_debut
            );

            index += 1;

        }

        if (filtres.date_fin) {

            conditions.push(
                `cree_le <= $${index}`
            );

            valeurs.push(
                filtres.date_fin
            );

            index += 1;

        }

        if (filtres.recherche) {

            conditions.push(`
                (
                    action ILIKE $${index}
                    OR ressource ILIKE $${index}
                    OR route ILIKE $${index}
                    OR message_erreur ILIKE $${index}
                    OR contexte::text ILIKE $${index}
                )
            `);

            valeurs.push(
                `%${filtres.recherche}%`
            );

        }

        const requete = `
            SELECT COUNT(*)::integer AS total
            FROM journaux_audit
            WHERE ${conditions.join(" AND ")};
        `;

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0].total;

    }

    async trouverParId(
        auditId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM journaux_audit
            WHERE id = $1
              AND organisation_id = $2;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    auditId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

}

export default new AuditRepository();