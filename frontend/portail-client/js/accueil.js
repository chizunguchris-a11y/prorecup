if (
    !PortailRecup.protegerPage()
) {

    throw new Error(
        "Session portail absente."
    );

}


const element = (
    id
) =>
    document.getElementById(
        id
    );


const normaliserListe = (
    valeur
) =>
    Array.isArray(
        valeur
    )
        ? valeur
        : [];


const libellesStatut = {

    en_attente:
        "En attente",

    planifiee:
        "Planifi\u00e9e",

    en_cours:
        "En cours",

    terminee:
        "Termin\u00e9e",

    valide:
        "Valid\u00e9e",

    echec:
        "\u00c9chec",

    annulee:
        "Annul\u00e9e",

    annule:
        "Annul\u00e9e"

};


const classeStatut = (
    statut
) => {

    const valeur =
        String(
            statut ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        valeur === "terminee" ||
        valeur === "valide"
    ) {

        return "success";

    }

    if (
        valeur === "en_cours"
    ) {

        return "progress";

    }

    if (
        valeur === "echec" ||
        valeur === "annulee" ||
        valeur === "annule"
    ) {

        return "danger";

    }

    return "neutral";

};


const estMemeMois = (
    valeur,
    reference
) => {

    if (!valeur) {
        return false;
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

        return false;

    }

    return (
        date.getFullYear() ===
            reference.getFullYear() &&
        date.getMonth() ===
            reference.getMonth()
    );

};


const nombrePreuves = (
    collecte
) => {

    const valeur =
        Number(
            collecte?.nombre_preuves
        );

    return Number.isFinite(
        valeur
    )
        ? valeur
        : 0;

};


const afficherIdentite = (
    contexte
) => {

    const utilisateur =
        contexte?.utilisateur ||
        {};

    const nom =
        utilisateur.nom ||
        "Client";


    element(
        "nomUtilisateur"
    ).textContent =
        nom;


    element(
        "nomUtilisateurEntete"
    ).textContent =
        nom;


    element(
        "initialeUtilisateur"
    ).textContent =
        String(
            nom
        )
            .charAt(0)
            .toUpperCase() ||
        "C";


    const clients =
        normaliserListe(
            contexte?.clients
        );


    let description =
        "Votre espace client Pro R\u00e9cup";


    if (
        clients.length === 1
    ) {

        description =
            clients[0].nom ||
            clients[0].client_nom ||
            description;

    }
    else if (
        clients.length > 1
    ) {

        description =
            clients.length +
            " entit\u00e9s clientes accessibles";

    }


    element(
        "contexteClient"
    ).textContent =
        description;

};


const afficherResume = (
    collectes,
    sites
) => {

    const maintenant =
        new Date();


    const collectesMois =
        collectes.filter(
            function (
                collecte
            ) {

                return estMemeMois(
                    collecte.date_collecte,
                    maintenant
                );

            }
        );


    const poidsMois =
        collectesMois.reduce(
            function (
                total,
                collecte
            ) {

                const poids =
                    Number(
                        collecte.poids_reel
                    );

                return total +
                    (
                        Number.isFinite(
                            poids
                        )
                            ? poids
                            : 0
                    );

            },
            0
        );


    const preuvesMois =
        collectesMois.reduce(
            function (
                total,
                collecte
            ) {

                return total +
                    nombrePreuves(
                        collecte
                    );

            },
            0
        );


    element(
        "statPoids"
    ).textContent =
        PortailRecup.formaterKg(
            poidsMois
        );


    element(
        "statCollectes"
    ).textContent =
        String(
            collectesMois.length
        );


    element(
        "statSites"
    ).textContent =
        String(
            sites.length
        );


    element(
        "statPreuves"
    ).textContent =
        String(
            preuvesMois
        );

};


