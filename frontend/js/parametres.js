(function () {

    "use strict";

    if (!window.ProRecup) {
        return;
    }

    ProRecup.protegerPage();
    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    const element = (
        id
    ) => document.getElementById(id);

    const formulaire =
        element(
            "formulaireOrganisation"
        );

    const erreur =
        element(
            "erreurParametres"
        );

    function afficherErreur(
        message
    ) {

        erreur.textContent =
            message;

        erreur.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        erreur.textContent = "";

        erreur.classList.add(
            "cache"
        );

    }

    function afficherLogo(
        organisation
    ) {

        const logo =
            element(
                "logoOrganisation"
            );

        logo.style.backgroundImage =
            "";

        logo.textContent =
            String(
                organisation.nom ||
                "PR"
            )
                .slice(0, 2)
                .toUpperCase();

        if (
            organisation.logo_url
        ) {

            logo.style.backgroundImage =
                `url("${organisation.logo_url}")`;

            logo.textContent =
                "";

        }

    }

    function afficherOrganisation(
        organisation
    ) {

        element("nom").value =
            organisation.nom || "";

        element("email").value =
            organisation.email || "";

        element("telephone").value =
            organisation.telephone || "";

        element("ville").value =
            organisation.ville || "";

        element("pays").value =
            organisation.pays || "";

        element("adresse").value =
            organisation.adresse || "";

        element("logoUrl").value =
            organisation.logo_url || "";

        element("devise").value =
            organisation.devise || "USD";

        element("fuseauHoraire").value =
            organisation.fuseau_horaire ||
            "Africa/Kinshasa";

        element(
            "numeroIdentification"
        ).value =
            organisation
                .numero_identification ||
            "";

        element("siteWeb").value =
            organisation.site_web || "";

        element("description").value =
            organisation.description || "";

        element(
            "nomOrganisationApercu"
        ).textContent =
            organisation.nom ||
            "Organisation";

        element(
            "adresseOrganisationApercu"
        ).textContent =
            [
                organisation.adresse,
                organisation.ville,
                organisation.pays
            ]
                .filter(Boolean)
                .join(", ") ||
            "Adresse non renseignée";

        afficherLogo(
            organisation
        );

    }

    async function chargerOrganisation() {

        cacherErreur();

        try {

            const resultat =
                await ProRecup.requete(
                    "/api/organisations/me"
                );

            afficherOrganisation(
                resultat.data
            );

        } catch (erreurRequete) {

            afficherErreur(
                erreurRequete.message ||
                "Impossible de charger l'organisation."
            );

        }

    }

    formulaire.addEventListener(
        "submit",
        async (
            evenement
        ) => {

            evenement.preventDefault();

            cacherErreur();

            const bouton =
                element(
                    "boutonEnregistrerParametres"
                );

            bouton.disabled = true;
            bouton.textContent =
                "Enregistrement...";

            try {

                const resultat =
                    await ProRecup.requete(
                        "/api/organisations/me",
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

                                    ville:
                                        element("ville")
                                            .value
                                            .trim(),

                                    pays:
                                        element("pays")
                                            .value
                                            .trim(),

                                    adresse:
                                        element("adresse")
                                            .value
                                            .trim(),

                                    logo_url:
                                        element("logoUrl")
                                            .value
                                            .trim(),

                                    devise:
                                        element("devise")
                                            .value,

                                    fuseau_horaire:
                                        element(
                                            "fuseauHoraire"
                                        ).value,

                                    numero_identification:
                                        element(
                                            "numeroIdentification"
                                        )
                                            .value
                                            .trim(),

                                    site_web:
                                        element("siteWeb")
                                            .value
                                            .trim(),

                                    description:
                                        element("description")
                                            .value
                                            .trim()
                                })
                        }
                    );

                afficherOrganisation(
                    resultat.data
                );

                ProRecup.afficherNotification(
                    "Paramètres enregistrés avec succès.",
                    "succes"
                );

            } catch (erreurRequete) {

                afficherErreur(
                    erreurRequete.message ||
                    "Impossible d'enregistrer les paramètres."
                );

            } finally {

                bouton.disabled = false;
                bouton.textContent =
                    "Enregistrer les paramètres";

            }

        }
    );

    element("logoUrl")
        .addEventListener(
            "input",
            () => {

                afficherLogo({
                    nom:
                        element("nom").value,

                    logo_url:
                        element("logoUrl")
                            .value
                            .trim()
                });

            }
        );

    chargerOrganisation();

})();