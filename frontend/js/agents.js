if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonNouvelAgent =
    document.getElementById(
        "boutonNouvelAgent"
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

const fenetreAgent =
    document.getElementById(
        "fenetreAgent"
    );

const formulaireAgent =
    document.getElementById(
        "formulaireAgent"
    );

const titreModale =
    document.getElementById(
        "titreModale"
    );

const groupeUtilisateur =
    document.getElementById(
        "groupeUtilisateur"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const corpsTableauAgents =
    document.getElementById(
        "corpsTableauAgents"
    );

const nombreAgents =
    document.getElementById(
        "nombreAgents"
    );

const erreurFormulaire =
    document.getElementById(
        "erreurFormulaire"
    );

const champAgentId =
    document.getElementById(
        "agentId"
    );

const champUtilisateur =
    document.getElementById(
        "utilisateur_id"
    );

const champTelephone =
    document.getElementById(
        "telephone"
    );

const champPhoto =
    document.getElementById(
        "photo_url"
    );

const champDateEmbauche =
    document.getElementById(
        "date_embauche"
    );

const champDisponible =
    document.getElementById(
        "disponible"
    );

let agents = [];

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

const formaterDateSimple = (
    date
) => {

    if (!date) {
        return "Non renseignée";
    }

    const valeur =
        new Date(date);

    if (
        Number.isNaN(
            valeur.getTime()
        )
    ) {
        return date;
    }

    return valeur.toLocaleDateString(
        "fr-FR"
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

const creerEtiquette = (
    texte,
    classe
) => {

    const etiquette =
        document.createElement("span");

    etiquette.className =
        `etiquette ${classe}`;

    etiquette.textContent =
        texte;

    return etiquette;

};

const modifierStatutAgent = async (
    agent,
    statut
) => {

    try {

        await ProRecup.requete(
            `/api/agents/${agent.id}/statut`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    statut
                })
            }
        );

        ProRecup.afficherNotification(
            "Statut de l’agent modifié avec succès.",
            "succes"
        );

        await chargerAgents();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

    }

};

const creerBoutonAction = (
    texte,
    classe,
    action
) => {

    const bouton =
        document.createElement("button");

    bouton.type = "button";

    bouton.className =
        `bouton-action ${classe}`;

    bouton.textContent =
        texte;

    bouton.addEventListener(
        "click",
        action
    );

    return bouton;

};

const afficherAgents = (
    listeAgents
) => {

    corpsTableauAgents.innerHTML = "";

    nombreAgents.textContent =
        listeAgents.length;

    if (listeAgents.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 6;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucun agent trouvé.";

        ligne.appendChild(cellule);

        corpsTableauAgents.appendChild(
            ligne
        );

        return;

    }

    listeAgents.forEach((agent) => {

        const ligne =
            document.createElement("tr");

        const celluleAgent =
            document.createElement("td");

        const nom =
            document.createElement("strong");

        nom.className =
            "nom-agent";

        nom.textContent =
            agent.nom || "Utilisateur";

        const email =
            document.createElement("span");

        email.className =
            "email-agent";

        email.textContent =
            agent.email || "";

        celluleAgent.appendChild(nom);
        celluleAgent.appendChild(email);

        ligne.appendChild(celluleAgent);

        ligne.appendChild(
            creerCellule(
                agent.telephone
            )
        );

        const celluleStatut =
            document.createElement("td");

        celluleStatut.appendChild(
            creerEtiquette(
                agent.statut,
                `statut-${agent.statut}`
            )
        );

        ligne.appendChild(celluleStatut);

        const celluleDisponibilite =
            document.createElement("td");

        celluleDisponibilite.appendChild(
            creerEtiquette(
                agent.disponible
                    ? "Disponible"
                    : "Indisponible",

                agent.disponible
                    ? "disponible"
                    : "indisponible"
            )
        );

        ligne.appendChild(
            celluleDisponibilite
        );

        ligne.appendChild(
            creerCellule(
                formaterDateSimple(
                    agent.date_embauche
                )
            )
        );

        const celluleActions =
            document.createElement("td");

        celluleActions.className =
            "actions-ligne";

        celluleActions.appendChild(
            creerBoutonAction(
                "Modifier",
                "modifier",
                () => ouvrirModification(
                    agent
                )
            )
        );

        if (agent.statut === "actif") {

            celluleActions.appendChild(
                creerBoutonAction(
                    "Suspendre",
                    "suspendre",
                    () =>
                        modifierStatutAgent(
                            agent,
                            "suspendu"
                        )
                )
            );

        } else {

            celluleActions.appendChild(
                creerBoutonAction(
                    "Réactiver",
                    "reactiver",
                    () =>
                        modifierStatutAgent(
                            agent,
                            "actif"
                        )
                )
            );

        }

        ligne.appendChild(
            celluleActions
        );

        corpsTableauAgents.appendChild(
            ligne
        );

    });

};

const filtrerAgents = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    if (!recherche) {

        afficherAgents(agents);

        return;

    }

    const resultat =
        agents.filter((agent) => {

            const contenu = [
                agent.nom,
                agent.email,
                agent.telephone,
                agent.statut,
                agent.disponible
                    ? "disponible"
                    : "indisponible"
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return contenu.includes(
                recherche
            );

        });

    afficherAgents(resultat);

};

const afficherChargement = () => {

    corpsTableauAgents.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="etat-tableau"
            >
                Chargement des agents...
            </td>
        </tr>
    `;

};

const chargerAgents = async () => {

    boutonActualiser.disabled = true;

    boutonActualiser.textContent =
        "Chargement...";

    afficherChargement();

    try {

        const resultat =
            await ProRecup.requete(
                "/api/agents"
            );

        agents =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        filtrerAgents();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauAgents.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="etat-tableau"
                >
                    Impossible de charger les agents.
                </td>
            </tr>
        `;

    } finally {

        boutonActualiser.disabled = false;

        boutonActualiser.textContent =
            "Actualiser";

    }

};

