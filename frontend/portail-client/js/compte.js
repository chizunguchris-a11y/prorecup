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

    const [securite, sessions] = await Promise.all([
        PortailRecup.requete("/api/identity/account/security"),
        PortailRecup.requete("/api/sessions")
    ]);

    const informations = PortailRecup.extraireDonnees(securite) || {};
    const sessionsActives = PortailRecup.extraireDonnees(sessions) || [];
    element("statutEmail").textContent = informations.email_verifie_le ? "Vérifiée" : "Non vérifiée";
    element("statutTelephone").textContent = informations.telephone_verifie_le ? "Vérifié" : "Non vérifié — vérification bientôt disponible";
    element("boutonVerifierEmail").hidden = Boolean(informations.email_verifie_le);
    element("statutSecuriteCompte").textContent = `${sessionsActives.length} session${sessionsActives.length > 1 ? "s" : ""} active${sessionsActives.length > 1 ? "s" : ""}.`;
    const liste = element("listeSessions");
    liste.replaceChildren();
    if (!sessionsActives.length) {
        liste.textContent = "Aucune activité de session disponible.";
    } else {
        const ul = document.createElement("ul");
        sessionsActives.forEach(session => {
            const li = document.createElement("li");
            const date = session.cree_le ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.cree_le)) : "Date indisponible";
            li.textContent = `${session.actuelle ? "Session actuelle — " : ""}${session.navigateur || "Appareil non identifié"} · ${date}${session.adresse_ip ? ` · ${session.adresse_ip}` : ""}`;
            ul.append(li);
        });
        liste.append(ul);
    }

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

element("boutonVerifierEmail")?.addEventListener("click", async evenement => {
    const bouton = evenement.currentTarget;
    bouton.disabled = true;
    try {
        const resultat = await PortailRecup.requete("/api/identity/account/email/request", { method: "POST", body: "{}" });
        element("statutSecuriteCompte").textContent = resultat.message || "Lien envoyé.";
    } catch (erreur) {
        element("statutSecuriteCompte").textContent = erreur.message || "Envoi impossible.";
    } finally {
        bouton.disabled = false;
    }
});

element("boutonFermerAutres")?.addEventListener("click", async evenement => {
    const bouton = evenement.currentTarget;
    bouton.disabled = true;
    try {
        await PortailRecup.requete("/api/sessions/fermer-autres", { method: "POST", body: "{}" });
        window.location.reload();
    } catch (erreur) {
        element("statutSecuriteCompte").textContent = erreur.message || "Révocation impossible.";
        bouton.disabled = false;
    }
});

element("boutonFermerToutes")?.addEventListener("click", async evenement => {
    const bouton = evenement.currentTarget;
    bouton.disabled = true;
    try {
        await PortailRecup.requete("/api/sessions/fermer-toutes", { method: "POST", body: "{}" });
        PortailRecup.deconnecter();
    } catch (erreur) {
        element("statutSecuriteCompte").textContent = erreur.message || "Révocation impossible.";
        bouton.disabled = false;
    }
});


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
