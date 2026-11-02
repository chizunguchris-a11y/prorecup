(function () {

    window.ProRecup =
        window.ProRecup || {};


    const config =
        window.ProRecup.config;


    const obtenirToken =
        function () {

            return localStorage.getItem(
                config.TOKEN_KEY
            );

        };


    const requete =
        async function (
            chemin,
            options
        ) {

            options =
                options || {};


            const headers =
                Object.assign(
                    {
                        Accept:
                            "application/json"
                    },
                    options.headers || {}
                );


            const token =
                obtenirToken();


            if (
                token &&
                options.auth !== false
            ) {

                headers.Authorization =
                    "Bearer " + token;

            }


            if (
                options.body &&
                !(options.body instanceof FormData)
            ) {

                headers["Content-Type"] =
                    "application/json";

            }


            let reponse;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);


            try {

                reponse =
                    await fetch(
                        config.API_BASE_URL +
                        chemin,
                        {
                            signal: controller.signal,
                            cache: 'no-store',
                            method:
                                options.method ||
                                "GET",

                            headers,

                            body:
                                options.body
                                    ? (
                                        options.body instanceof FormData
                                            ? options.body
                                            : JSON.stringify(
                                                options.body
                                            )
                                    )
                                    : undefined
                        }
                    );

            } catch (erreur) {

                clearTimeout(timeout);
                const erreurReseau =
                    new Error(
                        "Impossible de joindre le serveur Pro Récup."
                    );

                erreurReseau.code =
                    "NETWORK_ERROR";

                throw erreurReseau;

            }


            let donnees = null;


            try {

                donnees =
                    await reponse.json();

            } catch {
                donnees = null;
            }


            clearTimeout(timeout);
            if (reponse.ok && (!donnees || typeof donnees !== 'object' || donnees.success !== true)) {
                const error = new Error('Réponse serveur non confirmée. La même opération sera réessayée.');
                error.code = 'PROTOCOL_ERROR';
                throw error;
            }
            if (!reponse.ok) {

                const message =
                    donnees?.error ||
                    donnees?.message ||
                    "Une erreur est survenue.";


                const erreurApi =
                    new Error(
                        message
                    );


                erreurApi.status =
                    reponse.status;

                erreurApi.data =
                    donnees;


                throw erreurApi;

            }


            return donnees;

        };


    window.ProRecup.api = {
        requireReceipt: true,

        get:
            function (
                chemin
            ) {

                return requete(
                    chemin,
                    {
                        method:
                            "GET"
                    }
                );

            },


        post:
            function (
                chemin,
                body,
                auth
            ) {

                return requete(
                    chemin,
                    {
                        method:
                            "POST",

                        body,

                        auth:
                            auth !== false
                    }
                );

            },


        requete

    };

})();