import express from 'express';
import collecteRoutes from './src/routes/collecteRoutes.js';

const app = express();
app.use(express.json()); // Permet de lire les données envoyées

// Tes routes
app.use('/api/collectes', collecteRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Le serveur Pro Récup tourne sur le port ${PORT}`);
});