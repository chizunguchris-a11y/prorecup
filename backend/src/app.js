import express from "express";
import auditContextMiddleware
    from "./middlewares/auditContextMiddleware.js";
import utilisateurRoutes
    from "./routes/utilisateurRoutes.js";
import carteRoutes
    from "./routes/CarteRoutes.js";
import cors from "cors";
import dotenv from "dotenv";

import "./config/db.js";

import {
    swaggerUi,
    swaggerSpec
} from "./docs/swagger.js";

import errorHandler
    from "./middlewares/errorHandler.js";

import roleRoutes
    from "./routes/roleRoutes.js";

import organisationRoutes
    from "./routes/OrganisationRoutes.js";

import notificationRoutes
    from "./routes/NotificationRoutes.js";

import authRoutes
    from "./routes/authRoutes.js";

import clientRoutes
    from "./routes/clientRoutes.js";

import portailClientRoutes
    from "./routes/PortailClientRoutes.js";

import siteRoutes
    from "./routes/siteRoutes.js";

import collecteRoutes
    from "./routes/collecteRoutes.js";

import lotRoutes
    from "./routes/lotRoutes.js";

import stockRoutes
    from "./routes/stockRoutes.js";

import venteRoutes
    from "./routes/venteRoutes.js";

import dashboardRoutes
    from "./routes/dashboardRoutes.js";

import typeDechetRoutes
    from "./routes/typeDechetRoutes.js";

import impactCarboneRoutes
    from "./routes/ImpactCarboneRoutes.js";

import agentRoutes
    from "./routes/AgentRoutes.js";

import tricycleRoutes
    from "./routes/TricycleRoutes.js";

import missionRoutes
    from "./routes/MissionRoutes.js";
import terrainRoutes
    from "./routes/TerrainRoutes.js";
import balanceRoutes
    from "./routes/BalanceRoutes.js";

import auditRoutes
    from "./routes/AuditRoutes.js";

dotenv.config();

const app =
    express();

app.set(
    "trust proxy",
    true
);

const estProduction =
    process.env.NODE_ENV ===
    "production";

const originesAutorisees = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "https://prorecup-frontend.onrender.com"
];

if (
    process.env.FRONTEND_URL &&
    !originesAutorisees.includes(
        process.env.FRONTEND_URL
    )
) {

    originesAutorisees.push(
        process.env.FRONTEND_URL
    );

}

app.use(
    cors({
        origin: (
            origine,
            callback
        ) => {

            /*
             * Sans Origin : script, monitoring, API client,
             * serveur-a-serveur. Ce n est pas une requete
             * CORS provenant d un navigateur.
             */
            if (!origine) {

                return callback(
                    null,
                    true
                );

            }

            /*
             * Autorise l ouverture locale depuis le disque
             * uniquement hors production.
             */
            if (
                !estProduction &&
                origine === "null"
            ) {

                return callback(
                    null,
                    true
                );

            }

            if (
                originesAutorisees.includes(
                    origine
                )
            ) {

                return callback(
                    null,
                    true
                );

            }

            const erreurCors =
                new Error(
                    "Origine non autorisee par CORS."
                );

            erreurCors.statut =
                403;

            return callback(
                erreurCors
            );

        },

        credentials:
            true
    })
);
app.use(
    express.json({
        limit:
            "2mb"
    })
);

app.use(
    auditContextMiddleware
);

// Documentation Swagger
app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(
        swaggerSpec
    )
);

// Routes API
app.use(
    "/api/organisations",
    organisationRoutes
);

app.use(
    "/api/roles",
    roleRoutes
);

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/clients",
    clientRoutes
);

app.use(
    "/api/portail-client",
    portailClientRoutes
);

app.use(
    "/api/sites",
    siteRoutes
);

app.use(
    "/api/collectes",
    collecteRoutes
);

app.use(
    "/api/lots",
    lotRoutes
);

app.use(
    "/api/stocks",
    stockRoutes
);

app.use(
    "/api/ventes",
    venteRoutes
);

app.use(
    "/api/dashboard",
    dashboardRoutes
);

app.use(
    "/api/types-dechets",
    typeDechetRoutes
);

app.use(
    "/api/impacts-carbone",
    impactCarboneRoutes
);

app.use(
    "/api/agents",
    agentRoutes
);

app.use(
    "/api/tricycles",
    tricycleRoutes
);

app.use(
    "/api/missions",
    missionRoutes
);

app.use(
    "/api/terrain",
    terrainRoutes
);

app.use(
    "/api/balances",
    balanceRoutes
);

app.use(
    "/api/audits",
    auditRoutes
);

app.use(
    "/api/notifications",
    notificationRoutes
);

app.use(
    "/api/utilisateurs",
    utilisateurRoutes
);

app.use(
    "/api/carte",
    carteRoutes
);

// Toujours en dernier
app.use(
    errorHandler
);

export default app;
