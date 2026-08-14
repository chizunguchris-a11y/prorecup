

const formulaireConnexion =
    document.getElementById(
        "formulaireConnexion"
    );

const champEmail =
    document.getElementById(
        "email"
    );

const champMotDePasse =
    document.getElementById(
        "motDePasse"
    );

const boutonConnexion =
    document.getElementById(
        "boutonConnexion"
    );

const boutonAfficherMotDePasse =
    document.getElementById(
        "boutonAfficherMotDePasse"
    );

const messageErreur =
    document.getElementById(
        "messageErreur"
    );

const messageSucces =
    document.getElementById(
        "messageSucces"
    );

const afficherMessage = (
    element,
    message
) => {

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.classList.remove(
        "cache"
    );

};

const cacherMessages = () => {

    if (messageErreur) {

        messageErreur.textContent =
            "";

        messageErreur.classList.add(
            "cache"
        );

    }

    if (messageSucces) {

        messageSucces.textContent =
            "";

        messageSucces.classList.add(
            "cache"
        );

    }

};

if (
    boutonAfficherMotDePasse &&
    champMotDePasse
) {

    boutonAfficherMotDePasse
        .addEventListener(
            "click",
            () => {

                const estCache =
                    champMotDePasse.type ===
                    "password";

                champMotDePasse.type =
                    estCache
                        ? "text"
                        : "password";

                boutonAfficherMotDePasse
                    .textContent =
                    estCache
                        ? "Masquer"
                        : "Afficher";

            }
        );

}

if (formulaireConnexion) {

    formulaireConnexion
        .addEventListener(
            "submit",
            async (
                evenement
            ) => {

                evenement.preventDefault();

                cacherMessages();

                const email =
                    champEmail
                        .value
                        .trim();

                const motDePasse =
                    champMotDePasse
                        .value;

                if (
                    !email ||
                    !motDePasse
                ) {

                    afficherMessage(
                        messageErreur,
                        "Veuillez renseigner votre adresse e-mail et votre mot de passe."
                    );

                    return;

                }

                boutonConnexion.disabled =
                    true;

                boutonConnexion.textContent =
                    "Connexion en cours...";

                try {

                    const controleur =
                        new AbortController();

                    const minuteur =
                        window.setTimeout(
                            () => {

                                controleur.abort();

                            },
                            15000
                        );

                    let reponse;

                    try {

                        reponse =
                            await fetch(
                                `${PRORECUP_API_URL}/api/auth/login`,
                                {
                                    method:
                                        "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json",

                                        Accept:
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify({
                                            email,
                                            motDePasse
                                        }),

                                    signal:
                                        controleur.signal
                                }
                            );

                    } finally {

                        window.clearTimeout(
                            minuteur
                        );

                    }

                    const typeContenu =
                        reponse.headers.get(
                            "content-type"
                        ) || "";

                    const resultat =
                        typeContenu.includes(
                            "application/json"
                        )
                            ? await reponse.json()
                            : {
                                error:
                                    await reponse.text()
                            };

                    if (!reponse.ok) {

                        throw new Error(
                            resultat.error ||
                            resultat.message ||
                            "La connexion a échoué."
                        );

                    }

                    const accessToken =
                        resultat.accessToken ||
                        resultat.token;

                    if (!accessToken) {

                        throw new Error(
                            "La réponse de connexion ne contient aucun token."
                        );

                    }

                    localStorage.setItem(
                        "prorecup_token",
                        accessToken
                    );

                    /*
                     * Nettoyage des anciens refresh tokens
                     * enregistrés par la version précédente.
                     */
                    localStorage.removeItem(
                        "prorecup_refresh_token"
                    );

                    localStorage.setItem(
                        "prorecup_utilisateur",
                        JSON.stringify(
                            resultat.utilisateur
                        )
                    );

                    afficherMessage(
                        messageSucces,
                        "Connexion réussie. Redirection..."
                    );

                    window.setTimeout(
                        () => {

                            window.location.href =
                                "./dashboard.html";

                        },
                        500
                    );

                } catch (erreur) {

                    let message;

                    if (
                        erreur.name ===
                        "AbortError"
                    ) {

                        message =
                            "Le serveur met trop de temps à répondre.";

                    } else if (
                        erreur.message ===
                        "Failed to fetch"
                    ) {

                        message =
                            "Impossible de joindre le serveur. Vérifiez que le backend est démarré.";

                    } else {

                        message =
                            erreur.message;

                    }

                    afficherMessage(
                        messageErreur,
                        message
                    );

                } finally {

                    boutonConnexion.disabled =
                        false;

                    boutonConnexion.textContent =
                        "Se connecter";

                }

            }
        );

}

const tokenExistant =
    localStorage.getItem(
        "prorecup_token"
    );

if (tokenExistant) {

    window.location.href =
        "./dashboard.html";

}