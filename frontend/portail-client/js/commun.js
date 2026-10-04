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

    },


    statutClient: function (
        collecte
    ) {

        const brut =
            String(
                collecte?.statut ||
                ""
            )
                .trim()
                .toLowerCase();


        const poidsReel =
            Number(
                collecte?.poids_reel
            );


        const aPoidsReel =
            collecte?.poids_reel !== null &&
            collecte?.poids_reel !== undefined &&
            Number.isFinite(
                poidsReel
            );


        const preuves =
            Number(
                collecte?.nombre_preuves ??
                (
                    Array.isArray(
                        collecte?.preuves
                    )
                        ? collecte.preuves.length
                        : 0
                )
            );


        const nombrePreuves =
            Number.isFinite(
                preuves
            )
                ? preuves
                : 0;


        if (
            brut === "annule" ||
            brut === "annulee"
        ) {

            return {
                code:
                    "annulee",

                label:
                    "Annul\u00e9e",

                classe:
                    "danger"
            };

        }


        if (
            brut === "echec"
        ) {

            return {
                code:
                    "non_realisee",

                label:
                    "Non r\u00e9alis\u00e9e",

                classe:
                    "danger"
            };

        }


        if (
            brut === "valide" ||
            brut === "terminee"
        ) {

            return {
                code:
                    "validee",

                label:
                    "Valid\u00e9e",

                classe:
                    "success"
            };

        }


        if (
            aPoidsReel &&
            nombrePreuves > 0
        ) {

            return {
                code:
                    "documentee",

                label:
                    "Document\u00e9e",

                classe:
                    "success"
            };

        }


        if (
            aPoidsReel
        ) {

            return {
                code:
                    "realisee",

                label:
                    "R\u00e9alis\u00e9e",

                classe:
                    "success"
            };

        }


        if (
            brut === "en_cours"
        ) {

            return {
                code:
                    "en_cours",

                label:
                    "En cours",

                classe:
                    "progress"
            };

        }


        if (
            brut === "planifiee"
        ) {

            return {
                code:
                    "planifiee",

                label:
                    "Planifi\u00e9e",

                classe:
                    "progress"
            };

        }


        return {
            code:
                "en_attente",

            label:
                "En attente",

            classe:
                "neutral"
        };

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


};


window.PortailRecup =
    PortailRecup;



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