const afficherDerniereCollecte = (
    collectes
) => {

    if (
        collectes.length === 0
    ) {

        element(
            "derniereCollecteSite"
        ).textContent =
            "Aucune collecte disponible";

        element(
            "derniereCollecteStatut"
        ).textContent =
            "Aucune";

        return;

    }


    const collecte =
        collectes[0];


    element(
        "derniereCollecteSite"
    ).textContent =
        collecte.site_nom ||
        "Collecte";


    element(
        "derniereCollecteDate"
    ).textContent =
        PortailRecup.formaterDate(
            collecte.date_collecte
        );


    element(
        "derniereCollecteType"
    ).textContent =
        collecte.type_dechet ||
        "Non renseign\u00e9";


    const statut =
        String(
            collecte.statut ||
            ""
        )
            .trim()
            .toLowerCase();


    const badge =
        element(
            "derniereCollecteStatut"
        );


    badge.textContent =
        libellesStatut[
            statut
        ] ||
        collecte.statut ||
        "Statut";


    badge.className =
        "cockpit-status " +
        classeStatut(
            statut
        );


    const poidsReel =
        Number(
            collecte.poids_reel
        );

    const aPoidsReel =
        collecte.poids_reel !== null &&
        collecte.poids_reel !== undefined &&
        Number.isFinite(
            poidsReel
        );


    if (
        aPoidsReel
    ) {

        element(
            "derniereCollectePoids"
        ).textContent =
            PortailRecup.formaterKg(
                poidsReel
            );

        element(
            "derniereCollectePoidsLabel"
        ).textContent =
            "Poids r\u00e9el";

    }
    else {

        element(
            "derniereCollectePoids"
        ).textContent =
            PortailRecup.formaterKg(
                collecte.poids_estime
            );

        element(
            "derniereCollectePoidsLabel"
        ).textContent =
            "Poids estim\u00e9";

    }


    const traceCollecte =
        element(
            "traceCollecte"
        );

    traceCollecte.classList.add(
        "done"
    );


    if (
        aPoidsReel
    ) {

        element(
            "tracePesee"
        ).classList.add(
            "done"
        );

        element(
            "tracePeseeTexte"
        ).textContent =
            PortailRecup.formaterKg(
                poidsReel
            );

    }
    else {

        element(
            "tracePeseeTexte"
        ).textContent =
            "Poids r\u00e9el non disponible";

    }


    const preuves =
        nombrePreuves(
            collecte
        );


    if (
        preuves > 0
    ) {

        element(
            "tracePreuves"
        ).classList.add(
            "done"
        );

        element(
            "tracePreuvesTexte"
        ).textContent =
            preuves +
            (
                preuves > 1
                    ? " preuves disponibles"
                    : " preuve disponible"
            );

    }
    else {

        element(
            "tracePreuvesTexte"
        ).textContent =
            "Aucune preuve disponible";

    }

};


