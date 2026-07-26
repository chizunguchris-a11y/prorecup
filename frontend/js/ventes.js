


if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonNouvelleVente =
    document.getElementById(
        "boutonNouvelleVente"
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

const fenetreVente =
    document.getElementById(
        "fenetreVente"
    );

const formulaireVente =
    document.getElementById(
        "formulaireVente"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const filtreStatut =
    document.getElementById(
        "filtreStatut"
    );

const corpsTableauVentes =
    document.getElementById(
        "corpsTableauVentes"
    );

const nombreVentes =
    document.getElementById(
        "nombreVentes"
    );

const chiffreAffaires =
    document.getElementById(
        "chiffreAffaires"
    );

const quantiteVendue =
    document.getElementById(
        "quantiteVendue"
    );

const impactCarbone =
    document.getElementById(
        "impactCarbone"
    );

const erreurFormulaire =
    document.getElementById(
        "erreurFormulaire"
    );

const selectStock =
    document.getElementById(
        "stock_id"
    );

const champQuantite =
    document.getElementById(
        "quantite"
    );

const champPrixUnitaire =
    document.getElementById(
        "prix_unitaire"
    );

const champAcheteur =
    document.getElementById(
        "acheteur_nom"
    );

const champReference =
    document.getElementById(
        "reference_vente"
    );

const champMontantEstime =
    document.getElementById(
        "montant_estime"
    );

const informationStock =
    document.getElementById(
        "informationStock"
    );

let ventes = [];
let stocks = [];

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

    const statuts = {

        confirmee:
            "Confirmée",

        annulee:
            "Annulée"

    };

    return statuts[statut] ||
        statut ||
        "Non renseigné";

};

const formaterMontant = (
    valeur
) => {

    return Number(
        valeur || 0
    ).toLocaleString(
        "fr-FR",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );

};

const mettreAJourCompteurs = () => {

    nombreVentes.textContent =
        ventes.length;

    const ventesConfirmees =
        ventes.filter(
            (vente) =>
                vente.statut !==
                "annulee"
        );

    const totalMontant =
        ventesConfirmees.reduce(
            (somme, vente) =>
                somme +
                Number(
                    vente.montant_total ||
                    0
                ),
            0
        );

    const totalQuantite =
        ventesConfirmees.reduce(
            (somme, vente) =>
                somme +
                Number(
                    vente.quantite ||
                    0
                ),
            0
        );

    const totalCarbone =
        ventesConfirmees.reduce(
            (somme, vente) =>
                somme +
                Number(
                    vente.co2e_estime_kg ||
                    0
                ),
            0
        );

    chiffreAffaires.textContent =
        formaterMontant(
            totalMontant
        );

    quantiteVendue.textContent =
        `${ProRecup.formaterNombre(
            totalQuantite
        )} kg`;

    impactCarbone.textContent =
        `${ProRecup.formaterNombre(
            totalCarbone
        )} kg CO₂e`;

};

const creerCellule = (
    contenu,
    classe = ""
) => {

    const cellule =
        document.createElement("td");

    cellule.textContent =
        contenu ||
        "Non renseigné";

    if (classe) {

        cellule.className =
            classe;

    }

    return cellule;

};

const afficherVentes = (
    listeVentes
) => {

    corpsTableauVentes.innerHTML = "";

    if (listeVentes.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 10;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucune vente trouvée.";

        ligne.appendChild(cellule);

        corpsTableauVentes.appendChild(
            ligne
        );

        return;

    }

    listeVentes.forEach((vente) => {

        const ligne =
            document.createElement("tr");

        ligne.appendChild(
            creerCellule(
                vente.reference_vente ||
                "Sans référence",
                vente.reference_vente
                    ? "reference-vente"
                    : ""
            )
        );

        ligne.appendChild(
            creerCellule(
                vente.acheteur_nom,
                "nom-principal"
            )
        );

        ligne.appendChild(
            creerCellule(
                vente.type_dechet
            )
        );

        ligne.appendChild(
            creerCellule(
                `${ProRecup.formaterNombre(
                    vente.quantite
                )} ${vente.unite || "kg"}`
            )
        );

        ligne.appendChild(
            creerCellule(
                formaterMontant(
                    vente.prix_unitaire
                )
            )
        );

        ligne.appendChild(
            creerCellule(
                formaterMontant(
                    vente.montant_total
                ),
                "montant-vente"
            )
        );

        ligne.appendChild(
            creerCellule(
                vente.co2e_estime_kg !==
                null &&
                vente.co2e_estime_kg !==
                undefined
                    ? `${ProRecup.formaterNombre(
                        vente.co2e_estime_kg
                    )} kg`
                    : "Non calculé",
                "impact-vente"
            )
        );

        ligne.appendChild(
            creerCellule(
                vente.cree_par_nom
            )
        );

        ligne.appendChild(
            creerCellule(
                ProRecup.formaterDate(
                    vente.date_vente
                )
            )
        );

        const celluleStatut =
            document.createElement("td");

        const badge =
            document.createElement("span");

        badge.className =
            vente.statut === "annulee"
                ? "badge-statut statut-annulee"
                : "badge-statut statut-confirmee";

        badge.textContent =
            formaterStatut(
                vente.statut
            );

        celluleStatut.appendChild(
            badge
        );

        ligne.appendChild(
            celluleStatut
        );

        corpsTableauVentes.appendChild(
            ligne
        );

    });

};

const filtrerVentes = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    const statut =
        filtreStatut.value;

    const resultat =
        ventes.filter((vente) => {

            const contenu = [
                vente.reference_vente,
                vente.acheteur_nom,
                vente.type_dechet,
                vente.cree_par_nom,
                vente.statut,
                vente.quantite,
                vente.montant_total
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
                vente.statut ===
                    statut;

            return (
                correspondRecherche &&
                correspondStatut
            );

        });

    afficherVentes(resultat);

};

const afficherChargement = () => {

    corpsTableauVentes.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="etat-tableau"
            >
                <span
                    class="indicateur-chargement"
                ></span>
            </td>
        </tr>
    `;

};

const chargerVentes = async () => {

    boutonActualiser.disabled = true;

    boutonActualiser.textContent =
        "Chargement...";

    afficherChargement();

    try {

        const resultat =
            await ProRecup.requete(
                "/api/ventes"
            );

        ventes =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        mettreAJourCompteurs();
        filtrerVentes();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauVentes.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="etat-tableau"
                >
                    Impossible de charger les ventes.
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

const remplirStocks = () => {

    selectStock.innerHTML = "";

    const optionDefaut =
        document.createElement(
            "option"
        );

    optionDefaut.value = "";

    optionDefaut.textContent =
        stocks.length > 0
            ? "Sélectionnez un stock"
            : "Aucun stock disponible";

    selectStock.appendChild(
        optionDefaut
    );

    stocks.forEach((stock) => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            stock.id;

        option.textContent =
            `${stock.type_dechet} — ${ProRecup.formaterNombre(
                stock.quantite
            )} ${stock.unite || "kg"} disponible(s)`;

        selectStock.appendChild(
            option
        );

    });

    selectStock.disabled =
        stocks.length === 0;

    boutonEnregistrer.disabled =
        stocks.length === 0;

};

const chargerStocksDisponibles =
    async () => {

        const resultat =
            await ProRecup.requete(
                "/api/stocks"
            );

        const tousLesStocks =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        stocks =
            tousLesStocks.filter(
                (stock) =>
                    Number(
                        stock.quantite
                    ) > 0
            );

        remplirStocks();

    };

const obtenirStockSelectionne =
    () => {

        return stocks.find(
            (stock) =>
                stock.id ===
                selectStock.value
        );

    };

const actualiserInformationStock =
    () => {

        const stock =
            obtenirStockSelectionne();

        if (!stock) {

            informationStock.textContent =
                "Sélectionnez une matière disponible.";

            champQuantite.removeAttribute(
                "max"
            );

            return;

        }

        const disponible =
            Number(stock.quantite);

        informationStock.textContent =
            `Quantité disponible : ${ProRecup.formaterNombre(
                disponible
            )} ${stock.unite || "kg"}.`;

        champQuantite.max =
            String(disponible);

    };

const calculerMontant = () => {

    const quantite =
        Number(
            champQuantite.value ||
            0
        );

    const prixUnitaire =
        Number(
            champPrixUnitaire.value ||
            0
        );

    const montant =
        quantite *
        prixUnitaire;

    champMontantEstime.value =
        formaterMontant(
            montant
        );

};

const ouvrirModale = async () => {

    formulaireVente.reset();

    cacherErreurFormulaire();

    champMontantEstime.value =
        "0";

    informationStock.textContent =
        "Chargement des stocks...";

    boutonNouvelleVente.disabled =
        true;

    boutonNouvelleVente.textContent =
        "Chargement...";

    try {

        await chargerStocksDisponibles();

        fenetreVente.classList.remove(
            "cache"
        );

        fenetreVente.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

        if (stocks.length === 0) {

            afficherErreurFormulaire(
                "Aucun stock disponible pour enregistrer une vente."
            );

            informationStock.textContent =
                "Le stock disponible est vide.";

        } else {

            informationStock.textContent =
                "Sélectionnez une matière disponible.";

        }

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

    } finally {

        boutonNouvelleVente.disabled =
            false;

        boutonNouvelleVente.textContent =
            "Nouvelle vente";

    }

};

const fermerModale = () => {

    fenetreVente.classList.add(
        "cache"
    );

    fenetreVente.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

    cacherErreurFormulaire();

};

formulaireVente.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherErreurFormulaire();

        const stock =
            obtenirStockSelectionne();

        const quantite =
            Number(
                champQuantite.value
            );

        const prixUnitaire =
            Number(
                champPrixUnitaire.value
            );

        const acheteur =
            champAcheteur.value.trim();

        const reference =
            champReference.value.trim();

        if (!stock) {

            afficherErreurFormulaire(
                "Veuillez sélectionner un stock."
            );

            return;

        }

        if (
            !quantite ||
            quantite <= 0
        ) {

            afficherErreurFormulaire(
                "La quantité vendue doit être supérieure à zéro."
            );

            return;

        }

        if (
            quantite >
            Number(stock.quantite)
        ) {

            afficherErreurFormulaire(
                `Stock insuffisant. Quantité disponible : ${ProRecup.formaterNombre(
                    stock.quantite
                )} ${stock.unite || "kg"}.`
            );

            return;

        }

        if (
            Number.isNaN(
                prixUnitaire
            ) ||
            prixUnitaire < 0
        ) {

            afficherErreurFormulaire(
                "Le prix unitaire doit être supérieur ou égal à zéro."
            );

            return;

        }

        if (!acheteur) {

            afficherErreurFormulaire(
                "Le nom de l’acheteur est obligatoire."
            );

            return;

        }

        const donneesVente = {

            stock_id:
                stock.id,

            quantite,

            prix_unitaire:
                prixUnitaire,

            acheteur_nom:
                acheteur,

            reference_vente:
                reference

        };

        boutonEnregistrer.disabled =
            true;

        boutonEnregistrer.textContent =
            "Enregistrement...";

        try {

            await ProRecup.requete(
                "/api/ventes",
                {
                    method: "POST",

                    body: JSON.stringify(
                        donneesVente
                    )
                }
            );

            fermerModale();

            ProRecup.afficherNotification(
                "Vente enregistrée, stock diminué et impact carbone calculé.",
                "succes"
            );

            await chargerVentes();

        } catch (erreur) {

            afficherErreurFormulaire(
                erreur.message
            );

        } finally {

            boutonEnregistrer.disabled =
                false;

            boutonEnregistrer.textContent =
                "Enregistrer la vente";

        }

    }
);

selectStock.addEventListener(
    "change",
    actualiserInformationStock
);

champQuantite.addEventListener(
    "input",
    calculerMontant
);

champPrixUnitaire.addEventListener(
    "input",
    calculerMontant
);

boutonNouvelleVente.addEventListener(
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

fenetreVente
    .querySelector(".fond-modale")
    .addEventListener(
        "click",
        fermerModale
    );

boutonActualiser.addEventListener(
    "click",
    chargerVentes
);

champRecherche.addEventListener(
    "input",
    filtrerVentes
);

filtreStatut.addEventListener(
    "change",
    filtrerVentes
);

document.addEventListener(
    "keydown",
    (evenement) => {

        if (
            evenement.key === "Escape" &&
            !fenetreVente.classList.contains(
                "cache"
            )
        ) {

            fermerModale();

        }

    }
);

chargerVentes();

