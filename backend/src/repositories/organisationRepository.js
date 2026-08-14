import pool from "../config/db.js";

const genererSlug = (
    valeur
) => {

    return String(
        valeur || ""
    )
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .trim()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        );

};

const organisationRepository = {

    async create(
        nom,
        connexion = pool
    ) {

        const slug =
            genererSlug(
                nom
            );

        const requete = `
            INSERT INTO organisations
            (
                nom,
                slug,
                pays,
                devise,
                fuseau_horaire
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5
            )
            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    nom,
                    slug,
                    "RDC",
                    "USD",
                    "Africa/Kinshasa"
                ]
            );

        return resultat.rows[0];

    },

    async findAll(
        connexion = pool
    ) {

        const requete = `
            SELECT *
            FROM organisations
            ORDER BY nom ASC;
        `;

        const resultat =
            await connexion.query(
                requete
            );

        return resultat.rows;

    },

    async findById(
        organisationId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                nom,
                slug,
                pays,
                ville,
                adresse,
                telephone,
                email,
                logo_url,
                devise,
                fuseau_horaire,
                numero_identification,
                site_web,
                description,
                cree_le,
                modifie_le

            FROM organisations

            WHERE id = $1

            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [organisationId]
            );

        return resultat.rows[0];

    },

    async emailExistePourAutreOrganisation(
        email,
        organisationId,
        connexion = pool
    ) {

        if (!email) {
            return false;
        }

        const requete = `
            SELECT EXISTS
            (
                SELECT 1
                FROM organisations
                WHERE LOWER(email) =
                    LOWER($1)
                  AND id <> $2
            ) AS existe;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    email,
                    organisationId
                ]
            );

        return resultat.rows[0].existe;

    },

    async modifier(
        organisationId,
        donnees,
        connexion = pool
    ) {

        const requete = `
            UPDATE organisations
            SET
                nom = $1,
                slug = $2,
                pays = $3,
                ville = $4,
                adresse = $5,
                telephone = $6,
                email = $7,
                logo_url = $8,
                devise = $9,
                fuseau_horaire = $10,
                numero_identification = $11,
                site_web = $12,
                description = $13,
                modifie_le =
                    CURRENT_TIMESTAMP

            WHERE id = $14

            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    donnees.nom,
                    genererSlug(
                        donnees.nom
                    ),
                    donnees.pays || null,
                    donnees.ville || null,
                    donnees.adresse || null,
                    donnees.telephone || null,
                    donnees.email || null,
                    donnees.logo_url || null,
                    donnees.devise || "USD",
                    donnees.fuseau_horaire ||
                        "Africa/Kinshasa",
                    donnees.numero_identification ||
                        null,
                    donnees.site_web || null,
                    donnees.description || null,
                    organisationId
                ]
            );

        return resultat.rows[0];

    }

};

export default organisationRepository;