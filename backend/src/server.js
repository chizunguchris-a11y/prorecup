import dotenv from "dotenv";

import app from "./app.js";

dotenv.config();

const PORT =
    Number(
        process.env.PORT ||
        5000
    );

const serveur =
    app.listen(
        PORT,
        () => {

            console.log(
                `🚀 Serveur démarré sur le port ${PORT}`
            );

        }
    );

serveur.on(
    "error",
    (
        erreur
    ) => {

        if (
            erreur.code ===
            "EADDRINUSE"
        ) {

            console.error(
                `Le port ${PORT} est déjà utilisé.`
            );

            process.exit(1);

        }

        console.error(
            "Erreur du serveur :",
            erreur
        );

        process.exit(1);

    }
);