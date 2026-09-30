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


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


const parametres =
    new URLSearchParams(
        window.location.search
    );


const collecteId =
    String(
        parametres.get(
            "id"
        ) ||
        ""
    ).trim();


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


const formaterDateHeure = (
    valeur
) => {

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
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    ).format(
        date
    );

};


const formaterOctets = (
    valeur
) => {

    const octets =
        Number(
            valeur
        );


    if (
        !Number.isFinite(
            octets
        ) ||
        octets < 0
    ) {

        return "Taille inconnue";

    }


    if (
        octets < 1024
    ) {

        return (
            Math.round(
                octets
            ) +
            " o"
        );

    }


    if (
        octets <
        1024 * 1024
    ) {

        return (
            (
                octets /
                1024
            ).toFixed(
                1
            ) +
            " Ko"
        );

    }


    return (
        (
            octets /
            (
                1024 *
                1024
            )
        ).toFixed(
            1
        ) +
        " Mo"
    );

};


const formaterTypePreuve = (
    valeur
) => {

    const cle =
        String(
            valeur ||
            ""
        )
            .trim()
            .toLowerCase();


    const libelles = {

        avant_collecte:
            "Photo avant collecte",

        apres_collecte:
            "Photo apr\u00e8s collecte",

        ticket_balance:
            "Ticket de pes\u00e9e",

        ticket_pesee:
            "Ticket de pes\u00e9e",

        photo:
            "Photo terrain",

        signature:
            "Signature",

        incident:
            "Preuve d'incident"

    };


    if (
        libelles[
            cle
        ]
    ) {

        return libelles[
            cle
        ];

    }


    if (!cle) {
        return "Preuve terrain";
    }


    return cle
        .replace(
            /_/g,
            " "
        )
        .replace(
            /^./,
            function (
                lettre
            ) {

                return lettre
                    .toUpperCase();

            }
        );

};


