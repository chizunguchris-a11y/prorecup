import https
    from "node:https";


class TerrainStorageService {

    obtenirConfiguration() {

        const url =
            process.env.SUPABASE_URL;

        const cle =
            process.env.SUPABASE_SECRET_KEY;

        const bucket =
            process.env.SUPABASE_STORAGE_BUCKET;


        if (!url) {

            throw new Error(
                "SUPABASE_URL est absente."
            );

        }


        if (!cle) {

            throw new Error(
                "SUPABASE_SECRET_KEY est absente."
            );

        }


        if (!bucket) {

            throw new Error(
                "SUPABASE_STORAGE_BUCKET est absent."
            );

        }


        return {
            url,
            cle,
            bucket
        };

    }


    encoderChemin(
        chemin
    ) {

        return String(
            chemin
        )
            .split("/")
            .filter(Boolean)
            .map(
                morceau =>
                    encodeURIComponent(
                        morceau
                    )
            )
            .join("/");

    }


    async envoyerFichier(
        {
            buffer,
            chemin,
            mimeType
        }
    ) {

        if (
            !Buffer.isBuffer(
                buffer
            ) ||
            buffer.length === 0
        ) {

            throw new Error(
                "Le fichier à envoyer est vide."
            );

        }


        if (!chemin) {

            throw new Error(
                "Le chemin Storage est obligatoire."
            );

        }


        if (!mimeType) {

            throw new Error(
                "Le type MIME est obligatoire."
            );

        }


        const configuration =
            this.obtenirConfiguration();


        const urlProjet =
            new URL(
                configuration.url
            );


        const cheminEncode =
            this.encoderChemin(
                chemin
            );


        const cheminRequete =
            `/storage/v1/object/${encodeURIComponent(
                configuration.bucket
            )}/${cheminEncode}`;


        const headers = {

            apikey:
                configuration.cle,

            "Content-Type":
                mimeType,

            "Content-Length":
                buffer.length,

            "Cache-Control":
                "3600",

            "x-upsert":
                "false"

        };


        /*
         * Ancienne clé service_role :
         * c'est un JWT.
         *
         * Nouvelle clé sb_secret_ :
         * elle reste dans apikey.
         */
        if (
            !configuration.cle
                .startsWith(
                    "sb_secret_"
                )
        ) {

            headers.Authorization =
                `Bearer ${configuration.cle}`;

        }


        return new Promise(
            (
                resolve,
                reject
            ) => {

                const requete =
                    https.request(
                        {
                            protocol:
                                urlProjet.protocol,

                            hostname:
                                urlProjet.hostname,

                            port:
                                443,

                            path:
                                cheminRequete,

                            method:
                                "POST",

                            headers
                        },
                        reponse => {

                            let texte = "";


                            reponse.on(
                                "data",
                                morceau => {

                                    texte +=
                                        morceau;

                                }
                            );


                            reponse.on(
                                "end",
                                () => {

                                    let donnees =
                                        texte;


                                    try {

                                        donnees =
                                            JSON.parse(
                                                texte
                                            );

                                    } catch {
                                        // Réponse texte.
                                    }


                                    if (
                                        reponse.statusCode >=
                                            200 &&
                                        reponse.statusCode <
                                            300
                                    ) {

                                        return resolve(
                                            {
                                                bucket:
                                                    configuration
                                                        .bucket,

                                                chemin,

                                                statut:
                                                    reponse
                                                        .statusCode,

                                                reponse:
                                                    donnees
                                            }
                                        );

                                    }


                                    const message =
                                        donnees
                                            ?.message ||
                                        donnees
                                            ?.error ||
                                        texte ||
                                        "Erreur Storage inconnue.";


                                    reject(
                                        new Error(
                                            `Supabase Storage ${reponse.statusCode} : ${message}`
                                        )
                                    );

                                }
                            );

                        }
                    );


                requete.on(
                    "error",
                    reject
                );


                requete.write(
                    buffer
                );


                requete.end();

            }
        );

    }

