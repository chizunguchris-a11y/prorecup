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


let collectesToutes = [];


const texteNormalise = (
    valeur
) =>
    String(
        valeur ||
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();


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



const dateDansPeriode = (
    valeur,
    filtre
) => {

    if (!filtre) {
        return true;
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


    const maintenant =
        new Date();


    if (
        filtre === "annee"
    ) {

        return (
            date.getFullYear() ===
            maintenant.getFullYear()
        );

    }


    const jours =
        Number(
            filtre
        );


    if (
        !Number.isFinite(
            jours
        )
    ) {

        return true;

    }


    const limite =
        new Date(
            maintenant
        );


    limite.setDate(
        limite.getDate() -
        jours
    );


    return (
        date >= limite &&
        date <= maintenant
    );

};


const collectionFiltrees = () => {

    const recherche =
        texteNormalise(
            element(
                "rechercheCollectes"
            ).value
        );


    const filtreStatut =
        element(
            "filtreStatut"
        ).value;


    const filtreSite =
        element(
            "filtreSite"
        ).value;


    const filtrePeriode =
        element(
            "filtrePeriode"
        ).value;


    return collectesToutes.filter(
        function (
            collecte
        ) {

            const statut =
                PortailRecup.statutClient(
                    collecte
                );


            if (
                filtreStatut &&
                statut.code !==
                    filtreStatut
            ) {

                return false;

            }


            if (
                filtreSite &&
                String(
                    collecte.site_id ||
                    ""
                ) !==
                    filtreSite
            ) {

                return false;

            }


            if (
                !dateDansPeriode(
                    collecte.date_collecte,
                    filtrePeriode
                )
            ) {

                return false;

            }


            if (!recherche) {
                return true;
            }


            const corpus =
                texteNormalise(
                    [
                        collecte.site_nom,
                        collecte.site_adresse,
                        collecte.zone_geographique,
                        collecte.type_dechet,
                        collecte.client_nom,
                        collecte.agent_nom,
                        statut.label
                    ]
                        .filter(
                            Boolean
                        )
                        .join(
                            " "
                        )
                );


            return corpus.includes(
                recherche
            );

        }
    );

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
        Array.isArray(
            contexte?.clients
        )
            ? contexte.clients
            : [];


    if (
        clients.length === 1
    ) {

        const clientNom =
            clients[0].nom ||
            clients[0].client_nom;


        if (
            clientNom
        ) {

            element(
                "collectesContexte"
            ).textContent =
                "Historique des collectes de " +
                clientNom +
                ".";

        }

    }

};


const remplirSites = () => {

    const select =
        element(
            "filtreSite"
        );


    const sites =
        new Map();


    collectesToutes.forEach(
        function (
            collecte
        ) {

            if (
                collecte.site_id &&
                collecte.site_nom
            ) {

                sites.set(
                    String(
                        collecte.site_id
                    ),
                    collecte.site_nom
                );

            }

        }
    );


    [
        ...sites.entries()
    ]
        .sort(
            function (
                a,
                b
            ) {

                return String(
                    a[1]
                ).localeCompare(
                    String(
                        b[1]
                    ),
                    "fr"
                );

            }
        )
        .forEach(
            function (
                item
            ) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    item[0];


                option.textContent =
                    item[1];


                select.appendChild(
                    option
                );

            }
        );

};


const afficherStats = (
    collectes
) => {

    const poids =
        collectes.reduce(
            function (
                total,
                collecte
            ) {

                const valeur =
                    Number(
                        collecte.poids_reel
                    );


                return total +
                    (
                        Number.isFinite(
                            valeur
                        )
                            ? valeur
                            : 0
                    );

            },
            0
        );


    const preuves =
        collectes.reduce(
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
        "statTotalCollectes"
    ).textContent =
        String(
            collectes.length
        );


    element(
        "statPoidsCollectes"
    ).textContent =
        PortailRecup.formaterKg(
            poids
        );


    element(
        "statPreuvesCollectes"
    ).textContent =
        String(
            preuves
        );


    element(
        "nombreResultats"
    ).textContent =
        String(
            collectes.length
        );

};


const creerLigne = (
    collecte
) => {

    const lien =
        document.createElement(
            "a"
        );


    lien.className =
        "collectes-row";


    lien.href =
        "./collecte.html?id=" +
        encodeURIComponent(
            collecte.collecte_id
        );


    const contenu =
        document.createElement(
            "div"
        );


    contenu.className =
        "collectes-row-main";


    const titre =
        document.createElement(
            "div"
        );


    titre.className =
        "collectes-row-title";


    const nom =
        document.createElement(
            "strong"
        );


    nom.textContent =
        collecte.site_nom ||
        "Collecte";


    const statut =
        PortailRecup.statutClient(
            collecte
        );


    const badge =
        document.createElement(
            "span"
        );


    badge.className =
        "cockpit-status " +
        statut.classe;


    badge.textContent =
        statut.label;


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


    meta.textContent =
        [
            PortailRecup.formaterDate(
                collecte.date_collecte
            ),

            collecte.type_dechet ||
                null,

            collecte.client_nom ||
                null
        ]
            .filter(
                Boolean
            )
            .join(
                " \u00b7 "
            );


    const secondaire =
        document.createElement(
            "p"
        );


    secondaire.className =
        "collectes-row-secondary";


    const details = [];


    if (
        collecte.agent_nom
    ) {

        details.push(
            "Agent : " +
            collecte.agent_nom
        );

    }


    const preuves =
        nombrePreuves(
            collecte
        );


    details.push(
        preuves +
        (
            preuves > 1
                ? " preuves"
                : " preuve"
        )
    );


    secondaire.textContent =
        details.join(
            " \u00b7 "
        );


    contenu.appendChild(
        titre
    );


    contenu.appendChild(
        meta
    );


    contenu.appendChild(
        secondaire
    );


    const droite =
        document.createElement(
            "div"
        );


    droite.className =
        "collectes-row-right";


    const poids =
        document.createElement(
            "strong"
        );


    const aReel =
        collecte.poids_reel !== null &&
        collecte.poids_reel !== undefined;


    poids.textContent =
        PortailRecup.formaterKg(
            aReel
                ? collecte.poids_reel
                : collecte.poids_estime
        );


    const poidsLabel =
        document.createElement(
            "small"
        );


    poidsLabel.textContent =
        aReel
            ? "Poids r\u00e9el"
            : "Poids estim\u00e9";


    const fleche =
        document.createElement(
            "span"
        );


    fleche.className =
        "collectes-row-arrow";


    fleche.textContent =
        "\u2192";


    droite.appendChild(
        poids
    );


    droite.appendChild(
        poidsLabel
    );


    droite.appendChild(
        fleche
    );


    lien.appendChild(
        contenu
    );


    lien.appendChild(
        droite
    );


    return lien;

};


const afficherCollectes = () => {

    const collectes =
        collectionFiltrees();


    afficherStats(
        collectes
    );


    const conteneur =
        element(
            "listeCollectes"
        );


    conteneur.textContent =
        "";


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
            "Aucune collecte ne correspond aux filtres s\u00e9lectionn\u00e9s.";


        conteneur.appendChild(
            vide
        );


        return;

    }


    collectes.forEach(
        function (
            collecte
        ) {

            conteneur.appendChild(
                creerLigne(
                    collecte
                )
            );

        }
    );

};


