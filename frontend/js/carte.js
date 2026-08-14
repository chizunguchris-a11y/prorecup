(function () {

    "use strict";

    if (!window.ProRecup) {

        alert(
            "common.js est introuvable."
        );

        return;

    }

    ProRecup.protegerPage();
    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    function element(id) {
        return document.getElementById(id);
    }

    var boutonActualiser =
        element("boutonActualiserCarte");

    var erreurCarte =
        element("erreurCarte");

    var rechercheCarte =
        element("rechercheCarte");

    var filtreMission =
        element("filtreMissionCarte");

    var filtreStatut =
        element("filtreStatutCarte");

    var listePositions =
        element("listePositions");

    var messageCarteVide =
        element("messageCarteVide");

    var badgePositions =
        element("badgePositions");

    var missions = [];
    var positions = [];

    var carte = null;
    var groupeMarqueurs = null;
    var marqueursParPosition = {};

    function definirTexte(
        id,
        valeur
    ) {

        var cible =
            element(id);

        if (cible) {
            cible.textContent =
                valeur;
        }

    }

    function afficherErreur(
        message
    ) {

        erreurCarte.textContent =
            message;

        erreurCarte.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        erreurCarte.textContent = "";

        erreurCarte.classList.add(
            "cache"
        );

    }

    function extraireListe(
        resultat
    ) {

        if (
            Array.isArray(
                resultat
            )
        ) {
            return resultat;
        }

        if (
            resultat &&
            Array.isArray(
                resultat.data
            )
        ) {
            return resultat.data;
        }

        if (
            resultat &&
            resultat.data &&
            Array.isArray(
                resultat.data.data
            )
        ) {
            return resultat.data.data;
        }

        return [];

    }

    function formaterDate(
        valeur
    ) {

        if (!valeur) {
            return "Date inconnue";
        }

        var date =
            new Date(valeur);

        if (
            isNaN(
                date.getTime()
            )
        ) {
            return String(valeur);
        }

        return date.toLocaleString(
            "fr-FR"
        );

    }

    function formaterStatut(
        statut
    ) {

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

    function convertirNombre(
        valeur
    ) {

        var nombre =
            Number(valeur);

        return isNaN(nombre)
            ? null
            : nombre;

    }

    function initialiserCarte() {

        if (
            !window.L
        ) {

            afficherErreur(
                "La bibliothèque cartographique Leaflet n’a pas pu être chargée. Vérifiez la connexion Internet."
            );

            return false;

        }

        if (carte) {
            return true;
        }

        carte =
            L.map(
                "carteMissions",
                {
                    zoomControl: true
                }
            ).setView(
                [
                    -4.325,
                    15.322
                ],
                12
            );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,

                attribution:
                    "&copy; OpenStreetMap"
            }
        ).addTo(carte);

        groupeMarqueurs =
            L.layerGroup()
                .addTo(carte);

        return true;

    }

    function couleurStatut(
        statut
    ) {

        var couleurs = {

            planifiee:
                "#2563eb",

            en_cours:
                "#f97316",

            terminee:
                "#16a34a",

            annulee:
                "#dc2626"

        };

        return (
            couleurs[statut] ||
            "#475569"
        );

    }

    function remplirFiltreMissions() {

        filtreMission.innerHTML =
            '<option value="">' +
            "Toutes les missions" +
            "</option>";

        missions.forEach(
            function (mission) {

                var option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    mission.id;

                option.textContent =
                    (
                        mission.agent_nom ||
                        "Agent"
                    ) +
                    " — " +
                    (
                        mission.tricycle_numero ||
                        "Tricycle"
                    ) +
                    " — " +
                    String(
                        mission.date_prevue ||
                        ""
                    ).slice(
                        0,
                        10
                    );

                filtreMission.appendChild(
                    option
                );

            }
        );

    }

    

    function filtrerPositions() {

        var recherche =
            rechercheCarte.value
                .trim()
                .toLowerCase();

        var missionId =
            filtreMission.value;

        var statut =
            filtreStatut.value;

        return positions.filter(
            function (position) {

                var contenu = [

                    position.agent_nom,
                    position.tricycle_numero,
                    position.plaque_identification,
                    position.type_evenement,
                    position.date_prevue,
                    position.statut

                ]
                    .filter(
                        function (valeur) {
                            return Boolean(valeur);
                        }
                    )
                    .join(" ")
                    .toLowerCase();

                var correspondRecherche =
                    !recherche ||
                    contenu.indexOf(
                        recherche
                    ) !== -1;

                var correspondMission =
                    !missionId ||
                    position.mission_id ===
                    missionId;

                var correspondStatut =
                    !statut ||
                    position.statut ===
                    statut;

                return (
                    correspondRecherche &&
                    correspondMission &&
                    correspondStatut
                );

            }
        );

    }

    function creerContenuPopup(
        position
    ) {

        return [
            '<div class="popup-mission">',
            "<strong>",
            position.agent_nom,
            "</strong>",
            "<span>Tricycle : ",
            position.tricycle_numero,
            "</span>",
            "<span>Statut : ",
            formaterStatut(
                position.statut
            ),
            "</span>",
            "<span>Événement : ",
            position.type_evenement,
            "</span>",
            "<span>Date : ",
            formaterDate(
                position.cree_le
            ),
            "</span>",
            "<span>GPS : ",
            position.latitude,
            ", ",
            position.longitude,
            "</span>",
            "</div>"
        ].join("");

    }

    function centrerSurPosition(
        positionId
    ) {

        var marqueur =
            marqueursParPosition[
                positionId
            ];

        if (
            !marqueur ||
            !carte
        ) {
            return;
        }

        carte.setView(
            marqueur.getLatLng(),
            16
        );

        marqueur.openPopup();

        var cartes =
            document.querySelectorAll(
                ".carte-position"
            );

        Array.prototype.forEach.call(
            cartes,
            function (cartePosition) {

                cartePosition.classList.remove(
                    "active"
                );

            }
        );

        var carteActive =
            document.querySelector(
                '[data-position-id="' +
                positionId +
                '"]'
            );

        if (carteActive) {

            carteActive.classList.add(
                "active"
            );

        }

    }

    function afficherListePositions(
        liste
    ) {

        listePositions.innerHTML = "";

        if (!liste.length) {

            listePositions.innerHTML =
                '<div class="etat-vide">' +
                "Aucune position GPS trouvée." +
                "</div>";

            return;

        }

        liste
            .slice()
            .sort(
                function (
                    positionA,
                    positionB
                ) {

                    return (
                        new Date(
                            positionB.cree_le ||
                            0
                        ).getTime() -
                        new Date(
                            positionA.cree_le ||
                            0
                        ).getTime()
                    );

                }
            )
            .forEach(
                function (position) {

                    var bouton =
                        document.createElement(
                            "button"
                        );

                    bouton.type =
                        "button";

                    bouton.className =
                        "carte-position";

                    bouton.setAttribute(
                        "data-position-id",
                        position.id
                    );

                    var entete =
                        document.createElement(
                            "div"
                        );

                    entete.className =
                        "entete-position";

                    var agent =
                        document.createElement(
                            "strong"
                        );

                    var statut =
                        document.createElement(
                            "span"
                        );

                    agent.textContent =
                        position.agent_nom;

                    statut.className =
                        "statut-position statut-" +
                        position.statut;

                    statut.textContent =
                        formaterStatut(
                            position.statut
                        );

                    entete.appendChild(
                        agent
                    );

                    entete.appendChild(
                        statut
                    );

                    var details =
                        document.createElement(
                            "div"
                        );

                    details.className =
                        "details-position";

                    var tricycle =
                        document.createElement(
                            "span"
                        );

                    tricycle.textContent =
                        "Tricycle : " +
                        position.tricycle_numero;

                    var evenement =
                        document.createElement(
                            "span"
                        );

                    evenement.textContent =
                        "Événement : " +
                        position.type_evenement;

                    var date =
                        document.createElement(
                            "span"
                        );

                    date.textContent =
                        formaterDate(
                            position.cree_le
                        );

                    var coordonnees =
                        document.createElement(
                            "span"
                        );

                    coordonnees.className =
                        "coordonnees-position";

                    coordonnees.textContent =
                        position.latitude +
                        ", " +
                        position.longitude;

                    details.appendChild(
                        tricycle
                    );

                    details.appendChild(
                        evenement
                    );

                    details.appendChild(
                        date
                    );

                    details.appendChild(
                        coordonnees
                    );

                    bouton.appendChild(
                        entete
                    );

                    bouton.appendChild(
                        details
                    );

                    bouton.addEventListener(
                        "click",
                        function () {

                            centrerSurPosition(
                                position.id
                            );

                        }
                    );

                    listePositions.appendChild(
                        bouton
                    );

                }
            );

    }

    function afficherCarte() {

        if (
            !initialiserCarte()
        ) {
            return;
        }

        var liste =
            filtrerPositions();

        groupeMarqueurs.clearLayers();

        marqueursParPosition = {};

        var limites = [];

        liste.forEach(
            function (position) {

                var couleur =
                    couleurStatut(
                        position.statut
                    );

                var marqueur =
                    L.circleMarker(
                        [
                            position.latitude,
                            position.longitude
                        ],
                        {
                            radius: 9,
                            color: couleur,
                            fillColor: couleur,
                            fillOpacity: 0.78,
                            weight: 3
                        }
                    );

                marqueur.bindPopup(
                    creerContenuPopup(
                        position
                    )
                );

                marqueur.addTo(
                    groupeMarqueurs
                );

                marqueursParPosition[
                    position.id
                ] = marqueur;

                limites.push([
                    position.latitude,
                    position.longitude
                ]);

            }
        );

        if (
            limites.length === 1
        ) {

            carte.setView(
                limites[0],
                16
            );

        } else if (
            limites.length > 1
        ) {

            carte.fitBounds(
                limites,
                {
                    padding: [
                        35,
                        35
                    ]
                }
            );

        } else {

            carte.setView(
                [
                    -4.325,
                    15.322
                ],
                12
            );

        }

        badgePositions.textContent =
            liste.length +
            (
                liste.length > 1
                    ? " points"
                    : " point"
            );

        messageCarteVide.classList.toggle(
            "cache",
            liste.length > 0
        );

        afficherListePositions(
            liste
        );

        window.setTimeout(
            function () {

                carte.invalidateSize();

            },
            100
        );

    }

    function mettreAJourResume() {

        definirTexte(
            "nombreMissions",
            missions.length
        );

        definirTexte(
            "nombreMissionsEnCours",
            missions.filter(
                function (mission) {

                    return (
                        mission.statut ===
                        "en_cours"
                    );

                }
            ).length
        );

        definirTexte(
            "nombrePositions",
            positions.length
        );

        var agents = {};

        positions.forEach(
            function (position) {

                if (position.agent_id) {

                    agents[
                        position.agent_id
                    ] = true;

                } else {

                    agents[
                        position.agent_nom
                    ] = true;

                }

            }
        );

        definirTexte(
            "nombreAgentsLocalises",
            Object.keys(
                agents
            ).length
        );

    }

    async function chargerCarte() {

    cacherErreur();

    boutonActualiser.disabled =
        true;

    boutonActualiser.textContent =
        "Chargement...";

    listePositions.innerHTML =
        '<div class="etat-vide">' +
        "Chargement des positions..." +
        "</div>";

    try {

        var resultat =
            await ProRecup.requete(
                "/api/carte/positions"
            );

        var donnees =
            resultat &&
            resultat.data
                ? resultat.data
                : {};

        var resume =
            donnees.resume ||
            {};

        positions =
            Array.isArray(
                donnees.positions
            )
                ? donnees.positions.map(
                    function (
                        position
                    ) {

                        return {

                            id:
                                position.id,

                            mission_id:
                                position.mission_id,

                            agent_id:
                                position.agent_id,

                            agent_nom:
                                position.agent_nom ||
                                "Agent non renseigné",

                            tricycle_numero:
                                position.tricycle_numero ||
                                "Tricycle non renseigné",

                            plaque_identification:
                                position.plaque_identification ||
                                "",

                            statut:
                                position.mission_statut ||
                                position.statut ||
                                "non_renseigne",

                            date_prevue:
                                position.date_prevue,

                            type_evenement:
                                position.type_evenement ||
                                "position_enregistree",

                            latitude:
                                convertirNombre(
                                    position.latitude
                                ),

                            longitude:
                                convertirNombre(
                                    position.longitude
                                ),

                            precision_gps:
                                convertirNombre(
                                    position.precision_gps
                                ),

                            observations:
                                position.observations ||
                                "",

                            cree_le:
                                position.cree_le,

                            client_nom:
                                position.client_nom ||
                                null,

                            site_nom:
                                position.site_nom ||
                                null,

                            site_adresse:
                                position.site_adresse ||
                                null,

                            zone_geographique:
                                position.zone_geographique ||
                                null
                        };

                    }
                ).filter(
                    function (
                        position
                    ) {

                        return (
                            position.latitude !==
                                null &&
                            position.longitude !==
                                null
                        );

                    }
                )
                : [];

        missions = [];

        var missionsParId =
            {};

        positions.forEach(
            function (
                position
            ) {

                if (
                    !missionsParId[
                        position.mission_id
                    ]
                ) {

                    missionsParId[
                        position.mission_id
                    ] = {

                        id:
                            position.mission_id,

                        agent_id:
                            position.agent_id,

                        agent_nom:
                            position.agent_nom,

                        tricycle_numero:
                            position.tricycle_numero,

                        plaque_identification:
                            position.plaque_identification,

                        statut:
                            position.statut,

                        date_prevue:
                            position.date_prevue
                    };

                }

            }
        );

        missions =
            Object.values(
                missionsParId
            );

        remplirFiltreMissions();

        definirTexte(
            "nombreMissions",
            Number(
                resume.nombre_missions ||
                0
            )
        );

        definirTexte(
            "nombreMissionsEnCours",
            Number(
                resume.nombre_missions_en_cours ||
                0
            )
        );

        definirTexte(
            "nombrePositions",
            Number(
                resume.nombre_positions ||
                positions.length
            )
        );

        definirTexte(
            "nombreAgentsLocalises",
            Number(
                resume.nombre_agents_localises ||
                0
            )
        );

        afficherCarte();

    } catch (erreur) {

        console.error(
            erreur
        );

        afficherErreur(
            erreur.message ||
            "Impossible de charger les positions GPS."
        );

        missions = [];
        positions = [];

        definirTexte(
            "nombreMissions",
            0
        );

        definirTexte(
            "nombreMissionsEnCours",
            0
        );

        definirTexte(
            "nombrePositions",
            0
        );

        definirTexte(
            "nombreAgentsLocalises",
            0
        );

        remplirFiltreMissions();
        afficherCarte();

    } finally {

        boutonActualiser.disabled =
            false;

        boutonActualiser.textContent =
            "Actualiser";

    }

}

    boutonActualiser.addEventListener(
        "click",
        chargerCarte
    );

    rechercheCarte.addEventListener(
        "input",
        afficherCarte
    );

    filtreMission.addEventListener(
        "change",
        afficherCarte
    );

    filtreStatut.addEventListener(
        "change",
        afficherCarte
    );

    window.addEventListener(
        "resize",
        function () {

            if (carte) {

                carte.invalidateSize();

            }

        }
    );

    chargerCarte();

})();