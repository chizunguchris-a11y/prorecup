if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonNouveauTricycle =
    document.getElementById(
        "boutonNouveauTricycle"
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

const fenetreTricycle =
    document.getElementById(
        "fenetreTricycle"
    );

const formulaireTricycle =
    document.getElementById(
        "formulaireTricycle"
    );

const titreModale =
    document.getElementById(
        "titreModale"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const filtreStatut =
    document.getElementById(
        "filtreStatut"
    );

const corpsTableauTricycles =
    document.getElementById(
        "corpsTableauTricycles"
    );

const nombreTricycles =
    document.getElementById(
        "nombreTricycles"
    );

const nombreDisponibles =
    document.getElementById(
        "nombreDisponibles"
    );

const nombreIndisponibles =
    document.getElementById(
        "nombreIndisponibles"
    );

const erreurFormulaire =
    document.getElementById(
        "erreurFormulaire"
    );

let tricycles = [];

const champ = (id) =>
    document.getElementById(id);

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

const formaterStatut = (
    statut
) => {

    const libelles = {

        disponible:
            "Disponible",

        en_mission:
            "En mission",

        en_panne:
            "En panne",

        maintenance:
            "Maintenance",

        hors_service:
            "Hors service"

    };

    return libelles[statut] ||
        statut ||
        "Non renseigné";

};

const creerEtiquette = (
    texte,
    classe
) => {

    const element =
        document.createElement("span");

    element.className =
        `etiquette ${classe}`;

    element.textContent =
        texte;

    return element;

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

const mettreAJourResume = () => {

    nombreTricycles.textContent =
        tricycles.length;

    const disponibles =
        tricycles.filter(
            (tricycle) =>
                tricycle.statut ===
                "disponible"
        ).length;

    nombreDisponibles.textContent =
        disponibles;

    nombreIndisponibles.textContent =
        tricycles.length -
        disponibles;

};

const modifierStatut = async (
    tricycle,
    statut
) => {

    try {

        await ProRecup.requete(
            `/api/tricycles/${tricycle.id}/statut`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    statut
                })
            }
        );

        ProRecup.afficherNotification(
            "Statut du tricycle modifié avec succès.",
            "succes"
        );

        await chargerTricycles();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

    }

};

