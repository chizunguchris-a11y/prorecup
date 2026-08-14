(function () {

    "use strict";

    if (!window.ProRecup) {
        alert("common.js est introuvable.");
        return;
    }

    ProRecup.protegerPage();
    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    function element(id) {
        return document.getElementById(id);
    }

    var corpsTableau =
        element("corpsTableauAudits");

    var erreurAudits =
        element("erreurAudits");

    var boutonActualiser =
        element("boutonActualiserAudits");

    var recherche =
        element("rechercheAudits");

    var filtreRessource =
        element("filtreRessourceAudit");

    var filtreSucces =
        element("filtreSuccesAudit");

    var dateDebut =
        element("dateDebutAudit");

    var dateFin =
        element("dateFinAudit");

    var boutonReinitialiser =
        element("boutonReinitialiserFiltres");

    var boutonPrecedent =
        element("boutonPagePrecedente");

    var boutonSuivant =
        element("boutonPageSuivante");

    var modale =
        element("modaleAudit");

    var boutonFermerModale =
        element("boutonFermerModaleAudit");

    var fondModale =
        element("fondModaleAudit");

    var pageActuelle = 1;
    var nombrePages = 1;
    var minuterieRecherche = null;

    function afficherErreur(message) {

        if (!erreurAudits) {
            return;
        }

        erreurAudits.textContent =
            message || "Une erreur est survenue.";

        erreurAudits.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        if (!erreurAudits) {
            return;
        }

        erreurAudits.textContent = "";

        erreurAudits.classList.add(
            "cache"
        );

    }

    function formaterDate(valeur) {

        if (!valeur) {
            return "—";
        }

        var date =
            new Date(valeur);

        if (isNaN(date.getTime())) {
            return String(valeur);
        }

        return date.toLocaleString(
            "fr-FR"
        );

    }

    function formaterJson(valeur) {

        if (
            valeur === null ||
            valeur === undefined
        ) {
            return "Aucune donnée";
        }

        try {

            return JSON.stringify(
                valeur,
                null,
                2
            );

        } catch (erreur) {

            return String(valeur);

        }

    }

    function construireParametres() {

        var parametres =
            new URLSearchParams();

        if (
            recherche &&
            recherche.value.trim()
        ) {

            parametres.set(
                "recherche",
                recherche.value.trim()
            );

        }

        if (
            filtreRessource &&
            filtreRessource.value
        ) {

            parametres.set(
                "ressource",
                filtreRessource.value
            );

        }

        if (
            filtreSucces &&
            filtreSucces.value !== ""
        ) {

            parametres.set(
                "succes",
                filtreSucces.value
            );

        }

        if (
            dateDebut &&
            dateDebut.value
        ) {

            parametres.set(
                "date_debut",
                dateDebut.value +
                "T00:00:00"
            );

        }

        if (
            dateFin &&
            dateFin.value
        ) {

            parametres.set(
                "date_fin",
                dateFin.value +
                "T23:59:59"
            );

        }

        parametres.set(
            "page",
            String(pageActuelle)
        );

        parametres.set(
            "limite",
            "25"
        );

        return parametres;

    }

    function creerBadgeResultat(succes) {

        var badge =
            document.createElement(
                "span"
            );

        if (succes === true) {

            badge.className =
                "badge-resultat badge-succes";

            badge.textContent =
                "Succès";

        } else {

            badge.className =
                "badge-resultat badge-echec";

            badge.textContent =
                "Échec";

        }

        return badge;

    }

    function creerLigne(audit) {

        var ligne =
            document.createElement(
                "tr"
            );

        var celluleDate =
            document.createElement(
                "td"
            );

        var celluleAction =
            document.createElement(
                "td"
            );

        var celluleRessource =
            document.createElement(
                "td"
            );

        var celluleMethode =
            document.createElement(
                "td"
            );

        var celluleRoute =
            document.createElement(
                "td"
            );

        var celluleResultat =
            document.createElement(
                "td"
            );

        var celluleDetails =
            document.createElement(
                "td"
            );

        celluleDate.textContent =
            formaterDate(
                audit.cree_le
            );

        celluleAction.className =
            "action-audit";

        celluleAction.textContent =
            audit.action || "—";

        celluleRessource.textContent =
            audit.ressource || "—";

        var badgeMethode =
            document.createElement(
                "span"
            );

        badgeMethode.className =
            "badge-methode";

        badgeMethode.textContent =
            audit.methode_http || "—";

        celluleMethode.appendChild(
            badgeMethode
        );

        var route =
            document.createElement(
                "span"
            );

        route.className =
            "route-audit";

        route.textContent =
            audit.route || "—";

        route.title =
            audit.route || "";

        celluleRoute.appendChild(
            route
        );

        celluleResultat.appendChild(
            creerBadgeResultat(
                audit.succes
            )
        );

        var bouton =
            document.createElement(
                "button"
            );

        bouton.type =
            "button";

        bouton.className =
            "bouton-details";

        bouton.textContent =
            "Consulter";

        bouton.addEventListener(
            "click",
            function () {

                consulterAudit(
                    audit.id
                );

            }
        );

        celluleDetails.appendChild(
            bouton
        );

        ligne.appendChild(
            celluleDate
        );

        ligne.appendChild(
            celluleAction
        );

        ligne.appendChild(
            celluleRessource
        );

        ligne.appendChild(
            celluleMethode
        );

        ligne.appendChild(
            celluleRoute
        );

        ligne.appendChild(
            celluleResultat
        );

        ligne.appendChild(
            celluleDetails
        );

        return ligne;

    }

    function afficherAudits(audits) {

        if (!corpsTableau) {
            return;
        }

        corpsTableau.innerHTML = "";

        if (
            !audits ||
            audits.length === 0
        ) {

            corpsTableau.innerHTML =
                '<tr>' +
                '<td colspan="7" class="etat-vide">' +
                "Aucun journal d’audit trouvé." +
                "</td>" +
                "</tr>";

            return;

        }

        audits.forEach(
            function (audit) {

                corpsTableau.appendChild(
                    creerLigne(
                        audit
                    )
                );

            }
        );

    }

    function mettreAJourPagination(
        pagination,
        resume,
        audits
    ) {

        pagination =
            pagination || {};

        resume =
            resume || {};

        audits =
            audits || [];

        var total;

        if (
            resume.total !==
            undefined
        ) {

            total =
                Number(
                    resume.total
                );

        } else if (
            pagination.total !==
            undefined
        ) {

            total =
                Number(
                    pagination.total
                );

        } else {

            total =
                audits.length;

        }

        nombrePages =
            Number(
                pagination.nombre_pages ||
                1
            );

        if (
            !nombrePages ||
            nombrePages < 1
        ) {

            nombrePages = 1;

        }

        pageActuelle =
            Number(
                pagination.page ||
                pageActuelle
            );

        if (
            !pageActuelle ||
            pageActuelle < 1
        ) {

            pageActuelle = 1;

        }

        var succes = 0;
        var echecs = 0;

        if (
            resume.succes !==
            undefined
        ) {

            succes =
                Number(
                    resume.succes
                );

        } else {

            audits.forEach(
                function (audit) {

                    if (
                        audit.succes ===
                        true
                    ) {

                        succes += 1;

                    }

                }
            );

        }

        if (
            resume.echecs !==
            undefined
        ) {

            echecs =
                Number(
                    resume.echecs
                );

        } else {

            audits.forEach(
                function (audit) {

                    if (
                        audit.succes !==
                        true
                    ) {

                        echecs += 1;

                    }

                }
            );

        }

        element(
            "nombreAudits"
        ).textContent =
            String(total);

        element(
            "nombreSucces"
        ).textContent =
            String(succes);

        element(
            "nombreEchecs"
        ).textContent =
            String(echecs);

        element(
            "numeroPage"
        ).textContent =
            String(
                pageActuelle
            );

        element(
            "nombrePages"
        ).textContent =
            "sur " +
            nombrePages;

        element(
            "resumePagination"
        ).textContent =
            "Page " +
            pageActuelle +
            " sur " +
            nombrePages;

        if (boutonPrecedent) {

            boutonPrecedent.disabled =
                pageActuelle <= 1;

        }

        if (boutonSuivant) {

            boutonSuivant.disabled =
                pageActuelle >=
                nombrePages;

        }

    }

    function afficherChargement() {

        if (!corpsTableau) {
            return;
        }

        corpsTableau.innerHTML =
            '<tr>' +
            '<td colspan="7" class="etat-vide">' +
            "Chargement du journal d’audit..." +
            "</td>" +
            "</tr>";

    }

    function chargerAudits() {

        cacherErreur();
        afficherChargement();

        if (boutonActualiser) {

            boutonActualiser.disabled =
                true;

            boutonActualiser.textContent =
                "Chargement...";

        }

        var parametres =
            construireParametres();

        ProRecup.requete(
            "/api/audits?" +
            parametres.toString()
        )
            .then(
                function (resultat) {

                    var audits = [];

                    if (
                        resultat &&
                        Array.isArray(
                            resultat.data
                        )
                    ) {

                        audits =
                            resultat.data;

                    }

                    afficherAudits(
                        audits
                    );

                    mettreAJourPagination(
                        resultat.pagination,
                        resultat.resume,
                        audits
                    );

                }
            )
            .catch(
                function (erreur) {

                    console.error(
                        erreur
                    );

                    afficherAudits(
                        []
                    );

                    element(
                        "nombreAudits"
                    ).textContent =
                        "0";

                    element(
                        "nombreSucces"
                    ).textContent =
                        "0";

                    element(
                        "nombreEchecs"
                    ).textContent =
                        "0";

                    element(
                        "numeroPage"
                    ).textContent =
                        "1";

                    element(
                        "nombrePages"
                    ).textContent =
                        "sur 1";

                    element(
                        "resumePagination"
                    ).textContent =
                        "Page 1 sur 1";

                    afficherErreur(
                        erreur.message ||
                        "Impossible de charger le journal d’audit."
                    );

                }
            )
            .finally(
                function () {

                    if (
                        boutonActualiser
                    ) {

                        boutonActualiser.disabled =
                            false;

                        boutonActualiser.textContent =
                            "Actualiser";

                    }

                }
            );

    }

    function creerBlocDetail(
        titre,
        contenu,
        json,
        grand
    ) {

        var bloc =
            document.createElement(
                "section"
            );

        bloc.className =
            "bloc-detail";

        if (grand) {

            bloc.classList.add(
                "bloc-detail-large"
            );

        }

        var sousTitre =
            document.createElement(
                "h3"
            );

        sousTitre.textContent =
            titre;

        var valeur;

        if (json) {

            valeur =
                document.createElement(
                    "pre"
                );

            valeur.textContent =
                formaterJson(
                    contenu
                );

        } else {

            valeur =
                document.createElement(
                    "p"
                );

            valeur.textContent =
                contenu || "—";

        }

        bloc.appendChild(
            sousTitre
        );

        bloc.appendChild(
            valeur
        );

        return bloc;

    }

    function consulterAudit(id) {

        cacherErreur();

        ProRecup.requete(
            "/api/audits/" +
            id
        )
            .then(
                function (resultat) {

                    if (
                        !resultat ||
                        !resultat.data
                    ) {

                        throw new Error(
                            "Journal d’audit introuvable."
                        );

                    }

                    var audit =
                        resultat.data;

                    var details =
                        element(
                            "detailsAudit"
                        );

                    details.innerHTML =
                        "";

                    element(
                        "titreModaleAudit"
                    ).textContent =
                        audit.action ||
                        "Journal d’audit";

                    details.appendChild(
                        creerBlocDetail(
                            "Date",
                            formaterDate(
                                audit.cree_le
                            ),
                            false,
                            false
                        )
                    );

                    details.appendChild(
                        creerBlocDetail(
                            "Résultat",
                            audit.succes
                                ? "Succès"
                                : (
                                    "Échec — " +
                                    (
                                        audit.message_erreur ||
                                        "Erreur non renseignée"
                                    )
                                ),
                            false,
                            false
                        )
                    );

                    details.appendChild(
                        creerBlocDetail(
                            "Ressource",
                            (
                                audit.ressource ||
                                "—"
                            ) +
                            " — " +
                            (
                                audit.ressource_id ||
                                "Identifiant absent"
                            ),
                            false,
                            false
                        )
                    );

                    details.appendChild(
                        creerBlocDetail(
                            "Requête",
                            (
                                audit.methode_http ||
                                "—"
                            ) +
                            " " +
                            (
                                audit.route ||
                                "—"
                            ),
                            false,
                            false
                        )
                    );

                    details.appendChild(
                        creerBlocDetail(
                            "Adresse IP",
                            audit.adresse_ip,
                            false,
                            false
                        )
                    );

                    details.appendChild(
                        creerBlocDetail(
                            "Navigateur",
                            audit.navigateur,
                            false,
                            false
                        )
                    );

                    details.appendChild(
                        creerBlocDetail(
                            "Ancien état",
                            audit.ancien_etat,
                            true,
                            true
                        )
                    );

                    details.appendChild(
                        creerBlocDetail(
                            "Nouvel état",
                            audit.nouvel_etat,
                            true,
                            true
                        )
                    );

                    details.appendChild(
                        creerBlocDetail(
                            "Contexte",
                            audit.contexte,
                            true,
                            true
                        )
                    );

                    modale.classList.remove(
                        "cache"
                    );

                    document.body.style.overflow =
                        "hidden";

                }
            )
            .catch(
                function (erreur) {

                    console.error(
                        erreur
                    );

                    afficherErreur(
                        erreur.message ||
                        "Impossible de consulter ce journal."
                    );

                }
            );

    }

    function fermerModale() {

        if (!modale) {
            return;
        }

        modale.classList.add(
            "cache"
        );

        document.body.style.overflow =
            "";

    }

    if (boutonActualiser) {

        boutonActualiser.addEventListener(
            "click",
            chargerAudits
        );

    }

    if (boutonPrecedent) {

        boutonPrecedent.addEventListener(
            "click",
            function () {

                if (
                    pageActuelle >
                    1
                ) {

                    pageActuelle -=
                        1;

                    chargerAudits();

                }

            }
        );

    }

    if (boutonSuivant) {

        boutonSuivant.addEventListener(
            "click",
            function () {

                if (
                    pageActuelle <
                    nombrePages
                ) {

                    pageActuelle +=
                        1;

                    chargerAudits();

                }

            }
        );

    }

    if (boutonReinitialiser) {

        boutonReinitialiser.addEventListener(
            "click",
            function () {

                recherche.value =
                    "";

                filtreRessource.value =
                    "";

                filtreSucces.value =
                    "";

                dateDebut.value =
                    "";

                dateFin.value =
                    "";

                pageActuelle =
                    1;

                chargerAudits();

            }
        );

    }

    if (recherche) {

        recherche.addEventListener(
            "input",
            function () {

                window.clearTimeout(
                    minuterieRecherche
                );

                minuterieRecherche =
                    window.setTimeout(
                        function () {

                            pageActuelle =
                                1;

                            chargerAudits();

                        },
                        350
                    );

            }
        );

    }

    [
        filtreRessource,
        filtreSucces,
        dateDebut,
        dateFin
    ].forEach(
        function (champ) {

            if (!champ) {
                return;
            }

            champ.addEventListener(
                "change",
                function () {

                    pageActuelle =
                        1;

                    chargerAudits();

                }
            );

        }
    );

    if (boutonFermerModale) {

        boutonFermerModale.addEventListener(
            "click",
            fermerModale
        );

    }

    if (fondModale) {

        fondModale.addEventListener(
            "click",
            fermerModale
        );

    }

    document.addEventListener(
        "keydown",
        function (evenement) {

            if (
                evenement.key ===
                "Escape"
            ) {

                fermerModale();

            }

        }
    );

    chargerAudits();

})();