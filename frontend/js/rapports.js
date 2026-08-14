(function () {

    "use strict";

    if (!window.ProRecup) {

        alert("common.js est introuvable.");

        return;

    }

    ProRecup.protegerPage();
    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    function element(id) {
        return document.getElementById(id);
    }

    var typeRapport =
        element("typeRapport");

    var dateDebut =
        element("dateDebutRapport");

    var dateFin =
        element("dateFinRapport");

    var recherche =
        element("rechercheRapport");

    var boutonGenerer =
        element("boutonGenererRapport");

    var boutonExporter =
        element("boutonExporterCsv");

    var boutonImprimer =
        element("boutonImprimerRapport");

    var erreurRapports =
        element("erreurRapports");

    var enteteTableau =
        element("enteteTableauRapport");

    var corpsTableau =
        element("corpsTableauRapport");

    var donneesRapport = [];

    var configurations = {

    collectes: {
        titre:
            "Rapport des collectes",

        description:
            "Synthèse des collectes enregistrées.",

        route:
            "/api/collectes",

        colonnes: [
            {
                titre: "Date",
                cle: "date_collecte"
            },
            {
                titre: "Client",
                cle: "client_nom"
            },
            {
                titre: "Site",
                cle: "site_nom"
            },
            {
                titre: "Déchet",
                cle: "type_dechet"
            },
            {
                titre: "Poids estimé",
                cle: "poids_estime"
            },
            {
                titre: "Statut",
                cle: "statut"
            },
            {
                titre: "Agent",
                cle: "agent_nom"
            }
        ]
    },

    missions: {
        titre:
            "Rapport des missions",

        description:
            "Synthèse des missions planifiées et exécutées.",

        route:
            "/api/missions",

        colonnes: [
            {
                titre: "Date",
                cle: "date_prevue"
            },
            {
                titre: "Agent",
                cle: "agent_nom"
            },
            {
                titre: "Tricycle",
                cle: "tricycle_numero"
            },
            {
                titre: "Départ prévu",
                cle: "heure_depart_prevue"
            },
            {
                titre: "Retour prévu",
                cle: "heure_retour_prevue"
            },
            {
                titre: "Statut",
                cle: "statut"
            },
            {
                titre: "Observations",
                cle: "observations"
            }
        ]
    },

    stocks: {
        titre:
            "Rapport des stocks",

        description:
            "État actuel des matières disponibles.",

        route:
            "/api/stocks",

        colonnes: [
            {
                titre: "Matière",
                cle: "type_dechet"
            },
            {
                titre: "Quantité",
                cle: "quantite"
            },
            {
                titre: "Unité",
                cle: "unite"
            },
            {
                titre: "Dernière mise à jour",
                cle: "date_mise_a_jour"
            }
        ]
    },

    ventes: {
        titre:
            "Rapport des ventes",

        description:
            "Synthèse des ventes et sorties de stock.",

        route:
            "/api/ventes",

        colonnes: [
            {
                titre: "Date",
                cle: "date_vente"
            },
            {
                titre: "Acheteur",
                cle: "acheteur_nom"
            },
            {
                titre: "Matière",
                cle: "type_dechet"
            },
            {
                titre: "Quantité",
                cle: "quantite"
            },
            {
                titre: "Prix unitaire",
                cle: "prix_unitaire"
            },
            {
                titre: "Montant",
                cle: "montant_total"
            },
            {
                titre: "Statut",
                cle: "statut"
            }
        ]
    },

    impact: {
        titre:
            "Rapport d’impact carbone",

        description:
            "Synthèse des émissions estimées évitées.",

        route:
            "/api/impacts-carbone",

        colonnes: [
            {
                titre: "Date",
                cle: "date_calcul"
            },
            {
                titre: "Matière",
                cle: "type_dechet"
            },
            {
                titre: "Quantité",
                cle: "quantite_kg"
            },
            {
                titre: "Facteur",
                cle: "facteur_utilise"
            },
            {
                titre: "CO₂e évité",
                cle: "co2e_estime_kg"
            }
        ]
    }

};

    function afficherErreur(message) {

        erreurRapports.textContent =
            message;

        erreurRapports.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        erreurRapports.textContent = "";

        erreurRapports.classList.add(
            "cache"
        );

    }

    function extraireListe(resultat) {

        if (Array.isArray(resultat)) {
            return resultat;
        }

        if (
            resultat &&
            Array.isArray(resultat.data)
        ) {
            return resultat.data;
        }

        if (
            resultat &&
            resultat.data &&
            Array.isArray(resultat.data.data)
        ) {
            return resultat.data.data;
        }

        return [];

    }

    function formaterDate(valeur) {

        if (!valeur) {
            return "—";
        }

        var date =
            new Date(valeur);

        if (isNaN(date.getTime())) {
            return String(valeur);
        }

        return date.toLocaleDateString(
            "fr-FR"
        );

    }

    function formaterNombre(
        valeur,
        decimales
    ) {

        var nombre = Number(valeur);

        if (isNaN(nombre)) {
            nombre = 0;
        }

        return nombre.toLocaleString(
            "fr-FR",
            {
                maximumFractionDigits:
                    decimales || 0
            }
        );

    }

    function obtenirDateLigne(
        ligne
    ) {

        return (
            ligne.date_prevue ||
            ligne.date_collecte ||
            ligne.date_vente ||
            ligne.date_calcul ||
            ligne.cree_le ||
            ligne.modifie_le ||
            ligne.date_mise_a_jour ||
            ""
        );

    }

    function filtrerDonnees(liste) {

        var debut =
            dateDebut.value;

        var fin =
            dateFin.value;

        var texte =
            recherche.value
                .trim()
                .toLowerCase();

        return liste.filter(
            function (ligne) {

                var date =
                    String(
                        obtenirDateLigne(
                            ligne
                        )
                    ).slice(
                        0,
                        10
                    );

                var correspondDebut =
                    !debut ||
                    !date ||
                    date >= debut;

                var correspondFin =
                    !fin ||
                    !date ||
                    date <= fin;

                var contenu =
                    Object.keys(ligne)
                        .map(
                            function (cle) {
                                return ligne[cle];
                            }
                        )
                        .filter(
                            function (valeur) {
                                return (
                                    valeur !== null &&
                                    valeur !== undefined
                                );
                            }
                        )
                        .join(" ")
                        .toLowerCase();

                var correspondRecherche =
                    !texte ||
                    contenu.indexOf(texte) !== -1;

                return (
                    correspondDebut &&
                    correspondFin &&
                    correspondRecherche
                );

            }
        );

    }

    function valeurAffichage(
    ligne,
    cle
) {

    var valeur =
        ligne[cle];

    if (
        valeur === null ||
        valeur === undefined ||
        valeur === ""
    ) {
        return "—";
    }

    if (
        cle.indexOf("date") !== -1 ||
        cle === "cree_le" ||
        cle === "modifie_le"
    ) {
        return formaterDate(
            valeur
        );
    }

    if (
        cle === "facteur_utilise"
    ) {
        return formaterNombre(
            valeur,
            2
        );
    }

    if (
        cle === "co2e_estime_kg"
    ) {
        return (
            formaterNombre(
                valeur,
                2
            ) +
            " kg CO₂e"
        );
    }

    if (
        cle === "poids_estime" ||
        cle === "quantite" ||
        cle === "quantite_kg"
    ) {
        return formaterNombre(
            valeur,
            2
        );
    }

    if (
        cle === "prix_unitaire" ||
        cle === "montant_total"
    ) {
        return formaterNombre(
            valeur,
            2
        );
    }

    return String(
        valeur
    );

}
    function afficherEntete(
        colonnes
    ) {

        enteteTableau.innerHTML = "";

        var ligne =
            document.createElement("tr");

        colonnes.forEach(
            function (colonne) {

                var cellule =
                    document.createElement("th");

                cellule.textContent =
                    colonne.titre;

                ligne.appendChild(
                    cellule
                );

            }
        );

        enteteTableau.appendChild(
            ligne
        );

    }

    function afficherCorps(
        lignes,
        colonnes
    ) {

        corpsTableau.innerHTML = "";

        if (!lignes.length) {

            corpsTableau.innerHTML =
                '<tr>' +
                '<td colspan="' +
                colonnes.length +
                '" class="etat-vide">' +
                "Aucune donnée disponible pour ce rapport." +
                "</td>" +
                "</tr>";

            return;

        }

        lignes.forEach(
            function (ligneDonnee) {

                var ligne =
                    document.createElement("tr");

                colonnes.forEach(
                    function (colonne) {

                        var cellule =
                            document.createElement("td");

                        cellule.textContent =
                            valeurAffichage(
                                ligneDonnee,
                                colonne.cle
                            );

                        ligne.appendChild(
                            cellule
                        );

                    }
                );

                corpsTableau.appendChild(
                    ligne
                );

            }
        );

    }

    function obtenirQuantiteLigne(
        ligne
    ) {

        var valeurs = [
            ligne.quantite,
            ligne.quantite_kg,
            ligne.quantite_disponible,
            ligne.poids_estime,
            ligne.poids_reel
        ];

        var resultat = 0;

        valeurs.some(
            function (valeur) {

                var nombre =
                    Number(valeur);

                if (!isNaN(nombre)) {

                    resultat =
                        nombre;

                    return true;

                }

                return false;

            }
        );

        return resultat;

    }

    function obtenirValeurLigne(
        ligne
    ) {

        var valeurs = [
    ligne.montant_total,
    ligne.chiffre_affaires,
    ligne.co2e_estime_kg,
    ligne.co2e_estime,
    ligne.co2e_evite
];

        var resultat = 0;

        valeurs.some(
            function (valeur) {

                var nombre =
                    Number(valeur);

                if (!isNaN(nombre)) {

                    resultat =
                        nombre;

                    return true;

                }

                return false;

            }
        );

        return resultat;

    }

    function mettreAJourResume(
        lignes
    ) {

        var quantiteTotale = 0;
        var valeurTotale = 0;

        lignes.forEach(
            function (ligne) {

                quantiteTotale +=
                    obtenirQuantiteLigne(
                        ligne
                    );

                valeurTotale +=
                    obtenirValeurLigne(
                        ligne
                    );

            }
        );

        element(
            "nombreLignesRapport"
        ).textContent =
            String(lignes.length);

        element(
            "quantiteTotaleRapport"
        ).textContent =
            formaterNombre(
                quantiteTotale,
                2
            ) +
            " kg";

        element(
            "valeurTotaleRapport"
        ).textContent =
            formaterNombre(
                valeurTotale,
                2
            );

        var periode = "Toutes";

        if (
    typeRapport.value ===
    "impact"
) {

    element(
        "valeurTotaleRapport"
    ).textContent =
        formaterNombre(
            valeurTotale,
            2
        ) +
        " kg CO₂e";

} else {

    element(
        "valeurTotaleRapport"
    ).textContent =
        formaterNombre(
            valeurTotale,
            2
        );

}
        element(
            "periodeRapport"
        ).textContent =
            periode;

    }

    async function genererRapport() {

        cacherErreur();

        boutonGenerer.disabled =
            true;

        boutonGenerer.textContent =
            "Génération...";

        var configuration =
            configurations[
                typeRapport.value
            ];

        element(
            "titreRapport"
        ).textContent =
            configuration.titre;

        element(
            "descriptionRapport"
        ).textContent =
            configuration.description;

        element(
            "dateGenerationRapport"
        ).textContent =
            new Date().toLocaleString(
                "fr-FR"
            );

        try {

            var resultat =
                await ProRecup.requete(
                    configuration.route
                );

            var liste =
                extraireListe(
                    resultat
                );

            donneesRapport =
                filtrerDonnees(
                    liste
                );

            afficherEntete(
                configuration.colonnes
            );

            afficherCorps(
                donneesRapport,
                configuration.colonnes
            );

            mettreAJourResume(
                donneesRapport
            );

        } catch (erreur) {

            console.error(erreur);

            donneesRapport = [];

            afficherErreur(
                erreur.message ||
                "Impossible de générer le rapport."
            );

            afficherEntete(
                configuration.colonnes
            );

            afficherCorps(
                [],
                configuration.colonnes
            );

            mettreAJourResume([]);

        } finally {

            boutonGenerer.disabled =
                false;

            boutonGenerer.textContent =
                "Générer";

        }

    }

    function echapperCsv(valeur) {

        var texte =
            String(
                valeur === null ||
                valeur === undefined
                    ? ""
                    : valeur
            );

        texte =
            texte.replace(
                /"/g,
                '""'
            );

        return '"' + texte + '"';

    }

    function exporterCsv() {

        var configuration =
            configurations[
                typeRapport.value
            ];

        if (!donneesRapport.length) {

            ProRecup.afficherNotification(
                "Aucune donnée à exporter.",
                "erreur"
            );

            return;

        }

        var lignes = [];

        lignes.push(
            configuration.colonnes
                .map(
                    function (colonne) {
                        return echapperCsv(
                            colonne.titre
                        );
                    }
                )
                .join(";")
        );

        donneesRapport.forEach(
            function (ligne) {

                lignes.push(
                    configuration.colonnes
                        .map(
                            function (colonne) {

                                return echapperCsv(
                                    valeurAffichage(
                                        ligne,
                                        colonne.cle
                                    )
                                );

                            }
                        )
                        .join(";")
                );

            }
        );

        var contenu =
            "\uFEFF" +
            lignes.join("\r\n");

        var blob =
            new Blob(
                [contenu],
                {
                    type:
                        "text/csv;charset=utf-8"
                }
            );

        var url =
            URL.createObjectURL(
                blob
            );

        var lien =
            document.createElement("a");

        lien.href = url;

        lien.download =
            "prorecup-" +
            typeRapport.value +
            "-" +
            new Date()
                .toISOString()
                .slice(0, 10) +
            ".csv";

        document.body.appendChild(
            lien
        );

        lien.click();
        lien.remove();

        URL.revokeObjectURL(url);

        ProRecup.afficherNotification(
            "Rapport CSV téléchargé.",
            "succes"
        );

    }

    boutonGenerer.addEventListener(
        "click",
        genererRapport
    );

    boutonExporter.addEventListener(
        "click",
        exporterCsv
    );

    boutonImprimer.addEventListener(
        "click",
        function () {
            window.print();
        }
    );

    typeRapport.addEventListener(
        "change",
        genererRapport
    );

    genererRapport();

})();