const formaterTypePesee = (
    valeur
) => {

    const cle =
        String(
            valeur ||
            ""
        )
            .trim()
            .toLowerCase();


    const libelles = {

        terrain:
            "Pes\u00e9e terrain",

        depot:
            "Pes\u00e9e d\u00e9p\u00f4t",

        balance:
            "Pes\u00e9e balance"

    };


    return (
        libelles[
            cle
        ] ||
        (
            cle
                ? cle.replace(
                    /_/g,
                    " "
                )
                : "Pes\u00e9e"
        )
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

};


const afficherErreur = (
    message
) => {

    element(
        "detailChargement"
    ).classList.add(
        "cache"
    );


    element(
        "detailContenu"
    ).classList.add(
        "cache"
    );


    element(
        "detailErreurTexte"
    ).textContent =
        message;


    element(
        "detailErreur"
    ).classList.remove(
        "cache"
    );

};


const afficherPesees = (
    pesees
) => {

    const liste =
        Array.isArray(
            pesees
        )
            ? pesees
            : [];


    element(
        "detailNombrePesees"
    ).textContent =
        String(
            liste.length
        );


    const conteneur =
        element(
            "listePesees"
        );


    conteneur.textContent =
        "";


    if (
        liste.length === 0
    ) {

        const vide =
            document.createElement(
                "div"
            );

        vide.className =
            "cockpit-empty";

        vide.textContent =
            "Aucune pes\u00e9e disponible pour cette collecte.";

        conteneur.appendChild(
            vide
        );

        return;

    }


    liste.forEach(
        function (
            pesee
        ) {

            const carte =
                document.createElement(
                    "article"
                );

            carte.className =
                "detail-measure";


            const entete =
                document.createElement(
                    "div"
                );

            entete.className =
                "detail-measure-head";


            const titre =
                document.createElement(
                    "strong"
                );

            titre.textContent =
                formaterTypePesee(
                    pesee.type
                );


            const date =
                document.createElement(
                    "span"
                );

            date.textContent =
                formaterDateHeure(
                    pesee.date_heure
                );


            entete.appendChild(
                titre
            );

            entete.appendChild(
                date
            );


            const valeurs =
                document.createElement(
                    "div"
                );

            valeurs.className =
                "detail-measure-values";


            const donnees = [
                [
                    "Poids brut",
                    pesee.poids_brut
                ],
                [
                    "Tare",
                    pesee.tare
                ],
                [
                    "Poids net",
                    pesee.poids_net
                ]
            ];


            donnees.forEach(
                function (
                    item
                ) {

                    const bloc =
                        document.createElement(
                            "div"
                        );

                    const label =
                        document.createElement(
                            "span"
                        );

                    label.textContent =
                        item[0];


                    const valeur =
                        document.createElement(
                            "strong"
                        );

                    valeur.textContent =
                        PortailRecup.formaterKg(
                            item[1]
                        );


                    bloc.appendChild(
                        label
                    );

                    bloc.appendChild(
                        valeur
                    );


                    valeurs.appendChild(
                        bloc
                    );

                }
            );


            carte.appendChild(
                entete
            );

            carte.appendChild(
                valeurs
            );


            conteneur.appendChild(
                carte
            );

        }
    );

};


const ouvrirPreuve = async (
    preuve,
    bouton
) => {

    bouton.disabled =
        true;

    const texteInitial =
        bouton.textContent;

    bouton.textContent =
        "Ouverture...";


    const onglet =
        window.open(
            "",
            "_blank"
        );


    try {

        const resultat =
            await PortailRecup.requete(
                "/api/portail-client/collectes/" +
                encodeURIComponent(
                    collecteId
                ) +
                "/preuves/" +
                encodeURIComponent(
                    preuve.id
                ) +
                "/url"
            );


        if (
            !resultat?.url
        ) {

            throw new Error(
                "Lien de preuve indisponible."
            );

        }


        if (
            onglet
        ) {

            try {

                onglet.opener =
                    null;

            }
            catch {}


            onglet.location.href =
                resultat.url;

        }
        else {

            window.location.href =
                resultat.url;

        }

    }
    catch (
        erreur
    ) {

        if (
            onglet &&
            !onglet.closed
        ) {

            onglet.close();

        }


        window.alert(
            erreur.message ||
            "Impossible d'ouvrir la preuve."
        );

    }
    finally {

        bouton.disabled =
            false;

        bouton.textContent =
            texteInitial;

    }

};


const afficherPreuves = (
    preuves
) => {

    const liste =
        Array.isArray(
            preuves
        )
            ? preuves
            : [];


    element(
        "detailNombrePreuves"
    ).textContent =
        String(
            liste.length
        );


    element(
        "detailNombrePreuvesBis"
    ).textContent =
        String(
            liste.length
        );


    const conteneur =
        element(
            "listePreuves"
        );


    conteneur.textContent =
        "";


    if (
        liste.length === 0
    ) {

        const vide =
            document.createElement(
                "div"
            );

        vide.className =
            "cockpit-empty";

        vide.textContent =
            "Aucune preuve terrain disponible.";

        conteneur.appendChild(
            vide
        );

        return;

    }


    liste.forEach(
        function (
            preuve
        ) {

            const ligne =
                document.createElement(
                    "article"
                );

            ligne.className =
                "detail-proof";


            const icone =
                document.createElement(
                    "div"
                );

            icone.className =
                "detail-proof-icon";

            icone.textContent =
                "PR";


            const contenu =
                document.createElement(
                    "div"
                );

            contenu.className =
                "detail-proof-content";


            const titre =
                document.createElement(
                    "strong"
                );

            titre.textContent =
                formaterTypePreuve(
                    preuve.type_preuve
                );


            const meta =
                document.createElement(
                    "p"
                );

            meta.textContent =
                [
                    preuve.mime_type ||
                        "Fichier",

                    formaterOctets(
                        preuve.taille_octets
                    ),

                    formaterDateHeure(
                        preuve.pris_le
                    )
                ]
                    .filter(
                        Boolean
                    )
                    .join(
                        " \u00b7 "
                    );


            contenu.appendChild(
                titre
            );

            contenu.appendChild(
                meta
            );


            const bouton =
                document.createElement(
                    "button"
                );

            bouton.type =
                "button";

            bouton.className =
                "detail-proof-button";

            bouton.textContent =
                "Voir la preuve";


            bouton.addEventListener(
                "click",
                function () {

                    ouvrirPreuve(
                        preuve,
                        bouton
                    );

                }
            );


            ligne.appendChild(
                icone
            );

            ligne.appendChild(
                contenu
            );

            ligne.appendChild(
                bouton
            );


            conteneur.appendChild(
                ligne
            );

        }
    );

};


const afficherCollecte = (
    collecte
) => {

    document.title =
        (
            collecte.site_nom ||
            "Collecte"
        ) +
        " | Pro R\u00e9cup";


    element(
        "detailSite"
    ).textContent =
        collecte.site_nom ||
        "Collecte";


    element(
        "detailClient"
    ).textContent =
        collecte.client_nom ||
        "Client";


    element(
        "detailSiteInfo"
    ).textContent =
        collecte.site_nom ||
        "Non renseign\u00e9";


    element(
        "detailAdresse"
    ).textContent =
        collecte.site_adresse ||
        "Non renseign\u00e9e";


    element(
        "detailZone"
    ).textContent =
        collecte.zone_geographique ||
        "Non renseign\u00e9e";


    element(
        "detailAgent"
    ).textContent =
        collecte.agent_nom ||
        "Non renseign\u00e9";


    element(
        "detailDate"
    ).textContent =
        PortailRecup.formaterDate(
            collecte.date_collecte
        );


    element(
        "detailType"
    ).textContent =
        collecte.type_dechet ||
        "Non renseign\u00e9";


    element(
        "detailPoidsEstime"
    ).textContent =
        PortailRecup.formaterKg(
            collecte.poids_estime
        );


    element(
        "detailPoidsReel"
    ).textContent =
        PortailRecup.formaterKg(
            collecte.poids_reel
        );


    const statut =
        String(
            collecte.statut ||
            ""
        )
            .trim()
            .toLowerCase();


    const badge =
        element(
            "detailStatut"
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
            "detailPoidsLabel"
        ).textContent =
            "Poids r\u00e9el";

        element(
            "detailPoids"
        ).textContent =
            PortailRecup.formaterKg(
                poidsReel
            );

    }
    else {

        element(
            "detailPoidsLabel"
        ).textContent =
            "Poids estim\u00e9";

        element(
            "detailPoids"
        ).textContent =
            PortailRecup.formaterKg(
                collecte.poids_estime
            );

    }


    element(
        "detailTraceCollecte"
    ).classList.add(
        "done"
    );


    const pesees =
        Array.isArray(
            collecte.pesees
        )
            ? collecte.pesees
            : [];


    const preuves =
        Array.isArray(
            collecte.preuves
        )
            ? collecte.preuves
            : [];


    if (
        pesees.length > 0 ||
        aPoidsReel
    ) {

        element(
            "detailTracePesee"
        ).classList.add(
            "done"
        );

    }


    element(
        "detailTracePeseeTexte"
    ).textContent =
        pesees.length > 0
            ? (
                pesees.length +
                (
                    pesees.length > 1
                        ? " pes\u00e9es disponibles"
                        : " pes\u00e9e disponible"
                )
            )
            : (
                aPoidsReel
                    ? PortailRecup.formaterKg(
                        poidsReel
                    )
                    : "Aucune pes\u00e9e disponible"
            );


    if (
        preuves.length > 0
    ) {

        element(
            "detailTracePreuves"
        ).classList.add(
            "done"
        );

    }


    element(
        "detailTracePreuvesTexte"
    ).textContent =
        preuves.length +
        (
            preuves.length > 1
                ? " preuves disponibles"
                : preuves.length === 1
                    ? " preuve disponible"
                    : " preuve disponible"
        );


    afficherPesees(
        pesees
    );


    afficherPreuves(
        preuves
    );


    element(
        "detailChargement"
    ).classList.add(
        "cache"
    );


    element(
        "detailContenu"
    ).classList.remove(
        "cache"
    );

};


const chargerDetail = async () => {

    if (
        !UUID_REGEX.test(
            collecteId
        )
    ) {

        afficherErreur(
            "L'identifiant de collecte est invalide."
        );

        return;

    }


    const [
        contexte,
        collecte
    ] =
        await Promise.all([
            PortailRecup.requete(
                "/api/portail-client/me"
            ),

            PortailRecup.requete(
                "/api/portail-client/collectes/" +
                encodeURIComponent(
                    collecteId
                )
            )
        ]);


    afficherIdentite(
        contexte
    );


    afficherCollecte(
        collecte
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


chargerDetail().catch(
    function (
        erreur
    ) {

        console.error(
            "Chargement detail collecte impossible :",
            erreur.message
        );


        /*
         * Les 401/403 sont rediriges
         * automatiquement par commun.js.
         */
        afficherErreur(
            erreur.message ||
            "Impossible de charger cette collecte."
        );

    }
);
