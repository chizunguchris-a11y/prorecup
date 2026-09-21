import "dotenv/config";

import terrainStorageService
    from "./src/services/TerrainStorageService.js";


const executer =
    async () => {

        try {

            console.log("");
            console.log(
                "========================================"
            );

            console.log(
                "TEST SUPABASE STORAGE PRO RECUP"
            );

            console.log(
                "========================================"
            );


            /*
             * Petit PNG valide.
             */
            const pngBase64 =
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";


            const buffer =
                Buffer.from(
                    pngBase64,
                    "base64"
                );


            const nom =
                `diagnostic/${Date.now()}-preuve-test.png`;


            console.log(
                "Taille :",
                buffer.length,
                "octets"
            );


            console.log(
                "Chemin :",
                nom
            );


            const resultat =
                await terrainStorageService
                    .envoyerFichier(
                        {
                            buffer,

                            chemin:
                                nom,

                            mimeType:
                                "image/png"
                        }
                    );


            console.log("");
            console.log(
                "[OK] FICHIER ENVOYE"
            );


            console.log(
                "Bucket :",
                resultat.bucket
            );


            console.log(
                "Chemin :",
                resultat.chemin
            );


            console.log(
                "HTTP :",
                resultat.statut
            );


            console.log("");
            console.log(
                "========================================"
            );

            console.log(
                "STORAGE TERRAIN OPERATIONNEL"
            );

            console.log(
                "========================================"
            );


        } catch (erreur) {

            console.error("");
            console.error(
                "[ERREUR]",
                erreur.message
            );

        }

    };


executer();