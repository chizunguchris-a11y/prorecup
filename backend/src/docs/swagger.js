import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import schemas from "./schemas/index.js";

const options = {
    definition: {
        openapi: "3.0.0",

        info: {
            title: "Pro Récup API",
            version: "1.0.0",
            description:
                "API de gestion des collectes, lots, stocks, ventes et impacts carbone."
        },

        servers: [
            {
                url: "http://localhost:5000",
                description: "Serveur local"
            }
        ],

        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            },

            schemas
        }
    },

    apis: [
        "./src/routes/*.js"
    ]
};

const swaggerSpec = swaggerJsdoc(options);

export {
    swaggerUi,
    swaggerSpec
};