const chargerUtilisateursDisponibles =
    async () => {

        champUtilisateur.innerHTML = `
            <option value="">
                Sélectionner un utilisateur
            </option>
        `;

        const resultat =
            await ProRecup.requete(
                "/api/agents/utilisateurs-disponibles"
            );

        const utilisateurs =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        utilisateurs.forEach(
            (utilisateur) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    utilisateur.id;

                option.textContent =
                    `${utilisateur.nom} — ${utilisateur.email}`;

                champUtilisateur
                    .appendChild(option);

            }
        );

    };

const ouvrirCreation = async () => {

    formulaireAgent.reset();

    champAgentId.value = "";

    champDisponible.checked = true;

    titreModale.textContent =
        "Nouvel agent";

    groupeUtilisateur.classList.remove(
        "cache"
    );

    cacherErreurFormulaire();

    try {

        await chargerUtilisateursDisponibles();

    } catch (erreur) {

        afficherErreurFormulaire(
            erreur.message
        );

    }

    fenetreAgent.classList.remove(
        "cache"
    );

    fenetreAgent.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

};

const ouvrirModification = (
    agent
) => {

    formulaireAgent.reset();

    champAgentId.value =
        agent.id;

    champTelephone.value =
        agent.telephone || "";

    champPhoto.value =
        agent.photo_url || "";

    champDateEmbauche.value =
        agent.date_embauche
            ? String(
                agent.date_embauche
            ).slice(0, 10)
            : "";

    champDisponible.checked =
        Boolean(agent.disponible);

    titreModale.textContent =
        "Modifier l’agent";

    groupeUtilisateur.classList.add(
        "cache"
    );

    cacherErreurFormulaire();

    fenetreAgent.classList.remove(
        "cache"
    );

    fenetreAgent.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

};

const fermerModale = () => {

    fenetreAgent.classList.add(
        "cache"
    );

    fenetreAgent.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

    cacherErreurFormulaire();

};

formulaireAgent.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherErreurFormulaire();

        const agentId =
            champAgentId.value;

        const donnees = {

            telephone:
                champTelephone.value
                    .trim(),

            photo_url:
                champPhoto.value
                    .trim(),

            disponible:
                champDisponible.checked,

            date_embauche:
                champDateEmbauche.value ||
                null

        };

        let chemin =
            "/api/agents";

        let methode =
            "POST";

        if (!agentId) {

            if (!champUtilisateur.value) {

                afficherErreurFormulaire(
                    "Veuillez sélectionner un utilisateur."
                );

                return;

            }

            donnees.utilisateur_id =
                champUtilisateur.value;

            donnees.statut =
                "actif";

        } else {

            chemin =
                `/api/agents/${agentId}`;

            methode =
                "PUT";

        }

        boutonEnregistrer.disabled =
            true;

        boutonEnregistrer.textContent =
            "Enregistrement...";

        try {

            await ProRecup.requete(
                chemin,
                {
                    method:
                        methode,

                    body:
                        JSON.stringify(
                            donnees
                        )
                }
            );

            fermerModale();

            ProRecup.afficherNotification(
                agentId
                    ? "Agent modifié avec succès."
                    : "Agent créé avec succès.",
                "succes"
            );

            await chargerAgents();

        } catch (erreur) {

            afficherErreurFormulaire(
                erreur.message
            );

        } finally {

            boutonEnregistrer.disabled =
                false;

            boutonEnregistrer.textContent =
                "Enregistrer l’agent";

        }

    }
);

boutonNouvelAgent.addEventListener(
    "click",
    ouvrirCreation
);

boutonActualiser.addEventListener(
    "click",
    chargerAgents
);

boutonFermerModale.addEventListener(
    "click",
    fermerModale
);

boutonAnnuler.addEventListener(
    "click",
    fermerModale
);

fenetreAgent
    .querySelector(".fond-modale")
    .addEventListener(
        "click",
        fermerModale
    );

champRecherche.addEventListener(
    "input",
    filtrerAgents
);

document.addEventListener(
    "keydown",
    (evenement) => {

        if (
            evenement.key === "Escape" &&
            !fenetreAgent.classList
                .contains("cache")
        ) {

            fermerModale();

        }

    }
);

chargerAgents();