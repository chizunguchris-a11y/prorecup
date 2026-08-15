const PRORECUP_API_URL =
    window.PRORECUP_API_URL ||
    "https://prorecup-backend.onrender.com";

window.PRORECUP_API_URL =
    PRORECUP_API_URL;

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

            return JSON.parse(
                valeur
            );

        } catch (erreur) {

            localStorage.removeItem(
                "prorecup_utilisateur"
            );

            return null;

        }

    },

    supprimerSession() {

        localStorage.removeItem(
            "prorecup_token"
        );

        localStorage.removeItem(
            "prorecup_refresh_token"
        );

        localStorage.removeItem(
            "prorecup_utilisateur"
        );

    },

    deconnecter() {

        this.supprimerSession();

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

        const role =
            utilisateur.role_nom ||
            utilisateur.role ||
            utilisateur.nom_role ||
            "Utilisateur";

        const initiale =
            nom
                .charAt(0)
                .toUpperCase();

        [
            "nomUtilisateur",
            "nomUtilisateurLateral"
        ].forEach(
            (id) => {

                const cible =
                    document.getElementById(
                        id
                    );

                if (cible) {

                    cible.textContent =
                        nom;

                }

            }
        );

        [
            "emailUtilisateur",
            "emailUtilisateurLateral"
        ].forEach(
            (id) => {

                const cible =
                    document.getElementById(
                        id
                    );

                if (cible) {

                    cible.textContent =
                        email;

                }

            }
        );

        [
            "roleUtilisateur",
            "roleUtilisateurLateral"
        ].forEach(
            (id) => {

                const cible =
                    document.getElementById(
                        id
                    );

                if (cible) {

                    cible.textContent =
                        role;

                }

            }
        );

        [
            "avatarUtilisateur",
            "initialeUtilisateur"
        ].forEach(
            (id) => {

                const cible =
                    document.getElementById(
                        id
                    );

                if (cible) {

                    cible.textContent =
                        initiale;

                }

            }
        );

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
            Accept:
                "application/json",

            ...(options.headers || {})
        };

        if (token) {

            entetes.Authorization =
                `Bearer ${token}`;

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
                20000
            );

        const minuteur =
            window.setTimeout(
                () => {

                    controleur.abort();

                },
                delai
            );

        let reponse;

        try {

            reponse =
                await fetch(
                    `${PRORECUP_API_URL}${chemin}`,
                    {
                        ...options,

                        headers:
                            entetes,

                        signal:
                            options.signal ||
                            controleur.signal
                    }
                );

        } catch (erreur) {

            if (
                erreur.name ===
                "AbortError"
            ) {

                throw new Error(
                    "Le serveur met trop de temps à répondre."
                );

            }

            throw new Error(
                "Impossible de joindre le serveur. Vérifiez que le backend est démarré."
            );

        } finally {

            window.clearTimeout(
                minuteur
            );

        }

        let resultat = {};

        const typeContenu =
            reponse.headers.get(
                "content-type"
            ) || "";

        try {

            if (
                typeContenu.includes(
                    "application/json"
                )
            ) {

                resultat =
                    await reponse.json();

            } else {

                const texte =
                    await reponse.text();

                resultat =
                    texte
                        ? {
                            message:
                                texte
                        }
                        : {};

            }

        } catch (erreur) {

            resultat = {};

        }

        if (
            reponse.status === 401
        ) {

            const message =
                resultat.error ||
                resultat.message ||
                "Votre session a expiré.";

            this.supprimerSession();

            window.alert(
                message
            );

            window.location.href =
                "./index.html";

            throw new Error(
                message
            );

        }

        if (
            reponse.status === 403 &&
            String(
                resultat.error ||
                resultat.message ||
                ""
            )
                .toLowerCase()
                .includes(
                    "compte est désactivé"
                )
        ) {

            const message =
                resultat.error ||
                resultat.message ||
                "Votre compte est désactivé.";

            this.supprimerSession();

            window.alert(
                message
            );

            window.location.href =
                "./index.html";

            throw new Error(
                message
            );

        }

        if (!reponse.ok) {

            throw new Error(
                resultat.error ||
                resultat.message ||
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
                document.createElement(
                    "div"
                );

            conteneur.id =
                "conteneurNotifications";

            conteneur.className =
                "conteneur-notifications";

            document.body.appendChild(
                conteneur
            );

        }

        const notification =
            document.createElement(
                "div"
            );

        notification.className =
            `notification notification-${type}`;

        notification.textContent =
            message;

        conteneur.appendChild(
            notification
        );

        window.setTimeout(
            () => {

                notification.classList.add(
                    "notification-visible"
                );

            },
            20
        );

        window.setTimeout(
            () => {

                notification.classList.remove(
                    "notification-visible"
                );

                window.setTimeout(
                    () => {

                        notification.remove();

                    },
                    300
                );

            },
            3500
        );

    },

    notifierModificationNotifications() {

        document.dispatchEvent(
            new CustomEvent(
                "prorecup:notifications-modifiees"
            )
        );

    },

    actualiserCompteurNotifications() {

        if (
            typeof window
                .actualiserCompteurNotifications ===
            "function"
        ) {

            return window
                .actualiserCompteurNotifications();

        }

        return Promise.resolve();

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
                minimumFractionDigits:
                    0,

                maximumFractionDigits:
                    decimales
            }
        );

    },

    formaterDate(
        date
    ) {

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

window.ProRecup =
    ProRecup;