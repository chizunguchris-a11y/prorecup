/* P3.14d Impact environnemental */

(() => {

    const portail =
        window.PortailRecup;

    if (!portail) {
        return;
    }

    if (!portail.protegerPage()) {
        return;
    }


    const parId =
        function (
            id
        ) {

            return document.getElementById(
                id
            );

        };


    function nombre(
        valeur,
        maximumDecimales = 0
    ) {

        const n =
            Number(
                valeur
            );

        if (!Number.isFinite(n)) {
            return "\u2014";
        }

        return new Intl.NumberFormat(
            "fr-FR",
            {
                maximumFractionDigits:
                    maximumDecimales
            }
        ).format(
            n
        );

    }


    function kilogrammes(
        valeur
    ) {

        const n =
            Number(
                valeur
            );

        if (!Number.isFinite(n)) {
            return "\u2014";
        }

        return new Intl.NumberFormat(
            "fr-FR",
            {
                maximumFractionDigits:
                    2
            }
        ).format(
            n
        ) + " kg";

    }


    function pourcentage(
        valeur
    ) {

        const n =
            Number(
                valeur
            );

        if (!Number.isFinite(n)) {
            return "\u2014";
        }

        return new Intl.NumberFormat(
            "fr-FR",
            {
                maximumFractionDigits:
                    1
            }
        ).format(
            n
        ) + " %";

    }


    function echapper(
        valeur
    ) {

        return String(
            valeur ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    function identiteUtilisateur() {

        const contexte =
            portail.obtenirContexte() ||
            {};

        const utilisateur =
            contexte.utilisateur ||
            contexte.user ||
            contexte.compte ||
            contexte;

        const nomCompose =
            [
                utilisateur.prenom,
                utilisateur.nom
            ]
                .filter(Boolean)
                .join(" ")
                .trim();

        const nom =
            utilisateur.nom_complet ||
            utilisateur.nomComplet ||
            contexte.nom_utilisateur ||
            contexte.nomUtilisateur ||
            nomCompose ||
            utilisateur.nom ||
            utilisateur.email ||
            "Client";

        const nomEntete =
            parId(
                "nomUtilisateurEntete"
            );

        const initiale =
            parId(
                "initialeUtilisateur"
            );

        if (nomEntete) {
            nomEntete.textContent = nom;
        }

        if (initiale) {

            initiale.textContent =
                String(
                    nom
                )
                    .trim()
                    .charAt(0)
                    .toUpperCase() ||
                "C";

        }

    }


    function libellePeriode(
        element
    ) {

        const brut =
            element?.date_debut ||
            (
                element?.periode
                    ? String(
                        element.periode
                    ) + "-01"
                    : ""
            );

        if (!brut) {
            return "P\u00e9riode";
        }

        const texte =
            String(
                brut
            ).slice(
                0,
                10
            );

        const date =
            new Date(
                texte + "T12:00:00"
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return element?.periode ||
                "P\u00e9riode";

        }

        return new Intl.DateTimeFormat(
            "fr-FR",
            {
                month:
                    "long",

                year:
                    "numeric"
            }
        ).format(
            date
        );

    }


    function afficherMatieres(
        lignes,
        poidsTotal
    ) {

        const conteneur =
            parId(
                "listeMatieres"
            );

        if (!conteneur) {
            return;
        }

        if (
            !Array.isArray(lignes) ||
            lignes.length === 0
        ) {

            conteneur.innerHTML =
                '<div class="cockpit-empty">' +
                "Aucune mati\u00e8re mesur\u00e9e pour le moment." +
                "</div>";

            return;

        }


        const total =
            Number(
                poidsTotal
            );


        conteneur.innerHTML =
            lignes.map(
                function (
                    ligne
                ) {

                    const poids =
                        Number(
                            ligne.poids_reel_kg
                        );

                    const part =
                        Number.isFinite(total) &&
                        total > 0 &&
                        Number.isFinite(poids)
                            ? Math.max(
                                0,
                                Math.min(
                                    100,
                                    (
                                        poids /
                                        total
                                    ) * 100
                                )
                            )
                            : 0;

                    const nom =
                        ligne.type_dechet ||
                        "Mati\u00e8re non pr\u00e9cis\u00e9e";

                    const collectes =
                        nombre(
                            ligne.nombre_collectes
                        );

                    return (
                        '<div class="impact-bar-row">' +

                            '<div class="impact-bar-head">' +

                                "<div>" +

                                    "<strong>" +
                                        echapper(
                                            nom
                                        ) +
                                    "</strong>" +

                                    "<small>" +
                                        collectes +
                                        " collecte(s)" +
                                    "</small>" +

                                "</div>" +

                                "<span>" +
                                    kilogrammes(
                                        poids
                                    ) +
                                "</span>" +

                            "</div>" +

                            '<div class="impact-bar-track">' +

                                '<span style="width:' +
                                    part.toFixed(2) +
                                    '%"></span>' +

                            "</div>" +

                            '<div class="impact-bar-foot">' +

                                "<span>" +
                                    pourcentage(
                                        part
                                    ) +
                                    " du poids mesur\u00e9" +
                                "</span>" +

                                "<span>" +
                                    kilogrammes(
                                        ligne.poids_documente_kg
                                    ) +
                                    " document\u00e9(s)" +
                                "</span>" +

                            "</div>" +

                        "</div>"
                    );

                }
            ).join("");

    }


    function afficherEvolution(
        lignes
    ) {

        const conteneur =
            parId(
                "evolutionMensuelle"
            );

        if (!conteneur) {
            return;
        }

        if (
            !Array.isArray(lignes) ||
            lignes.length === 0
        ) {

            conteneur.innerHTML =
                '<div class="cockpit-empty">' +
                "Pas encore assez de donn\u00e9es pour afficher une \u00e9volution." +
                "</div>";

            return;

        }


        const maximum =
            Math.max(
                0,
                ...lignes.map(
                    function (
                        ligne
                    ) {

                        const poids =
                            Number(
                                ligne.poids_reel_kg
                            );

                        return Number.isFinite(poids)
                            ? poids
                            : 0;

                    }
                )
            );


        conteneur.innerHTML =
            lignes.map(
                function (
                    ligne
                ) {

                    const poids =
                        Number(
                            ligne.poids_reel_kg
                        );

                    const largeur =
                        maximum > 0 &&
                        Number.isFinite(poids)
                            ? Math.max(
                                4,
                                (
                                    poids /
                                    maximum
                                ) * 100
                            )
                            : 0;

                    return (
                        '<div class="impact-month-row">' +

                            '<div class="impact-month-top">' +

                                "<div>" +

                                    "<strong>" +
                                        echapper(
                                            libellePeriode(
                                                ligne
                                            )
                                        ) +
                                    "</strong>" +

                                    "<small>" +
                                        nombre(
                                            ligne.nombre_collectes
                                        ) +
                                        " collecte(s)" +
                                    "</small>" +

                                "</div>" +

                                "<span>" +
                                    kilogrammes(
                                        poids
                                    ) +
                                "</span>" +

                            "</div>" +

                            '<div class="impact-month-track">' +

                                '<span style="width:' +
                                    Math.min(
                                        100,
                                        largeur
                                    ).toFixed(2) +
                                    '%"></span>' +

                            "</div>" +

                        "</div>"
                    );

                }
            ).join("");

    }


    function afficherClients(
        lignes
    ) {

        const bloc =
            parId(
                "blocClients"
            );

        const conteneur =
            parId(
                "listeClients"
            );

        if (
            !bloc ||
            !conteneur
        ) {
            return;
        }


        if (
            !Array.isArray(lignes) ||
            lignes.length <= 1
        ) {

            bloc.classList.add(
                "cache"
            );

            conteneur.innerHTML =
                "";

            return;

        }


        bloc.classList.remove(
            "cache"
        );


        conteneur.innerHTML =
            lignes.map(
                function (
                    ligne
                ) {

                    const type =
                        String(
                            ligne.type_client ||
                            "Entit\u00e9 cliente"
                        )
                            .replace(
                                /_/g,
                                " "
                            );

                    return (
                        '<article class="impact-client-card">' +

                            "<span>" +
                                echapper(
                                    type
                                ) +
                            "</span>" +

                            "<strong>" +
                                echapper(
                                    ligne.client_nom ||
                                    "Client"
                                ) +
                            "</strong>" +

                            '<div class="impact-client-meta">' +

                                "<div>" +

                                    "<small>Poids r\u00e9el</small>" +

                                    "<b>" +
                                        kilogrammes(
                                            ligne.poids_reel_kg
                                        ) +
                                    "</b>" +

                                "</div>" +

                                "<div>" +

                                    "<small>Collectes</small>" +

                                    "<b>" +
                                        nombre(
                                            ligne.nombre_collectes
                                        ) +
                                    "</b>" +

                                "</div>" +

                                "<div>" +

                                    "<small>Poids document\u00e9</small>" +

                                    "<b>" +
                                        kilogrammes(
                                            ligne.poids_documente_kg
                                        ) +
                                    "</b>" +

                                "</div>" +

                            "</div>" +

                        "</article>"
                    );

                }
            ).join("");

    }


    function afficherCarbone(
        carbone
    ) {

        carbone =
            carbone ||
            {};

        const badge =
            parId(
                "carboneBadge"
            );

        const titre =
            parId(
                "carboneTitre"
            );

        const valeur =
            parId(
                "carboneValeur"
            );

        const message =
            parId(
                "carboneMessage"
            );


        const co2e =
            Number(
                carbone.co2e_estime_kg
            );

        const disponible =
            carbone.disponible === true &&
            Number.isFinite(
                co2e
            );


        if (disponible) {

            badge.textContent =
                "Disponible";

            badge.classList.add(
                "disponible"
            );

            titre.textContent =
                "Estimation CO2e";

            valeur.textContent =
                kilogrammes(
                    co2e
                );

            message.textContent =
                carbone.message ||
                "Estimation environnementale disponible selon la m\u00e9thodologie active.";

            return;

        }


        badge.textContent =
            "En consolidation";

        badge.classList.remove(
            "disponible"
        );

        titre.textContent =
            "Impact carbone en cours de consolidation";

        valeur.textContent =
            "Indisponible";

        message.textContent =
            carbone.message ||
            "L'estimation CO2e individuelle sera disponible lorsque la provenance des mati\u00e8res jusqu'\u00e0 leur valorisation sera suffisamment trac\u00e9e.";

    }


    async function charger() {

        const message =
            parId(
                "messageImpact"
            );

        try {

            const data =
                await portail.requete(
                    "/api/portail-client/impact"
                );


            const resume =
                data?.resume ||
                {};

            const total =
                Number(
                    resume.collectes_total
                );

            const clients =
                Number(
                    resume.clients_couverts
                );


            parId(
                "statPoidsReel"
            ).textContent =
                kilogrammes(
                    resume.poids_reel_kg
                );


            parId(
                "statCollectesMesurees"
            ).textContent =
                nombre(
                    resume.collectes_mesurees
                );


            parId(
                "statCollectesDetail"
            ).textContent =
                Number.isFinite(total)
                    ? "sur " +
                        nombre(
                            total
                        ) +
                        " collecte(s) autoris\u00e9e(s)"
                    : "collectes exploitables";


            parId(
                "statCollectesDocumentees"
            ).textContent =
                nombre(
                    resume.collectes_documentees
                );


            parId(
                "statDocumentationTaux"
            ).textContent =
                Number.isFinite(
                    Number(
                        resume.taux_documentation_poids_pct
                    )
                )
                    ? pourcentage(
                        resume.taux_documentation_poids_pct
                    ) +
                        " du poids document\u00e9"
                    : "taux indisponible";


            parId(
                "statPoidsDocumente"
            ).textContent =
                kilogrammes(
                    resume.poids_documente_kg
                );


            parId(
                "statSites"
            ).textContent =
                nombre(
                    resume.sites_concernes
                );


            parId(
                "statMatieres"
            ).textContent =
                nombre(
                    resume.matieres_distinctes
                );


            const contexte =
                parId(
                    "impactContexte"
                );


            if (
                Number.isFinite(clients) &&
                clients > 1
            ) {

                contexte.textContent =
                    "Vue consolid\u00e9e de " +
                    nombre(
                        clients
                    ) +
                    " entit\u00e9s clientes accessibles \u00e0 votre compte.";

            }
            else {

                contexte.textContent =
                    "Indicateurs construits \u00e0 partir des collectes r\u00e9ellement mesur\u00e9es et autoris\u00e9es pour votre compte.";

            }


            afficherMatieres(
                data?.repartition_matieres ||
                    [],
                resume.poids_reel_kg
            );


            afficherEvolution(
                data?.evolution_mensuelle ||
                    []
            );


            afficherClients(
                data?.par_client ||
                    []
            );


            afficherCarbone(
                data?.carbone ||
                    {}
            );


            const methodologie =
                data?.methodologie ||
                {};


            parId(
                "methodologieDescription"
            ).textContent =
                methodologie.description ||
                "Les indicateurs reposent sur les mesures r\u00e9ellement enregistr\u00e9es dans Pro R\u00e9cup.";


            parId(
                "methodologieVersion"
            ).textContent =
                methodologie.version ||
                "\u2014";


            parId(
                "methodologieBase"
            ).textContent =
                methodologie.base_mesure ===
                "poids_reel"
                    ? "Poids r\u00e9el"
                    : (
                        methodologie.base_mesure ||
                        "\u2014"
                    );


            message.classList.add(
                "cache"
            );

        }
        catch (erreur) {

            message.textContent =
                erreur?.message ||
                "Impossible de charger les indicateurs environnementaux.";

            message.classList.remove(
                "cache"
            );


            parId(
                "listeMatieres"
            ).innerHTML =
                '<div class="cockpit-empty">' +
                "Donn\u00e9es indisponibles." +
                "</div>";


            parId(
                "evolutionMensuelle"
            ).innerHTML =
                '<div class="cockpit-empty">' +
                "Donn\u00e9es indisponibles." +
                "</div>";

        }

    }


    identiteUtilisateur();


    const boutonDeconnexion =
        parId(
            "boutonDeconnexion"
        );

    if (boutonDeconnexion) {

        boutonDeconnexion.addEventListener(
            "click",
            function () {

                portail.deconnecter();

            }
        );

    }


    charger();

})();