const afficherHistorique = (
    collectes
) => {

    const conteneur =
        element(
            "listeCollectesRecentes"
        );


    conteneur.textContent =
        "";


    element(
        "totalCollectes"
    ).textContent =
        String(
            collectes.length
        );


    if (
        collectes.length === 0
    ) {

        const vide =
            document.createElement(
                "div"
            );

        vide.className =
            "cockpit-empty";

        vide.textContent =
            "Aucune collecte disponible.";

        conteneur.appendChild(
            vide
        );

        return;

    }


    collectes
        .slice(
            0,
            6
        )
        .forEach(
            function (
                collecte
            ) {

                const ligne =
                    document.createElement(
                        "article"
                    );

                ligne.className =
                    "cockpit-history-row";


                const principal =
                    document.createElement(
                        "div"
                    );

                principal.className =
                    "cockpit-history-main";


                const titre =
                    document.createElement(
                        "div"
                    );

                titre.className =
                    "cockpit-history-title";


                const nom =
                    document.createElement(
                        "strong"
                    );

                nom.textContent =
                    collecte.site_nom ||
                    "Collecte";


                const statut =
                    String(
                        collecte.statut ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                const badge =
                    document.createElement(
                        "span"
                    );

                badge.className =
                    "cockpit-status " +
                    classeStatut(
                        statut
                    );

                badge.textContent =
                    libellesStatut[
                        statut
                    ] ||
                    collecte.statut ||
                    "Statut";


                titre.appendChild(
                    nom
                );

                titre.appendChild(
                    badge
                );


                const meta =
                    document.createElement(
                        "p"
                    );


                const parties = [
                    PortailRecup.formaterDate(
                        collecte.date_collecte
                    ),

                    collecte.type_dechet ||
                        null,

                    collecte.client_nom ||
                        null
                ].filter(
                    Boolean
                );


                meta.textContent =
                    parties.join(
                        " \u00b7 "
                    );


                principal.appendChild(
                    titre
                );

                principal.appendChild(
                    meta
                );


                const droite =
                    document.createElement(
                        "div"
                    );

                droite.className =
                    "cockpit-history-right";


                const poids =
                    document.createElement(
                        "strong"
                    );


                const reel =
                    collecte.poids_reel !== null &&
                    collecte.poids_reel !== undefined;


                poids.textContent =
                    PortailRecup.formaterKg(
                        reel
                            ? collecte.poids_reel
                            : collecte.poids_estime
                    );


                const libelle =
                    document.createElement(
                        "small"
                    );

                libelle.textContent =
                    reel
                        ? "Poids r\u00e9el"
                        : "Poids estim\u00e9";


                droite.appendChild(
                    poids
                );

                droite.appendChild(
                    libelle
                );


                ligne.appendChild(
                    principal
                );

                ligne.appendChild(
                    droite
                );


                conteneur.appendChild(
                    ligne
                );

            }
        );

};


const afficherSites = (
    sites
) => {

    const conteneur =
        element(
            "listeSites"
        );


    conteneur.textContent =
        "";


    element(
        "totalSites"
    ).textContent =
        String(
            sites.length
        );


    if (
        sites.length === 0
    ) {

        const vide =
            document.createElement(
                "div"
            );

        vide.className =
            "cockpit-empty";

        vide.textContent =
            "Aucun site rattach\u00e9 \u00e0 votre espace.";

        conteneur.appendChild(
            vide
        );

        return;

    }


    sites
        .slice(
            0,
            5
        )
        .forEach(
            function (
                site
            ) {

                const ligne =
                    document.createElement(
                        "article"
                    );

                ligne.className =
                    "cockpit-site-row";


                const icone =
                    document.createElement(
                        "div"
                    );

                icone.className =
                    "cockpit-site-icon";

                icone.textContent =
                    "S";


                const contenu =
                    document.createElement(
                        "div"
                    );


                const nom =
                    document.createElement(
                        "strong"
                    );

                nom.textContent =
                    site.site_nom ||
                    site.nom ||
                    "Site";


                const detail =
                    document.createElement(
                        "p"
                    );


                const morceaux = [
                    site.adresse ||
                        null,

                    site.zone_geographique ||
                        null
                ].filter(
                    Boolean
                );


                detail.textContent =
                    morceaux.length
                        ? morceaux.join(
                            " \u00b7 "
                        )
                        : "Adresse non renseign\u00e9e";


                contenu.appendChild(
                    nom
                );

                contenu.appendChild(
                    detail
                );


                ligne.appendChild(
                    icone
                );

                ligne.appendChild(
                    contenu
                );


                conteneur.appendChild(
                    ligne
                );

            }
        );

};


const chargerCockpit = async () => {

    const [
        contexte,
        sites,
        collectes
    ] =
        await Promise.all([
            PortailRecup.requete(
                "/api/portail-client/me"
            ),

            PortailRecup.requete(
                "/api/portail-client/sites"
            ),

            PortailRecup.requete(
                "/api/portail-client/collectes"
            )
        ]);


    localStorage.setItem(
        PortailRecup.cleContexte,
        JSON.stringify(
            contexte
        )
    );


    const listeSites =
        normaliserListe(
            sites
        );


    const listeCollectes =
        normaliserListe(
            collectes
        );


    afficherIdentite(
        contexte
    );

    afficherResume(
        listeCollectes,
        listeSites
    );

    afficherDerniereCollecte(
        listeCollectes
    );

    afficherHistorique(
        listeCollectes
    );

    afficherSites(
        listeSites
    );

};


const boutonDeconnexion =
    element(
        "boutonDeconnexion"
    );


if (
    boutonDeconnexion
) {

    boutonDeconnexion.addEventListener(
        "click",
        function () {

            PortailRecup.deconnecter();

        }
    );

}


chargerCockpit().catch(
    function (
        erreur
    ) {

        console.error(
            "Chargement cockpit client impossible :",
            erreur.message
        );

    }
);
