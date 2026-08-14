import path from "path";
import { fileURLToPath } from "url";

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import schemas from "./schemas/index.js";

const fichierActuel =
    fileURLToPath(
        import.meta.url
    );

const dossierActuel =
    path.dirname(
        fichierActuel
    );

const dossierRoutes =
    path.resolve(
        dossierActuel,
        "../routes"
    );

const options = {

    definition: {

        openapi:
            "3.0.0",

        info: {

            title:
                "Pro Récup API",

            version:
                "1.0.0",

            description:
                "API de gestion des opérations Pro Récup."

        },

        servers: [
            {
                url:
                    "http://localhost:5000",

                description:
                    "Serveur local"
            }
        ],

        components: {

            securitySchemes: {

                bearerAuth: {

                    type:
                        "http",

                    scheme:
                        "bearer",

                    bearerFormat:
                        "JWT"

                }

            },

            schemas

        }

    },

    apis: [

        path.join(
            dossierRoutes,
            "*.js"
        ),

        path.join(
            dossierRoutes,
            "**/*.js"
        )

    ]

};

const swaggerSpec =
    swaggerJsdoc(
        options
    );

export {
    swaggerUi,
    swaggerSpec
};