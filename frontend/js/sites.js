if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonNouveauSite =
    document.getElementById(
        "boutonNouveauSite"
    );

const boutonActualiser =
    document.getElementById(
        "boutonActualiser"
    );

const boutonFermerModale =
    document.getElementById(
        "boutonFermerModale"
    );

const boutonAnnuler =
    document.getElementById(
        "boutonAnnuler"
    );

const boutonEnregistrer =
    document.getElementById(
        "boutonEnregistrer"
    );

const fenetreSite =
    document.getElementById(
        "fenetreSite"
    );

const formulaireSite =
    document.getElementById(
        "formulaireSite"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const corpsTableauSites =
    document.getElementById(
        "corpsTableauSites"
    );

const nombreSites =
    document.getElementById(
        "nombreSites"
    );

const erreurFormulaire =
    document.getElementById(
        "erreurFormulaire"
    );

const titreModale =
    document.getElementById(
        "titreModale"
    );

const surTitreModale =
    document.getElementById(
        "surTitreModale"
    );

let sites = [];

let siteEnModificationId = null;

const obtenirChamp = (id) => {

    return document.getElementById(id);

};

const obtenirValeur = (id) => {

    return obtenirChamp(id)
        .value
        .trim();

};

const afficherErreurFormulaire = (
    message
) => {

    erreurFormulaire.textContent =
        message;

    erreurFormulaire.classList.remove(
        "cache"
    );

};

const cacherErreurFormulaire = () => {

    erreurFormulaire.textContent = "";

    erreurFormulaire.classList.add(
        "cache"
    );

};

const creerCellule = (
    contenu,
    classe = ""
) => {

    const cellule =
        document.createElement("td");

    cellule.textContent =
        contenu || "Non renseigné";

    if (classe) {
        cellule.className = classe;
    }

    return cellule;

};

const creerBoutonAction = (
    texte,
    classe,
    action
) => {

    const bouton =
        document.createElement("button");

    bouton.type = "button";
    bouton.textContent = texte;
    bouton.className = classe;

    bouton.addEventListener(
        "click",
        action
    );

    return bouton;

};

const ouvrirModaleCreation = () => {

    siteEnModificationId = null;

    formulaireSite.reset();

    cacherErreurFormulaire();

    surTitreModale.textContent =
        "NOUVEAU SITE";

    titreModale.textContent =
        "Enregistrer un site";

    boutonEnregistrer.textContent =
        "Enregistrer le site";

    fenetreSite.classList.remove(
        "cache"
    );

    fenetreSite.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    obtenirChamp("nom").focus();

};

const ouvrirModaleModification = (
    site
) => {

    siteEnModificationId =
        site.id;

    cacherErreurFormulaire();

    obtenirChamp("nom").value =
        site.nom || "";

    obtenirChamp("adresse").value =
        site.adresse || "";

    obtenirChamp(
        "zone_geographique"
    ).value =
        site.zone_geographique || "";

    obtenirChamp(
        "responsable_nom"
    ).value =
        site.responsable_nom || "";

    surTitreModale.textContent =
        "MODIFICATION";

    titreModale.textContent =
        "Modifier le site";

    boutonEnregistrer.textContent =
        "Enregistrer les modifications";

    fenetreSite.classList.remove(
        "cache"
    );

    fenetreSite.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    obtenirChamp("nom").focus();

};

const fermerModale = () => {

    fenetreSite.classList.add(
        "cache"
    );

    fenetreSite.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";

    formulaireSite.reset();

    cacherErreurFormulaire();

    siteEnModificationId = null;

};

const supprimerSite = async (
    site,
    bouton
) => {

    const confirmation =
        window.confirm(
            `Voulez-vous vraiment supprimer le site « ${site.nom} » ?`
        );

    if (!confirmation) {
        return;
    }

    bouton.disabled = true;
    bouton.textContent =
        "Suppression...";

    try {

        await ProRecup.requete(
            `/api/sites/${site.id}`,
            {
                method: "DELETE"
            }
        );

        ProRecup.afficherNotification(
            "Site supprimé avec succès.",
            "succes"
        );

        await chargerSites();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        bouton.disabled = false;
        bouton.textContent =
            "Supprimer";

    }

};

const afficherSites = (
    listeSites
) => {

    corpsTableauSites.innerHTML = "";

    nombreSites.textContent =
        sites.length;

    if (listeSites.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 5;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucun site trouvé.";

        ligne.appendChild(cellule);

        corpsTableauSites.appendChild(
            ligne
        );

        return;

    }

    listeSites.forEach((site) => {

        const ligne =
            document.createElement("tr");

        ligne.appendChild(
            creerCellule(
                site.nom,
                "nom-site"
            )
        );

        ligne.appendChild(
            creerCellule(
                site.adresse,
                site.adresse
                    ? ""
                    : "texte-vide"
            )
        );

        const celluleZone =
            document.createElement("td");

        if (site.zone_geographique) {

            const etiquette =
                document.createElement(
                    "span"
                );

            etiquette.className =
                "zone-site";

            etiquette.textContent =
                site.zone_geographique;

            celluleZone.appendChild(
                etiquette
            );

        } else {

            celluleZone.textContent =
                "Non renseignée";

            celluleZone.className =
                "texte-vide";

        }

        ligne.appendChild(celluleZone);

        ligne.appendChild(
            creerCellule(
                site.responsable_nom,
                site.responsable_nom
                    ? ""
                    : "texte-vide"
            )
        );

        const celluleActions =
            document.createElement("td");

        celluleActions.className =
            "cellule-actions";

        const boutonModifier =
            creerBoutonAction(
                "Modifier",
                "bouton-action bouton-modifier",
                () =>
                    ouvrirModaleModification(
                        site
                    )
            );

        const boutonSupprimer =
            creerBoutonAction(
                "Supprimer",
                "bouton-action bouton-supprimer",
                () =>
                    supprimerSite(
                        site,
                        boutonSupprimer
                    )
            );

        celluleActions.appendChild(
            boutonModifier
        );

        celluleActions.appendChild(
            boutonSupprimer
        );

        ligne.appendChild(
            celluleActions
        );

        corpsTableauSites.appendChild(
            ligne
        );

    });

};

const filtrerSites = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    if (!recherche) {

        afficherSites(sites);

        return;

    }

    const resultat =
        sites.filter(
            (site) => {

                const contenu = [
                    site.nom,
                    site.adresse,
                    site.zone_geographique,
                    site.responsable_nom
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return contenu.includes(
                    recherche
                );

            }
        );

    afficherSites(resultat);

};

const afficherEtatChargement = () => {

    corpsTableauSites.innerHTML = `
        <tr>
            <td
                colspan="5"
                class="etat-tableau"
            >
                <span
                    class="indicateur-chargement"
                ></span>
            </td>
        </tr>
    `;

};

const chargerSites = async () => {

    boutonActualiser.disabled = true;

    boutonActualiser.textContent =
        "Chargement...";

    afficherEtatChargement();

    try {

        const resultat =
            await ProRecup.requete(
                "/api/sites"
            );

        sites =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        filtrerSites();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauSites.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="etat-tableau"
                >
                    Impossible de charger les sites.
                </td>
            </tr>
        `;

    } finally {

        boutonActualiser.disabled =
            false;

        boutonActualiser.textContent =
            "Actualiser";

    }

};

formulaireSite.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherErreurFormulaire();

        const donneesSite = {

            nom:
                obtenirValeur("nom"),

            adresse:
                obtenirValeur("adresse"),

            zone_geographique:
                obtenirValeur(
                    "zone_geographique"
                ),

            responsable_nom:
                obtenirValeur(
                    "responsable_nom"
                )

        };

        if (!donneesSite.nom) {

            afficherErreurFormulaire(
                "Le nom du site est obligatoire."
            );

            return;

        }

        const modification =
            Boolean(
                siteEnModificationId
            );

        boutonEnregistrer.disabled =
            true;

        boutonEnregistrer.textContent =
            modification
                ? "Modification..."
                : "Enregistrement...";

        try {

            const chemin =
                modification
                    ? `/api/sites/${siteEnModificationId}`
                    : "/api/sites";

            const methode =
                modification
                    ? "PUT"
                    : "POST";

            await ProRecup.requete(
                chemin,
                {
                    method: methode,

                    body: JSON.stringify(
                        donneesSite
                    )
                }
            );

            fermerModale();

            ProRecup.afficherNotification(
                modification
                    ? "Site modifié avec succès."
                    : "Site créé avec succès.",
                "succes"
            );

            await chargerSites();

        } catch (erreur) {

            afficherErreurFormulaire(
                erreur.message
            );

        } finally {

            boutonEnregistrer.disabled =
                false;

            boutonEnregistrer.textContent =
                siteEnModificationId
                    ? "Enregistrer les modifications"
                    : "Enregistrer le site";

        }

    }
);

boutonNouveauSite.addEventListener(
    "click",
    ouvrirModaleCreation
);

boutonFermerModale.addEventListener(
    "click",
    fermerModale
);

boutonAnnuler.addEventListener(
    "click",
    fermerModale
);

fenetreSite
    .querySelector(".fond-modale")
    .addEventListener(
        "click",
        fermerModale
    );

boutonActualiser.addEventListener(
    "click",
    chargerSites
);

champRecherche.addEventListener(
    "input",
    filtrerSites
);

document.addEventListener(
    "keydown",
    (evenement) => {

        if (
            evenement.key === "Escape" &&
            !fenetreSite.classList
                .contains("cache")
        ) {

            fermerModale();

        }

    }
);

chargerSites();