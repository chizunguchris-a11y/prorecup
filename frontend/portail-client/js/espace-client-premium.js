(function () {

    "use strict";


    const parId =
        function (id) {

            return document.getElementById(
                id
            );
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


    const pageCourante =
        function () {

            const scripts =
                Array.from(
                    document.querySelectorAll(
                        "script[src]"
                    )
                );

            if (
                scripts.some(
                    function (script) {

                        return String(
                            script.getAttribute(
                                "src"
                            ) || ""
                        ).includes(
                            "js/sites.js"
                        );
                    }
                )
            ) {

                return "sites";
            }


            if (
                scripts.some(
                    function (script) {

                        return String(
                            script.getAttribute(
                                "src"
                            ) || ""
                        ).includes(
                            "js/impact.js"
                        );
                    }
                )
            ) {

                return "impact";
            }


            if (
                scripts.some(
                    function (script) {

                        return String(
                            script.getAttribute(
                                "src"
                            ) || ""
                        ).includes(
                            "js/compte.js"
                        );
                    }
                )
            ) {

                return "compte";
            }


            return null;
        };


    const configurations = {

        sites: {

            eyebrow:
                "VOTRE PERIMETRE",

            titre:
                "Vos sites suivis",

            sousTitre:
                "Retrouvez les sites rattaches a votre compte et utilisez-les comme point de lecture de votre historique de collecte.",

            badge:
                "Sites autorises",

            cartes: [
                {
                    label:
                        "Perimetre",

                    titre:
                        "Vos sites rattaches",

                    texte:
                        "La page presente les sites accessibles a votre compte client."
                },
                {
                    label:
                        "Traçabilite",

                    titre:
                        "Historique par site",

                    texte:
                        "Chaque site permet de replacer les collectes dans leur contexte operationnel."
                },
                {
                    label:
                        "Acces",

                    titre:
                        "Vue client controlee",

                    texte:
                        "Le portail reste limite aux donnees auxquelles votre compte est autorise."
                }
            ]

        },


        impact: {

            eyebrow:
                "IMPACT DOCUMENTE",

            titre:
                "Votre impact environnemental",

            sousTitre:
                "Une lecture fondee d'abord sur les mesures effectivement documentees, sans transformer une estimation carbone en resultat certifie.",

            badge:
                "Mesure responsable",

            cartes: []

        },


        compte: {

            eyebrow:
                "VOTRE ESPACE",

            titre:
                "Votre compte Pro Recup",

            sousTitre:
                "Un espace simple pour comprendre votre acces au portail et conserver une separation claire entre votre compte et les operations internes de Pro Recup.",

            badge:
                "Espace client",

            cartes: [
                {
                    label:
                        "Acces",

                    titre:
                        "Donnees autorisees",

                    texte:
                        "Votre compte donne acces uniquement au perimetre client qui lui est rattache."
                },
                {
                    label:
                        "Confidentialite",

                    titre:
                        "Separation des espaces",

                    texte:
                        "Le portail client reste distinct du Back-office et de l'application Agent Terrain."
                },
                {
                    label:
                        "Session",

                    titre:
                        "Controle de votre acces",

                    texte:
                        "Utilisez les fonctions du compte pour gerer votre session sans exposer les donnees operationnelles internes."
                }
            ]

        }

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


    const ajouterCarte =
        function (
            grille,
            donnee
        ) {

            const carte =
                creer(
                    "article",
                    "pce-card"
                );


            carte.append(
                creer(
                    "span",
                    "",
                    donnee.label
                ),

                creer(
                    "strong",
                    "",
                    donnee.titre
                ),

                creer(
                    "p",
                    "",
                    donnee.texte
                )
            );


            grille.appendChild(
                carte
            );
        };


    const connecterKpi =
        function (
            cible,
            sourceId
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

                    const valeur =
                        String(
                            source.textContent || ""
                        ).trim();

                    cible.textContent =
                        valeur ||
                        "\u2014";
                };


            appliquer();


            const mutation =
                new MutationObserver(
                    appliquer
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


    const ajouterImpact =
        function (
            section
        ) {

            const grille =
                creer(
                    "div",
                    "pce-impact-kpis"
                );


            const definitions = [
                {
                    label:
                        "Poids reel",

                    source:
                        "statPoidsReel"
                },
                {
                    label:
                        "Collectes mesurees",

                    source:
                        "statCollectesMesurees"
                },
                {
                    label:
                        "Sites documentes",

                    source:
                        "statSites"
                }
            ];


            definitions.forEach(
                function (definition) {

                    const carte =
                        creer(
                            "article",
                            "pce-kpi"
                        );


                    const label =
                        creer(
                            "span",
                            "",
                            definition.label
                        );


                    const valeur =
                        creer(
                            "strong",
                            "",
                            "\u2014"
                        );


                    carte.append(
                        label,
                        valeur
                    );


                    grille.appendChild(
                        carte
                    );


                    connecterKpi(
                        valeur,
                        definition.source
                    );
                }
            );


            const carbone =
                creer(
                    "article",
                    "pce-kpi"
                );


            carbone.append(
                creer(
                    "span",
                    "",
                    "Carbone"
                ),

                creer(
                    "strong",
                    "",
                    "En consolidation"
                )
            );


            grille.appendChild(
                carbone
            );


            section.appendChild(
                grille
            );


            const note =
                creer(
                    "div",
                    "pce-impact-note"
                );


            const copie =
                creer(
                    "div"
                );


            copie.append(
                creer(
                    "strong",
                    "",
                    "Impact carbone non surdeclare"
                ),

                creer(
                    "p",
                    "",
                    "Pro Recup affiche les mesures documentees immediatement. Le carbone reste en consolidation tant que la chaine de valorisation n'est pas suffisamment etablie."
                )
            );


            note.appendChild(
                copie
            );


            section.appendChild(
                note
            );
        };


    const construire =
        function () {

            if (
                parId(
                    "pceEspaceClientPremium"
                )
            ) {
                return;
            }


            const type =
                pageCourante();


            if (!type) {
                return;
            }


            const configuration =
                configurations[type];


            if (!configuration) {
                return;
            }


            const section =
                creer(
                    "section",
                    "pce-shell"
                );


            section.id =
                "pceEspaceClientPremium";


            const head =
                creer(
                    "div",
                    "pce-head"
                );


            const copie =
                creer(
                    "div"
                );


            copie.append(
                creer(
                    "span",
                    "pce-eyebrow",
                    configuration.eyebrow
                )
            );


            const titre =
                creer(
                    "h2",
                    "pce-title",
                    configuration.titre
                );


            titre.id =
                "pceEspaceClientTitre";


            copie.append(
                titre,

                creer(
                    "p",
                    "pce-subtitle",
                    configuration.sousTitre
                )
            );


            head.append(
                copie,

                creer(
                    "span",
                    "pce-badge",
                    configuration.badge
                )
            );


            section.appendChild(
                head
            );


            if (
                type ===
                "impact"
            ) {

                ajouterImpact(
                    section
                );
            }
            else {

                const grille =
                    creer(
                        "div",
                        "pce-grid"
                    );


                configuration.cartes.forEach(
                    function (carte) {

                        ajouterCarte(
                            grille,
                            carte
                        );
                    }
                );


                section.appendChild(
                    grille
                );
            }


            inserer(
                section
            );
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