import helmet
    from "helmet";

import {
    rateLimit
} from "express-rate-limit";


const creerReponseLimite =
    message =>
        (
            req,
            res
        ) => {

            return res
                .status(429)
                .json({
                    success: false,
                    code: "TROP_DE_REQUETES",
                    message
                });
        };


export const creerHeadersSecurite =
    ({ production = false } = {}) => {

        return helmet({

            /*
             * Swagger utilise actuellement du JS/CSS inline.
             * La CSP sera durcie separement sans casser /api/docs.
             */
            contentSecurityPolicy: false,

            hsts:
                production
                    ? {
                        maxAge: 31_536_000,
                        includeSubDomains: true,
                        preload: false
                    }
                    : false,

            referrerPolicy: {
                policy: "no-referrer"
            },

            /*
             * Le frontend et le backend sont sur des origines
             * distinctes. CORS reste la vraie frontiere d acces.
             */
            crossOriginResourcePolicy: {
                policy: "cross-origin"
            }
        });
    };


export const creerLimiteurGlobal =
    () => {

        return rateLimit({

            windowMs:
                15 * 60 * 1000,

            limit:
                1200,

            standardHeaders:
                "draft-8",

            legacyHeaders:
                false,

            skip:
                req => {

                    if (req.method === "OPTIONS") {
                        return true;
                    }

                    return String(
                        req.originalUrl || ""
                    ).startsWith(
                        "/api/docs"
                    );
                },

            handler:
                creerReponseLimite(
                    "Trop de requetes ont ete envoyees. Reessayez dans quelques minutes."
                )
        });
    };


export const creerLimiteurConnexion =
    () => {

        return rateLimit({

            windowMs:
                15 * 60 * 1000,

            limit:
                10,

            /*
             * Une connexion reussie est retiree du compteur.
             * Les echecs successifs sont donc la cible.
             */
            skipSuccessfulRequests:
                true,

            standardHeaders:
                "draft-8",

            legacyHeaders:
                false,

            handler:
                creerReponseLimite(
                    "Trop de tentatives de connexion ont echoue. Patientez 15 minutes avant de reessayer."
                )
        });
    };
