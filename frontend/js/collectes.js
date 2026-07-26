if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonNouvelleCollecte =
    document.getElementById(
        "boutonNouvelleCollecte"
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

const fenetreCollecte =
    document.getElementById(
        "fenetreCollecte"
    );

const formulaireCollecte =
    document.getElementById(
        "formulaireCollecte"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const filtreStatut =
    document.getElementById(
        "filtreStatut"
    );

const corpsTableauCollectes =
    document.getElementById(
        "corpsTableauCollectes"
    );

const nombreCollectes =
    document.getElementById(
        "nombreCollectes"
    );

const nombreEnAttente =
    document.getElementById(
        "nombreEnAttente"
    );

const nombreValidees =
    document.getElementById(
        "nombreValidees"
    );

const erreurFormulaire =
    document.getElementById(
        "erreurFormulaire"
    );

const selectClient =
    document.getElementById(
        "client_id"
    );

const selectSite =
    document.getElementById(
        "site_id"
    );

const selectTypeDechet =
    document.getElementById(
        "type_dechet_id"
    );

let collectes = [];
let clients = [];
let sites = [];
let typesDechets = [];

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

const remplirSelect = (
    element,
    liste,
    texteParDefaut,
    obtenirTexte
) => {

    element.innerHTML = "";

    const optionDefaut =
        document.createElement("option");

    optionDefaut.value = "";

    optionDefaut.textContent =
        texteParDefaut;

    element.appendChild(
        optionDefaut
    );

    liste.forEach((item) => {

        const option =
            document.createElement("option");

        option.value = item.id;

        option.textContent =
            obtenirTexte(item);

        element.appendChild(
            option
        );

    });

};

const chargerListesFormulaire =
    async () => {

        const resultats =
            await Promise.all([
                ProRecup.requete(
                    "/api/clients"
                ),
                ProRecup.requete(
                    "/api/sites"
                ),
                ProRecup.requete(
                    "/api/types-dechets"
                )
            ]);

        clients =
            Array.isArray(resultats[0].data)
                ? resultats[0].data
                : [];

        sites =
            Array.isArray(resultats[1].data)
                ? resultats[1].data
                : [];

        typesDechets =
            Array.isArray(resultats[2].data)
                ? resultats[2].data
                : [];

        remplirSelect(
            selectClient,
            clients,
            "Sélectionnez un client",
            (client) => client.nom
        );

        remplirSelect(
            selectSite,
            sites,
            "Sélectionnez un site",
            (site) => site.nom
        );

        remplirSelect(
            selectTypeDechet,
            typesDechets,
            "Sélectionnez un type de déchet",
            (type) => type.nom
        );

    };

const mettreAJourCompteurs = () => {

    nombreCollectes.textContent =
        collectes.length;

    nombreEnAttente.textContent =
        collectes.filter(
            (collecte) =>
                collecte.statut ===
                "en_attente"
        ).length;

    nombreValidees.textContent =
        collectes.filter(
            (collecte) =>
                collecte.statut ===
                "valide"
        ).length;

};

const formaterStatut = (statut) => {

    if (statut === "valide") {
        return "Validée";
    }

    return "En attente";

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

const validerCollecte = async (
    collecte,
    bouton
) => {

    const confirmation =
        window.confirm(
            `Valider la collecte du client "${collecte.client_nom}" ?`
        );

    if (!confirmation) {
        return;
    }

    bouton.disabled = true;
    bouton.textContent =
        "Validation...";

    try {

        await ProRecup.requete(
            `/api/collectes/${collecte.id}/valider`,
            {
                method: "PATCH"
            }
        );

        ProRecup.afficherNotification(
            "Collecte validée avec succès.",
            "succes"
        );

        await chargerCollectes();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        bouton.disabled = false;
        bouton.textContent = "Valider";

    }

};

const afficherCollectes = (
    listeCollectes
) => {

    corpsTableauCollectes.innerHTML =
        "";

    if (listeCollectes.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 7;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucune collecte trouvée.";

        ligne.appendChild(cellule);

        corpsTableauCollectes
            .appendChild(ligne);

        return;

    }

    listeCollectes.forEach(
        (collecte) => {

            const ligne =
                document.createElement("tr");

            ligne.appendChild(
                creerCellule(
                    collecte.client_nom,
                    "nom-principal"
                )
            );

            ligne.appendChild(
                creerCellule(
                    collecte.site_nom
                )
            );

            ligne.appendChild(
                creerCellule(
                    collecte.type_dechet
                )
            );

            ligne.appendChild(
                creerCellule(
                    `${ProRecup.formaterNombre(
                        collecte.poids_estime
                    )} kg`
                )
            );

            ligne.appendChild(
                creerCellule(
                    collecte.agent_nom,
                    collecte.agent_nom
                        ? ""
                        : "texte-vide"
                )
            );

            const celluleStatut =
                document.createElement("td");

            const badge =
                document.createElement("span");

            badge.className =
                collecte.statut === "valide"
                    ? "badge-statut statut-valide"
                    : "badge-statut statut-attente";

            badge.textContent =
                formaterStatut(
                    collecte.statut
                );

            celluleStatut.appendChild(
                badge
            );

            ligne.appendChild(
                celluleStatut
            );

            const celluleAction =
                document.createElement("td");

            if (
                collecte.statut ===
                "en_attente"
            ) {

                const bouton =
                    document.createElement(
                        "button"
                    );

                bouton.type = "button";

                bouton.className =
                    "bouton-valider";

                bouton.textContent =
                    "Valider";

                bouton.addEventListener(
                    "click",
                    () =>
                        validerCollecte(
                            collecte,
                            bouton
                        )
                );

                celluleAction.appendChild(
                    bouton
                );

            } else {

                celluleAction.textContent =
                    "Terminée";

                celluleAction.className =
                    "texte-vide";

            }

            ligne.appendChild(
                celluleAction
            );

            corpsTableauCollectes
                .appendChild(ligne);

        }
    );

};

const filtrerCollectes = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    const statut =
        filtreStatut.value;

    const resultat =
        collectes.filter(
            (collecte) => {

                const contenu = [
                    collecte.client_nom,
                    collecte.site_nom,
                    collecte.type_dechet,
                    collecte.agent_nom,
                    collecte.statut,
                    collecte.poids_estime
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const correspondRecherche =
                    !recherche ||
                    contenu.includes(
                        recherche
                    );

                const correspondStatut =
                    !statut ||
                    collecte.statut ===
                        statut;

                return (
                    correspondRecherche &&
                    correspondStatut
                );

            }
        );

    afficherCollectes(resultat);

};

const afficherEtatChargement = () => {

    corpsTableauCollectes.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="etat-tableau"
            >
                <span
                    class="indicateur-chargement"
                ></span>
            </td>
        </tr>
    `;

};

const chargerCollectes = async () => {

    boutonActualiser.disabled = true;

    boutonActualiser.textContent =
        "Chargement...";

    afficherEtatChargement();

    try {

        const resultat =
            await ProRecup.requete(
                "/api/collectes"
            );

        collectes =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        mettreAJourCompteurs();
        filtrerCollectes();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauCollectes.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="etat-tableau"
                >
                    Impossible de charger les collectes.
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

const ouvrirModale = async () => {

    formulaireCollecte.reset();
    cacherErreurFormulaire();

    boutonNouvelleCollecte.disabled =
        true;

    boutonNouvelleCollecte.textContent =
        "Chargement...";

    try {

        await chargerListesFormulaire();

        fenetreCollecte.classList.remove(
            "cache"
        );

        fenetreCollecte.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

    } finally {

        boutonNouvelleCollecte.disabled =
            false;

        boutonNouvelleCollecte.textContent =
            "Nouvelle collecte";

    }

};

const fermerModale = () => {

    fenetreCollecte.classList.add(
        "cache"
    );

    fenetreCollecte.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";

    cacherErreurFormulaire();

};

formulaireCollecte.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherErreurFormulaire();

        const donneesCollecte = {

            client_id:
                selectClient.value,

            site_id:
                selectSite.value,

            type_dechet_id:
                selectTypeDechet.value,

            poids_estime:
                Number(
                    document
                        .getElementById(
                            "poids_estime"
                        )
                        .value
                )

        };

        if (
            !donneesCollecte.client_id ||
            !donneesCollecte.site_id ||
            !donneesCollecte.type_dechet_id ||
            !donneesCollecte.poids_estime ||
            donneesCollecte.poids_estime <= 0
        ) {

            afficherErreurFormulaire(
                "Veuillez renseigner correctement tous les champs obligatoires."
            );

            return;

        }

        boutonEnregistrer.disabled =
            true;

        boutonEnregistrer.textContent =
            "Enregistrement...";

        try {

            await ProRecup.requete(
                "/api/collectes",
                {
                    method: "POST",

                    body: JSON.stringify(
                        donneesCollecte
                    )
                }
            );

            fermerModale();

            ProRecup.afficherNotification(
                "Collecte enregistrée avec succès.",
                "succes"
            );

            await chargerCollectes();

        } catch (erreur) {

            afficherErreurFormulaire(
                erreur.message
            );

        } finally {

            boutonEnregistrer.disabled =
                false;

            boutonEnregistrer.textContent =
                "Enregistrer la collecte";

        }

    }
);

boutonNouvelleCollecte.addEventListener(
    "click",
    ouvrirModale
);

boutonFermerModale.addEventListener(
    "click",
    fermerModale
);

boutonAnnuler.addEventListener(
    "click",
    fermerModale
);

fenetreCollecte
    .querySelector(".fond-modale")
    .addEventListener(
        "click",
        fermerModale
    );

boutonActualiser.addEventListener(
    "click",
    chargerCollectes
);

champRecherche.addEventListener(
    "input",
    filtrerCollectes
);

filtreStatut.addEventListener(
    "change",
    filtrerCollectes
);

document.addEventListener(
    "keydown",
    (evenement) => {

        if (
            evenement.key === "Escape" &&
            !fenetreCollecte
                .classList.contains(
                    "cache"
                )
        ) {

            fermerModale();

        }

    }
);

chargerCollectes();