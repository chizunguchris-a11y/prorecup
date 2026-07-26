const API_URL =
    "http://localhost:5000";

const token =
    localStorage.getItem(
        "prorecup_token"
    );

const utilisateurEnregistre =
    localStorage.getItem(
        "prorecup_utilisateur"
    );

const obtenirElement = (id) => {

    return document.getElementById(id);

};

const boutonDeconnexion =
    obtenirElement(
        "boutonDeconnexion"
    );

const boutonActualiser =
    obtenirElement(
        "boutonActualiser"
    );

const nomUtilisateur =
    obtenirElement(
        "nomUtilisateur"
    );

const nomUtilisateurLateral =
    obtenirElement(
        "nomUtilisateurLateral"
    );

const emailUtilisateurLateral =
    obtenirElement(
        "emailUtilisateurLateral"
    );

const avatarUtilisateur =
    obtenirElement(
        "avatarUtilisateur"
    );

const initialeUtilisateur =
    obtenirElement(
        "initialeUtilisateur"
    );

const nombreClients =
    obtenirElement(
        "nombreClients"
    );

const nombreSites =
    obtenirElement(
        "nombreSites"
    );

const nombreCollectes =
    obtenirElement(
        "nombreCollectes"
    );

const nombreLots =
    obtenirElement(
        "nombreLots"
    );

const quantiteStock =
    obtenirElement(
        "quantiteStock"
    );

const nombreTypesStock =
    obtenirElement(
        "nombreTypesStock"
    );

const nombreVentes =
    obtenirElement(
        "nombreVentes"
    );

const chiffreAffaires =
    obtenirElement(
        "chiffreAffaires"
    );

const impactCarbone =
    obtenirElement(
        "impactCarbone"
    );

const corpsTableauStocks =
    obtenirElement(
        "corpsTableauStocks"
    );

const messageErreur =
    obtenirElement(
        "messageErreur"
    );

const definirTexte = (
    element,
    valeur
) => {

    if (element) {
        element.textContent = valeur;
    }

};

const redirigerVersConnexion = () => {

    localStorage.removeItem(
        "prorecup_token"
    );

    localStorage.removeItem(
        "prorecup_utilisateur"
    );

    window.location.href =
        "./index.html";

};

if (!token) {

    redirigerVersConnexion();

}

const afficherErreur = (
    message
) => {

    if (!messageErreur) {
        return;
    }

    messageErreur.textContent =
        message;

    messageErreur.classList.remove(
        "cache"
    );

};

const cacherErreur = () => {

    if (!messageErreur) {
        return;
    }

    messageErreur.textContent = "";

    messageErreur.classList.add(
        "cache"
    );

};

const formaterNombre = (
    valeur,
    nombreDecimales = 2
) => {

    const nombre =
        Number(valeur || 0);

    return nombre.toLocaleString(
        "fr-FR",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits:
                nombreDecimales
        }
    );

};

const formaterDate = (date) => {

    if (!date) {
        return "Non renseignée";
    }

    const dateConvertie =
        new Date(date);

    if (
        Number.isNaN(
            dateConvertie.getTime()
        )
    ) {
        return date;
    }

    return dateConvertie
        .toLocaleString(
            "fr-FR"
        );

};

const initialiserUtilisateur = () => {

    if (!utilisateurEnregistre) {
        return;
    }

    try {

        const utilisateur =
            JSON.parse(
                utilisateurEnregistre
            );

        const nom =
            utilisateur.nom ||
            "Utilisateur";

        const email =
            utilisateur.email ||
            "";

        const initiale =
            nom
                .charAt(0)
                .toUpperCase();

        definirTexte(
            nomUtilisateur,
            nom
        );

        definirTexte(
            nomUtilisateurLateral,
            nom
        );

        definirTexte(
            emailUtilisateurLateral,
            email
        );

        definirTexte(
            avatarUtilisateur,
            initiale
        );

        definirTexte(
            initialeUtilisateur,
            initiale
        );

    } catch (erreur) {

        localStorage.removeItem(
            "prorecup_utilisateur"
        );

    }

};

const requeteApi = async (
    chemin
) => {

    const reponse =
        await fetch(
            `${API_URL}${chemin}`,
            {
                method: "GET",

                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    Accept:
                        "application/json"

                }
            }
        );

    let resultat = {};

    try {

        resultat =
            await reponse.json();

    } catch (erreur) {

        resultat = {};

    }

    if (reponse.status === 401) {

        redirigerVersConnexion();

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

};

