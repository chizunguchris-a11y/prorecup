const PRORECUP_API_URL = "http://localhost:5000";

const ProRecup = {

    obtenirToken() {

        return localStorage.getItem(
            "prorecup_token"
        );

    },

    obtenirUtilisateur() {

        const valeur =
            localStorage.getItem(
                "prorecup_utilisateur"
            );

        if (!valeur) {
            return null;
        }

        try {

            return JSON.parse(valeur);

        } catch (erreur) {

            localStorage.removeItem(
                "prorecup_utilisateur"
            );

            return null;

        }

    },

    deconnecter() {

        localStorage.removeItem(
            "prorecup_token"
        );

        localStorage.removeItem(
            "prorecup_utilisateur"
        );

        window.location.href =
            "./index.html";

    },

    protegerPage() {

        if (!this.obtenirToken()) {

            this.deconnecter();

            return false;

        }

        return true;

    },

    initialiserUtilisateur() {

        const utilisateur =
            this.obtenirUtilisateur();

        if (!utilisateur) {
            return;
        }

        const nom =
            utilisateur.nom ||
            "Utilisateur";

        const email =
            utilisateur.email ||
            "";

        const initiale =
            nom.charAt(0).toUpperCase();

        const champsNom = [
            "nomUtilisateur",
            "nomUtilisateurLateral"
        ];

        const champsEmail = [
            "emailUtilisateur",
            "emailUtilisateurLateral"
        ];

        const champsAvatar = [
            "avatarUtilisateur",
            "initialeUtilisateur"
        ];

        champsNom.forEach((id) => {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent = nom;
            }

        });

        champsEmail.forEach((id) => {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent = email;
            }

        });

        champsAvatar.forEach((id) => {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent = initiale;
            }

        });

    },

    initialiserDeconnexion() {

        const bouton =
            document.getElementById(
                "boutonDeconnexion"
            );

        if (!bouton) {
            return;
        }

        bouton.addEventListener(
            "click",
            () => this.deconnecter()
        );

    },

    async requete(
        chemin,
        options = {}
    ) {

        const token =
            this.obtenirToken();

        const entetes = {
            Accept: "application/json",
            ...(options.headers || {})
        };

        if (token) {

            entetes.Authorization =
                `Bearer ${token}`;

        }

        if (options.body) {

            entetes["Content-Type"] =
                "application/json";

        }

        let reponse;

        try {

            reponse = await fetch(
                `${PRORECUP_API_URL}${chemin}`,
                {
                    ...options,
                    headers: entetes
                }
            );

        } catch (erreur) {

            throw new Error(
                "Impossible de joindre le serveur. Vérifiez que le backend est démarré."
            );

        }

        let resultat = {};

        try {

            resultat =
                await reponse.json();

        } catch (erreur) {

            resultat = {};

        }

        if (reponse.status === 401) {

            this.deconnecter();

            throw new Error(
                "Votre session a expiré."
            );

        }

        if (!reponse.ok) {

            throw new Error(
                resultat.error ||
                "Une erreur est survenue."
            );

        }

        return resultat;

    },

    afficherNotification(
        message,
        type = "succes"
    ) {

        let conteneur =
            document.getElementById(
                "conteneurNotifications"
            );

        if (!conteneur) {

            conteneur =
                document.createElement("div");

            conteneur.id =
                "conteneurNotifications";

            conteneur.className =
                "conteneur-notifications";

            document.body.appendChild(
                conteneur
            );

        }

        const notification =
            document.createElement("div");

        notification.className =
            `notification notification-${type}`;

        notification.textContent =
            message;

        conteneur.appendChild(
            notification
        );

        setTimeout(
            () => {

                notification.classList.add(
                    "notification-visible"
                );

            },
            20
        );

        setTimeout(
            () => {

                notification.classList.remove(
                    "notification-visible"
                );

                setTimeout(
                    () => notification.remove(),
                    300
                );

            },
            3500
        );

    },

    formaterNombre(
        valeur,
        decimales = 2
    ) {

        return Number(
            valeur || 0
        ).toLocaleString(
            "fr-FR",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits:
                    decimales
            }
        );

    },

    formaterDate(date) {

        if (!date) {
            return "Non renseignée";
        }

        const valeur =
            new Date(date);

        if (
            Number.isNaN(
                valeur.getTime()
            )
        ) {
            return date;
        }

        return valeur.toLocaleString(
            "fr-FR"
        );

    }

};

window.ProRecup = ProRecup;