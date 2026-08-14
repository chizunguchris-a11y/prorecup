import pool from "../config/db.js";

const roleRepository = {

    async creer(
        donnees,
        connexion = pool
    ) {

        const requete = `
            INSERT INTO roles
            (
                nom,
                description
            )
            VALUES
            (
                $1,
                $2
            )
            RETURNING *;
        `;

        const resultat =
            await connexion.query(
                requete,
                [
                    donnees.nom,
                    donnees.description || null
                ]
            );

        return resultat.rows[0];

    },

    async lister(
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                nom,
                description
            FROM roles
            ORDER BY nom ASC;
        `;

        const resultat =
            await connexion.query(
                requete
            );

        return resultat.rows;

    },

    async trouverParId(
        roleId,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                nom,
                description
            FROM roles
            WHERE id = $1
            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [roleId]
            );

        return resultat.rows[0];

    },

    async trouverParNom(
        nom,
        connexion = pool
    ) {

        const requete = `
            SELECT
                id,
                nom,
                description
            FROM roles
            WHERE LOWER(nom) = LOWER($1)
            LIMIT 1;
        `;

        const resultat =
            await connexion.query(
                requete,
                [nom]
            );

        return resultat.rows[0];

    }

};

export default roleRepository;