const charger = async () => {

    const [
        contexte,
        collectes
    ] =
        await Promise.all([
            PortailRecup.requete(
                "/api/portail-client/me"
            ),

            PortailRecup.requete(
                "/api/portail-client/collectes"
            )
        ]);


    collectesToutes =
        Array.isArray(
            collectes
        )
            ? collectes
            : [];


    afficherIdentite(
        contexte
    );


    remplirSites();


    afficherCollectes();

};


[
    "rechercheCollectes",
    "filtreStatut",
    "filtreSite",
    "filtrePeriode"
].forEach(
    function (
        id
    ) {

        const controle =
            element(
                id
            );


        controle.addEventListener(
            id ===
                "rechercheCollectes"
                ? "input"
                : "change",
            afficherCollectes
        );

    }
);


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


charger().catch(
    function (
        erreur
    ) {

        console.error(
            "Chargement page collectes impossible :",
            erreur.message
        );


        const conteneur =
            element(
                "listeCollectes"
            );


        conteneur.textContent =
            "";


        const erreurElement =
            document.createElement(
                "div"
            );


        erreurElement.className =
            "cockpit-empty";


        erreurElement.textContent =
            erreur.message ||
            "Impossible de charger vos collectes.";


        conteneur.appendChild(
            erreurElement
        );

    }
);