const afficherTricycles = (
    liste
) => {

    corpsTableauTricycles.innerHTML = "";

    if (liste.length === 0) {

        corpsTableauTricycles.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="etat-tableau"
                >
                    Aucun tricycle trouvé.
                </td>
            </tr>
        `;

        return;

    }

    liste.forEach((tricycle) => {

        const ligne =
            document.createElement("tr");

        const celluleNumero =
            document.createElement("td");

        const numero =
            document.createElement("strong");

        numero.className =
            "numero-tricycle";

        numero.textContent =
            tricycle.numero_interne;

        celluleNumero.appendChild(
            numero
        );

        ligne.appendChild(
            celluleNumero
        );

        const cellulePlaque =
            document.createElement("td");

        cellulePlaque.textContent =
            tricycle.plaque_identification ||
            "Non renseignée";

        ligne.appendChild(
            cellulePlaque
        );

        const celluleModele =
            document.createElement("td");

        celluleModele.innerHTML = `
            <strong>
                ${tricycle.marque || "Non renseignée"}
            </strong>
            <span class="texte-secondaire">
                ${tricycle.modele || ""}
            </span>
        `;

        ligne.appendChild(
            celluleModele
        );

        const celluleCapacite =
            document.createElement("td");

        celluleCapacite.textContent =
            `${ProRecup.formaterNombre(
                tricycle.capacite_kg
            )} kg`;

        ligne.appendChild(
            celluleCapacite
        );

        const celluleEtat =
            document.createElement("td");

        celluleEtat.appendChild(
            creerEtiquette(
                tricycle.etat,
                `etat-${tricycle.etat}`
            )
        );

        ligne.appendChild(
            celluleEtat
        );

        const celluleStatut =
            document.createElement("td");

        celluleStatut.appendChild(
            creerEtiquette(
                formaterStatut(
                    tricycle.statut
                ),
                `statut-${tricycle.statut}`
            )
        );

        ligne.appendChild(
            celluleStatut
        );

        const celluleActions =
            document.createElement("td");

        celluleActions.className =
            "actions-ligne";

        celluleActions.appendChild(
            creerBoutonAction(
                "Modifier",
                "modifier",
                () =>
                    ouvrirModification(
                        tricycle
                    )
            )
        );

        if (
            tricycle.statut ===
            "disponible"
        ) {

            celluleActions.appendChild(
                creerBoutonAction(
                    "Maintenance",
                    "maintenance",
                    () =>
                        modifierStatut(
                            tricycle,
                            "maintenance"
                        )
                )
            );

        } else if (
            tricycle.statut !==
            "en_mission"
        ) {

            celluleActions.appendChild(
                creerBoutonAction(
                    "Disponible",
                    "disponible",
                    () =>
                        modifierStatut(
                            tricycle,
                            "disponible"
                        )
                )
            );

        }

        ligne.appendChild(
            celluleActions
        );

        corpsTableauTricycles.appendChild(
            ligne
        );

    });

};

const filtrerTricycles = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    const statut =
        filtreStatut.value;

    const resultat =
        tricycles.filter(
            (tricycle) => {

                const contenu = [
                    tricycle.numero_interne,
                    tricycle.plaque_identification,
                    tricycle.marque,
                    tricycle.modele,
                    tricycle.statut,
                    tricycle.etat
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
                    tricycle.statut ===
                    statut;

                return (
                    correspondRecherche &&
                    correspondStatut
                );

            }
        );

    afficherTricycles(
        resultat
    );

};

const chargerTricycles = async () => {

    boutonActualiser.disabled = true;

    boutonActualiser.textContent =
        "Chargement...";

    corpsTableauTricycles.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="etat-tableau"
            >
                Chargement des tricycles...
            </td>
        </tr>
    `;

    try {

        const resultat =
            await ProRecup.requete(
                "/api/tricycles"
            );

        tricycles =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        mettreAJourResume();
        filtrerTricycles();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauTricycles.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="etat-tableau"
                >
                    Impossible de charger les tricycles.
                </td>
            </tr>
        `;

    } finally {

        boutonActualiser.disabled = false;

        boutonActualiser.textContent =
            "Actualiser";

    }

};

const ouvrirCreation = () => {

    formulaireTricycle.reset();

    champ("tricycleId").value = "";

    champ("etat").value =
        "bon";

    titreModale.textContent =
        "Nouveau tricycle";

    cacherErreurFormulaire();

    fenetreTricycle.classList.remove(
        "cache"
    );

    fenetreTricycle.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

};

const ouvrirModification = (
    tricycle
) => {

    formulaireTricycle.reset();

    champ("tricycleId").value =
        tricycle.id;

    champ("numero_interne").value =
        tricycle.numero_interne || "";

    champ("plaque_identification").value =
        tricycle.plaque_identification || "";

    champ("marque").value =
        tricycle.marque || "";

    champ("modele").value =
        tricycle.modele || "";

    champ("capacite_kg").value =
        tricycle.capacite_kg || "";

    champ("etat").value =
        tricycle.etat || "bon";

    champ("date_mise_en_service").value =
        tricycle.date_mise_en_service
            ? String(
                tricycle.date_mise_en_service
            ).slice(0, 10)
            : "";

    champ("observations").value =
        tricycle.observations || "";

    titreModale.textContent =
        "Modifier le tricycle";

    cacherErreurFormulaire();

    fenetreTricycle.classList.remove(
        "cache"
    );

    fenetreTricycle.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

};

const fermerModale = () => {

    fenetreTricycle.classList.add(
        "cache"
    );

    fenetreTricycle.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

    cacherErreurFormulaire();

};

formulaireTricycle.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherErreurFormulaire();

        const tricycleId =
            champ("tricycleId").value;

        const donnees = {

            numero_interne:
                champ("numero_interne")
                    .value
                    .trim(),

            plaque_identification:
                champ(
                    "plaque_identification"
                )
                    .value
                    .trim(),

            marque:
                champ("marque")
                    .value
                    .trim(),

            modele:
                champ("modele")
                    .value
                    .trim(),

            capacite_kg:
                Number(
                    champ("capacite_kg")
                        .value
                ),

            etat:
                champ("etat").value,

            date_mise_en_service:
                champ(
                    "date_mise_en_service"
                ).value || null,

            observations:
                champ("observations")
                    .value
                    .trim()

        };

        if (!donnees.numero_interne) {

            afficherErreurFormulaire(
                "Le numéro interne est obligatoire."
            );

            return;

        }

        if (
            !donnees.capacite_kg ||
            donnees.capacite_kg <= 0
        ) {

            afficherErreurFormulaire(
                "La capacité doit être supérieure à zéro."
            );

            return;

        }

        let chemin =
            "/api/tricycles";

        let methode =
            "POST";

        if (tricycleId) {

            chemin =
                `/api/tricycles/${tricycleId}`;

            methode =
                "PUT";

        } else {

            donnees.statut =
                "disponible";

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
                tricycleId
                    ? "Tricycle modifié avec succès."
                    : "Tricycle créé avec succès.",
                "succes"
            );

            await chargerTricycles();

        } catch (erreur) {

            afficherErreurFormulaire(
                erreur.message
            );

        } finally {

            boutonEnregistrer.disabled =
                false;

            boutonEnregistrer.textContent =
                "Enregistrer";

        }

    }
);

boutonNouveauTricycle.addEventListener(
    "click",
    ouvrirCreation
);

boutonActualiser.addEventListener(
    "click",
    chargerTricycles
);

boutonFermerModale.addEventListener(
    "click",
    fermerModale
);

boutonAnnuler.addEventListener(
    "click",
    fermerModale
);

champRecherche.addEventListener(
    "input",
    filtrerTricycles
);

filtreStatut.addEventListener(
    "change",
    filtrerTricycles
);

fenetreTricycle
    .querySelector(".fond-modale")
    .addEventListener(
        "click",
        fermerModale
    );

document.addEventListener(
    "keydown",
    (evenement) => {

        if (
            evenement.key === "Escape" &&
            !fenetreTricycle.classList
                .contains("cache")
        ) {

            fermerModale();

        }

    }
);

chargerTricycles();