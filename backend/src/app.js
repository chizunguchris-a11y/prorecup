import express from "express";
import impactCarboneRoutes
    from "./routes/ImpactCarboneRoutes.js";
import cors from "cors";
import dotenv from "dotenv";

import "./config/db.js";

import {
    swaggerUi,
    swaggerSpec
} from "./docs/swagger.js";

import errorHandler from "./middlewares/errorHandler.js";

import organisationController
    from "./controllers/organisationController.js";

import roleController
    from "./controllers/roleController.js";

import authRoutes from "./routes/authRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import siteRoutes from "./routes/siteRoutes.js";
import collecteRoutes from "./routes/collecteRoutes.js";
import lotRoutes from "./routes/lotRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import venteRoutes from "./routes/venteRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import typeDechetRoutes
    from "./routes/typeDechetRoutes.js";

dotenv.config();

const app = express();

// Middlewares généraux
app.use(cors());
app.use(express.json());

// Documentation Swagger
app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

// Route de test
app.get("/", (req, res) => {

    return res.status(200).send(
        "🚀 Serveur Pro Récup opérationnel et connecté !"
    );

});

// Organisations
app.post(
    "/api/organisations",
    organisationController.create
);

app.get(
    "/api/organisations",
    organisationController.getAll
);

// Rôles
app.post(
    "/api/roles",
    roleController.create
);

app.get(
    "/api/roles",
    roleController.getAll
);

// Routes principales
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/collectes", collecteRoutes);
app.use("/api/lots", lotRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/ventes", venteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use(
    "/api/types-dechets",
    typeDechetRoutes
);
app.use(
    "/api/impacts-carbone",
    impactCarboneRoutes
);

// Middleware global d'erreur
app.use(errorHandler);

export default app;