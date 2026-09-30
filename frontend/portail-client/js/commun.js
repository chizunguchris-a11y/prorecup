const PORTAIL_API_URL =
    window.PRORECUP_API_URL ||
    "https://prorecup-backend.onrender.com";


const PortailRecup = {

    cleToken:
        "prorecup_portail_token",

    cleContexte:
        "prorecup_portail_contexte",


    obtenirToken() {

        return localStorage.getItem(
            this.cleToken
        );

    },


    enregistrerSession(
        token,
        contexte
    ) {

        localStorage.setItem(
            this.cleToken,
            token
        );

        localStorage.setItem(
            this.cleContexte,
            JSON.stringify(
                contexte
            )
        );

    },


    obtenirContexte() {

        const brut =
            localStorage.getItem(
                this.cleContexte
            );

        if (!brut) {
            return null;
        }

        try {

            return JSON.parse(
                brut
            );

        }
        catch {

            localStorage.removeItem(
                this.cleContexte
            );

            return null;

        }

    },


    supprimerSession() {

        localStorage.removeItem(
            this.cleToken
        );

        localStorage.removeItem(
            this.cleContexte
        );

    },


    deconnecter() {

        this.supprimerSession();

        window.location.href =
            "./index.html";

    },


    protegerPage() {

        if (
            this.obtenirToken()
        ) {
            return true;
        }

        window.location.replace(
            "./index.html"
        );

        return false;

    },


    extraireDonnees(
        resultat
    ) {

        if (
            resultat &&
            Object.prototype.hasOwnProperty.call(
                resultat,
                "data"
            )
        ) {

            return resultat.data;

        }

        return resultat;

    },


    async requete(
        chemin,
        options = {}
    ) {

        const token =
            this.obtenirToken();

        const entetes = {
            Accept:
                "application/json",

            ...(options.headers || {})
        };

        if (token) {

            entetes.Authorization =
                "Bearer " + token;

        }

        if (
            options.body &&
            !(
                options.body instanceof
                FormData
            )
        ) {

            entetes["Content-Type"] =
                "application/json";

        }


        const controleur =
            new AbortController();

        const delai =
            Number(
                options.timeout ||
                45000
            );

        const minuteur =
            window.setTimeout(
                function () {
                    controleur.abort();
                },
                delai
            );


        let reponse;

        try {

            reponse =
                await fetch(
                    PORTAIL_API_URL +
                        chemin,
                    {
                        ...options,

                        headers:
                            entetes,

                        signal:
                            options.signal ||
                            controleur.signal
                    }
                );

        }
        catch (erreur) {

            if (
                erreur.name ===
                "AbortError"
            ) {

                throw new Error(
                    "Le serveur met trop de temps ? répondre."
                );

            }

            throw new Error(
                "Impossible de joindre Pro Récup pour le moment."
            );

        }
        finally {

            window.clearTimeout(
                minuteur
            );

        }


        const typeContenu =
            reponse.headers.get(
                "content-type"
            ) || "";

        let resultat;

        if (
            typeContenu.includes(
                "application/json"
            )
        ) {

            resultat =
                await reponse.json();

        }
        else {

            resultat = {
                error:
                    await reponse.text()
            };

        }


        if (
            reponse.status === 401 ||
            reponse.status === 403
        ) {

            this.supprimerSession();

            window.location.replace(
                "./index.html?session=expiree"
            );

            throw new Error(
                "Votre session n'est plus autoris?e."
            );

        }


        if (!reponse.ok) {

            throw new Error(
                resultat.error ||
                resultat.message ||
                "Une erreur est survenue."
            );

        }


        return this.extraireDonnees(
            resultat
        );

    },


    formaterDate(
        valeur
    ) {

        if (!valeur) {
            return "Date indisponible";
        }

        const date =
            new Date(
                valeur
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Date indisponible";
        }

        return new Intl.DateTimeFormat(
            "fr-FR",
            {
                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric"
            }
        ).format(
            date
        );

    },


    formaterKg(
        valeur
    ) {

        const nombre =
            Number(
                valeur
            );

        if (
            !Number.isFinite(
                nombre
            )
        ) {
            return "?";
        }

        return new Intl.NumberFormat(
            "fr-FR",
            {
                maximumFractionDigits:
                    2
            }
        ).format(
            nombre
        ) + " kg";

    }

};


window.PortailRecup =
    PortailRecup;