const chargerDashboard =
    async () => {

        const resultat =
            await requeteApi(
                "/api/dashboard"
            );

        const donnees =
            resultat.data || {};

        const activite =
            donnees.activite || {};

        const stocks =
            donnees.stocks || {};

        const ventes =
            donnees.ventes || {};

        const carbone =
            donnees.carbone || {};

        definirTexte(
            nombreClients,
            formaterNombre(
                activite.nombre_clients,
                0
            )
        );

        definirTexte(
            nombreSites,
            formaterNombre(
                activite.nombre_sites,
                0
            )
        );

        definirTexte(
            nombreCollectes,
            formaterNombre(
                activite.nombre_collectes,
                0
            )
        );

        definirTexte(
            nombreLots,
            formaterNombre(
                activite.nombre_lots,
                0
            )
        );

        definirTexte(
            quantiteStock,
            formaterNombre(
                stocks.quantite_totale
            )
        );

        definirTexte(
            nombreTypesStock,
            formaterNombre(
                stocks.nombre_types,
                0
            )
        );

        definirTexte(
            nombreVentes,
            formaterNombre(
                ventes.nombre,
                0
            )
        );

        definirTexte(
            chiffreAffaires,
            formaterNombre(
                ventes
                    .chiffre_affaires_total
            )
        );

        definirTexte(
            impactCarbone,
            formaterNombre(
                carbone
                    .co2e_estime_total
            )
        );

    };

const creerCellule = (
    contenu,
    classe = ""
) => {

    const cellule =
        document.createElement("td");

    cellule.textContent =
        contenu;

    if (classe) {
        cellule.className = classe;
    }

    return cellule;

};

const afficherStocks = (
    stocks
) => {

    if (!corpsTableauStocks) {
        return;
    }

    corpsTableauStocks.innerHTML = "";

    if (
        !Array.isArray(stocks) ||
        stocks.length === 0
    ) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 4;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucun stock disponible.";

        ligne.appendChild(cellule);

        corpsTableauStocks.appendChild(
            ligne
        );

        return;

    }

    stocks.forEach((stock) => {

        const ligne =
            document.createElement("tr");

        ligne.appendChild(
            creerCellule(
                stock.type_dechet ||
                "Non renseigné",
                "nom-matiere"
            )
        );

        ligne.appendChild(
            creerCellule(
                formaterNombre(
                    stock.quantite
                ),
                "quantite-matiere"
            )
        );

        ligne.appendChild(
            creerCellule(
                stock.unite || "kg"
            )
        );

        ligne.appendChild(
            creerCellule(
                formaterDate(
                    stock.date_mise_a_jour
                )
            )
        );

        corpsTableauStocks.appendChild(
            ligne
        );

    });

};

const chargerStocks = async () => {

    const resultat =
        await requeteApi(
            "/api/stocks"
        );

    afficherStocks(
        resultat.data
    );

};

const chargerToutesLesDonnees =
    async () => {

        cacherErreur();

        if (boutonActualiser) {

            boutonActualiser.disabled =
                true;

            boutonActualiser.textContent =
                "Chargement...";

        }

        try {

            await Promise.all([
                chargerDashboard(),
                chargerStocks()
            ]);

        } catch (erreur) {

            afficherErreur(
                erreur.message ===
                "Failed to fetch"
                    ? "Impossible de joindre le backend. Vérifiez que le serveur est démarré."
                    : erreur.message
            );

        } finally {

            if (boutonActualiser) {

                boutonActualiser.disabled =
                    false;

                boutonActualiser.textContent =
                    "Actualiser";

            }

        }

    };

if (boutonDeconnexion) {

    boutonDeconnexion.addEventListener(
        "click",
        redirigerVersConnexion
    );

}

if (boutonActualiser) {

    boutonActualiser.addEventListener(
        "click",
        chargerToutesLesDonnees
    );

}

const routesActions = {

    client:
        "./clients.html",

    collecte:
        "./collectes.html",

    vente:
        "./ventes.html"

};

document
    .querySelectorAll(".action")
    .forEach((bouton) => {

        bouton.addEventListener(
            "click",
            () => {

                const action =
                    bouton.getAttribute(
                        "data-action"
                    );

                const destination =
                    routesActions[action];

                if (destination) {

                    window.location.href =
                        destination;

                }

            }
        );

    });

initialiserUtilisateur();
chargerToutesLesDonnees();