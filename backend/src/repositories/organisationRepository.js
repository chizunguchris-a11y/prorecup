import pool from '../config/db.js';

const organisationRepository = {
  create: async (nom) => {
    const slug = nom
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const pays = 'RDC';
    const queryText = 'INSERT INTO organisations(nom, slug, pays) VALUES($1, $2, $3) RETURNING *';
    
    try {
      const res = await pool.query(queryText, [nom, slug, pays]);
      return res.rows[0];
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // La nouvelle fonction pour récupérer toutes les organisations
  findAll: async () => {
    const queryText = 'SELECT * FROM organisations ORDER BY id DESC';
    try {
      const res = await pool.query(queryText);
      return res.rows;
    } catch (error) {
      throw new Error(error.message);
    }
  }
};

export default organisationRepository;