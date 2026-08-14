import pool from "../config/db.js";

class NotificationRepository {

    async creer(
        notification,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO notifications
            (
                organisation_id,
                utilisateur_id,
                type,
                categorie,
                titre,
                message,
                ressource,
                ressource_id,
                lien,
                contexte,
                expire_le
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
                $11
            )
            RETURNING *;
        `;

        const valeurs = [
            notification.organisation_id,
            notification.utilisateur_id || null,
            notification.type,
            notification.categorie,
            notification.titre,
            notification.message,
            notification.ressource || null,
            notification.ressource_id || null,
            notification.lien || null,
            notification.contexte || null,
            notification.expire_le || null
        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    }

    construireConditions(
        filtres
    ) {

        const conditions = [
            "n.organisation_id = $1",
            `
                (
                    n.utilisateur_id IS NULL
                    OR n.utilisateur_id = $2
                )
            `,
            `
                (
                    n.expire_le IS NULL
                    OR n.expire_le >
                        CURRENT_TIMESTAMP
                )
            `,
            `
                COALESCE(
                    nu.supprimee,
                    false
                ) = false
            `
        ];

        const valeurs = [
            filtres.organisation_id,
            filtres.utilisateur_id
        ];

        let index = 3;

        if (filtres.type) {

            conditions.push(
                `n.type = $${index}`
            );

            valeurs.push(
                filtres.type
            );

            index += 1;

        }

        if (filtres.categorie) {

            conditions.push(
                `n.categorie = $${index}`
            );

            valeurs.push(
                filtres.categorie
            );

            index += 1;

        }

        if (
            filtres.lue !==
            undefined
        ) {

            conditions.push(
                `
                    COALESCE(
                        nu.lue,
                        false
                    ) = $${index}
                `
            );

            valeurs.push(
                filtres.lue
            );

            index += 1;

        }

        if (filtres.recherche) {

            conditions.push(`
                (
                    n.titre ILIKE $${index}
                    OR n.message ILIKE $${index}
                    OR n.categorie ILIKE $${index}
                    OR COALESCE(
                        n.ressource,
                        ''
                    ) ILIKE $${index}
                )
            `);

            valeurs.push(
                `%${filtres.recherche}%`
            );

            index += 1;

        }

        return {
            conditions,
            valeurs,
            prochainIndex:
                index
        };

    }

    async lister(
        filtres,
        connexion = pool
    ) {

        const construction =
            this.construireConditions(
                filtres
            );

        const conditions =
            construction.conditions;

        const valeurs =
            construction.valeurs;

        let index =
            construction.prochainIndex;

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
            (page - 1) *
            limite;

        const requete = `
            SELECT
                n.id,
                n.organisation_id,
                n.utilisateur_id,
                n.type,
                n.categorie,
                n.titre,
                n.message,
                n.ressource,
                n.ressource_id,
                n.lien,
                n.contexte,
                n.cree_le,
                n.expire_le,

                COALESCE(
                    nu.lue,
                    false
                ) AS lue,

                nu.lue_le

            FROM notifications n

            LEFT JOIN
                notifications_utilisateurs nu
                ON nu.notification_id = n.id
               AND nu.utilisateur_id = $2

            WHERE
                ${conditions.join(" AND ")}

            ORDER BY
                COALESCE(
                    nu.lue,
                    false
                ) ASC,
                n.cree_le DESC

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

        const construction =
            this.construireConditions(
                filtres
            );

        const requete = `
            SELECT
                COUNT(*)::integer
                    AS total

            FROM notifications n

            LEFT JOIN
                notifications_utilisateurs nu
                ON nu.notification_id = n.id
               AND nu.utilisateur_id = $2

            WHERE
                ${construction.conditions.join(
                    " AND "
                )};
        `;

        const resultat =
            await connexion.query(
                requete,
                construction.valeurs
            );

        return resultat.rows[0].total;

    }

