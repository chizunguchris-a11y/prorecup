(function () {

    "use strict";


    const parId =
        function (id) {

            return document.getElementById(
                id
            );
        };


    const texte =
        function (
            id,
            defaut
        ) {

            const element =
                parId(id);

            const valeur =
                element &&
                element.textContent
                    ? element.textContent.trim()
                    : "";

            return valeur ||
                defaut ||
                "\u2014";
        };


    const creer =
        function (
            balise,
            classe,
            contenu
        ) {

            const element =
                document.createElement(
                    balise
                );

            if (classe) {

                element.className =
                    classe;
            }

            if (
                contenu !== undefined &&
                contenu !== null
            ) {

                element.textContent =
                    contenu;
            }

            return element;
        };


    const ajouterKpi =
        function (
            grille,
            libelle,
            valeurId,
            note,
            cibleId
        ) {

            const carte =
                creer(
                    "article",
                    "pct-kpi"
                );

            const label =
                creer(
                    "span",
                    "",
                    libelle
                );

            const valeur =
                creer(
                    "strong",
                    "",
                    "\u2014"
                );

            valeur.id =
                cibleId;

            const petit =
                creer(
                    "small",
                    "",
                    note
                );

            carte.append(
                label,
                valeur,
                petit
            );

            grille.appendChild(
                carte
            );


            valeur.dataset.source =
                valeurId;
        };


    const valeurSource =
        function (
            cible
        ) {

            if (!cible) {
                return;
            }

            cible.textContent =
                texte(
                    cible.dataset.source,
                    "\u2014"
                );
        };


    const connecterSource =
        function (
            cible
        ) {

            valeurSource(
                cible
            );

            const source =
                parId(
                    cible.dataset.source
                );

            if (!source) {
                return;
            }

            const mutation =
                new MutationObserver(
                    function () {
                        valeurSource(
                            cible
                        );
                    }
                );

            mutation.observe(
                source,
                {
                    childList:
                        true,

                    characterData:
                        true,

                    subtree:
                        true
                }
            );
        };


    const mettreTrace =
        function (
            sourceId,
            cible
        ) {

            const source =
                parId(
                    sourceId
                );

            if (
                !source ||
                !cible
            ) {
                return;
            }

            const appliquer =
                function () {

                    const termine =
                        source.classList.contains(
                            "done"
                        );

                    cible.classList.toggle(
                        "is-done",
                        termine
                    );

                    const statut =
                        cible.querySelector(
                            ".pct-trace-state"
                        );

                    const detail =
                        cible.querySelector(
                            ".pct-copy small"
                        );

                    if (statut) {

                        statut.textContent =
                            termine
                                ? "Document\u00e9"
                                : "En cours";
                    }

                    if (detail) {

                        const valeur =
                            String(
                                source.textContent || ""
                            )
                                .replace(
                                    /\s+/g,
                                    " "
                                )
                                .trim();

                        if (valeur) {

                            detail.textContent =
                                valeur;
                        }
                    }
                };


            appliquer();


            const mutation =
                new MutationObserver(
                    appliquer
                );

            mutation.observe(
                source,
                {
                    attributes:
                        true,

                    childList:
                        true,

                    characterData:
                        true,

                    subtree:
                        true
                }
            );
        };


    const traceRow =
        function (
            titre,
            id
        ) {

            const row =
                creer(
                    "div",
                    "pct-trace-row"
                );

            row.id =
                id;


            const point =
                creer(
                    "span",
                    "pct-point"
                );


            const copy =
                creer(
                    "div",
                    "pct-copy"
                );

            copy.append(
                creer(
                    "strong",
                    "",
                    titre
                ),

                creer(
                    "small",
                    "",
                    "En attente de donnees"
                )
            );


            const statut =
                creer(
                    "span",
                    "pct-trace-state",
                    "En cours"
                );


            row.append(
                point,
                copy,
                statut
            );


            return row;
        };


    const inserer =
        function (
            section
        ) {

            const main =
                document.querySelector(
                    "main"
                );

            if (!main) {
                return false;
            }


            const premiereSection =
                Array.from(
                    main.children
                ).find(
                    function (element) {

                        return (
                            element.tagName ===
                            "SECTION"
                        );
                    }
                );


            if (premiereSection) {

                premiereSection.insertAdjacentElement(
                    "afterend",
                    section
                );
            }
            else {

                main.prepend(
                    section
                );
            }


            return true;
        };


    const construireListe =
        function () {

            if (
                !parId(
                    "statPoidsCollectes"
                )
            ) {
                return false;
            }


            if (
                parId(
                    "pctCollectesPremium"
                )
            ) {
                return true;
            }


            const section =
                creer(
                    "section",
                    "pct-shell"
                );

            section.id =
                "pctCollectesPremium";


            const head =
                creer(
                    "div",
                    "pct-head"
                );


            const copy =
                creer(
                    "div"
                );


            copy.append(
                creer(
                    "span",
                    "pct-eyebrow",
                    "DOSSIER DE COLLECTES"
                )
            );


            const titre =
                creer(
                    "h2",
                    "pct-title",
                    "Vos collectes documentees"
                );

            titre.id =
                "pctCollectesTitre";


            copy.append(
                titre,

                creer(
                    "p",
                    "pct-subtitle",
                    "Retrouvez la matiere mesuree, les collectes enregistrees et les preuves disponibles dans votre historique."
                )
            );


            head.append(
                copy,

                creer(
                    "span",
                    "pct-state",
                    "Vue documentaire"
                )
            );


            const grille =
                creer(
                    "div",
                    "pct-kpis"
                );


            ajouterKpi(
                grille,
                "Poids reel",
                "statPoidsCollectes",
                "Matiere mesuree dans la selection",
                "pctListePoids"
            );


            ajouterKpi(
                grille,
                "Preuves",
                "statPreuvesCollectes",
                "Elements documentaires disponibles",
                "pctListePreuves"
            );


            ajouterKpi(
                grille,
                "Resultats",
                "nombreResultats",
                "Collectes correspondant aux filtres",
                "pctListeResultats"
            );


            section.append(
                head,
                grille
            );


            if (
                !inserer(
                    section
                )
            ) {
                return false;
            }


            section
                .querySelectorAll(
                    "[data-source]"
                )
                .forEach(
                    connecterSource
                );


            return true;
        };


    const construireDetail =
        function () {

            if (
                !parId(
                    "detailNombrePreuves"
                )
            ) {
                return false;
            }


            if (
                parId(
                    "pctCollecteDetailPremium"
                )
            ) {
                return true;
            }


            const section =
                creer(
                    "section",
                    "pct-shell"
                );

            section.id =
                "pctCollecteDetailPremium";


            const head =
                creer(
                    "div",
                    "pct-head"
                );


            const copy =
                creer(
                    "div"
                );


            copy.append(
                creer(
                    "span",
                    "pct-eyebrow",
                    "DOSSIER DE TRACABILITE"
                )
            );


            const titre =
                creer(
                    "h2",
                    "pct-title",
                    "Cette collecte est documentee"
                );

            titre.id =
                "pctCollecteDetailTitre";


            copy.append(
                titre,

                creer(
                    "p",
                    "pct-subtitle",
                    "Lecture client de la mesure, de la pesee et des preuves associees a cette collecte."
                )
            );


            head.append(
                copy,

                creer(
                    "span",
                    "pct-state",
                    "Preuves securisees"
                )
            );


            const grille =
                creer(
                    "div",
                    "pct-kpis"
                );


            ajouterKpi(
                grille,
                "Poids",
                "detailPoids",
                "Valeur affichee dans le dossier",
                "pctDetailPoids"
            );


            ajouterKpi(
                grille,
                "Type de mesure",
                "detailPoidsLabel",
                "Reel ou estime selon les donnees",
                "pctDetailPoidsType"
            );


            ajouterKpi(
                grille,
                "Preuves",
                "detailNombrePreuves",
                "Pieces accessibles pour cette collecte",
                "pctDetailPreuves"
            );


            const trace =
                creer(
                    "div",
                    "pct-trace"
                );


            const collecte =
                traceRow(
                    "Collecte",
                    "pctTraceCollecte"
                );


            const pesee =
                traceRow(
                    "Pesee",
                    "pctTracePesee"
                );


            const preuves =
                traceRow(
                    "Preuves",
                    "pctTracePreuves"
                );


            trace.append(
                collecte,
                pesee,
                preuves
            );


            const focus =
                creer(
                    "div",
                    "pct-proof-focus"
                );


            focus.append(
                creer(
                    "strong",
                    "",
                    "Preuves disponibles"
                ),

                creer(
                    "p",
                    "",
                    "Les fichiers de preuve restent proteges. Leur URL temporaire est demandee uniquement lorsque vous ouvrez une preuve autorisee."
                )
            );


            const compteur =
                creer(
                    "span",
                    "pct-proof-count",
                    "\u2014"
                );

            compteur.id =
                "pctProofCount";

            compteur.dataset.source =
                "detailNombrePreuves";


            focus.appendChild(
                compteur
            );


            section.append(
                head,
                grille,
                trace,
                focus
            );


            if (
                !inserer(
                    section
                )
            ) {
                return false;
            }


            section
                .querySelectorAll(
                    "[data-source]"
                )
                .forEach(
                    connecterSource
                );


            mettreTrace(
                "detailTraceCollecte",
                collecte
            );


            mettreTrace(
                "detailTracePesee",
                pesee
            );


            mettreTrace(
                "detailTracePreuves",
                preuves
            );


            return true;
        };


    const construire =
        function () {

            construireListe();

            construireDetail();
        };


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            construire,
            {
                once:
                    true
            }
        );
    }
    else {

        construire();
    }

})();