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

    var boutonActualiser =
        element("boutonActualiserPlanning");

    var boutonPrecedent =
        element("boutonPeriodePrecedente");

    var boutonSuivant =
        element("boutonPeriodeSuivante");

    var boutonAujourdhui =
        element("boutonAujourdhui");

    var titrePeriode =
        element("titrePeriodePlanning");

    var recherche =
        element("recherchePlanning");

    var filtreStatut =
        element("filtreStatutPlanning");

    var nombreAffiche =
        element("nombreMissionsAffichees");

    var vuePlanning =
        element("vuePlanning");

    var etatChargement =
        element("etatChargementPlanning");

    var erreurPlanning =
        element("erreurPlanning");

    var boutonsVue =
        document.querySelectorAll(
            ".bouton-vue"
        );

    var missions = [];
    var vueActive = "mois";
    var dateReference = new Date();

    dateReference.setHours(
        0,
        0,
        0,
        0
    );

    function afficherErreur(message) {

        erreurPlanning.textContent =
            message;

        erreurPlanning.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        erreurPlanning.textContent = "";

        erreurPlanning.classList.add(
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

    function normaliserDate(valeur) {

        if (!valeur) {
            return "";
        }

        return String(valeur).slice(
            0,
            10
        );

    }

    function obtenirCleDate(date) {

        var mois =
            String(
                date.getMonth() + 1
            );

        var jour =
            String(
                date.getDate()
            );

        if (mois.length < 2) {
            mois = "0" + mois;
        }

        if (jour.length < 2) {
            jour = "0" + jour;
        }

        return (
            date.getFullYear() +
            "-" +
            mois +
            "-" +
            jour
        );

    }

    function formaterDateLongue(date) {

        return date.toLocaleDateString(
            "fr-FR",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

    }

    function formaterMois(date) {

        var texte =
            date.toLocaleDateString(
                "fr-FR",
                {
                    month: "long",
                    year: "numeric"
                }
            );

        return (
            texte.charAt(0).toUpperCase() +
            texte.slice(1)
        );

    }

    function formaterHeure(heure) {

        if (!heure) {
            return "—";
        }

        return String(heure).slice(
            0,
            5
        );

    }

    function formaterStatut(statut) {

        var libelles = {

            planifiee:
                "Planifiée",

            en_cours:
                "En cours",

            terminee:
                "Terminée",

            annulee:
                "Annulée"

        };

        return (
            libelles[statut] ||
            statut ||
            "Non renseigné"
        );

    }

    function obtenirLundi(date) {

        var resultat =
            new Date(
                date.getTime()
            );

        var jour =
            resultat.getDay();

        var difference =
            jour === 0
                ? -6
                : 1 - jour;

        resultat.setDate(
            resultat.getDate() +
            difference
        );

        resultat.setHours(
            0,
            0,
            0,
            0
        );

        return resultat;

    }

    function filtrerMissions() {

        var texteRecherche =
            recherche.value
                .trim()
                .toLowerCase();

        var statut =
            filtreStatut.value;

        return missions.filter(
            function (mission) {

                var contenu = [

                    mission.agent_nom,
                    mission.nom_agent,
                    mission.agent_email,
                    mission.tricycle_numero,
                    mission.numero_interne,
                    mission.plaque_identification,
                    mission.date_prevue,
                    mission.statut

                ]
                    .filter(
                        function (valeur) {
                            return Boolean(valeur);
                        }
                    )
                    .join(" ")
                    .toLowerCase();

                var correspondRecherche =
                    !texteRecherche ||
                    contenu.indexOf(
                        texteRecherche
                    ) !== -1;

                var correspondStatut =
                    !statut ||
                    mission.statut ===
                    statut;

                return (
                    correspondRecherche &&
                    correspondStatut
                );

            }
        );

    }

    function obtenirMissionsDuJour(
        liste,
        date
    ) {

        var cle =
            obtenirCleDate(date);

        return liste.filter(
            function (mission) {

                return (
                    normaliserDate(
                        mission.date_prevue
                    ) === cle
                );

            }
        );

    }

    function creerCarteMission(
        mission
    ) {

        var lien =
            document.createElement("a");

        lien.href =
            "./missions.html";

        lien.className =
            "mission-planning mission-" +
            (
                mission.statut ||
                "planifiee"
            );

        var titre =
            document.createElement(
                "strong"
            );

        var detail =
            document.createElement(
                "span"
            );

        titre.textContent =
            formaterHeure(
                mission.heure_depart_prevue
            ) +
            " — " +
            (
                mission.agent_nom ||
                "Agent non renseigné"
            );

        detail.textContent =
            mission.tricycle_numero ||
            mission.numero_interne ||
            "Tricycle non renseigné";

        lien.appendChild(titre);
        lien.appendChild(detail);

        return lien;

    }

    function afficherVueMois(
        liste
    ) {

        titrePeriode.textContent =
            formaterMois(
                dateReference
            );

        var conteneur =
            document.createElement("div");

        conteneur.className =
            "grille-mois";

        var joursSemaine = [
            "Lun",
            "Mar",
            "Mer",
            "Jeu",
            "Ven",
            "Sam",
            "Dim"
        ];

        joursSemaine.forEach(
            function (jour) {

                var entete =
                    document.createElement(
                        "div"
                    );

                entete.className =
                    "entete-jour-semaine";

                entete.textContent =
                    jour;

                conteneur.appendChild(
                    entete
                );

            }
        );

        var premierJour =
            new Date(
                dateReference.getFullYear(),
                dateReference.getMonth(),
                1
            );

        var lundiDebut =
            obtenirLundi(
                premierJour
            );

        var aujourdHui =
            obtenirCleDate(
                new Date()
            );

        var index;

        for (
            index = 0;
            index < 42;
            index += 1
        ) {

            var date =
                new Date(
                    lundiDebut.getTime()
                );

            date.setDate(
                lundiDebut.getDate() +
                index
            );

            var caseJour =
                document.createElement(
                    "div"
                );

            caseJour.className =
                "case-jour";

            if (
                date.getMonth() !==
                dateReference.getMonth()
            ) {

                caseJour.classList.add(
                    "hors-mois"
                );

            }

            if (
                obtenirCleDate(date) ===
                aujourdHui
            ) {

                caseJour.classList.add(
                    "aujourdhui"
                );

            }

            var numero =
                document.createElement(
                    "span"
                );

            numero.className =
                "numero-jour";

            numero.textContent =
                String(
                    date.getDate()
                );

            var listeJour =
                document.createElement(
                    "div"
                );

            listeJour.className =
                "liste-missions-jour";

            var missionsJour =
                obtenirMissionsDuJour(
                    liste,
                    date
                );

            missionsJour
                .slice(
                    0,
                    4
                )
                .forEach(
                    function (mission) {

                        listeJour.appendChild(
                            creerCarteMission(
                                mission
                            )
                        );

                    }
                );

            if (
                missionsJour.length >
                4
            ) {

                var supplement =
                    document.createElement(
                        "small"
                    );

                supplement.textContent =
                    "+" +
                    (
                        missionsJour.length -
                        4
                    ) +
                    " mission(s)";

                listeJour.appendChild(
                    supplement
                );

            }

            caseJour.appendChild(
                numero
            );

            caseJour.appendChild(
                listeJour
            );

            conteneur.appendChild(
                caseJour
            );

        }

        vuePlanning.appendChild(
            conteneur
        );

    }

    function afficherVueSemaine(
        liste
    ) {

        var lundi =
            obtenirLundi(
                dateReference
            );

        var dimanche =
            new Date(
                lundi.getTime()
            );

        dimanche.setDate(
            lundi.getDate() + 6
        );

        titrePeriode.textContent =
            lundi.toLocaleDateString(
                "fr-FR",
                {
                    day: "2-digit",
                    month: "short"
                }
            ) +
            " — " +
            dimanche.toLocaleDateString(
                "fr-FR",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

        var conteneur =
            document.createElement(
                "div"
            );

        conteneur.className =
            "grille-semaine";

        var aujourdHui =
            obtenirCleDate(
                new Date()
            );

        var index;

        for (
            index = 0;
            index < 7;
            index += 1
        ) {

            var date =
                new Date(
                    lundi.getTime()
                );

            date.setDate(
                lundi.getDate() +
                index
            );

            var colonne =
                document.createElement(
                    "div"
                );

            colonne.className =
                "colonne-semaine";

            if (
                obtenirCleDate(date) ===
                aujourdHui
            ) {

                colonne.classList.add(
                    "colonne-aujourdhui"
                );

            }

            var entete =
                document.createElement(
                    "div"
                );

            entete.className =
                "entete-colonne-semaine";

            var nomJour =
                document.createElement(
                    "span"
                );

            var numero =
                document.createElement(
                    "strong"
                );

            nomJour.textContent =
                date.toLocaleDateString(
                    "fr-FR",
                    {
                        weekday: "short"
                    }
                );

            numero.textContent =
                String(
                    date.getDate()
                );

            entete.appendChild(
                nomJour
            );

            entete.appendChild(
                numero
            );

            var listeColonne =
                document.createElement(
                    "div"
                );

            listeColonne.className =
                "missions-colonne-semaine";

            var missionsJour =
                obtenirMissionsDuJour(
                    liste,
                    date
                );

            missionsJour.forEach(
                function (mission) {

                    listeColonne.appendChild(
                        creerCarteMission(
                            mission
                        )
                    );

                }
            );

            colonne.appendChild(
                entete
            );

            colonne.appendChild(
                listeColonne
            );

            conteneur.appendChild(
                colonne
            );

        }

        vuePlanning.appendChild(
            conteneur
        );

    }

    function afficherVueJour(
        liste
    ) {

        titrePeriode.textContent =
            formaterDateLongue(
                dateReference
            );

        var conteneur =
            document.createElement(
                "div"
            );

        conteneur.className =
            "vue-jour";

        var entete =
            document.createElement(
                "div"
            );

        entete.className =
            "entete-vue-jour";

        var titre =
            document.createElement(
                "h2"
            );

        var sousTitre =
            document.createElement(
                "p"
            );

        titre.textContent =
            formaterDateLongue(
                dateReference
            );

        var missionsJour =
            obtenirMissionsDuJour(
                liste,
                dateReference
            );

        sousTitre.textContent =
            missionsJour.length +
            " mission(s) planifiée(s)";

        entete.appendChild(
            titre
        );

        entete.appendChild(
            sousTitre
        );

        conteneur.appendChild(
            entete
        );

        var listeJour =
            document.createElement(
                "div"
            );

        listeJour.className =
            "liste-vue-jour";

        if (
            missionsJour.length ===
            0
        ) {

            listeJour.innerHTML =
                '<div class="etat-vide-planning">' +
                "Aucune mission prévue pour cette journée." +
                "</div>";

        } else {

            missionsJour
                .slice()
                .sort(
                    function (
                        missionA,
                        missionB
                    ) {

                        return String(
                            missionA
                                .heure_depart_prevue ||
                            ""
                        ).localeCompare(
                            String(
                                missionB
                                    .heure_depart_prevue ||
                                ""
                            )
                        );

                    }
                )
                .forEach(
                    function (mission) {

                        var carte =
                            document.createElement(
                                "article"
                            );

                        carte.className =
                            "carte-mission-jour mission-" +
                            (
                                mission.statut ||
                                "planifiee"
                            );

                        var heure =
                            document.createElement(
                                "div"
                            );

                        heure.className =
                            "heure-mission";

                        heure.textContent =
                            formaterHeure(
                                mission
                                    .heure_depart_prevue
                            );

                        var informations =
                            document.createElement(
                                "div"
                            );

                        informations.className =
                            "informations-mission-jour";

                        var agent =
                            document.createElement(
                                "strong"
                            );

                        var tricycle =
                            document.createElement(
                                "span"
                            );

                        var horaires =
                            document.createElement(
                                "span"
                            );

                        agent.textContent =
                            mission.agent_nom ||
                            "Agent non renseigné";

                        tricycle.textContent =
                            "Tricycle : " +
                            (
                                mission.tricycle_numero ||
                                mission.numero_interne ||
                                "Non renseigné"
                            );

                        horaires.textContent =
                            "Horaire : " +
                            formaterHeure(
                                mission
                                    .heure_depart_prevue
                            ) +
                            " — " +
                            formaterHeure(
                                mission
                                    .heure_retour_prevue
                            );

                        informations.appendChild(
                            agent
                        );

                        informations.appendChild(
                            tricycle
                        );

                        informations.appendChild(
                            horaires
                        );

                        var statut =
                            document.createElement(
                                "span"
                            );

                        statut.className =
                            "badge-statut-planning badge-" +
                            (
                                mission.statut ||
                                "planifiee"
                            );

                        statut.textContent =
                            formaterStatut(
                                mission.statut
                            );

                        carte.appendChild(
                            heure
                        );

                        carte.appendChild(
                            informations
                        );

                        carte.appendChild(
                            statut
                        );

                        listeJour.appendChild(
                            carte
                        );

                    }
                );

        }

        conteneur.appendChild(
            listeJour
        );

        vuePlanning.appendChild(
            conteneur
        );

    }

    function afficherPlanning() {

        var liste =
            filtrerMissions();

        nombreAffiche.textContent =
            String(
                liste.length
            );

        vuePlanning.innerHTML = "";

        etatChargement.classList.add(
            "cache"
        );

        if (vueActive === "mois") {

            afficherVueMois(
                liste
            );

            return;

        }

        if (vueActive === "semaine") {

            afficherVueSemaine(
                liste
            );

            return;

        }

        afficherVueJour(
            liste
        );

    }

    async function chargerMissions() {

        cacherErreur();

        boutonActualiser.disabled =
            true;

        boutonActualiser.textContent =
            "Chargement...";

        etatChargement.classList.remove(
            "cache"
        );

        vuePlanning.innerHTML = "";

        try {

            var resultat =
                await ProRecup.requete(
                    "/api/missions"
                );

            missions =
                extraireListe(
                    resultat
                );

            afficherPlanning();

        } catch (erreur) {

            console.error(
                erreur
            );

            afficherErreur(
                erreur.message ||
                "Impossible de charger le planning."
            );

            etatChargement.textContent =
                "Impossible de charger les missions.";

        } finally {

            boutonActualiser.disabled =
                false;

            boutonActualiser.textContent =
                "Actualiser";

        }

    }

    function changerPeriode(
        direction
    ) {

        if (vueActive === "mois") {

            dateReference.setMonth(
                dateReference.getMonth() +
                direction
            );

        } else if (
            vueActive ===
            "semaine"
        ) {

            dateReference.setDate(
                dateReference.getDate() +
                direction * 7
            );

        } else {

            dateReference.setDate(
                dateReference.getDate() +
                direction
            );

        }

        afficherPlanning();

    }

    boutonPrecedent.addEventListener(
        "click",
        function () {
            changerPeriode(-1);
        }
    );

    boutonSuivant.addEventListener(
        "click",
        function () {
            changerPeriode(1);
        }
    );

    boutonAujourdhui.addEventListener(
        "click",
        function () {

            dateReference =
                new Date();

            dateReference.setHours(
                0,
                0,
                0,
                0
            );

            afficherPlanning();

        }
    );

    boutonActualiser.addEventListener(
        "click",
        chargerMissions
    );

    recherche.addEventListener(
        "input",
        afficherPlanning
    );

    filtreStatut.addEventListener(
        "change",
        afficherPlanning
    );

    Array.prototype.forEach.call(
        boutonsVue,
        function (bouton) {

            bouton.addEventListener(
                "click",
                function () {

                    vueActive =
                        bouton.getAttribute(
                            "data-vue"
                        );

                    Array.prototype.forEach.call(
                        boutonsVue,
                        function (
                            autreBouton
                        ) {

                            autreBouton.classList.remove(
                                "actif"
                            );

                        }
                    );

                    bouton.classList.add(
                        "actif"
                    );

                    afficherPlanning();

                }
            );

        }
    );

    chargerMissions();

})();