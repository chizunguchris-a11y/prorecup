const API_URL = "http://localhost:5000";

const formulaireConnexion =
    document.getElementById("formulaireConnexion");

const champEmail =
    document.getElementById("email");

const champMotDePasse =
    document.getElementById("motDePasse");

const boutonConnexion =
    document.getElementById("boutonConnexion");

const boutonAfficherMotDePasse =
    document.getElementById("boutonAfficherMotDePasse");

const messageErreur =
    document.getElementById("messageErreur");

const messageSucces =
    document.getElementById("messageSucces");

const afficherMessage = (
    element,
    message
) => {

    element.textContent = message;
    element.classList.remove("cache");

};

const cacherMessages = () => {

    messageErreur.textContent = "";
    messageSucces.textContent = "";

    messageErreur.classList.add("cache");
    messageSucces.classList.add("cache");

};

boutonAfficherMotDePasse.addEventListener(
    "click",
    () => {

        const estCache =
            champMotDePasse.type === "password";

        champMotDePasse.type =
            estCache
                ? "text"
                : "password";

        boutonAfficherMotDePasse.textContent =
            estCache
                ? "Masquer"
                : "Afficher";

    }
);

formulaireConnexion.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherMessages();

        const email =
            champEmail.value.trim();

        const motDePasse =
            champMotDePasse.value;

        if (!email || !motDePasse) {

            afficherMessage(
                messageErreur,
                "Veuillez renseigner votre adresse e-mail et votre mot de passe."
            );

            return;

        }

        boutonConnexion.disabled = true;
        boutonConnexion.textContent =
            "Connexion en cours...";

        try {

            const reponse = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        motDePasse
                    })
                }
            );

            const resultat =
                await reponse.json();

            if (!reponse.ok) {

                throw new Error(
                    resultat.error ||
                    "La connexion a échoué."
                );

            }

            localStorage.setItem(
                "prorecup_token",
                resultat.token
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

            setTimeout(
                () => {

                    window.location.href =
                        "./dashboard.html";

                },
                900
            );

        } catch (erreur) {

            const message =
                erreur.message === "Failed to fetch"
                    ? "Impossible de joindre le serveur. Vérifiez que le backend est démarré."
                    : erreur.message;

            afficherMessage(
                messageErreur,
                message
            );

        } finally {

            boutonConnexion.disabled = false;

            boutonConnexion.textContent =
                "Se connecter";

        }

    }
);

const tokenExistant =
    localStorage.getItem("prorecup_token");

if (tokenExistant) {

    window.location.href =
        "./dashboard.html";

}