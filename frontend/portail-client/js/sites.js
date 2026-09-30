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


let sitesTous = [];


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

        const nomClient =
            clients[0].nom ||
            clients[0].client_nom;


        if (
            nomClient
        ) {

            element(
                "sitesContexte"
            ).textContent =
                "Sites suivis pour " +
                nomClient +
                ".";

        }

    }
    else if (
        clients.length > 1
    ) {

        element(
            "sitesContexte"
        ).textContent =
            "Sites accessibles pour vos " +
            clients.length +
            " entites clientes.";

    }

};


const estGeolocalise = (
    site
) => {

    const latitude =
        Number(
            site?.latitude
        );

    const longitude =
        Number(
            site?.longitude
        );


    return (
        Number.isFinite(
            latitude
        ) &&
        Number.isFinite(
            longitude
        )
    );

};


const afficherStats = (
    sites
) => {

    const zones =
        new Set();


    let gps =
        0;


    sites.forEach(
        function (
            site
        ) {

            if (
                site.zone_geographique
            ) {

                zones.add(
                    texteNormalise(
                        site.zone_geographique
                    )
                );

            }


            if (
                estGeolocalise(
                    site
                )
            ) {

                gps += 1;

            }

        }
    );


    element(
        "statSitesTotal"
    ).textContent =
        String(
            sites.length
        );


    element(
        "statZones"
    ).textContent =
        String(
            zones.size
        );


    element(
        "statGps"
    ).textContent =
        String(
            gps
        );

};


const creerSite = (
    site
) => {

    const carte =
        document.createElement(
            "article"
        );


    carte.className =
        "site-page-card";


    const entete =
        document.createElement(
            "div"
        );


    entete.className =
        "site-page-head";


    const icone =
        document.createElement(
            "div"
        );


    icone.className =
        "site-page-icon";


    icone.textContent =
        "S";


    const titre =
        document.createElement(
            "div"
        );


    titre.className =
        "site-page-title";


    const nom =
        document.createElement(
            "strong"
        );


    nom.textContent =
        site.site_nom ||
        site.nom ||
        "Site";


    const localisation =
        document.createElement(
            "p"
        );


    localisation.textContent =
        [
            site.adresse ||
                null,

            site.zone_geographique ||
                null
        ]
            .filter(
                Boolean
            )
            .join(
                " \u00b7 "
            ) ||
        "Localisation non renseign\u00e9e";


    titre.appendChild(
        nom
    );


    titre.appendChild(
        localisation
    );


    entete.appendChild(
        icone
    );


    entete.appendChild(
        titre
    );


    carte.appendChild(
        entete
    );


    const informations =
        document.createElement(
            "dl"
        );


    informations.className =
        "site-page-info";


    const ajouterInfo = (
        label,
        valeur
    ) => {

        const ligne =
            document.createElement(
                "div"
            );


        const dt =
            document.createElement(
                "dt"
            );


        dt.textContent =
            label;


        const dd =
            document.createElement(
                "dd"
            );


        dd.textContent =
            valeur ||
            "Non renseign\u00e9";


        ligne.appendChild(
            dt
        );


        ligne.appendChild(
            dd
        );


        informations.appendChild(
            ligne
        );

    };


    ajouterInfo(
        "Responsable",
        site.responsable_nom
    );


    ajouterInfo(
        "Zone",
        site.zone_geographique
    );


    ajouterInfo(
        "GPS",
        estGeolocalise(
            site
        )
            ? "R\u00e9f\u00e9rence disponible"
            : "Non renseign\u00e9"
    );


    carte.appendChild(
        informations
    );


    const clients =
        Array.isArray(
            site.clients_autorises
        )
            ? site.clients_autorises
            : [];


    if (
        clients.length > 0
    ) {

        const blocClients =
            document.createElement(
                "div"
            );


        blocClients.className =
            "site-page-clients";


        const label =
            document.createElement(
                "span"
            );


        label.textContent =
            clients.length > 1
                ? "Entit\u00e9s associ\u00e9es"
                : "Entit\u00e9 associ\u00e9e";


        const noms =
            document.createElement(
                "strong"
            );


        noms.textContent =
            clients
                .map(
                    function (
                        client
                    ) {

                        return (
                            client.client_nom ||
                            client.nom
                        );

                    }
                )
                .filter(
                    Boolean
                )
                .join(
                    ", "
                );


        blocClients.appendChild(
            label
        );


        blocClients.appendChild(
            noms
        );


        carte.appendChild(
            blocClients
        );

    }


    return carte;

};


const sitesFiltres = () => {

    const recherche =
        texteNormalise(
            element(
                "rechercheSites"
            ).value
        );


    if (!recherche) {
        return sitesTous;
    }


    return sitesTous.filter(
        function (
            site
        ) {

            const clients =
                Array.isArray(
                    site.clients_autorises
                )
                    ? site.clients_autorises
                    : [];


            const corpus =
                texteNormalise(
                    [
                        site.site_nom,
                        site.nom,
                        site.adresse,
                        site.zone_geographique,
                        site.responsable_nom,

                        clients
                            .map(
                                function (
                                    client
                                ) {

                                    return (
                                        client.client_nom ||
                                        client.nom
                                    );

                                }
                            )
                            .join(
                                " "
                            )
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


const afficherSites = () => {

    const sites =
        sitesFiltres();


    afficherStats(
        sites
    );


    element(
        "nombreSitesResultats"
    ).textContent =
        String(
            sites.length
        );


    const conteneur =
        element(
            "listeSitesPage"
        );


    conteneur.textContent =
        "";


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
            "Aucun site ne correspond \u00e0 votre recherche.";


        conteneur.appendChild(
            vide
        );


        return;

    }


    sites.forEach(
        function (
            site
        ) {

            conteneur.appendChild(
                creerSite(
                    site
                )
            );

        }
    );

};


const charger = async () => {

    const [
        contexte,
        sites
    ] =
        await Promise.all([
            PortailRecup.requete(
                "/api/portail-client/me"
            ),

            PortailRecup.requete(
                "/api/portail-client/sites"
            )
        ]);


    sitesTous =
        Array.isArray(
            sites
        )
            ? sites
            : [];


    afficherIdentite(
        contexte
    );


    afficherSites();

};


element(
    "rechercheSites"
).addEventListener(
    "input",
    afficherSites
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
            "Chargement Sites impossible :",
            erreur.message
        );


        const conteneur =
            element(
                "listeSitesPage"
            );


        conteneur.textContent =
            "";


        const blocErreur =
            document.createElement(
                "div"
            );


        blocErreur.className =
            "cockpit-empty";


        blocErreur.textContent =
            erreur.message ||
            "Impossible de charger vos sites.";


        conteneur.appendChild(
            blocErreur
        );

    }
);
