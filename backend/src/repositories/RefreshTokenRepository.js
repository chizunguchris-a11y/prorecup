import pool from "../config/db.js";

class RefreshTokenRepository {

    async creer(
        donnees,
        connexion = pool
    ) {

        /*
         * Nettoyage léger avant de créer une nouvelle session.
         * Cela évite l'accumulation de jetons expirés.
         */
        await this.supprimerExpires(
            connexion
        );

        const requete = `
            INSERT INTO refresh_tokens
            (
                utilisateur_id,
                token_hash,
                expire_le,
                adresse_ip,
                navigateur
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5
            )
            RETURNING
                id,
                utilisateur_id,
                expire_le,
                adresse_ip,
                navigateur,
                cree_le;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    donnees.utilisateur_id,
                    donnees.token_hash,
                    donnees.expire_le,
                    donnees.adresse_ip || null,
                    donnees.navigateur || null
                ]
            );

        /*
         * Maximum cinq sessions actives par utilisateur.
         * Les plus anciennes sont automatiquement révoquées.
         */
        await this.limiterSessionsActives(
            donnees.utilisateur_id,
            5,
            connexion
        );

        return resultat.rows[0];

    }

    async trouverValideParHash(
        tokenHash,
        connexion = pool
    ) {

        const requete = `
            SELECT
                rt.id,
                rt.utilisateur_id,
                rt.token_hash,
                rt.expire_le,
                rt.revoque,
                rt.adresse_ip,
                rt.navigateur,
                rt.cree_le,

                u.nom,
                u.email,
                u.organisation_id,
                u.role_id,
                u.actif,

                r.nom AS role_nom

            FROM refresh_tokens rt

            JOIN utilisateurs u
                ON u.id =
                    rt.utilisateur_id

            LEFT JOIN roles r
                ON r.id = u.role_id

            WHERE rt.token_hash = $1
              AND rt.revoque = false
              AND rt.expire_le >
                    CURRENT_TIMESTAMP

            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [tokenHash]
            );

        return resultat.rows[0];

    }

    async listerActifsParUtilisateur(
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                utilisateur_id,
                expire_le,
                adresse_ip,
                navigateur,
                cree_le

            FROM refresh_tokens

            WHERE utilisateur_id = $1
              AND revoque = false
              AND expire_le >
                    CURRENT_TIMESTAMP

            ORDER BY cree_le DESC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [utilisateurId]
            );

        return resultat.rows;

    }

    async compterActifs(
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                COUNT(*)::integer AS total

            FROM refresh_tokens

            WHERE utilisateur_id = $1
              AND revoque = false
              AND expire_le >
                    CURRENT_TIMESTAMP;
        `;

        const resultat =
            await connexion.query(
                requete,
                [utilisateurId]
            );

        return Number(
            resultat.rows[0]?.total ||
            0
        );

    }

    async revoquerParHash(
        tokenHash,
        connexion = pool
    ) {

        const requete = `
            UPDATE refresh_tokens
            SET
                revoque = true,
                revoque_le =
                    CURRENT_TIMESTAMP

            WHERE token_hash = $1
              AND revoque = false

            RETURNING id;
        `;

        const resultat =
            await connexion.query(
                requete,
                [tokenHash]
            );

        return resultat.rows[0];

    }

    async revoquerTousPourUtilisateur(
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            UPDATE refresh_tokens
            SET
                revoque = true,
                revoque_le =
                    CURRENT_TIMESTAMP

            WHERE utilisateur_id = $1
              AND revoque = false;
        `;

        const resultat =
            await connexion.query(
                requete,
                [utilisateurId]
            );

        return resultat.rowCount;

    }

    async revoquerTousSaufHash(
        utilisateurId,
        tokenHashConserve,
        connexion = pool
    ) {

        const requete = `
            UPDATE refresh_tokens
            SET
                revoque = true,
                revoque_le =
                    CURRENT_TIMESTAMP

            WHERE utilisateur_id = $1
              AND token_hash <> $2
              AND revoque = false;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    utilisateurId,
                    tokenHashConserve
                ]
            );

        return resultat.rowCount;

    }

    async limiterSessionsActives(
        utilisateurId,
        limite = 5,
        connexion = pool
    ) {

        const limiteFinale =
            Math.max(
                Number(limite) || 5,
                1
            );

        const requete = `
            WITH sessions_a_revoquer AS
            (
                SELECT id

                FROM refresh_tokens

                WHERE utilisateur_id = $1
                  AND revoque = false
                  AND expire_le >
                        CURRENT_TIMESTAMP

                ORDER BY cree_le DESC

                OFFSET $2
            )

            UPDATE refresh_tokens
            SET
                revoque = true,
                revoque_le =
                    CURRENT_TIMESTAMP

            WHERE id IN
            (
                SELECT id
                FROM sessions_a_revoquer
            );
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    utilisateurId,
                    limiteFinale
                ]
            );

        return resultat.rowCount;

    }

    async supprimerExpires(
        connexion = pool
    ) {

        const requete = `
            DELETE FROM refresh_tokens

            WHERE expire_le <
                    CURRENT_TIMESTAMP

               OR
               (
                    revoque = true

                    AND revoque_le <
                        CURRENT_TIMESTAMP
                        - INTERVAL '7 days'
               );
        `;

        const resultat =
            await connexion.query(
                requete
            );

        return resultat.rowCount;

    }

}

export default new RefreshTokenRepository();