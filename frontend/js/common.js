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

            window.location.replace(
                "./index.html?session=expiree"
            );

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

            window.location.replace(
                "./index.html?session=desactivee"
            );

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
        type = "succes",
        options = {}
    ) {

        const variantes = {
            succes: "succes",
            success: "succes",
            erreur: "erreur",
            error: "erreur",
            avertissement: "avertissement",
            warning: "avertissement",
            info: "info"
        };

        const variante =
            variantes[
                String(type || "")
                    .toLowerCase()
            ] || "info";

        let region =
            document.getElementById(
                "prFeedbackRegion"
            );

        if (!region) {

            region =
                document.createElement(
                    "div"
                );

            region.id =
                "prFeedbackRegion";

            region.className =
                "pr-toast-region";

            region.setAttribute(
                "aria-live",
                "polite"
            );

            region.setAttribute(
                "aria-atomic",
                "false"
            );

            document.body.appendChild(
                region
            );
        }

        const toast =
            document.createElement(
                "div"
            );

        toast.className =
            "pr-toast pr-toast-" +
            variante;

        toast.setAttribute(
            "role",
            variante === "erreur"
                ? "alert"
                : "status"
        );

        const symbole =
            document.createElement(
                "span"
            );

        symbole.className =
            "pr-toast-symbole";

        symbole.setAttribute(
            "aria-hidden",
            "true"
        );

        symbole.textContent =
            variante === "succes"
                ? "\u2713"
                : variante === "erreur"
                    ? "!"
                    : variante === "avertissement"
                        ? "!"
                        : "i";

        const contenu =
            document.createElement(
                "div"
            );

        contenu.className =
            "pr-toast-contenu";

        const titre =
            document.createElement(
                "strong"
            );

        titre.className =
            "pr-toast-titre";

        titre.textContent =
            options.titre ||
            (
                variante === "succes"
                    ? "Operation reussie"
                    : variante === "erreur"
                        ? "Une erreur est survenue"
                        : variante === "avertissement"
                            ? "Attention"
                            : "Information"
            );

        const texte =
            document.createElement(
                "span"
            );

        texte.className =
            "pr-toast-message";

        texte.textContent =
            String(
                message ||
                ""
            );

        const fermer =
            document.createElement(
                "button"
            );

        fermer.type =
            "button";

        fermer.className =
            "pr-toast-fermer";

        fermer.setAttribute(
            "aria-label",
            "Fermer la notification"
        );

        fermer.textContent =
            "\u00d7";

        contenu.append(
            titre,
            texte
        );

        toast.append(
            symbole,
            contenu,
            fermer
        );

        region.appendChild(
            toast
        );

        let retire =
            false;

        const retirer =
            () => {

                if (retire) {
                    return;
                }

                retire =
                    true;

                toast.classList.remove(
                    "pr-toast-visible"
                );

                toast.classList.add(
                    "pr-toast-sortie"
                );

                window.setTimeout(
                    () => {
                        toast.remove();

                        if (
                            region &&
                            !region.children.length
                        ) {
                            region.remove();
                        }
                    },
                    220
                );
            };

        fermer.addEventListener(
            "click",
            retirer
        );

        window.requestAnimationFrame(
            () => {
                toast.classList.add(
                    "pr-toast-visible"
                );
            }
        );

        const duree =
            Number(
                options.duree ||
                (
                    variante === "erreur"
                        ? 6500
                        : 4500
                )
            );

        if (
            Number.isFinite(duree) &&
            duree > 0
        ) {

            window.setTimeout(
                retirer,
                duree
            );
        }

        return retirer;
    },


    confirmer(
        options = {}
    ) {

        return new Promise(
            resolve => {

                const precedent =
                    document.activeElement;

                const fond =
                    document.createElement(
                        "div"
                    );

                fond.className =
                    "pr-dialog-fond";

                const dialogue =
                    document.createElement(
                        "div"
                    );

                dialogue.className =
                    "pr-dialog";

                dialogue.setAttribute(
                    "role",
                    "dialog"
                );

                dialogue.setAttribute(
                    "aria-modal",
                    "true"
                );

                const idTitre =
                    "pr-dialog-titre-" +
                    Date.now();

                const idMessage =
                    "pr-dialog-message-" +
                    Date.now();

                dialogue.setAttribute(
                    "aria-labelledby",
                    idTitre
                );

                dialogue.setAttribute(
                    "aria-describedby",
                    idMessage
                );

                const entete =
                    document.createElement(
                        "div"
                    );

                entete.className =
                    "pr-dialog-entete";

                const titre =
                    document.createElement(
                        "h2"
                    );

                titre.id =
                    idTitre;

                titre.textContent =
                    options.titre ||
                    "Confirmer l'action";

                const message =
                    document.createElement(
                        "p"
                    );

                message.id =
                    idMessage;

                message.className =
                    "pr-dialog-message";

                message.textContent =
                    options.message ||
                    "Voulez-vous continuer ?";

                entete.append(
                    titre,
                    message
                );

                const actions =
                    document.createElement(
                        "div"
                    );

                actions.className =
                    "pr-dialog-actions";

                const annuler =
                    document.createElement(
                        "button"
                    );

                annuler.type =
                    "button";

                annuler.className =
                    "pr-dialog-bouton pr-dialog-annuler";

                annuler.textContent =
                    options.texteAnnuler ||
                    "Annuler";

                const confirmer =
                    document.createElement(
                        "button"
                    );

                confirmer.type =
                    "button";

                confirmer.className =
                    "pr-dialog-bouton " +
                    (
                        options.danger
                            ? "pr-dialog-danger"
                            : "pr-dialog-confirmer"
                    );

                confirmer.textContent =
                    options.texteConfirmer ||
                    "Confirmer";

                actions.append(
                    annuler,
                    confirmer
                );

                dialogue.append(
                    entete,
                    actions
                );

                fond.appendChild(
                    dialogue
                );

                document.body.appendChild(
                    fond
                );

                document.body.classList.add(
                    "pr-dialog-ouvert"
                );

                let termine =
                    false;

                const terminer =
                    valeur => {

                        if (termine) {
                            return;
                        }

                        termine =
                            true;

                        document.removeEventListener(
                            "keydown",
                            gererClavier
                        );

                        fond.classList.add(
                            "pr-dialog-fermeture"
                        );

                        document.body.classList.remove(
                            "pr-dialog-ouvert"
                        );

                        window.setTimeout(
                            () => {
                                fond.remove();

                                if (
                                    precedent &&
                                    typeof precedent.focus ===
                                        "function"
                                ) {
                                    precedent.focus();
                                }

                                resolve(
                                    valeur
                                );
                            },
                            180
                        );
                    };

                const gererClavier =
                    evenement => {

                        if (
                            evenement.key ===
                            "Escape"
                        ) {

                            evenement.preventDefault();

                            terminer(
                                false
                            );

                            return;
                        }

                        if (
                            evenement.key !==
                            "Tab"
                        ) {
                            return;
                        }

                        const focusables =
                            Array.from(
                                dialogue.querySelectorAll(
                                    "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
                                )
                            );

                        if (
                            focusables.length ===
                            0
                        ) {
                            return;
                        }

                        const premier =
                            focusables[0];

                        const dernier =
                            focusables[
                                focusables.length - 1
                            ];

                        if (
                            evenement.shiftKey &&
                            document.activeElement ===
                                premier
                        ) {

                            evenement.preventDefault();

                            dernier.focus();

                        }
                        else if (
                            !evenement.shiftKey &&
                            document.activeElement ===
                                dernier
                        ) {

                            evenement.preventDefault();

                            premier.focus();
                        }
                    };

                annuler.addEventListener(
                    "click",
                    () => terminer(false)
                );

                confirmer.addEventListener(
                    "click",
                    () => terminer(true)
                );

                fond.addEventListener(
                    "click",
                    evenement => {

                        if (
                            evenement.target ===
                            fond
                        ) {
                            terminer(false);
                        }
                    }
                );

                document.addEventListener(
                    "keydown",
                    gererClavier
                );

                window.requestAnimationFrame(
                    () => {
                        fond.classList.add(
                            "pr-dialog-visible"
                        );

                        annuler.focus();
                    }
                );
            }
        );
    },


    definirOccupation(
        element,
        occupe,
        texte = "Traitement..."
    ) {

        if (!element) {
            return;
        }

        if (occupe) {

            if (
                !element.dataset
                    .prTexteInitial
            ) {

                element.dataset
                    .prTexteInitial =
                        element.textContent;
            }

            element.disabled =
                true;

            element.setAttribute(
                "aria-busy",
                "true"
            );

            if (texte) {

                element.textContent =
                    texte;
            }

            return;
        }

        element.disabled =
            false;

        element.removeAttribute(
            "aria-busy"
        );

        if (
            element.dataset
                .prTexteInitial !==
            undefined
        ) {

            element.textContent =
                element.dataset
                    .prTexteInitial;

            delete element.dataset
                .prTexteInitial;
        }
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


/* ==========================================================
   P5.1c - HARMONISATION AUTOMATIQUE DES ETATS
   ========================================================== */

(() => {

    const motifOccupation =
        /(?:chargement|suppression|validation|enregistrement|connexion|synchronisation|traitement|actualisation|ouverture|pr?paration|generation|g?n?ration|export|import|envoi)[\s?\.]*$/i;


    const estBouton =
        element =>
            element &&
            element.nodeType === 1 &&
            element.matches(
                "button"
            );


    const synchroniserBouton =
        element => {

            if (
                !estBouton(
                    element
                )
            ) {
                return;
            }


            const texte =
                String(
                    element.textContent ||
                    ""
                )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();


            const occupe =
                element.disabled &&
                motifOccupation.test(
                    texte
                );


            if (occupe) {

                element.classList.add(
                    "pr-bouton-occupe"
                );


                if (
                    !element.hasAttribute(
                        "aria-busy"
                    )
                ) {

                    element.setAttribute(
                        "aria-busy",
                        "true"
                    );

                    element.dataset.prBusyAuto =
                        "1";
                }

                return;
            }


            element.classList.remove(
                "pr-bouton-occupe"
            );


            if (
                element.dataset.prBusyAuto ===
                "1"
            ) {

                element.removeAttribute(
                    "aria-busy"
                );

                delete element.dataset
                    .prBusyAuto;
            }
        };


    const synchroniserArbre =
        racine => {

            if (!racine) {
                return;
            }


            if (
                racine.nodeType === 1
            ) {

                synchroniserBouton(
                    racine
                );


                racine
                    .querySelectorAll?.(
                        "button"
                    )
                    .forEach(
                        synchroniserBouton
                    );
            }
        };


    const traiterMutation =
        mutation => {

            if (
                mutation.type ===
                "attributes"
            ) {

                synchroniserBouton(
                    mutation.target
                );

                return;
            }


            if (
                mutation.type ===
                "characterData"
            ) {

                const bouton =
                    mutation.target
                        ?.parentElement
                        ?.closest(
                            "button"
                        );

                synchroniserBouton(
                    bouton
                );

                return;
            }


            synchroniserArbre(
                mutation.target
            );


            mutation.addedNodes
                .forEach(
                    synchroniserArbre
                );
        };


    const demarrer =
        () => {

            synchroniserArbre(
                document.documentElement
            );


            const observateur =
                new MutationObserver(
                    mutations => {

                        mutations.forEach(
                            traiterMutation
                        );
                    }
                );


            observateur.observe(
                document.documentElement,
                {
                    subtree:
                        true,

                    childList:
                        true,

                    characterData:
                        true,

                    attributes:
                        true,

                    attributeFilter:
                        [
                            "disabled"
                        ]
                }
            );
        };


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            demarrer,
            {
                once:
                    true
            }
        );

    } else {

        demarrer();
    }

})();
