(function () {

    "use strict";


    const parId = function (id) {
        return document.getElementById(id);
    };


    const texte = function (
        id,
        valeurDefaut
    ) {

        const source =
            parId(id);

        const valeur =
            source &&
            source.textContent
                ? source.textContent.trim()
                : "";

        return valeur ||
            valeurDefaut ||
            "\u2014";
    };


    const normaliser = function (valeur) {

        return String(
            valeur || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim()
            .toLowerCase();
    };


    const trouverLien = function (
        libelle
    ) {

        const attendu =
            normaliser(libelle);

        const liens =
            Array.from(
                document.querySelectorAll(
                    "a[href]"
                )
            );

        const lien =
            liens.find(
                function (element) {

                    const valeur =
                        normaliser(
                            element.textContent
                        );

                    return (
                        valeur === attendu ||
                        valeur.includes(
                            attendu
                        )
                    );
                }
            );

        return lien
            ? lien.getAttribute("href")
            : null;
    };


    const connecterLien = function (
        nom,
        libelle
    ) {

        const element =
            document.querySelector(
                '[data-pcp-link="' +
                nom +
                '"]'
            );

        if (!element) {
            return;
        }

        const href =
            trouverLien(libelle);

        if (!href) {

            element.hidden =
                true;

            return;
        }

        element.href =
            href;

        element.hidden =
            false;
    };


    const rafraichirTrace =
        function (
            sourceId,
            cibleId
        ) {

            const source =
                parId(sourceId);

            const cible =
                parId(cibleId);

            if (!cible) {
                return;
            }

            const documente =
                Boolean(
                    source &&
                    source.classList.contains(
                        "done"
                    )
                );

            cible.classList.toggle(
                "is-done",
                documente
            );

            const statut =
                cible.querySelector(
                    ".pcp-trace-state"
                );

            const detail =
                cible.querySelector(
                    ".pcp-trace-copy small"
                );

            if (statut) {

                statut.textContent =
                    documente
                        ? "Document\u00e9"
                        : "En cours";
            }

            if (
                source &&
                detail
            ) {

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


    const rafraichir =
        function () {

            const valeurs = [
                [
                    "pcpPoids",
                    "statPoids"
                ],
                [
                    "pcpCollectes",
                    "statCollectes"
                ],
                [
                    "pcpPreuves",
                    "statPreuves"
                ],
                [
                    "pcpDerniereCollecte",
                    "derniereCollectePoids"
                ]
            ];


            valeurs.forEach(
                function (item) {

                    const cible =
                        parId(
                            item[0]
                        );

                    if (cible) {

                        cible.textContent =
                            texte(
                                item[1],
                                "\u2014"
                            );
                    }
                }
            );


            const derniereNote =
                parId(
                    "pcpDerniereCollecteNote"
                );

            if (derniereNote) {

                derniereNote.textContent =
                    texte(
                        "derniereCollectePoidsLabel",
                        "Derni\u00e8re collecte document\u00e9e"
                    );
            }


            rafraichirTrace(
                "traceCollecte",
                "pcpTraceCollecte"
            );

            rafraichirTrace(
                "tracePesee",
                "pcpTracePesee"
            );

            rafraichirTrace(
                "tracePreuves",
                "pcpTracePreuves"
            );


            connecterLien(
                "collectes",
                "Collectes"
            );

            connecterLien(
                "sites",
                "Sites"
            );

            connecterLien(
                "impact",
                "Impact"
            );
        };


    const observer =
        function () {

            const ids = [
                "statPoids",
                "statCollectes",
                "statPreuves",
                "derniereCollectePoids",
                "derniereCollectePoidsLabel",
                "traceCollecte",
                "tracePesee",
                "tracePreuves"
            ];


            ids.forEach(
                function (id) {

                    const source =
                        parId(id);

                    if (!source) {
                        return;
                    }

                    const mutation =
                        new MutationObserver(
                            rafraichir
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
                }
            );
        };


    const construire =
        function () {

            if (
                parId(
                    "pcpAccueilPremium"
                )
            ) {
                return;
            }


            const main =
                document.querySelector(
                    "main"
                );

            if (!main) {
                return;
            }


            const section =
                document.createElement(
                    "section"
                );


            section.id =
                "pcpAccueilPremium";

            section.className =
                "pcp-home";

            section.setAttribute(
                "aria-labelledby",
                "pcpAccueilTitre"
            );


            section.innerHTML = `
                <div class="pcp-head">

                    <div>

                        <span class="pcp-eyebrow">
                            VOTRE SERVICE PRO R\u00c9CUP
                        </span>

                        <h2
                            class="pcp-title"
                            id="pcpAccueilTitre"
                        >
                            Votre activit\u00e9 en un coup d'oeil
                        </h2>

                        <p class="pcp-subtitle">
                            Une lecture simple de vos collectes,
                            de la mati\u00e8re mesur\u00e9e et des preuves
                            qui documentent votre service.
                        </p>

                    </div>

                    <span class="pcp-badge">
                        Vue client
                    </span>

                </div>


                <div class="pcp-kpis">

                    <article class="pcp-kpi">

                        <span class="pcp-kpi-label">
                            Poids r\u00e9el ce mois
                        </span>

                        <strong
                            class="pcp-kpi-value"
                            id="pcpPoids"
                        >
                            \u2014
                        </strong>

                        <small class="pcp-kpi-note">
                            Mati\u00e8re effectivement mesur\u00e9e
                        </small>

                    </article>


                    <article class="pcp-kpi">

                        <span class="pcp-kpi-label">
                            Collectes ce mois
                        </span>

                        <strong
                            class="pcp-kpi-value"
                            id="pcpCollectes"
                        >
                            \u2014
                        </strong>

                        <small class="pcp-kpi-note">
                            Activit\u00e9 enregistr\u00e9e
                        </small>

                    </article>


                    <article class="pcp-kpi">

                        <span class="pcp-kpi-label">
                            Preuves ce mois
                        </span>

                        <strong
                            class="pcp-kpi-value"
                            id="pcpPreuves"
                        >
                            \u2014
                        </strong>

                        <small class="pcp-kpi-note">
                            El\u00e9ments de tra\u00e7abilit\u00e9
                        </small>

                    </article>


                    <article class="pcp-kpi">

                        <span class="pcp-kpi-label">
                            Derni\u00e8re collecte
                        </span>

                        <strong
                            class="pcp-kpi-value"
                            id="pcpDerniereCollecte"
                        >
                            \u2014
                        </strong>

                        <small
                            class="pcp-kpi-note"
                            id="pcpDerniereCollecteNote"
                        >
                            Derni\u00e8re collecte document\u00e9e
                        </small>

                    </article>

                </div>


                <div class="pcp-grid">

                    <article class="pcp-panel">

                        <div class="pcp-panel-head">

                            <strong>
                                Tra\u00e7abilit\u00e9 de la derni\u00e8re collecte
                            </strong>

                            <span>
                                Etat des principales preuves
                                disponibles dans votre dossier.
                            </span>

                        </div>


                        <div class="pcp-trace">

                            <div
                                class="pcp-trace-row"
                                id="pcpTraceCollecte"
                            >

                                <span class="pcp-trace-point"></span>

                                <div class="pcp-trace-copy">

                                    <strong>
                                        Collecte
                                    </strong>

                                    <small>
                                        En attente de donn\u00e9es
                                    </small>

                                </div>

                                <span class="pcp-trace-state">
                                    En cours
                                </span>

                            </div>


                            <div
                                class="pcp-trace-row"
                                id="pcpTracePesee"
                            >

                                <span class="pcp-trace-point"></span>

                                <div class="pcp-trace-copy">

                                    <strong>
                                        Pes\u00e9e
                                    </strong>

                                    <small>
                                        En attente de donn\u00e9es
                                    </small>

                                </div>

                                <span class="pcp-trace-state">
                                    En cours
                                </span>

                            </div>


                            <div
                                class="pcp-trace-row"
                                id="pcpTracePreuves"
                            >

                                <span class="pcp-trace-point"></span>

                                <div class="pcp-trace-copy">

                                    <strong>
                                        Preuves
                                    </strong>

                                    <small>
                                        En attente de donn\u00e9es
                                    </small>

                                </div>

                                <span class="pcp-trace-state">
                                    En cours
                                </span>

                            </div>

                        </div>

                    </article>


                    <article class="pcp-panel">

                        <div class="pcp-impact">

                            <div>

                                <div class="pcp-panel-head">

                                    <strong>
                                        Impact environnemental
                                    </strong>

                                    <span>
                                        Mesure responsable
                                    </span>

                                </div>


                                <span class="pcp-impact-status">
                                    Carbone \u00b7 En consolidation
                                </span>


                                <p>
                                    Les poids et les preuves sont
                                    disponibles sans transformer une
                                    estimation carbone en resultat
                                    certifie. Le calcul carbone sera
                                    consolide avec la chaine de
                                    valorisation.
                                </p>

                            </div>


                            <div class="pcp-actions">

                                <a
                                    class="pcp-action"
                                    data-pcp-link="collectes"
                                    href="#"
                                    hidden
                                >
                                    Voir mes collectes
                                </a>

                                <a
                                    class="pcp-action"
                                    data-pcp-link="sites"
                                    href="#"
                                    hidden
                                >
                                    Voir mes sites
                                </a>

                                <a
                                    class="pcp-action"
                                    data-pcp-link="impact"
                                    href="#"
                                    hidden
                                >
                                    Voir mon impact
                                </a>

                            </div>

                        </div>

                    </article>

                </div>
            `;


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


            observer();

            rafraichir();
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