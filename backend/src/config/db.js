import pkg from 'pg';
import dotenv from 'dotenv';

// Charge les variables du fichier .env
dotenv.config();

const { Pool } = pkg;

// On utilise l'URL de connexion du fichier .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Requis pour se connecter à Supabase de manière sécurisée
  }
});

// Test de connexion immédiat au démarrage
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erreur de connexion à Supabase :', err.message);
  } else {
    console.log('🚀 Connexion réussie à la base de données Supabase !');
  }
});

export default pool;