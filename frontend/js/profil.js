(function () {

    "use strict";

    if (!window.ProRecup) {
        return;
    }

    ProRecup.protegerPage();
    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    const element = (id) =>
        document.getElementById(id);

    const formulaireProfil =
        element("formulaireProfil");

    const formulaireMotDePasse =
        element("formulaireMotDePasse");

    const erreurProfil =
        element("erreurProfil");

    let profil = null;

    const formaterSession = session => {

        const appareil =
            session.navigateur ||
            "Appareil non identifié";

        const date =
            session.cree_le
                ? new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short"
                }).format(new Date(session.cree_le))
                : "Date indisponible";

        return `${session.actuelle ? "Session actuelle — " : ""}${appareil} · ${date}${session.adresse_ip ? ` · ${session.adresse_ip}` : ""}`;

    };

    async function chargerSecurite() {

        const [securite, sessions] =
            await Promise.all([
                ProRecup.requete("/api/identity/account/security"),
                ProRecup.requete("/api/sessions")
            ]);

        const informations =
            securite.data || {};

        element("statutEmail").textContent =
            informations.email_verifie_le
                ? "Vérifiée"
                : "Non vérifiée";

        element("statutTelephone").textContent =
            informations.telephone_verifie_le
                ? "Vérifié"
                : "Non vérifié — vérification bientôt disponible";

        element("boutonVerifierEmail").hidden =
            Boolean(informations.email_verifie_le);

        const liste =
            element("listeSessions");

        liste.replaceChildren();

        const sessionsActives =
            Array.isArray(sessions.data)
                ? sessions.data
                : [];

        if (!sessionsActives.length) {
            liste.textContent = "Aucune activité de session disponible.";
        } else {
            const ul = document.createElement("ul");
            sessionsActives.forEach(session => {
                const li = document.createElement("li");
                li.textContent = formaterSession(session);
                ul.append(li);
            });
            liste.append(ul);
        }

        element("statutSecuriteCompte").textContent =
            `${sessionsActives.length} session${sessionsActives.length > 1 ? "s" : ""} active${sessionsActives.length > 1 ? "s" : ""}.`;

    }

    function afficherErreur(
        message
    ) {

        erreurProfil.textContent =
            message;

        erreurProfil.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        erreurProfil.textContent = "";

        erreurProfil.classList.add(
            "cache"
        );

    }

    function afficherPhoto(
        utilisateur
    ) {

        const photo =
            element("photoProfil");

        photo.style.backgroundImage =
            "";

        photo.textContent =
            (
                utilisateur.nom ||
                "U"
            )
                .charAt(0)
                .toUpperCase();

        if (
            utilisateur.photo_url
        ) {

            photo.style.backgroundImage =
                `url("${utilisateur.photo_url}")`;

            photo.textContent = "";

        }

    }

    function afficherProfil(
        utilisateur
    ) {

        profil =
            utilisateur;

        element("nom").value =
            utilisateur.nom || "";

        element("email").value =
            utilisateur.email || "";

        element("telephone").value =
            utilisateur.telephone || "";

        element("photoUrl").value =
            utilisateur.photo_url || "";

        element("nomProfil").textContent =
            utilisateur.nom ||
            "Utilisateur";

        element("emailProfil").textContent =
            utilisateur.email || "—";

        element("roleProfil").textContent =
            utilisateur.role ||
            utilisateur.role_nom ||
            "Rôle non renseigné";

        element(
            "organisationProfil"
        ).textContent =
            utilisateur.organisation_nom ||
            "Organisation";

        afficherPhoto(
            utilisateur
        );

    }

    function enregistrerUtilisateurLocal(
        utilisateur
    ) {

        const utilisateurActuel =
            ProRecup.obtenirUtilisateur() ||
            {};

        const nouveauUtilisateur = {

            ...utilisateurActuel,
            ...utilisateur

        };

        localStorage.setItem(
            "prorecup_utilisateur",
            JSON.stringify(
                nouveauUtilisateur
            )
        );

        ProRecup.initialiserUtilisateur();

    }

    async function chargerProfil() {

        cacherErreur();

        try {

            const resultat =
                await ProRecup.requete(
                    "/api/auth/me"
                );

            afficherProfil(
                resultat.data
            );

            enregistrerUtilisateurLocal(
                resultat.data
            );

        } catch (erreur) {

            afficherErreur(
                erreur.message ||
                "Impossible de charger le profil."
            );

        }

    }

    formulaireProfil.addEventListener(
        "submit",
        async (
            evenement
        ) => {

            evenement.preventDefault();
            cacherErreur();

            const bouton =
                element(
                    "boutonEnregistrerProfil"
                );

            bouton.disabled = true;
            bouton.textContent =
                "Enregistrement...";

            try {

                const resultat =
                    await ProRecup.requete(
                        "/api/auth/me",
                        {
                            method:
                                "PUT",

                            body:
                                JSON.stringify({
                                    nom:
                                        element("nom")
                                            .value
                                            .trim(),

                                    email:
                                        element("email")
                                            .value
                                            .trim(),

                                    telephone:
                                        element("telephone")
                                            .value
                                            .trim(),

                                    photo_url:
                                        element("photoUrl")
                                            .value
                                            .trim()
                                })
                        }
                    );

                afficherProfil(
                    resultat.data
                );

                enregistrerUtilisateurLocal(
                    resultat.data
                );

                ProRecup.afficherNotification(
                    "Profil modifié avec succès.",
                    "succes"
                );

            } catch (erreur) {

                afficherErreur(
                    erreur.message ||
                    "Impossible de modifier le profil."
                );

            } finally {

                bouton.disabled = false;
                bouton.textContent =
                    "Enregistrer le profil";

            }

        }
    );

    formulaireMotDePasse.addEventListener(
        "submit",
        async (
            evenement
        ) => {

            evenement.preventDefault();
            cacherErreur();

            const ancienMotDePasse =
                element(
                    "ancienMotDePasse"
                ).value;

            const nouveauMotDePasse =
                element(
                    "nouveauMotDePasse"
                ).value;

            const confirmation =
                element(
                    "confirmationMotDePasse"
                ).value;

            if (
                nouveauMotDePasse !==
                confirmation
            ) {

                afficherErreur(
                    "La confirmation du mot de passe ne correspond pas."
                );

                return;

            }

            const bouton =
                element(
                    "boutonModifierMotDePasse"
                );

            bouton.disabled = true;
            bouton.textContent =
                "Modification...";

            try {

                await ProRecup.requete(
                    "/api/auth/me/password",
                    {
                        method:
                            "PATCH",

                        body:
                            JSON.stringify({
                                ancienMotDePasse,

                                nouveauMotDePasse,

                                confirmationMotDePasse:
                                    confirmation
                            })
                    }
                );

                formulaireMotDePasse.reset();

                ProRecup.afficherNotification(
                    "Mot de passe modifié. Reconnexion nécessaire.",
                    "succes"
                );

                window.setTimeout(
                    () => ProRecup.deconnecter(),
                    900
                );

            } catch (erreur) {

                afficherErreur(
                    erreur.message ||
                    "Impossible de modifier le mot de passe."
                );

            } finally {

                bouton.disabled = false;
                bouton.textContent =
                    "Modifier le mot de passe";

            }

        }
    );

    element("photoUrl").addEventListener(
        "input",
        () => {

            afficherPhoto({
                nom:
                    element("nom").value,

                photo_url:
                    element("photoUrl")
                        .value
                        .trim()
            });

        }
    );

    element("boutonVerifierEmail").addEventListener("click", async evenement => {
        const bouton = evenement.currentTarget;
        bouton.disabled = true;
        try {
            const resultat = await ProRecup.requete("/api/identity/account/email/request", { method: "POST", body: "{}" });
            ProRecup.afficherNotification(resultat.message || "Lien envoyé.", "succes");
        } catch (erreur) {
            afficherErreur(erreur.message || "Envoi impossible.");
        } finally {
            bouton.disabled = false;
        }
    });

    element("boutonFermerAutres").addEventListener("click", async evenement => {
        const bouton = evenement.currentTarget;
        bouton.disabled = true;
        try {
            await ProRecup.requete("/api/sessions/fermer-autres", { method: "POST", body: "{}" });
            await chargerSecurite();
            ProRecup.afficherNotification("Les autres sessions ont été fermées.", "succes");
        } catch (erreur) {
            afficherErreur(erreur.message || "Révocation impossible.");
        } finally {
            bouton.disabled = false;
        }
    });

    element("boutonFermerToutes").addEventListener("click", async evenement => {
        const bouton = evenement.currentTarget;
        bouton.disabled = true;
        try {
            await ProRecup.requete("/api/sessions/fermer-toutes", { method: "POST", body: "{}" });
            ProRecup.deconnecter();
        } catch (erreur) {
            afficherErreur(erreur.message || "Révocation impossible.");
            bouton.disabled = false;
        }
    });

    chargerProfil();
    chargerSecurite().catch(erreur => {
        element("statutSecuriteCompte").textContent =
            erreur.message || "Informations de sécurité indisponibles.";
    });

})();
