if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonNouveauClient =
    document.getElementById(
        "boutonNouveauClient"
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

const fenetreClient =
    document.getElementById(
        "fenetreClient"
    );

const formulaireClient =
    document.getElementById(
        "formulaireClient"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const corpsTableauClients =
    document.getElementById(
        "corpsTableauClients"
    );

const nombreClients =
    document.getElementById(
        "nombreClients"
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

let clients = [];

let clientEnModificationId = null;

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

    clientEnModificationId = null;

    formulaireClient.reset();

    cacherErreurFormulaire();

    surTitreModale.textContent =
        "NOUVEAU CLIENT";

    titreModale.textContent =
        "Enregistrer un client";

    boutonEnregistrer.textContent =
        "Enregistrer le client";

    fenetreClient.classList.remove(
        "cache"
    );

    fenetreClient.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    obtenirChamp("nom").focus();

};

const ouvrirModaleModification = (
    client
) => {

    clientEnModificationId =
        client.id;

    cacherErreurFormulaire();

    obtenirChamp("nom").value =
        client.nom || "";

    obtenirChamp("type_client").value =
        client.type_client || "";

    obtenirChamp("contact_email").value =
        client.contact_email || "";

    obtenirChamp(
        "contact_telephone"
    ).value =
        client.contact_telephone || "";

    obtenirChamp("adresse_siege").value =
        client.adresse_siege || "";

    surTitreModale.textContent =
        "MODIFICATION";

    titreModale.textContent =
        "Modifier le client";

    boutonEnregistrer.textContent =
        "Enregistrer les modifications";

    fenetreClient.classList.remove(
        "cache"
    );

    fenetreClient.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    obtenirChamp("nom").focus();

};

const fermerModale = () => {

    fenetreClient.classList.add(
        "cache"
    );

    fenetreClient.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";

    formulaireClient.reset();

    cacherErreurFormulaire();

    clientEnModificationId = null;

};

const supprimerClient = async (
    client,
    bouton
) => {

    const confirmation =
        window.confirm(
            `Voulez-vous vraiment supprimer le client « ${client.nom} » ?`
        );

    if (!confirmation) {
        return;
    }

    bouton.disabled = true;
    bouton.textContent =
        "Suppression...";

    try {

        await ProRecup.requete(
            `/api/clients/${client.id}`,
            {
                method: "DELETE"
            }
        );

        ProRecup.afficherNotification(
            "Client supprimé avec succès.",
            "succes"
        );

        await chargerClients();

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

const afficherClients = (
    listeClients
) => {

    corpsTableauClients.innerHTML = "";

    nombreClients.textContent =
        clients.length;

    if (listeClients.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 6;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucun client trouvé.";

        ligne.appendChild(cellule);

        corpsTableauClients.appendChild(
            ligne
        );

        return;

    }

    listeClients.forEach((client) => {

        const ligne =
            document.createElement("tr");

        ligne.appendChild(
            creerCellule(
                client.nom,
                "nom-client"
            )
        );

        const celluleType =
            document.createElement("td");

        if (client.type_client) {

            const etiquette =
                document.createElement(
                    "span"
                );

            etiquette.className =
                "type-client";

            etiquette.textContent =
                client.type_client;

            celluleType.appendChild(
                etiquette
            );

        } else {

            celluleType.textContent =
                "Non renseigné";

            celluleType.className =
                "texte-vide";

        }

        ligne.appendChild(celluleType);

        ligne.appendChild(
            creerCellule(
                client.contact_email,
                client.contact_email
                    ? ""
                    : "texte-vide"
            )
        );

        ligne.appendChild(
            creerCellule(
                client.contact_telephone,
                client.contact_telephone
                    ? ""
                    : "texte-vide"
            )
        );

        ligne.appendChild(
            creerCellule(
                client.adresse_siege,
                client.adresse_siege
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
                        client
                    )
            );

        const boutonSupprimer =
            creerBoutonAction(
                "Supprimer",
                "bouton-action bouton-supprimer",
                () =>
                    supprimerClient(
                        client,
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

        corpsTableauClients.appendChild(
            ligne
        );

    });

};

const filtrerClients = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    if (!recherche) {

        afficherClients(clients);

        return;

    }

    const resultat =
        clients.filter(
            (client) => {

                const contenu = [
                    client.nom,
                    client.type_client,
                    client.contact_email,
                    client.contact_telephone,
                    client.adresse_siege
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return contenu.includes(
                    recherche
                );

            }
        );

    afficherClients(resultat);

};

const afficherEtatChargement = () => {

    corpsTableauClients.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="etat-tableau"
            >
                <span
                    class="indicateur-chargement"
                ></span>
            </td>
        </tr>
    `;

};

const chargerClients = async () => {

    boutonActualiser.disabled = true;

    boutonActualiser.textContent =
        "Chargement...";

    afficherEtatChargement();

    try {

        const resultat =
            await ProRecup.requete(
                "/api/clients"
            );

        clients =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        filtrerClients();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauClients.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="etat-tableau"
                >
                    Impossible de charger les clients.
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

formulaireClient.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherErreurFormulaire();

        const donneesClient = {

            nom:
                obtenirValeur("nom"),

            type_client:
                obtenirValeur(
                    "type_client"
                ),

            contact_email:
                obtenirValeur(
                    "contact_email"
                ),

            contact_telephone:
                obtenirValeur(
                    "contact_telephone"
                ),

            adresse_siege:
                obtenirValeur(
                    "adresse_siege"
                )

        };

        if (!donneesClient.nom) {

            afficherErreurFormulaire(
                "Le nom du client est obligatoire."
            );

            return;

        }

        const modification =
            Boolean(
                clientEnModificationId
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
                    ? `/api/clients/${clientEnModificationId}`
                    : "/api/clients";

            const methode =
                modification
                    ? "PUT"
                    : "POST";

            await ProRecup.requete(
                chemin,
                {
                    method: methode,

                    body: JSON.stringify(
                        donneesClient
                    )
                }
            );

            fermerModale();

            ProRecup.afficherNotification(
                modification
                    ? "Client modifié avec succès."
                    : "Client créé avec succès.",
                "succes"
            );

            await chargerClients();

        } catch (erreur) {

            afficherErreurFormulaire(
                erreur.message
            );

        } finally {

            boutonEnregistrer.disabled =
                false;

            boutonEnregistrer.textContent =
                clientEnModificationId
                    ? "Enregistrer les modifications"
                    : "Enregistrer le client";

        }

    }
);

boutonNouveauClient.addEventListener(
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

fenetreClient
    .querySelector(".fond-modale")
    .addEventListener(
        "click",
        fermerModale
    );

boutonActualiser.addEventListener(
    "click",
    chargerClients
);

champRecherche.addEventListener(
    "input",
    filtrerClients
);

document.addEventListener(
    "keydown",
    (evenement) => {

        if (
            evenement.key === "Escape" &&
            !fenetreClient.classList
                .contains("cache")
        ) {

            fermerModale();

        }

    }
);

chargerClients();