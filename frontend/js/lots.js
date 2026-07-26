

if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonNouveauLot =
    document.getElementById(
        "boutonNouveauLot"
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

const fenetreLot =
    document.getElementById(
        "fenetreLot"
    );

const formulaireLot =
    document.getElementById(
        "formulaireLot"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const filtreStatut =
    document.getElementById(
        "filtreStatut"
    );

const corpsTableauLots =
    document.getElementById(
        "corpsTableauLots"
    );

const nombreLots =
    document.getElementById(
        "nombreLots"
    );

const nombreEnStock =
    document.getElementById(
        "nombreEnStock"
    );

const poidsTotal =
    document.getElementById(
        "poidsTotal"
    );

const erreurFormulaire =
    document.getElementById(
        "erreurFormulaire"
    );

const selectCollecte =
    document.getElementById(
        "collecte_id"
    );

const typeDechetAffiche =
    document.getElementById(
        "type_dechet_affiche"
    );

const poidsEstimeAffiche =
    document.getElementById(
        "poids_estime_affiche"
    );

const champPoidsReel =
    document.getElementById(
        "poids_reel"
    );

const selectStatutLot =
    document.getElementById(
        "statut_lot"
    );

let lots = [];
let collectesDisponibles = [];

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

const formaterStatutLot = (
    statut
) => {

    const statuts = {

        en_stock:
            "En stock",

        vendu:
            "Vendu",

        transforme:
            "Transformé"

    };

    return statuts[statut] ||
        statut ||
        "Non renseigné";

};

const classeStatutLot = (
    statut
) => {

    const classes = {

        en_stock:
            "statut-stock",

        vendu:
            "statut-vendu",

        transforme:
            "statut-transforme"

    };

    return classes[statut] ||
        "statut-stock";

};

const mettreAJourCompteurs = () => {

    nombreLots.textContent =
        lots.length;

    nombreEnStock.textContent =
        lots.filter(
            (lot) =>
                lot.statut_lot ===
                "en_stock"
        ).length;

    const total =
        lots.reduce(
            (somme, lot) =>
                somme +
                Number(
                    lot.poids_reel || 0
                ),
            0
        );

    poidsTotal.textContent =
        `${ProRecup.formaterNombre(total)} kg`;

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

        cellule.className =
            classe;

    }

    return cellule;

};

const afficherLots = (
    listeLots
) => {

    corpsTableauLots.innerHTML = "";

    if (listeLots.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 6;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucun lot trouvé.";

        ligne.appendChild(cellule);

        corpsTableauLots.appendChild(
            ligne
        );

        return;

    }

    listeLots.forEach((lot) => {

        const ligne =
            document.createElement("tr");

        ligne.appendChild(
            creerCellule(
                lot.client_nom,
                "nom-principal"
            )
        );

        ligne.appendChild(
            creerCellule(
                lot.site_nom
            )
        );

        ligne.appendChild(
            creerCellule(
                lot.type_dechet
            )
        );

        ligne.appendChild(
            creerCellule(
                `${ProRecup.formaterNombre(
                    lot.poids_reel
                )} kg`
            )
        );

        const celluleStatut =
            document.createElement("td");

        const badgeStatut =
            document.createElement("span");

        badgeStatut.className =
            `badge-statut ${
                classeStatutLot(
                    lot.statut_lot
                )
            }`;

        badgeStatut.textContent =
            formaterStatutLot(
                lot.statut_lot
            );

        celluleStatut.appendChild(
            badgeStatut
        );

        ligne.appendChild(
            celluleStatut
        );

        const celluleCollecte =
            document.createElement("td");

        const badgeCollecte =
            document.createElement("span");

        badgeCollecte.className =
            "badge-collecte";

        badgeCollecte.textContent =
            lot.statut_collecte ===
            "valide"
                ? "Collecte validée"
                : lot.statut_collecte;

        celluleCollecte.appendChild(
            badgeCollecte
        );

        ligne.appendChild(
            celluleCollecte
        );

        corpsTableauLots.appendChild(
            ligne
        );

    });

};

const filtrerLots = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    const statut =
        filtreStatut.value;

    const resultat =
        lots.filter((lot) => {

            const contenu = [
                lot.client_nom,
                lot.site_nom,
                lot.type_dechet,
                lot.statut_lot,
                lot.statut_collecte,
                lot.poids_reel
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
                lot.statut_lot ===
                    statut;

            return (
                correspondRecherche &&
                correspondStatut
            );

        });

    afficherLots(resultat);

};

const afficherEtatChargement = () => {

    corpsTableauLots.innerHTML = `
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

const chargerLots = async () => {

    boutonActualiser.disabled = true;

    boutonActualiser.textContent =
        "Chargement...";

    afficherEtatChargement();

    try {

        const resultat =
            await ProRecup.requete(
                "/api/lots"
            );

        lots =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        mettreAJourCompteurs();
        filtrerLots();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauLots.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="etat-tableau"
                >
                    Impossible de charger les lots.
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

const remplirCollectesDisponibles =
    (collectes) => {

        selectCollecte.innerHTML = "";

        const optionDefaut =
            document.createElement(
                "option"
            );

        optionDefaut.value = "";

        optionDefaut.textContent =
            collectes.length > 0
                ? "Sélectionnez une collecte"
                : "Aucune collecte disponible";

        selectCollecte.appendChild(
            optionDefaut
        );

        collectes.forEach(
            (collecte) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    collecte.id;

                option.textContent =
                    `${collecte.client_nom} — ${collecte.site_nom} — ${collecte.type_dechet} — ${ProRecup.formaterNombre(
                        collecte.poids_estime
                    )} kg`;

                selectCollecte.appendChild(
                    option
                );

            }
        );

        selectCollecte.disabled =
            collectes.length === 0;

        boutonEnregistrer.disabled =
            collectes.length === 0;

    };

const chargerCollectesDisponibles =
    async () => {

        const resultat =
            await ProRecup.requete(
                "/api/collectes"
            );

        const toutesLesCollectes =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        const collecteIdsAvecLot =
            lots.map(
                (lot) =>
                    lot.collecte_id
            );

        collectesDisponibles =
            toutesLesCollectes.filter(
                (collecte) => {

                    return (
                        collecte.statut ===
                            "valide" &&
                        !collecteIdsAvecLot.includes(
                            collecte.id
                        )
                    );

                }
            );

        remplirCollectesDisponibles(
            collectesDisponibles
        );

};

const actualiserInformationsCollecte =
    () => {

        const collecte =
            collectesDisponibles.find(
                (element) =>
                    element.id ===
                    selectCollecte.value
            );

        if (!collecte) {

            typeDechetAffiche.value = "";

            poidsEstimeAffiche.value = "";

            champPoidsReel.value = "";

            return;

        }

        typeDechetAffiche.value =
            collecte.type_dechet ||
            "Non renseigné";

        poidsEstimeAffiche.value =
            `${ProRecup.formaterNombre(
                collecte.poids_estime
            )} kg`;

        champPoidsReel.value =
            Number(
                collecte.poids_estime || 0
            );

    };

const ouvrirModale = async () => {

    formulaireLot.reset();

    cacherErreurFormulaire();

    typeDechetAffiche.value = "";

    poidsEstimeAffiche.value = "";

    boutonNouveauLot.disabled =
        true;

    boutonNouveauLot.textContent =
        "Chargement...";

    try {

        await chargerCollectesDisponibles();

        fenetreLot.classList.remove(
            "cache"
        );

        fenetreLot.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

        if (
            collectesDisponibles.length === 0
        ) {

            afficherErreurFormulaire(
                "Aucune collecte validée sans lot n'est disponible."
            );

        }

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

    } finally {

        boutonNouveauLot.disabled =
            false;

        boutonNouveauLot.textContent =
            "Nouveau lot";

    }

};

const fermerModale = () => {

    fenetreLot.classList.add(
        "cache"
    );

    fenetreLot.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";

    cacherErreurFormulaire();

};

formulaireLot.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherErreurFormulaire();

        const collecte =
            collectesDisponibles.find(
                (element) =>
                    element.id ===
                    selectCollecte.value
            );

        const poidsReel =
            Number(
                champPoidsReel.value
            );

        if (!collecte) {

            afficherErreurFormulaire(
                "Veuillez sélectionner une collecte valide."
            );

            return;

        }

        if (
            !poidsReel ||
            poidsReel <= 0
        ) {

            afficherErreurFormulaire(
                "Le poids réel doit être supérieur à zéro."
            );

            return;

        }

        const donneesLot = {

            collecte_id:
                collecte.id,

            type_dechet_id:
                collecte.type_dechet_id,

            poids_reel:
                poidsReel,

            statut_lot:
                selectStatutLot.value ||
                "en_stock"

        };

        boutonEnregistrer.disabled =
            true;

        boutonEnregistrer.textContent =
            "Création...";

        try {

            await ProRecup.requete(
                "/api/lots",
                {
                    method: "POST",

                    body: JSON.stringify(
                        donneesLot
                    )
                }
            );

            fermerModale();

            ProRecup.afficherNotification(
                "Lot créé et stock mis à jour avec succès.",
                "succes"
            );

            await chargerLots();

        } catch (erreur) {

            afficherErreurFormulaire(
                erreur.message
            );

        } finally {

            boutonEnregistrer.disabled =
                false;

            boutonEnregistrer.textContent =
                "Créer le lot";

        }

    }
);

selectCollecte.addEventListener(
    "change",
    actualiserInformationsCollecte
);

boutonNouveauLot.addEventListener(
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

fenetreLot
    .querySelector(".fond-modale")
    .addEventListener(
        "click",
        fermerModale
    );

boutonActualiser.addEventListener(
    "click",
    chargerLots
);

champRecherche.addEventListener(
    "input",
    filtrerLots
);

filtreStatut.addEventListener(
    "change",
    filtrerLots
);

document.addEventListener(
    "keydown",
    (evenement) => {

        if (
            evenement.key === "Escape" &&
            !fenetreLot.classList.contains(
                "cache"
            )
        ) {

            fermerModale();

        }

    }
);

chargerLots();