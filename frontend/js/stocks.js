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

const filtreNiveau =
    document.getElementById(
        "filtreNiveau"
    );

const corpsTableauStocks =
    document.getElementById(
        "corpsTableauStocks"
    );

const listeRepartition =
    document.getElementById(
        "listeRepartition"
    );

const nombreTypes =
    document.getElementById(
        "nombreTypes"
    );

const quantiteTotale =
    document.getElementById(
        "quantiteTotale"
    );

const nombreStocksFaibles =
    document.getElementById(
        "nombreStocksFaibles"
    );

let stocks = [];

const seuilStockFaible = 10;

const obtenirNiveau = (stock) => {

    return Number(stock.quantite) <
        seuilStockFaible
        ? "faible"
        : "normal";

};

const mettreAJourCompteurs = () => {

    nombreTypes.textContent =
        stocks.length;

    const total =
        stocks.reduce(
            (somme, stock) =>
                somme +
                Number(
                    stock.quantite || 0
                ),
            0
        );

    quantiteTotale.textContent =
        `${ProRecup.formaterNombre(total)} kg`;

    nombreStocksFaibles.textContent =
        stocks.filter(
            (stock) =>
                obtenirNiveau(stock) ===
                "faible"
        ).length;

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

const afficherStocks = (
    listeStocks
) => {

    corpsTableauStocks.innerHTML = "";

    if (listeStocks.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 5;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucun stock trouvé.";

        ligne.appendChild(cellule);

        corpsTableauStocks.appendChild(
            ligne
        );

        return;

    }

    listeStocks.forEach((stock) => {

        const ligne =
            document.createElement("tr");

        ligne.appendChild(
            creerCellule(
                stock.type_dechet,
                "nom-matiere"
            )
        );

        ligne.appendChild(
            creerCellule(
                ProRecup.formaterNombre(
                    stock.quantite
                ),
                "quantite-stock"
            )
        );

        ligne.appendChild(
            creerCellule(
                stock.unite || "kg"
            )
        );

        const celluleNiveau =
            document.createElement("td");

        const badge =
            document.createElement("span");

        const niveau =
            obtenirNiveau(stock);

        badge.className =
            niveau === "faible"
                ? "badge-niveau niveau-faible"
                : "badge-niveau niveau-normal";

        badge.textContent =
            niveau === "faible"
                ? "Stock faible"
                : "Stock normal";

        celluleNiveau.appendChild(
            badge
        );

        ligne.appendChild(
            celluleNiveau
        );

        ligne.appendChild(
            creerCellule(
                ProRecup.formaterDate(
                    stock.date_mise_a_jour
                )
            )
        );

        corpsTableauStocks.appendChild(
            ligne
        );

    });

};

const afficherRepartition = () => {

    listeRepartition.innerHTML = "";

    if (stocks.length === 0) {

        listeRepartition.innerHTML = `
            <p class="etat-repartition">
                Aucune donnée disponible.
            </p>
        `;

        return;

    }

    const total =
        stocks.reduce(
            (somme, stock) =>
                somme +
                Number(
                    stock.quantite || 0
                ),
            0
        );

    stocks.forEach((stock) => {

        const quantite =
            Number(stock.quantite || 0);

        const pourcentage =
            total > 0
                ? (
                    quantite /
                    total
                ) * 100
                : 0;

        const element =
            document.createElement("div");

        element.className =
            "element-repartition";

        const entete =
            document.createElement("div");

        entete.className =
            "entete-repartition";

        const nom =
            document.createElement("strong");

        nom.textContent =
            stock.type_dechet ||
            "Matière";

        const valeur =
            document.createElement("span");

        valeur.textContent =
            `${ProRecup.formaterNombre(
                quantite
            )} ${stock.unite || "kg"}`;

        entete.appendChild(nom);
        entete.appendChild(valeur);

        const barre =
            document.createElement("div");

        barre.className =
            "barre-repartition";

        const progression =
            document.createElement("div");

        progression.className =
            "progression-repartition";

        progression.style.width =
            `${Math.max(
                0,
                Math.min(100, pourcentage)
            )}%`;

        barre.appendChild(
            progression
        );

        element.appendChild(entete);
        element.appendChild(barre);

        listeRepartition.appendChild(
            element
        );

    });

};

const filtrerStocks = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    const niveauSelectionne =
        filtreNiveau.value;

    const resultat =
        stocks.filter((stock) => {

            const correspondRecherche =
                !recherche ||
                String(
                    stock.type_dechet || ""
                )
                    .toLowerCase()
                    .includes(recherche);

            const correspondNiveau =
                !niveauSelectionne ||
                obtenirNiveau(stock) ===
                    niveauSelectionne;

            return (
                correspondRecherche &&
                correspondNiveau
            );

        });

    afficherStocks(resultat);

};

const afficherChargement = () => {

    corpsTableauStocks.innerHTML = `
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

    listeRepartition.innerHTML = `
        <p class="etat-repartition">
            Chargement...
        </p>
    `;

};

const chargerStocks = async () => {

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
                "/api/stocks"
            );

        stocks =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        mettreAJourCompteurs();
        filtrerStocks();
        afficherRepartition();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauStocks.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="etat-tableau"
                >
                    Impossible de charger les stocks.
                </td>
            </tr>
        `;

        listeRepartition.innerHTML = `
            <p class="etat-repartition">
                Impossible de charger les données.
            </p>
        `;

    } finally {

        boutonActualiser.disabled = false;

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
    chargerStocks
);

boutonActualiserEntete.addEventListener(
    "click",
    chargerStocks
);

champRecherche.addEventListener(
    "input",
    filtrerStocks
);

filtreNiveau.addEventListener(
    "change",
    filtrerStocks
);

chargerStocks();


