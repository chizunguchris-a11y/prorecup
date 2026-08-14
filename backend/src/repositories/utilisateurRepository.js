import pool from "../config/db.js";

const utilisateurRepository = {

    async findByEmail(
        email,
        connexion = pool
    ) {

        const requete = `
            SELECT
                u.id,
                u.nom,
                u.email,
                u.mot_de_passe,
                u.telephone,
                u.photo_url,
                u.organisation_id,
                u.role_id,
                u.actif,
                u.dernier_acces,
                u.cree_le,
                u.modifie_le,
                r.nom AS role_nom
            FROM utilisateurs u
            LEFT JOIN roles r
                ON r.id = u.role_id
            WHERE LOWER(u.email) = LOWER($1)
            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    String(email)
                        .trim()
                        .toLowerCase()
                ]
            );

        return resultat.rows[0];

    },

    async findById(
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                u.id,
                u.nom,
                u.email,
                u.telephone,
                u.photo_url,
                u.organisation_id,
                u.role_id,
                u.actif,
                u.dernier_acces,
                u.cree_le,
                u.modifie_le,
                r.nom AS role_nom,
                o.nom AS organisation_nom
            FROM utilisateurs u
            LEFT JOIN roles r
                ON r.id = u.role_id
            LEFT JOIN organisations o
                ON o.id = u.organisation_id
            WHERE u.id = $1
            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [utilisateurId]
            );

        return resultat.rows[0];

    },

    async findByIdAvecMotDePasse(
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                nom,
                email,
                mot_de_passe,
                telephone,
                photo_url,
                organisation_id,
                role_id,
                actif
            FROM utilisateurs
            WHERE id = $1
            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [utilisateurId]
            );

        return resultat.rows[0];

    },

    async emailExistePourAutreUtilisateur(
        email,
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            SELECT EXISTS
            (
                SELECT 1
                FROM utilisateurs
                WHERE LOWER(email) = LOWER($1)
                  AND id <> $2
            ) AS existe;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    String(email)
                        .trim()
                        .toLowerCase(),
                    utilisateurId
                ]
            );

        return resultat.rows[0].existe;

    },

    async emailExisteDansOrganisation(
        email,
        organisationId,
        utilisateurIdExclu = null,
        connexion = pool
    ) {

        const valeurs = [
            String(email)
                .trim()
                .toLowerCase(),
            organisationId
        ];

        let conditionExclusion = "";

        if (utilisateurIdExclu) {

            valeurs.push(
                utilisateurIdExclu
            );

            conditionExclusion =
                `AND id <> $${valeurs.length}`;

        }

        const requete = `
            SELECT EXISTS
            (
                SELECT 1
                FROM utilisateurs
                WHERE LOWER(email) = LOWER($1)
                  AND organisation_id = $2
                  ${conditionExclusion}
            ) AS existe;
        `;

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0].existe;

    },

    async create(
        nom,
        email,
        motDePasseHache,
        organisationId,
        roleId = null,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO utilisateurs
            (
                nom,
                email,
                mot_de_passe,
                organisation_id,
                role_id,
                actif
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                true
            )
            RETURNING
                id,
                nom,
                email,
                telephone,
                photo_url,
                organisation_id,
                role_id,
                actif,
                cree_le;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    nom,
                    String(email)
                        .trim()
                        .toLowerCase(),
                    motDePasseHache,
                    organisationId,
                    roleId
                ]
            );

        return resultat.rows[0];

    },

    async listerParOrganisation(
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                u.id,
                u.nom,
                u.email,
                u.telephone,
                u.photo_url,
                u.organisation_id,
                u.role_id,
                u.actif,
                u.dernier_acces,
                u.cree_le,
                u.modifie_le,
                r.nom AS role_nom
            FROM utilisateurs u
            LEFT JOIN roles r
                ON r.id = u.role_id
            WHERE u.organisation_id = $1
            ORDER BY u.nom ASC, u.email ASC;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows;

    },

    async trouverParIdPourOrganisation(
        utilisateurId,
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                u.id,
                u.nom,
                u.email,
                u.telephone,
                u.photo_url,
                u.organisation_id,
                u.role_id,
                u.actif,
                u.dernier_acces,
                u.cree_le,
                u.modifie_le,
                r.nom AS role_nom
            FROM utilisateurs u
            LEFT JOIN roles r
                ON r.id = u.role_id
            WHERE u.id = $1
              AND u.organisation_id = $2
            LIMIT 1;
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

    },

    async creerPourOrganisation(
        utilisateur,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO utilisateurs
            (
                nom,
                email,
                mot_de_passe,
                telephone,
                photo_url,
                organisation_id,
                role_id,
                actif
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
                $8
            )
            RETURNING
                id,
                nom,
                email,
                telephone,
                photo_url,
                organisation_id,
                role_id,
                actif,
                dernier_acces,
                cree_le,
                modifie_le;
        `;

        const valeurs = [
            utilisateur.nom,
            String(
                utilisateur.email
            )
                .trim()
                .toLowerCase(),
            utilisateur.mot_de_passe,
            utilisateur.telephone || null,
            utilisateur.photo_url || null,
            utilisateur.organisation_id,
            utilisateur.role_id,
            utilisateur.actif !== false
        ];

        const resultat =
            await connexion.query(
                requete,
                valeurs
            );

        return resultat.rows[0];

    },

    async modifierPourOrganisation(
        utilisateurId,
        organisationId,
        donnees,
        connexion = pool
    ) {

        const requete = `
            UPDATE utilisateurs
            SET
                nom = $1,
                email = $2,
                telephone = $3,
                photo_url = $4,
                role_id = $5,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $6
              AND organisation_id = $7
            RETURNING
                id,
                nom,
                email,
                telephone,
                photo_url,
                organisation_id,
                role_id,
                actif,
                dernier_acces,
                cree_le,
                modifie_le;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    donnees.nom,
                    String(
                        donnees.email
                    )
                        .trim()
                        .toLowerCase(),
                    donnees.telephone || null,
                    donnees.photo_url || null,
                    donnees.role_id,
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    },

    async changerStatut(
        utilisateurId,
        organisationId,
        actif,
        connexion = pool
    ) {

        const requete = `
            UPDATE utilisateurs
            SET
                actif = $1,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $2
              AND organisation_id = $3
            RETURNING
                id,
                nom,
                email,
                telephone,
                photo_url,
                organisation_id,
                role_id,
                actif,
                dernier_acces,
                cree_le,
                modifie_le;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    actif,
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    },

    async modifierProfil(
        utilisateurId,
        organisationId,
        donnees,
        connexion = pool
    ) {

        const requete = `
            UPDATE utilisateurs
            SET
                nom = $1,
                email = $2,
                telephone = $3,
                photo_url = $4,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $5
              AND organisation_id = $6
            RETURNING
                id,
                nom,
                email,
                telephone,
                photo_url,
                organisation_id,
                role_id,
                actif,
                dernier_acces,
                cree_le,
                modifie_le;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    donnees.nom,
                    String(
                        donnees.email
                    )
                        .trim()
                        .toLowerCase(),
                    donnees.telephone || null,
                    donnees.photo_url || null,
                    utilisateurId,
                    organisationId
                ]
            );

        return resultat.rows[0];

    },

    async enregistrerDernierAcces(
        utilisateurId,
        connexion = pool
    ) {

        const requete = `
            UPDATE utilisateurs
            SET
                dernier_acces = CURRENT_TIMESTAMP,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING
                id,
                dernier_acces;
        `;

        const resultat =
            await connexion.query(
                requete,
                [utilisateurId]
            );

        return resultat.rows[0];

    },

    async updatePassword(
        id,
        motDePasseHache,
        connexion = pool
    ) {

        const requete = `
            UPDATE utilisateurs
            SET
                mot_de_passe = $1,
                modifie_le = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    motDePasseHache,
                    id
                ]
            );

        return resultat.rows[0];

    }

};

export default utilisateurRepository;