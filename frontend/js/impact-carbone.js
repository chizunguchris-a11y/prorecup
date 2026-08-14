if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonActualiser =
    document.getElementById(
        "boutonActualiser"
    );

const boutonActualiserEntete =
    document.getElementById(
        "boutonActualiserEntete"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const filtreMatiere =
    document.getElementById(
        "filtreMatiere"
    );

const corpsTableauImpacts =
    document.getElementById(
        "corpsTableauImpacts"
    );

const listeRepartition =
    document.getElementById(
        "listeRepartition"
    );

const nombreImpacts =
    document.getElementById(
        "nombreImpacts"
    );

const co2eTotal =
    document.getElementById(
        "co2eTotal"
    );

const quantiteTotale =
    document.getElementById(
        "quantiteTotale"
    );

const facteurMoyen =
    document.getElementById(
        "facteurMoyen"
    );

let impacts = [];

const mettreAJourCompteurs = () => {

    nombreImpacts.textContent =
        impacts.length;

    const totalCo2 =
        impacts.reduce(
            (somme, impact) =>
                somme +
                Number(
                    impact.co2e_estime_kg ||
                    0
                ),
            0
        );

    const totalQuantite =
        impacts.reduce(
            (somme, impact) =>
                somme +
                Number(
                    impact.quantite_kg ||
                    0
                ),
            0
        );

    const moyenne =
    totalQuantite > 0
        ? totalCo2 /
            totalQuantite
        : 0;

    co2eTotal.textContent =
        `${ProRecup.formaterNombre(
            totalCo2
        )} kg`;

    quantiteTotale.textContent =
        `${ProRecup.formaterNombre(
            totalQuantite
        )} kg`;

    facteurMoyen.textContent =
        ProRecup.formaterNombre(
            moyenne,
            4
        );

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

const afficherImpacts = (
    listeImpacts
) => {

    corpsTableauImpacts.innerHTML =
        "";

    if (listeImpacts.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 10;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucun impact carbone trouvé.";

        ligne.appendChild(cellule);

        corpsTableauImpacts.appendChild(
            ligne
        );

        return;

    }

    listeImpacts.forEach(
        (impact) => {

            const ligne =
                document.createElement(
                    "tr"
                );

            ligne.appendChild(
                creerCellule(
                    impact.reference_vente ||
                    "Sans référence",
                    impact.reference_vente
                        ? "reference-impact"
                        : ""
                )
            );

            ligne.appendChild(
                creerCellule(
                    impact.acheteur_nom,
                    "nom-principal"
                )
            );

            ligne.appendChild(
                creerCellule(
                    impact.type_dechet
                )
            );

            ligne.appendChild(
                creerCellule(
                    `${ProRecup.formaterNombre(
                        impact.quantite_kg
                    )} ${impact.unite || "kg"}`
                )
            );

            ligne.appendChild(
                creerCellule(
                    ProRecup.formaterNombre(
                        impact.facteur_utilise,
                        6
                    ),
                    "facteur-impact"
                )
            );

            ligne.appendChild(
                creerCellule(
                    `${ProRecup.formaterNombre(
                        impact.co2e_estime_kg,
                        6
                    )} kg`,
                    "co2-impact"
                )
            );

            ligne.appendChild(
                creerCellule(
                    impact.source_facteur,
                    "source-impact"
                )
            );

            ligne.appendChild(
                creerCellule(
                    impact.zone_geographique
                )
            );

            ligne.appendChild(
                creerCellule(
                    impact.cree_par_nom
                )
            );

            ligne.appendChild(
                creerCellule(
                    ProRecup.formaterDate(
                        impact.date_calcul
                    )
                )
            );

            corpsTableauImpacts
                .appendChild(ligne);

        }
    );

};

const remplirFiltreMatieres = () => {

    const matieres = [
        ...new Set(
            impacts
                .map(
                    (impact) =>
                        impact.type_dechet
                )
                .filter(Boolean)
        )
    ].sort();

    filtreMatiere.innerHTML = "";

    const optionToutes =
        document.createElement(
            "option"
        );

    optionToutes.value = "";

    optionToutes.textContent =
        "Toutes les matières";

    filtreMatiere.appendChild(
        optionToutes
    );

    matieres.forEach(
        (matiere) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value = matiere;

            option.textContent =
                matiere;

            filtreMatiere.appendChild(
                option
            );

        }
    );

};

const afficherRepartition = () => {

    listeRepartition.innerHTML = "";

    if (impacts.length === 0) {

        listeRepartition.innerHTML = `
            <p class="etat-repartition">
                Aucune donnée disponible.
            </p>
        `;

        return;

    }

    const regroupement = {};

    impacts.forEach(
        (impact) => {

            const matiere =
                impact.type_dechet ||
                "Non renseigné";

            regroupement[matiere] =
                (
                    regroupement[matiere] ||
                    0
                ) +
                Number(
                    impact.co2e_estime_kg ||
                    0
                );

        }
    );

    const total =
        Object.values(
            regroupement
        ).reduce(
            (somme, valeur) =>
                somme + valeur,
            0
        );

    Object.entries(
        regroupement
    )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .forEach(
            ([matiere, valeur]) => {

                const pourcentage =
                    total > 0
                        ? (
                            valeur /
                            total
                        ) * 100
                        : 0;

                const element =
                    document.createElement(
                        "div"
                    );

                element.className =
                    "element-repartition";

                const entete =
                    document.createElement(
                        "div"
                    );

                entete.className =
                    "entete-repartition";

                const nom =
                    document.createElement(
                        "strong"
                    );

                nom.textContent =
                    matiere;

                const valeurAffichee =
                    document.createElement(
                        "span"
                    );

                valeurAffichee.textContent =
                    `${ProRecup.formaterNombre(
                        valeur
                    )} kg CO₂e`;

                entete.appendChild(nom);

                entete.appendChild(
                    valeurAffichee
                );

                const barre =
                    document.createElement(
                        "div"
                    );

                barre.className =
                    "barre-repartition";

                const progression =
                    document.createElement(
                        "div"
                    );

                progression.className =
                    "progression-repartition";

                progression.style.width =
                    `${Math.max(
                        0,
                        Math.min(
                            100,
                            pourcentage
                        )
                    )}%`;

                barre.appendChild(
                    progression
                );

                element.appendChild(
                    entete
                );

                element.appendChild(
                    barre
                );

                listeRepartition
                    .appendChild(element);

            }
        );

};

const filtrerImpacts = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    const matiere =
        filtreMatiere.value;

    const resultat =
        impacts.filter(
            (impact) => {

                const contenu = [
                    impact.reference_vente,
                    impact.acheteur_nom,
                    impact.type_dechet,
                    impact.source_facteur,
                    impact.zone_geographique,
                    impact.version_source,
                    impact.cree_par_nom,
                    impact.facteur_utilise,
                    impact.co2e_estime_kg
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const correspondRecherche =
                    !recherche ||
                    contenu.includes(
                        recherche
                    );

                const correspondMatiere =
                    !matiere ||
                    impact.type_dechet ===
                        matiere;

                return (
                    correspondRecherche &&
                    correspondMatiere
                );

            }
        );

    afficherImpacts(resultat);

};

const afficherChargement = () => {

    corpsTableauImpacts.innerHTML = `
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

    listeRepartition.innerHTML = `
        <p class="etat-repartition">
            Chargement...
        </p>
    `;

};

const chargerImpacts = async () => {

    boutonActualiser.disabled = true;

    boutonActualiserEntete.disabled =
        true;

    boutonActualiser.textContent =
        "Chargement...";

    boutonActualiserEntete.textContent =
        "Chargement...";

    afficherChargement();

    try {

        const resultat =
            await ProRecup.requete(
                "/api/impacts-carbone"
            );

        impacts =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        mettreAJourCompteurs();

        remplirFiltreMatieres();

        filtrerImpacts();

        afficherRepartition();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauImpacts.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="etat-tableau"
                >
                    Impossible de charger les impacts carbone.
                </td>
            </tr>
        `;

        listeRepartition.innerHTML = `
            <p class="etat-repartition">
                Impossible de charger les données.
            </p>
        `;

    } finally {

        boutonActualiser.disabled =
            false;

        boutonActualiserEntete.disabled =
            false;

        boutonActualiser.textContent =
            "Actualiser";

        boutonActualiserEntete.textContent =
            "Actualiser";

    }

};

boutonActualiser.addEventListener(
    "click",
    chargerImpacts
);

boutonActualiserEntete.addEventListener(
    "click",
    chargerImpacts
);

champRecherche.addEventListener(
    "input",
    filtrerImpacts
);

filtreMatiere.addEventListener(
    "change",
    filtrerImpacts
);

chargerImpacts();


