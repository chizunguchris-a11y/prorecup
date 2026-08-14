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
                    "Mot de passe modifié avec succès.",
                    "succes"
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

    chargerProfil();

})();