    async supprimerFichier(
        chemin
    ) {

        if (!chemin) {
            return;
        }


        const configuration =
            this.obtenirConfiguration();


        const urlProjet =
            new URL(
                configuration.url
            );


        const cheminEncode =
            this.encoderChemin(
                chemin
            );


        const cheminRequete =
            `/storage/v1/object/${encodeURIComponent(
                configuration.bucket
            )}/${cheminEncode}`;


        const headers = {

            apikey:
                configuration.cle

        };


        if (
            !configuration.cle
                .startsWith(
                    "sb_secret_"
                )
        ) {

            headers.Authorization =
                `Bearer ${configuration.cle}`;

        }


        return new Promise(
            (
                resolve,
                reject
            ) => {

                const requete =
                    https.request(
                        {
                            protocol:
                                urlProjet.protocol,

                            hostname:
                                urlProjet.hostname,

                            port:
                                443,

                            path:
                                cheminRequete,

                            method:
                                "DELETE",

                            headers
                        },
                        reponse => {

                            let texte = "";


                            reponse.on(
                                "data",
                                morceau => {
                                    texte += morceau;
                                }
                            );


                            reponse.on(
                                "end",
                                () => {

                                    if (
                                        reponse.statusCode >= 200 &&
                                        reponse.statusCode < 300
                                    ) {

                                        resolve(true);
                                        return;

                                    }


                                    reject(
                                        new Error(
                                            `Suppression Storage impossible (${reponse.statusCode}) : ${texte}`
                                        )
                                    );

                                }
                            );

                        }
                    );


                requete.on(
                    "error",
                    reject
                );


                requete.end();

            }
        );

    }

    async creerUrlSignee(
        chemin,
        dureeSecondes = 300
    ) {

        if (!chemin) {

            throw new Error(
                "Le chemin Storage est obligatoire."
            );

        }


        const duree =
            Number(
                dureeSecondes
            );


        if (
            !Number.isInteger(
                duree
            ) ||
            duree < 30 ||
            duree > 3600
        ) {

            throw new Error(
                "La durée de l'URL signée est invalide."
            );

        }


        const configuration =
            this.obtenirConfiguration();


        const urlProjet =
            new URL(
                configuration.url
            );


        const cheminEncode =
            this.encoderChemin(
                chemin
            );


        const cheminRequete =
            `/storage/v1/object/sign/${encodeURIComponent(
                configuration.bucket
            )}/${cheminEncode}`;


        const corps =
            JSON.stringify(
                {
                    expiresIn:
                        duree
                }
            );


        const headers = {

            apikey:
                configuration.cle,

            "Content-Type":
                "application/json",

            "Content-Length":
                Buffer.byteLength(
                    corps
                )

        };


        if (
            !configuration.cle
                .startsWith(
                    "sb_secret_"
                )
        ) {

            headers.Authorization =
                `Bearer ${configuration.cle}`;

        }


        return new Promise(
            (
                resolve,
                reject
            ) => {

                const requete =
                    https.request(
                        {
                            protocol:
                                urlProjet.protocol,

                            hostname:
                                urlProjet.hostname,

                            port:
                                443,

                            path:
                                cheminRequete,

                            method:
                                "POST",

                            headers
                        },
                        reponse => {

                            let texte = "";


                            reponse.on(
                                "data",
                                morceau => {

                                    texte +=
                                        morceau;

                                }
                            );


                            reponse.on(
                                "end",
                                () => {

                                    let donnees =
                                        texte;


                                    try {

                                        donnees =
                                            JSON.parse(
                                                texte
                                            );

                                    } catch {
                                        // Rien.
                                    }


                                    if (
                                        reponse.statusCode <
                                            200 ||
                                        reponse.statusCode >=
                                            300
                                    ) {

                                        return reject(
                                            new Error(
                                                `Supabase Storage ${reponse.statusCode} : ${
                                                    donnees?.message ||
                                                    donnees?.error ||
                                                    texte
                                                }`
                                            )
                                        );

                                    }


                                    const urlRetournee =
                                        donnees
                                            ?.signedURL ||
                                        donnees
                                            ?.signedUrl;


                                    if (!urlRetournee) {

                                        return reject(
                                            new Error(
                                                "Supabase n'a retourné aucune URL signée."
                                            )
                                        );

                                    }


                                    let urlComplete;


                                    if (
                                        /^https?:\/\//i
                                            .test(
                                                urlRetournee
                                            )
                                    ) {

                                        urlComplete =
                                            urlRetournee;

                                    } else if (
                                        urlRetournee
                                            .startsWith(
                                                "/storage/v1/"
                                            )
                                    ) {

                                        urlComplete =
                                            `${urlProjet.origin}${urlRetournee}`;

                                    } else {

                                        urlComplete =
                                            `${urlProjet.origin}/storage/v1${
                                                urlRetournee.startsWith("/")
                                                    ? ""
                                                    : "/"
                                            }${urlRetournee}`;

                                    }


                                    resolve(
                                        {
                                            url:
                                                urlComplete,

                                            expire_dans_secondes:
                                                duree
                                        }
                                    );

                                }
                            );

                        }
                    );


                requete.on(
                    "error",
                    reject
                );


                requete.write(
                    corps
                );


                requete.end();

            }
        );

    }

}


export default new TerrainStorageService();