    async compterNonLues(
        organisationId,
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                COUNT(*)::integer
                    AS total

            FROM notifications n

            LEFT JOIN
                notifications_utilisateurs nu
                ON nu.notification_id = n.id
               AND nu.utilisateur_id = $2

            WHERE n.organisation_id = $1

              AND (
                    n.utilisateur_id IS NULL
                    OR n.utilisateur_id = $2
              )

              AND (
                    n.expire_le IS NULL
                    OR n.expire_le >
                        CURRENT_TIMESTAMP
              )

              AND COALESCE(
                    nu.lue,
                    false
                  ) = false

              AND COALESCE(
                    nu.supprimee,
                    false
                  ) = false;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    organisationId,
                    utilisateurId
                ]
            );

        return resultat.rows[0].total;

    }

    async trouverParId(
        notificationId,
        organisationId,
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                n.*,

                COALESCE(
                    nu.lue,
                    false
                ) AS lue,

                nu.lue_le,

                COALESCE(
                    nu.supprimee,
                    false
                ) AS supprimee

            FROM notifications n

            LEFT JOIN
                notifications_utilisateurs nu
                ON nu.notification_id = n.id
               AND nu.utilisateur_id = $3

            WHERE n.id = $1
              AND n.organisation_id = $2

              AND (
                    n.utilisateur_id IS NULL
                    OR n.utilisateur_id = $3
              )

              AND COALESCE(
                    nu.supprimee,
                    false
                  ) = false;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    notificationId,
                    organisationId,
                    utilisateurId
                ]
            );

        return resultat.rows[0];

    }

    async marquerCommeLue(
        notificationId,
        organisationId,
        utilisateurId,
        connexion = pool
    ) {

        const notification =
            await this.trouverParId(
                notificationId,
                organisationId,
                utilisateurId,
                connexion
            );

        if (!notification) {
            return null;
        }

        const requete = `
            INSERT INTO
                notifications_utilisateurs
            (
                notification_id,
                utilisateur_id,
                lue,
                lue_le,
                supprimee,
                supprimee_le
            )
            VALUES
            (
                $1,
                $2,
                true,
                CURRENT_TIMESTAMP,
                false,
                null
            )

            ON CONFLICT
            (
                notification_id,
                utilisateur_id
            )
            DO UPDATE
            SET
                lue = true,

                lue_le =
                    COALESCE(
                        notifications_utilisateurs
                            .lue_le,
                        CURRENT_TIMESTAMP
                    ),

                supprimee = false,

                supprimee_le = null,

                modifie_le =
                    CURRENT_TIMESTAMP

            RETURNING *;
        `;

        await connexion.query(
            requete,
            [
                notificationId,
                utilisateurId
            ]
        );

        return this.trouverParId(
            notificationId,
            organisationId,
            utilisateurId,
            connexion
        );

    }

    async marquerToutesCommeLues(
        organisationId,
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO
                notifications_utilisateurs
            (
                notification_id,
                utilisateur_id,
                lue,
                lue_le,
                supprimee,
                supprimee_le
            )

            SELECT
                n.id,
                $2,
                true,
                CURRENT_TIMESTAMP,
                false,
                null

            FROM notifications n

            LEFT JOIN
                notifications_utilisateurs nu
                ON nu.notification_id = n.id
               AND nu.utilisateur_id = $2

            WHERE n.organisation_id = $1

              AND (
                    n.utilisateur_id IS NULL
                    OR n.utilisateur_id = $2
              )

              AND (
                    n.expire_le IS NULL
                    OR n.expire_le >
                        CURRENT_TIMESTAMP
              )

              AND COALESCE(
                    nu.supprimee,
                    false
                  ) = false

              AND COALESCE(
                    nu.lue,
                    false
                  ) = false

            ON CONFLICT
            (
                notification_id,
                utilisateur_id
            )
            DO UPDATE
            SET
                lue = true,

                lue_le =
                    COALESCE(
                        notifications_utilisateurs
                            .lue_le,
                        CURRENT_TIMESTAMP
                    ),

                modifie_le =
                    CURRENT_TIMESTAMP

            RETURNING notification_id;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    organisationId,
                    utilisateurId
                ]
            );

        return resultat.rowCount;

    }

    async supprimer(
        notificationId,
        organisationId,
        utilisateurId,
        connexion = pool
    ) {

        const notification =
            await this.trouverParId(
                notificationId,
                organisationId,
                utilisateurId,
                connexion
            );

        if (!notification) {
            return null;
        }

        const requete = `
            INSERT INTO
                notifications_utilisateurs
            (
                notification_id,
                utilisateur_id,
                lue,
                lue_le,
                supprimee,
                supprimee_le
            )
            VALUES
            (
                $1,
                $2,
                true,
                CURRENT_TIMESTAMP,
                true,
                CURRENT_TIMESTAMP
            )

            ON CONFLICT
            (
                notification_id,
                utilisateur_id
            )
            DO UPDATE
            SET
                lue = true,

                lue_le =
                    COALESCE(
                        notifications_utilisateurs
                            .lue_le,
                        CURRENT_TIMESTAMP
                    ),

                supprimee = true,

                supprimee_le =
                    CURRENT_TIMESTAMP,

                modifie_le =
                    CURRENT_TIMESTAMP

            RETURNING *;
        `;

        await connexion.query(
            requete,
            [
                notificationId,
                utilisateurId
            ]
        );

        return notification;

    }

}

export default new NotificationRepository();