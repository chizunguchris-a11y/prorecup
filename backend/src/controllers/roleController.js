import pool from '../config/db.js';

const roleController = {
  create: async (req, res) => {
    const { nom, description } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO roles (nom, description) VALUES ($1, $2) RETURNING *',
        [nom, description]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
  
  getAll: async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM roles');
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

export default roleController;