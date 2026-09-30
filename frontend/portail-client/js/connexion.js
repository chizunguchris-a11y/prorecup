const formulaire =
    document.getElementById(
        "formulaireConnexionClient"
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

const boutonAfficher =
    document.getElementById(
        "boutonAfficherMotDePasse"
    );

const messageConnexion =
    document.getElementById(
        "messageConnexion"
    );


const afficherMessage = (
    message,
    type = "erreur"
) => {

    if (!messageConnexion) {
        return;
    }

    messageConnexion.textContent =
        message;

    messageConnexion.className =
        "message-connexion " +
        type;

};


const cacherMessage = () => {

    if (!messageConnexion) {
        return;
    }

    messageConnexion.textContent =
        "";

    messageConnexion.className =
        "message-connexion cache";

};


if (
    boutonAfficher &&
    champMotDePasse
) {

    boutonAfficher.addEventListener(
        "click",
        function () {

            const masque =
                champMotDePasse.type ===
                "password";

            champMotDePasse.type =
                masque
                    ? "text"
                    : "password";

            boutonAfficher.textContent =
                masque
                    ? "Masquer"
                    : "Afficher";

        }
    );

}


const parametres =
    new URLSearchParams(
        window.location.search
    );


if (
    parametres.get(
        "session"
    ) === "expiree"
) {

    afficherMessage(
        "Votre session a expir\u00e9 ou votre acc\u00e8s n'est plus actif. Reconnectez-vous.",
        "info"
    );

}


if (
    PortailRecup.obtenirToken()
) {

    window.location.replace(
        "./accueil.html"
    );

}


if (formulaire) {

    formulaire.addEventListener(
        "submit",
        async function (
            evenement
        ) {

            evenement.preventDefault();

            cacherMessage();


            const email =
                String(
                    champEmail.value ||
                    ""
                ).trim();

            const motDePasse =
                champMotDePasse.value;


            if (
                !email ||
                !motDePasse
            ) {

                afficherMessage(
                    "Renseignez votre adresse e-mail et votre mot de passe."
                );

                return;

            }


            boutonConnexion.disabled =
                true;

            boutonConnexion.innerHTML =
                "V\u00e9rification de votre acc\u00e8s...";


            const controleur =
                new AbortController();

            const minuteur =
                window.setTimeout(
                    function () {
                        controleur.abort();
                    },
                    45000
                );


            try {

                const reponseLogin =
                    await fetch(
                        PORTAIL_API_URL +
                            "/api/auth/login",
                        {
                            method:
                                "POST",

                            headers: {
                                Accept:
                                    "application/json",

                                "Content-Type":
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


                const login =
                    await reponseLogin.json();


                if (
                    !reponseLogin.ok
                ) {

                    throw new Error(
                        login.error ||
                        login.message ||
                        "Adresse e-mail ou mot de passe incorrect."
                    );

                }


                const token =
                    login.accessToken ||
                    login.token;


                if (!token) {

                    throw new Error(
                        "La connexion n'a retourn\u00e9 aucun jeton d'acc\u00e8s."
                    );

                }


                const reponsePortail =
                    await fetch(
                        PORTAIL_API_URL +
                            "/api/portail-client/me",
                        {
                            headers: {
                                Accept:
                                    "application/json",

                                Authorization:
                                    "Bearer " +
                                    token
                            },

                            signal:
                                controleur.signal
                        }
                    );


                const resultatPortail =
                    await reponsePortail.json();


                if (
                    reponsePortail.status ===
                    403
                ) {

                    throw new Error(
                        "Ce compte ne dispose pas d'un acc\u00e8s actif au portail client."
                    );

                }


                if (
                    !reponsePortail.ok
                ) {

                    throw new Error(
                        resultatPortail.error ||
                        resultatPortail.message ||
                        "Impossible de v\u00e9rifier votre espace client."
                    );

                }


                const contexte =
                    PortailRecup.extraireDonnees(
                        resultatPortail
                    );


                PortailRecup.enregistrerSession(
                    token,
                    contexte
                );


                afficherMessage(
                    "Connexion r\u00e9ussie. Ouverture de votre espace...",
                    "info"
                );


                window.setTimeout(
                    function () {

                        window.location.replace(
                            "./accueil.html"
                        );

                    },
                    300
                );

            }
            catch (erreur) {

                if (
                    erreur.name ===
                    "AbortError"
                ) {

                    afficherMessage(
                        "Le serveur met trop de temps \u00e0 r\u00e9pondre. R\u00e9essayez."
                    );

                }
                else {

                    afficherMessage(
                        erreur.message ||
                        "Connexion impossible."
                    );

                }

            }
            finally {

                window.clearTimeout(
                    minuteur
                );

                boutonConnexion.disabled =
                    false;

                boutonConnexion.innerHTML =
                    'Se connecter <span aria-hidden="true">&rarr;</span>';

            }

        }
    );

}
