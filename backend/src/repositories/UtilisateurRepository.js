import pool from '../config/db.js';

const utilisateurRepository = {

  // Rechercher un utilisateur par email
  findByEmail: async (email) => {

    const queryText = 'SELECT * FROM utilisateurs WHERE email = $1';

    try {

      const res = await pool.query(queryText, [email]);

      return res.rows[0];

    } catch (error) {

      throw new Error(error.message);

    }

  },

  // Créer un utilisateur
  create: async (nom, email, motDePasseHache, organisationId) => {

    const queryText = `
      INSERT INTO utilisateurs
      (
        nom,
        email,
        mot_de_passe,
        organisation_id
      )
      VALUES ($1,$2,$3,$4)
      RETURNING id, nom, email, organisation_id, cree_le
    `;

    try {

      const res = await pool.query(queryText, [
        nom,
        email,
        motDePasseHache,
        organisationId
      ]);

      return res.rows[0];

    } catch (error) {

      throw new Error(error.message);

    }

  },

  // Mettre à jour le mot de passe
  updatePassword: async (id, motDePasseHache) => {

    const queryText = `
      UPDATE utilisateurs
      SET
        mot_de_passe = $1,
        modifie_le = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id;
    `;

    try {

      await pool.query(queryText, [
        motDePasseHache,
        id
      ]);

    } catch (error) {

      throw new Error(error.message);

    }

  }

};

export default utilisateurRepository;