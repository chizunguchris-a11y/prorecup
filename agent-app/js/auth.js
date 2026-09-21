(function () {

    window.ProRecup =
        window.ProRecup || {};


    const config =
        window.ProRecup.config;


    const api =
        window.ProRecup.api;


    const sauvegarder =
        function (
            token,
            utilisateur
        ) {

            localStorage.setItem(
                config.TOKEN_KEY,
                token
            );


            localStorage.setItem(
                config.USER_KEY,
                JSON.stringify(
                    utilisateur || {}
                )
            );

        };


    const vider =
        function () {

            localStorage.removeItem(
                config.TOKEN_KEY
            );


            localStorage.removeItem(
                config.USER_KEY
            );

        };


    const obtenirUtilisateur =
        function () {

            const brut =
                localStorage.getItem(
                    config.USER_KEY
                );


            if (!brut) {
                return null;
            }


            try {

                return JSON.parse(
                    brut
                );

            } catch {

                return null;

            }

        };


    const verifierRole =
        function (
            utilisateur
        ) {

            const role =
                String(
                    utilisateur?.role ||
                    utilisateur?.role_nom ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            return (
                role ===
                config.ROLE_TERRAIN
            );

        };


    const connexion =
        async function (
            email,
            motDePasse
        ) {

            const reponse =
                await api.post(
                    "/auth/login",
                    {
                        email,
                        motDePasse
                    },
                    false
                );


            const token =
                reponse?.accessToken ||
                reponse?.token;


            const utilisateur =
                reponse?.utilisateur;


            if (!token) {

                throw new Error(
                    "Le serveur n'a retourné aucun jeton de connexion."
                );

            }


            if (
                !verifierRole(
                    utilisateur
                )
            ) {

                vider();


                throw new Error(
                    "Ce compte n'est pas un compte Agent de valorisation carbone."
                );

            }


            sauvegarder(
                token,
                utilisateur
            );


            /*
             * Vérification serveur.
             *
             * Le rôle contenu dans le navigateur
             * n'est jamais considéré comme suffisant.
             */
            try {

                const contexte =
                    await api.get(
                        "/terrain/me"
                    );


                return {

                    utilisateur,

                    contexte:
                        contexte?.data ||
                        contexte

                };

            } catch (erreur) {

                vider();

                throw erreur;

            }

        };


    const restaurer =
        async function () {

            const token =
                localStorage.getItem(
                    config.TOKEN_KEY
                );


            const utilisateur =
                obtenirUtilisateur();


            if (
                !token ||
                !utilisateur
            ) {

                return null;

            }


            if (
                !verifierRole(
                    utilisateur
                )
            ) {

                vider();

                return null;

            }


            try {

                const contexte =
                    await api.get(
                        "/terrain/me"
                    );


                return {

                    utilisateur,

                    contexte:
                        contexte?.data ||
                        contexte

                };

            } catch (erreur) {

                if (
                    erreur.status === 401 ||
                    erreur.status === 403
                ) {

                    vider();

                    return null;

                }


                /*
                 * En cas de simple coupure réseau,
                 * on ne détruit pas immédiatement
                 * la session locale.
                 */
                if (
                    erreur.code ===
                    "NETWORK_ERROR"
                ) {

                    return {

                        utilisateur,

                        contexte:
                            null,

                        hors_ligne:
                            true

                    };

                }


                throw erreur;

            }

        };


    window.ProRecup.auth = {

        connexion,

        restaurer,

        deconnexion:
            vider,

        obtenirUtilisateur

    };

})();