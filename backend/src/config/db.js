import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
    throw new Error(
        "La variable DATABASE_URL est absente du fichier .env."
    );
}

const pool = new Pool({

    connectionString:
        process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    },

    // Nombre maximum de connexions simultanées
    max: 10,

    // Ferme une connexion inutilisée après 30 secondes
    idleTimeoutMillis: 30000,

    // N'attend pas indéfiniment une connexion
    connectionTimeoutMillis: 10000,

    // Renouvelle périodiquement les connexions
    maxLifetimeSeconds: 300

});

pool.on(
    "error",
    (erreur) => {

        console.error(
            "❌ Erreur PostgreSQL sur une connexion inactive :",
            erreur.message
        );

    }
);

async function testerConnexion() {

    try {

        const resultat =
            await pool.query(
                "SELECT NOW() AS maintenant;"
            );

        console.log(
            "🚀 Connexion réussie à Supabase :",
            resultat.rows[0].maintenant
        );

    } catch (erreur) {

        console.error(
            "❌ Erreur de connexion à Supabase :",
            erreur.message
        );

    }

}

testerConnexion();

export default pool;