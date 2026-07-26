import pool from "../config/db.js";

class TypeDechetRepository {

    async lister(connexion = pool) {

        const requete = `
            SELECT
                id,
                nom
            FROM types_dechets
            ORDER BY nom ASC;
        `;

        const resultat =
            await connexion.query(requete);

        return resultat.rows;

    }

}

export default new TypeDechetRepository();







