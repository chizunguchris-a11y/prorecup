import pool
    from "../config/db.js";


const identityRecoveryRepository = {

    async trouverUtilisateurParEmail(
        email,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    id,
                    nom,
                    email,
                    telephone,
                    actif,
                    organisation_id,
                    email_verifie_le,
                    telephone_verifie_le
                FROM utilisateurs
                WHERE LOWER(email) =
                    LOWER($1)
                LIMIT 1;
                `,
                [
                    String(
                        email || ""
                    ).trim()
                ]
            );


        return resultat.rows[0] ||
            null;

    },


    async trouverUtilisateurParIdentifiant(
        identifiant,
        connexion = pool
    ) {

        const valeur =
            String(
                identifiant || ""
            ).trim();


        if (!valeur) {

            return null;

        }


        /*
         * Important :
         * un email n'est compare qu'aux emails.
         * Un telephone n'est compare que si au moins
         * 6 chiffres ont ete fournis.
         *
         * Cela evite qu'une chaine sans chiffre
         * corresponde accidentellement a un telephone vide.
         */

        const resultat =
            await connexion.query(
                `
                WITH entree AS (
                    SELECT
                        LOWER(
                            TRIM($1)
                        ) AS brut,

                        regexp_replace(
                            COALESCE(
                                $1,
                                ''
                            ),
                            '[^0-9]',
                            '',
                            'g'
                        ) AS chiffres
                )

                SELECT
                    u.id,
                    u.nom,
                    u.email,
                    u.telephone,
                    u.actif,
                    u.organisation_id,
                    u.email_verifie_le,
                    u.telephone_verifie_le

                FROM utilisateurs u
                CROSS JOIN entree e

                WHERE (
                    POSITION(
                        '@' IN e.brut
                    ) > 0
                    AND
                    LOWER(
                        COALESCE(
                            u.email,
                            ''
                        )
                    ) = e.brut
                )
                OR (
                    LENGTH(
                        e.chiffres
                    ) >= 6
                    AND
                    regexp_replace(
                        COALESCE(
                            u.telephone,
                            ''
                        ),
                        '[^0-9]',
                        '',
                        'g'
                    ) = e.chiffres
                )

                LIMIT 1;
                `,
                [
                    valeur
                ]
            );


        return resultat.rows[0] ||
            null;

    },


    async invaliderTokens(
        utilisateurId,
        purpose,
        connexion = pool
    ) {

        await connexion.query(
            `
            UPDATE identity_recovery_tokens
            SET
                utilise_le =
                    CURRENT_TIMESTAMP
            WHERE utilisateur_id = $1
              AND purpose = $2
              AND utilise_le IS NULL;
            `,
            [
                utilisateurId,
                purpose
            ]
        );

    },


    async creerToken(
        donnees,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                INSERT INTO identity_recovery_tokens (
                    id,
                    utilisateur_id,
                    purpose,
                    channel,
                    token_hash,
                    code_hash,
                    destination_hint,
                    expire_le,
                    adresse_ip,
                    user_agent
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10
                )
                RETURNING
                    id,
                    utilisateur_id,
                    purpose,
                    channel,
                    expire_le;
                `,
                [
                    donnees.id,
                    donnees.utilisateurId,
                    donnees.purpose,
                    donnees.channel,
                    donnees.tokenHash ||
                        null,
                    donnees.codeHash ||
                        null,
                    donnees.destinationHint ||
                        null,
                    donnees.expireLe,
                    donnees.adresseIp ||
                        null,
                    donnees.userAgent ||
                        null
                ]
            );


        return resultat.rows[0];

    },


    async trouverTokenValide(
        tokenHash,
        purpose,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    id,
                    utilisateur_id,
                    purpose,
                    channel,
                    expire_le,
                    utilise_le
                FROM identity_recovery_tokens
                WHERE token_hash = $1
                  AND purpose = $2
                  AND utilise_le IS NULL
                  AND expire_le >
                        CURRENT_TIMESTAMP
                LIMIT 1
                FOR UPDATE;
                `,
                [
                    tokenHash,
                    purpose
                ]
            );


        return resultat.rows[0] ||
            null;

    },


    async verrouillerUtilisateur(
        utilisateurId,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                SELECT
                    id,
                    nom,
                    email,
                    telephone,
                    actif,
                    mot_de_passe,
                    organisation_id,
                    email_verifie_le,
                    telephone_verifie_le
                FROM utilisateurs
                WHERE id = $1
                LIMIT 1
                FOR UPDATE;
                `,
                [
                    utilisateurId
                ]
            );


        return resultat.rows[0] ||
            null;

    },


    async modifierMotDePasse(
        utilisateurId,
        motDePasseHash,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                UPDATE utilisateurs
                SET
                    mot_de_passe = $1,

                    email_verifie_le =
                        COALESCE(
                            email_verifie_le,
                            CURRENT_TIMESTAMP
                        ),

                    modifie_le =
                        CURRENT_TIMESTAMP

                WHERE id = $2

                RETURNING id;
                `,
                [
                    motDePasseHash,
                    utilisateurId
                ]
            );


        return resultat.rows[0] ||
            null;

    },


    async creerDemandeAssistee(
        donnees,
        connexion = pool
    ) {

        const resultat =
            await connexion.query(
                `
                INSERT INTO account_recovery_requests (
                    id,
                    utilisateur_id,
                    type,
                    nom_declare,
                    organisation_declaree,
                    telephone_contact,
                    email_contact,
                    message,
                    statut,
                    produit_source,
                    adresse_ip,
                    user_agent
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    'en_attente',
                    $9,
                    $10,
                    $11
                )
                RETURNING
                    id,
                    statut,
                    produit_source,
                    cree_le;
                `,
                [
                    donnees.id,
                    donnees.utilisateurId ||
                        null,
                    donnees.type,
                    donnees.nomDeclare ||
                        null,
                    donnees.organisationDeclaree ||
                        null,
                    donnees.telephoneContact ||
                        null,
                    donnees.emailContact ||
                        null,
                    donnees.message ||
                        null,
                    donnees.produitSource ||
                        "inconnu",
                    donnees.adresseIp ||
                        null,
                    donnees.userAgent ||
                        null
                ]
            );


        return resultat.rows[0];

    },


    async purgerTokensAnciens(
        connexion = pool
    ) {

        await connexion.query(
            `
            DELETE FROM identity_recovery_tokens
            WHERE expire_le <
                CURRENT_TIMESTAMP -
                INTERVAL '7 days';
            `
        );

    }

};


export default identityRecoveryRepository;