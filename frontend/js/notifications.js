(function () {

    "use strict";

    if (!window.ProRecup) {

        alert(
            "common.js est introuvable."
        );

        return;

    }

    ProRecup.protegerPage();
    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    function element(id) {

        return document.getElementById(
            id
        );

    }

    const boutonActualiser =
        element(
            "boutonActualiserNotifications"
        );

    const boutonToutMarquerLu =
        element(
            "boutonToutMarquerLu"
        );

    const erreurNotifications =
        element(
            "erreurNotifications"
        );

    const recherche =
        element(
            "rechercheNotifications"
        );

    const filtreType =
        element(
            "filtreTypeNotification"
        );

    const filtreLecture =
        element(
            "filtreLectureNotification"
        );

    const listeNotifications =
        element(
            "listeNotifications"
        );

    let notifications = [];
    let minuterieRecherche = null;

    function definirTexte(
        id,
        valeur
    ) {

        const cible =
            element(id);

        if (cible) {

            cible.textContent =
                String(valeur);

        }

    }

    function signalerModificationNotifications() {

        if (
            typeof ProRecup
                .notifierModificationNotifications ===
            "function"
        ) {

            ProRecup
                .notifierModificationNotifications();

            return;

        }

        document.dispatchEvent(
            new CustomEvent(
                "prorecup:notifications-modifiees"
            )
        );

    }

    function afficherErreur(
        message
    ) {

        if (!erreurNotifications) {
            return;
        }

        erreurNotifications.textContent =
            message;

        erreurNotifications.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        if (!erreurNotifications) {
            return;
        }

        erreurNotifications.textContent =
            "";

        erreurNotifications.classList.add(
            "cache"
        );

    }

    function extraireListe(
        resultat
    ) {

        if (
            Array.isArray(
                resultat
            )
        ) {

            return resultat;

        }

        if (
            resultat &&
            Array.isArray(
                resultat.data
            )
        ) {

            return resultat.data;

        }

        if (
            resultat &&
            resultat.data &&
            Array.isArray(
                resultat.data.data
            )
        ) {

            return resultat.data.data;

        }

        return [];

    }

    function formaterDate(
        valeur
    ) {

        if (!valeur) {

            return "Date inconnue";

        }

        const date =
            new Date(valeur);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(valeur);

        }

        return date.toLocaleString(
            "fr-FR",
            {
                dateStyle:
                    "medium",

                timeStyle:
                    "short"
            }
        );

    }

    function formaterCategorie(
        categorie
    ) {

        const libelles = {

            mission_creee:
                "Mission créée",

            mission_modifiee:
                "Mission modifiée",

            mission_demarree:
                "Mission démarrée",

            mission_terminee:
                "Mission terminée",

            mission_annulee:
                "Mission annulée",

            collecte_creee:
                "Collecte créée",

            collecte_validee:
                "Collecte validée",

            incident_signale:
                "Incident signalé",

            agent_suspendu:
                "Agent suspendu",

            tricycle_indisponible:
                "Tricycle indisponible"

        };

        return (
            libelles[categorie] ||
            categorie ||
            "Notification"
        );

    }

    function obtenirIcone(
        notification
    ) {

        const iconesCategories = {

            mission_creee:
                "M",

            mission_modifiee:
                "M",

            mission_demarree:
                "▶",

            mission_terminee:
                "✓",

            mission_annulee:
                "!",

            collecte_creee:
                "C",

            collecte_validee:
                "✓",

            incident_signale:
                "!",

            agent_suspendu:
                "A",

            tricycle_indisponible:
                "T"

        };

        if (
            iconesCategories[
                notification.categorie
            ]
        ) {

            return iconesCategories[
                notification.categorie
            ];

        }

        const iconesTypes = {

            alerte:
                "!",

            erreur:
                "!",

            succes:
                "✓",

            information:
                "i"

        };

        return (
            iconesTypes[
                notification.type
            ] ||
            "i"
        );

    }

    function normaliserType(
        type
    ) {

        if (type === "erreur") {

            return "alerte";

        }

        if (
            [
                "alerte",
                "succes",
                "information"
            ].includes(type)
        ) {

            return type;

        }

        return "information";

    }

    function construireParametres() {

        const parametres =
            new URLSearchParams();

        const texteRecherche =
            recherche
                ? recherche.value.trim()
                : "";

        if (texteRecherche) {

            parametres.set(
                "recherche",
                texteRecherche
            );

        }

        if (
            filtreType &&
            filtreType.value
        ) {

            parametres.set(
                "type",
                filtreType.value
            );

        }

        if (
            filtreLecture &&
            filtreLecture.value ===
                "lue"
        ) {

            parametres.set(
                "lue",
                "true"
            );

        }

        if (
            filtreLecture &&
            filtreLecture.value ===
                "non_lue"
        ) {

            parametres.set(
                "lue",
                "false"
            );

        }

        parametres.set(
            "page",
            "1"
        );

        parametres.set(
            "limite",
            "100"
        );

        return parametres;

    }

    function mettreAJourResume() {

        const total =
            notifications.length;

        const nonLues =
            notifications.filter(
                (notification) =>
                    notification.lue !== true
            ).length;

        const alertes =
            notifications.filter(
                (notification) =>
                    notification.type ===
                        "alerte" ||
                    notification.type ===
                        "erreur"
            ).length;

        const informations =
            notifications.filter(
                (notification) =>
                    notification.type ===
                        "information"
            ).length;

        definirTexte(
            "nombreNotifications",
            total
        );

        definirTexte(
            "nombreNonLues",
            nonLues
        );

        definirTexte(
            "nombreAlertes",
            alertes
        );

        definirTexte(
            "nombreInformations",
            informations
        );

        definirTexte(
            "nombreResultats",
            total +
            (
                total > 1
                    ? " résultats"
                    : " résultat"
            )
        );

    }

    async function marquerCommeLue(
        notification
    ) {

        if (
            notification.lue === true
        ) {

            return notification;

        }

        const resultat =
            await ProRecup.requete(
                `/api/notifications/${notification.id}/lire`,
                {
                    method:
                        "PATCH",

                    body:
                        JSON.stringify({})
                }
            );

        notification.lue =
            true;

        notification.lue_le =
            resultat.data?.lue_le ||
            new Date().toISOString();

        mettreAJourResume();

        signalerModificationNotifications();

        return notification;

    }

    async function supprimerNotification(
        notification
    ) {

        const confirmation =
            window.confirm(
                "Supprimer cette notification de votre liste ?"
            );

        if (!confirmation) {
            return;
        }

        try {

            await ProRecup.requete(
                `/api/notifications/${notification.id}`,
                {
                    method:
                        "DELETE"
                }
            );

            notifications =
                notifications.filter(
                    (elementNotification) =>
                        elementNotification.id !==
                        notification.id
                );

            afficherNotifications();

            signalerModificationNotifications();

            ProRecup.afficherNotification(
                "Notification supprimée.",
                "succes"
            );

        } catch (erreur) {

            afficherErreur(
                erreur.message ||
                "Impossible de supprimer la notification."
            );

        }

    }

    function creerBoutonSuppression(
        notification
    ) {

        const bouton =
            document.createElement(
                "button"
            );

        bouton.type =
            "button";

        bouton.className =
            "bouton-supprimer-notification";

        bouton.textContent =
            "Supprimer";

        bouton.setAttribute(
            "aria-label",
            "Supprimer la notification"
        );

        bouton.addEventListener(
            "click",
            async (evenement) => {

                evenement.stopPropagation();

                await supprimerNotification(
                    notification
                );

            }
        );

        return bouton;

    }

    function creerLigneNotification(
        notification
    ) {

        const type =
            normaliserType(
                notification.type
            );

        const ligne =
            document.createElement(
                "article"
            );

        ligne.className =
            `notification-ligne type-${type}`;

        if (
            notification.lue !== true
        ) {

            ligne.classList.add(
                "non-lue"
            );

        }

        ligne.tabIndex = 0;

        ligne.setAttribute(
            "role",
            "button"
        );

        const icone =
            document.createElement(
                "div"
            );

        icone.className =
            "icone-notification";

        icone.textContent =
            obtenirIcone(
                notification
            );

        const contenu =
            document.createElement(
                "div"
            );

        contenu.className =
            "contenu-notification";

        const entete =
            document.createElement(
                "div"
            );

        entete.className =
            "entete-notification";

        const titre =
            document.createElement(
                "strong"
            );

        titre.textContent =
            notification.titre ||
            formaterCategorie(
                notification.categorie
            );

        entete.appendChild(
            titre
        );

        if (
            notification.lue !== true
        ) {

            const point =
                document.createElement(
                    "span"
                );

            point.className =
                "point-non-lu";

            point.title =
                "Notification non lue";

            entete.appendChild(
                point
            );

        }

        const message =
            document.createElement(
                "p"
            );

        message.textContent =
            notification.message ||
            "";

        const meta =
            document.createElement(
                "div"
            );

        meta.className =
            "meta-notification";

        const categorie =
            document.createElement(
                "span"
            );

        categorie.textContent =
            formaterCategorie(
                notification.categorie
            );

        const etat =
            document.createElement(
                "span"
            );

        etat.textContent =
            notification.lue === true
                ? "Lue"
                : "Non lue";

        meta.appendChild(
            categorie
        );

        meta.appendChild(
            etat
        );

        if (
            notification.ressource
        ) {

            const ressource =
                document.createElement(
                    "span"
                );

            ressource.textContent =
                `Ressource : ${notification.ressource}`;

            meta.appendChild(
                ressource
            );

        }

        contenu.appendChild(
            entete
        );

        contenu.appendChild(
            message
        );

        contenu.appendChild(
            meta
        );

        const zoneDroite =
            document.createElement(
                "div"
            );

        zoneDroite.className =
            "zone-droite-notification";

        const date =
            document.createElement(
                "span"
            );

        date.className =
            "date-notification";

        date.textContent =
            formaterDate(
                notification.cree_le
            );

        zoneDroite.appendChild(
            date
        );

        zoneDroite.appendChild(
            creerBoutonSuppression(
                notification
            )
        );

        ligne.appendChild(
            icone
        );

        ligne.appendChild(
            contenu
        );

        ligne.appendChild(
            zoneDroite
        );

        const ouvrirNotification =
            async () => {

                try {

                    await marquerCommeLue(
                        notification
                    );

                    if (
                        notification.lien
                    ) {

                        window.location.href =
                            notification.lien;

                        return;

                    }

                    afficherNotifications();

                } catch (erreur) {

                    afficherErreur(
                        erreur.message ||
                        "Impossible de marquer la notification comme lue."
                    );

                }

            };

        ligne.addEventListener(
            "click",
            ouvrirNotification
        );

        ligne.addEventListener(
            "keydown",
            async (evenement) => {

                if (
                    evenement.key ===
                        "Enter" ||
                    evenement.key ===
                        " "
                ) {

                    evenement.preventDefault();

                    await ouvrirNotification();

                }

            }
        );

        return ligne;

    }

    function afficherNotifications() {

        listeNotifications.innerHTML =
            "";

        mettreAJourResume();

        if (
            notifications.length === 0
        ) {

            listeNotifications.innerHTML =
                '<div class="etat-vide">' +
                "Aucune notification ne correspond aux filtres." +
                "</div>";

            return;

        }

        notifications.forEach(
            (notification) => {

                listeNotifications.appendChild(
                    creerLigneNotification(
                        notification
                    )
                );

            }
        );

    }

    async function chargerCompteurNonLues() {

        try {

            const resultat =
                await ProRecup.requete(
                    "/api/notifications/non-lues/compteur"
                );

            const total =
                Number(
                    resultat.data?.total ||
                    0
                );

            definirTexte(
                "nombreNonLues",
                total
            );

        } catch (erreur) {

            console.warn(
                "Compteur des notifications indisponible :",
                erreur.message
            );

        }

    }

    async function chargerNotifications() {

        cacherErreur();

        if (boutonActualiser) {

            boutonActualiser.disabled =
                true;

            boutonActualiser.textContent =
                "Chargement...";

        }

        listeNotifications.innerHTML =
            '<div class="etat-vide">' +
            "Chargement des notifications..." +
            "</div>";

        try {

            const parametres =
                construireParametres();

            const resultat =
                await ProRecup.requete(
                    `/api/notifications?${parametres.toString()}`
                );

            notifications =
                extraireListe(
                    resultat
                );

            afficherNotifications();

            await chargerCompteurNonLues();

            signalerModificationNotifications();

        } catch (erreur) {

            console.error(
                erreur
            );

            notifications = [];

            afficherNotifications();

            afficherErreur(
                erreur.message ||
                "Impossible de charger les notifications."
            );

        } finally {

            if (boutonActualiser) {

                boutonActualiser.disabled =
                    false;

                boutonActualiser.textContent =
                    "Actualiser";

            }

        }

    }

    async function marquerToutesCommeLues() {

        if (
            notifications.length === 0
        ) {

            ProRecup.afficherNotification(
                "Aucune notification à mettre à jour.",
                "information"
            );

            return;

        }

        boutonToutMarquerLu.disabled =
            true;

        boutonToutMarquerLu.textContent =
            "Mise à jour...";

        try {

            const resultat =
                await ProRecup.requete(
                    "/api/notifications/tout-lire",
                    {
                        method:
                            "PATCH",

                        body:
                            JSON.stringify({})
                    }
                );

            notifications.forEach(
                (notification) => {

                    notification.lue =
                        true;

                    notification.lue_le =
                        new Date()
                            .toISOString();

                }
            );

            afficherNotifications();

            definirTexte(
                "nombreNonLues",
                0
            );

            signalerModificationNotifications();

            const nombreModifie =
                Number(
                    resultat.data
                        ?.nombre_modifie ||
                    0
                );

            ProRecup.afficherNotification(
                nombreModifie +
                " notification(s) marquée(s) comme lue(s).",
                "succes"
            );

        } catch (erreur) {

            afficherErreur(
                erreur.message ||
                "Impossible de marquer les notifications comme lues."
            );

        } finally {

            boutonToutMarquerLu.disabled =
                false;

            boutonToutMarquerLu.textContent =
                "Tout marquer comme lu";

        }

    }

    if (boutonActualiser) {

        boutonActualiser.addEventListener(
            "click",
            chargerNotifications
        );

    }

    if (boutonToutMarquerLu) {

        boutonToutMarquerLu.addEventListener(
            "click",
            marquerToutesCommeLues
        );

    }

    if (recherche) {

        recherche.addEventListener(
            "input",
            () => {

                window.clearTimeout(
                    minuterieRecherche
                );

                minuterieRecherche =
                    window.setTimeout(
                        chargerNotifications,
                        350
                    );

            }
        );

    }

    if (filtreType) {

        filtreType.addEventListener(
            "change",
            chargerNotifications
        );

    }

    if (filtreLecture) {

        filtreLecture.addEventListener(
            "change",
            chargerNotifications
        );

    }

    chargerNotifications();

})();