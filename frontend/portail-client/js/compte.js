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


const texteOuDefaut = (
    valeur,
    defaut = "Non renseign\u00e9"
) => {

    const texte =
        String(
            valeur ||
            ""
        ).trim();


    return texte ||
        defaut;

};


const formaterTypeClient = (
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

        entreprise:
            "Entreprise",

        institution:
            "Institution",

        menage:
            "M\u00e9nage",

        association:
            "Association",

        collectivite:
            "Collectivit\u00e9"

    };


    return (
        libelles[
            cle
        ] ||
        texteOuDefaut(
            valeur
        )
    );

};


const afficherUtilisateur = (
    contexte
) => {

    const utilisateur =
        contexte?.utilisateur ||
        {};


    const nom =
        utilisateur.nom ||
        "Client";


    const initiale =
        String(
            nom
        )
            .charAt(0)
            .toUpperCase() ||
        "C";


    element(
        "nomUtilisateurEntete"
    ).textContent =
        nom;


    element(
        "initialeUtilisateur"
    ).textContent =
        initiale;


    element(
        "compteAvatar"
    ).textContent =
        initiale;


    element(
        "compteNom"
    ).textContent =
        nom;


    element(
        "compteEmail"
    ).textContent =
        texteOuDefaut(
            utilisateur.email
        );


    element(
        "compteTelephone"
    ).textContent =
        texteOuDefaut(
            utilisateur.telephone
        );

};


const creerEntite = (
    client
) => {

    const carte =
        document.createElement(
            "article"
        );


    carte.className =
        "compte-entite";


    const entete =
        document.createElement(
            "div"
        );


    entete.className =
        "compte-entite-head";


    const icone =
        document.createElement(
            "div"
        );


    icone.className =
        "compte-entite-icon";


    icone.textContent =
        "E";


    const titre =
        document.createElement(
            "div"
        );


    const nom =
        document.createElement(
            "strong"
        );


    nom.textContent =
        texteOuDefaut(
            client.nom,
            "Entit\u00e9 cliente"
        );


    const type =
        document.createElement(
            "span"
        );


    type.textContent =
        formaterTypeClient(
            client.type_client
        );


    titre.appendChild(
        nom
    );


    titre.appendChild(
        type
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


    const infos =
        document.createElement(
            "dl"
        );


    infos.className =
        "compte-entite-infos";


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
            texteOuDefaut(
                valeur
            );


        ligne.appendChild(
            dt
        );


        ligne.appendChild(
            dd
        );


        infos.appendChild(
            ligne
        );

    };


    ajouterInfo(
        "Secteur d'activit\u00e9",
        client.secteur_activite
    );


    ajouterInfo(
        "Adresse du si\u00e8ge",
        client.adresse_siege
    );


    ajouterInfo(
        "E-mail de contact",
        client.contact_email
    );


    ajouterInfo(
        "T\u00e9l\u00e9phone de contact",
        client.contact_telephone
    );


    carte.appendChild(
        infos
    );


    return carte;

};


const afficherEntites = (
    clients
) => {

    const liste =
        Array.isArray(
            clients
        )
            ? clients
            : [];


    element(
        "nombreEntites"
    ).textContent =
        String(
            liste.length
        );


    const conteneur =
        element(
            "listeEntites"
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
            "Aucune entit\u00e9 cliente accessible.";


        conteneur.appendChild(
            vide
        );


        return;

    }


    liste.forEach(
        function (
            client
        ) {

            conteneur.appendChild(
                creerEntite(
                    client
                )
            );

        }
    );

};


const charger = async () => {

    const contexte =
        await PortailRecup.requete(
            "/api/portail-client/me"
        );


    afficherUtilisateur(
        contexte
    );


    afficherEntites(
        contexte?.clients
    );

};


const deconnecter = () => {

    PortailRecup.deconnecter();

};


[
    "boutonDeconnexion",
    "boutonDeconnexionBas"
].forEach(
    function (
        id
    ) {

        const bouton =
            element(
                id
            );


        if (
            bouton
        ) {

            bouton.addEventListener(
                "click",
                deconnecter
            );

        }

    }
);


charger().catch(
    function (
        erreur
    ) {

        console.error(
            "Chargement compte impossible :",
            erreur.message
        );


        const conteneur =
            element(
                "listeEntites"
            );


        conteneur.textContent =
            "";


        const bloc =
            document.createElement(
                "div"
            );


        bloc.className =
            "cockpit-empty";


        bloc.textContent =
            erreur.message ||
            "Impossible de charger votre compte.";


        conteneur.appendChild(
            bloc
        );

    }
);
