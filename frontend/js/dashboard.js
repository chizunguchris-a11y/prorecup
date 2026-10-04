(function () {

    "use strict";

    if (!window.ProRecup) {

        const afficherErreurNoyau = () => {

            if (
                document.querySelector(
                    ".pr-erreur-systeme"
                )
            ) {
                return;
            }

            const erreur =
                document.createElement(
                    "div"
                );

            erreur.className =
                "pr-erreur-systeme";

            erreur.setAttribute(
                "role",
                "alert"
            );

            erreur.textContent =
                "Une ressource essentielle de Pro R?cup n?a pas pu ?tre charg?e. Actualisez la page. Si le probl?me persiste, contactez l?administrateur.";

            document.body.prepend(
                erreur
            );
        };

        if (document.body) {

            afficherErreurNoyau();

        } else {

            document.addEventListener(
                "DOMContentLoaded",
                afficherErreurNoyau,
                { once: true }
            );
        }

        console.error(
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
        element("boutonActualiserDashboard");

    var erreurDashboard =
        element("erreurDashboard");

    var corpsTableauStocks =
        element("corpsTableauStocks");

    var listeMissions =
        element("listeMissionsRecentes");

    var listeAlertes =
        element("listeAlertes");

    var nombreAlertes =
        element("nombreAlertes");

    var dernieresCollectes = [];

    function definirTexte(id, valeur) {

        var cible = element(id);

        if (cible) {
            cible.textContent = valeur;
        }

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
                minimumFractionDigits: 0,
                maximumFractionDigits:
                    decimales || 0
            }
        );

    }

    function normaliserDevise(
        valeur
    ) {

        return String(
            valeur || ""
        )
            .trim()
            .toUpperCase();

    }

    function formaterMontantDevise(
        valeur,
        devise
    ) {

        var montant =
            formaterNombre(
                valeur,
                2
            );

        var code =
            normaliserDevise(
                devise
            );

        if (code === "CDF") {
            return montant + " FC";
        }

        if (code === "USD") {
            return montant + " $";
        }

        if (
            code ===
            "NON_RENSEIGNEE"
        ) {
            return montant;
        }

        return code
            ? montant + " " + code
            : montant;

    }

    function formaterChiffreAffairesParDevise(
        valeurs
    ) {

        if (
            !valeurs ||
            typeof valeurs !== "object"
        ) {
            return "0 de chiffre d?affaires";
        }

        var devises =
            Object.keys(
                valeurs
            ).sort();

        if (!devises.length) {
            return "0 de chiffre d?affaires";
        }

        return devises
            .map(
                function (devise) {

                    if (
                        devise ===
                        "NON_RENSEIGNEE"
                    ) {
                        return (
                            "Devise non renseign\u00e9e : " +
                            formaterMontantDevise(
                                valeurs[devise],
                                devise
                            )
                        );
                    }

                    return (
                        devise +
                        " : " +
                        formaterMontantDevise(
                            valeurs[devise],
                            devise
                        )
                    );

                }
            )
            .join(" ? ");

    }

    function formaterDate(valeur) {

        if (!valeur) {
            return "Date non renseignée";
        }

        var date = new Date(valeur);

        if (isNaN(date.getTime())) {
            return String(valeur);
        }

        return date.toLocaleDateString(
            "fr-FR"
        );

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

    function afficherErreur(message) {

        if (!erreurDashboard) {
            return;
        }

        erreurDashboard.textContent =
            message;

        erreurDashboard.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        if (!erreurDashboard) {
            return;
        }

        erreurDashboard.textContent = "";

        erreurDashboard.classList.add(
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

    function extraireObjet(resultat) {

        if (
            resultat &&
            resultat.data &&
            !Array.isArray(resultat.data)
        ) {
            return resultat.data;
        }

        return resultat || {};

    }

    async function appelerApi(chemin) {

        try {

            var resultat =
                await ProRecup.requete(
                    chemin
                );

            return {
                succes: true,
                chemin: chemin,
                resultat: resultat
            };

        } catch (erreur) {

            console.error(
                "Erreur API " + chemin,
                erreur
            );

            return {
                succes: false,
                chemin: chemin,
                erreur: erreur
            };

        }

    }

    function estDisponible(objet) {

        return (
            objet.disponible === true ||
            objet.disponible === "true" ||
            objet.disponible === 1 ||
            objet.disponible === "1" ||
            objet.statut === "disponible"
        );

    }

    function obtenirQuantite(stock) {

        var valeur = stock.quantite;

        if (
            valeur === undefined ||
            valeur === null
        ) {
            valeur =
                stock.quantite_disponible;
        }

        valeur = Number(valeur);

        return isNaN(valeur)
            ? 0
            : valeur;

    }

    function afficherStocks(stocks) {

        corpsTableauStocks.innerHTML = "";

        if (!stocks.length) {

            corpsTableauStocks.innerHTML =
                '<tr>' +
                '<td colspan="4" class="etat-tableau">' +
                "Aucun stock disponible." +
                "</td>" +
                "</tr>";

            return;

        }

        stocks.forEach(function (stock) {

            var ligne =
                document.createElement("tr");

            var matiere =
                document.createElement("td");

            var quantite =
                document.createElement("td");

            var unite =
                document.createElement("td");

            var date =
                document.createElement("td");

            matiere.className =
                "nom-matiere";

            quantite.className =
                "quantite-matiere";

            matiere.textContent =
                stock.type_dechet ||
                stock.matiere ||
                "Non renseigné";

            quantite.textContent =
                formaterNombre(
                    obtenirQuantite(stock),
                    2
                );

            unite.textContent =
                stock.unite || "kg";

            date.textContent =
                formaterDate(
                    stock.date_mise_a_jour ||
                    stock.modifie_le
                );

            ligne.appendChild(matiere);
            ligne.appendChild(quantite);
            ligne.appendChild(unite);
            ligne.appendChild(date);

            corpsTableauStocks.appendChild(
                ligne
            );

        });

    }

    function afficherMissions(missions) {

        listeMissions.innerHTML = "";

        if (!missions.length) {

            listeMissions.innerHTML =
                '<div class="etat-vide">' +
                "Aucune mission enregistrée." +
                "</div>";

            return;

        }

        missions
            .slice()
            .sort(function (a, b) {

                return (
                    new Date(
                        b.date_prevue ||
                        b.cree_le ||
                        0
                    ).getTime() -
                    new Date(
                        a.date_prevue ||
                        a.cree_le ||
                        0
                    ).getTime()
                );

            })
            .slice(0, 5)
            .forEach(function (mission) {

                var carte =
                    document.createElement(
                        "article"
                    );

                var infos =
                    document.createElement(
                        "div"
                    );

                var titre =
                    document.createElement(
                        "strong"
                    );

                var detail =
                    document.createElement(
                        "span"
                    );

                var statut =
                    document.createElement(
                        "span"
                    );

                carte.className =
                    "mission-recente";

                titre.textContent =
                    mission.agent_nom ||
                    "Mission sans agent";

                detail.textContent =
                    formaterDate(
                        mission.date_prevue
                    ) +
                    " — " +
                    (
                        mission.tricycle_numero ||
                        mission.numero_interne ||
                        "Tricycle non renseigné"
                    );

                statut.className =
                    "statut-mission statut-" +
                    (
                        mission.statut ||
                        "planifiee"
                    );

                statut.textContent =
                    mission.statut ||
                    "planifiee";

                infos.appendChild(titre);
                infos.appendChild(detail);

                carte.appendChild(infos);
                carte.appendChild(statut);

                listeMissions.appendChild(
                    carte
                );

            });

    }

    function prioriteNiveauAlerte(niveau) {

        if (niveau === "critique") {
            return 0;
        }

        if (niveau === "vigilance") {
            return 1;
        }

        return 2;

    }


    function afficherAlertes(
        missions,
        collectes,
        agents,
        tricycles,
        incidents
    ) {

        var alertes = [];

        incidents.forEach(
            function (incident) {

                var niveau =
                    incident.niveau ||
                    "information";

                alertes.push({
                    niveau: niveau,
                    priorite:
                        prioriteNiveauAlerte(niveau),
                    titre:
                        incident.titre ||
                        "Incident terrain",
                    detail:
                        incident.detail ||
                        "Incident terrain signale.",
                    lien:
                        incident.lien ||
                        "./carte.html",
                    action:
                        "Voir sur la carte"
                });

            }
        );


        var collectesEchec =
            collectes.filter(
                function (collecte) {

                    return (
                        normaliserStatutCommandCenter(
                            collecte.statut
                        ) === "echec"
                    );

                }
            ).length;


        var collectesAttente =
            collectes.filter(
                function (collecte) {

                    var statut =
                        normaliserStatutCommandCenter(
                            collecte.statut
                        );

                    return (
                        statut === "en_attente" ||
                        statut === "planifiee"
                    );

                }
            ).length;


        var agentsSuspendus =
            agents.filter(
                function (agent) {

                    return (
                        normaliserStatutCommandCenter(
                            agent.statut
                        ) === "suspendu"
                    );

                }
            ).length;


        var tricyclesMaintenance =
            tricycles.filter(
                function (tricycle) {

                    return (
                        normaliserStatutCommandCenter(
                            tricycle.statut
                        ) === "maintenance"
                    );

                }
            ).length;


        var aujourdHui =
            normaliserDate(
                new Date()
            );


        var missionsNonCloturees =
            missions.filter(
                function (mission) {

                    var statut =
                        normaliserStatutCommandCenter(
                            mission.statut
                        );

                    var datePrevue =
                        normaliserDate(
                            mission.date_prevue
                        );

                    return (
                        datePrevue &&
                        datePrevue < aujourdHui &&
                        (
                            statut === "planifiee" ||
                            statut === "en_cours"
                        )
                    );

                }
            ).length;


        if (collectesEchec) {

            alertes.push({
                niveau: "critique",
                priorite: 0,
                titre: "Collectes en echec",
                detail:
                    collectesEchec +
                    " collecte(s) necessitent une verification.",
                lien: "./collectes.html",
                action: "Voir les collectes"
            });

        }


        if (missionsNonCloturees) {

            alertes.push({
                niveau: "vigilance",
                priorite: 1,
                titre: "Missions passees non cloturees",
                detail:
                    missionsNonCloturees +
                    " mission(s) anciennes sont encore ouvertes.",
                lien: "./missions.html",
                action: "Verifier les missions"
            });

        }


        if (collectesAttente) {

            alertes.push({
                niveau: "vigilance",
                priorite: 1,
                titre: "Collectes a planifier",
                detail:
                    collectesAttente +
                    " collecte(s) attendent une action.",
                lien: "./collectes.html",
                action: "Planifier"
            });

        }


        if (agentsSuspendus) {

            alertes.push({
                niveau: "vigilance",
                priorite: 1,
                titre: "Agents suspendus",
                detail:
                    agentsSuspendus +
                    " agent(s) sont indisponibles.",
                lien: "./agents.html",
                action: "Voir les agents"
            });

        }


        if (tricyclesMaintenance) {

            alertes.push({
                niveau: "vigilance",
                priorite: 1,
                titre: "Tricycles en maintenance",
                detail:
                    tricyclesMaintenance +
                    " tricycle(s) reduisent la capacite logistique.",
                lien: "./tricycles.html",
                action: "Voir les tricycles"
            });

        }


        alertes.sort(
            function (a, b) {

                return a.priorite -
                    b.priorite;

            }
        );


        nombreAlertes.textContent =
            String(alertes.length);

        listeAlertes.innerHTML = "";


        if (!alertes.length) {

            listeAlertes.innerHTML =
                '<article class="alerte-operationnelle alerte-succes">' +
                "<strong>Aucun probleme detecte</strong>" +
                "<span>La situation operationnelle est normale.</span>" +
                "</article>";

            return;

        }


        alertes
            .slice(0, 8)
            .forEach(
                function (alerte) {

                    var carte =
                        document.createElement(
                            "article"
                        );

                    var contenu =
                        document.createElement(
                            "div"
                        );

                    var titre =
                        document.createElement(
                            "strong"
                        );

                    var detail =
                        document.createElement(
                            "span"
                        );

                    carte.className =
                        "alerte-operationnelle " +
                        "alerte-" +
                        alerte.niveau;

                    contenu.className =
                        "alerte-operationnelle-contenu";

                    titre.textContent =
                        alerte.titre;

                    detail.textContent =
                        alerte.detail;

                    contenu.appendChild(titre);
                    contenu.appendChild(detail);
                    carte.appendChild(contenu);


                    if (alerte.lien) {

                        var action =
                            document.createElement(
                                "a"
                            );

                        action.className =
                            "alerte-operationnelle-action";

                        action.href =
                            alerte.lien;

                        action.textContent =
                            alerte.action ||
                            "Ouvrir";

                        carte.appendChild(action);

                    }


                    listeAlertes.appendChild(carte);

                }
            );

    }


    function preparerCanvas(canvas) {

        if (!canvas) {
            return null;
        }

        var contexte =
            canvas.getContext("2d");

        var largeur =
            canvas.clientWidth || 600;

        var hauteur =
            canvas.clientHeight || 300;

        var ratio =
            window.devicePixelRatio || 1;

        canvas.width =
            Math.round(
                largeur * ratio
            );

        canvas.height =
            Math.round(
                hauteur * ratio
            );

        contexte.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );

        contexte.clearRect(
            0,
            0,
            largeur,
            hauteur
        );

        return {
            contexte: contexte,
            largeur: largeur,
            hauteur: hauteur
        };

    }

    function obtenirDateCollecte(
        collecte
    ) {

        return (
            collecte.date_collecte ||
            collecte.date_prevue ||
            collecte.cree_le ||
            collecte.date_creation ||
            null
        );

    }

    function obtenirTypeCollecte(
        collecte
    ) {

        return (
            collecte.type_dechet ||
            collecte.nom_type_dechet ||
            collecte.matiere ||
            "Non renseigné"
        );

    }

    function dessinerEvolution(
        collectes
    ) {

        var canvas =
            element("graphiqueCollectes");

        var message =
            element(
                "messageGraphiqueCollectes"
            );

        var dessin =
            preparerCanvas(canvas);

        if (!dessin) {
            return;
        }

        var jours = [];
        var aujourdHui = new Date();

        aujourdHui.setHours(
            0,
            0,
            0,
            0
        );

        var i;

        for (
            i = 29;
            i >= 0;
            i -= 1
        ) {

            var date =
                new Date(
                    aujourdHui.getTime()
                );

            date.setDate(
                aujourdHui.getDate() - i
            );

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

            jours.push({
                date: date,
                cle:
                    date.getFullYear() +
                    "-" +
                    mois +
                    "-" +
                    jour,
                valeur: 0
            });

        }

        collectes.forEach(
            function (collecte) {

                var date =
                    obtenirDateCollecte(
                        collecte
                    );

                if (!date) {
                    return;
                }

                var cle =
                    normaliserDate(date);

                jours.forEach(
                    function (jour) {

                        if (
                            jour.cle === cle
                        ) {
                            jour.valeur += 1;
                        }

                    }
                );

            }
        );

        var total = 0;
        var maximum = 1;

        jours.forEach(function (jour) {

            total += jour.valeur;

            if (jour.valeur > maximum) {
                maximum = jour.valeur;
            }

        });

        message.classList.toggle(
            "cache",
            total > 0
        );

        var ctx =
            dessin.contexte;

        var largeur =
            dessin.largeur;

        var hauteur =
            dessin.hauteur;

        var gauche = 42;
        var droite = 20;
        var haut = 20;
        var bas = 42;

        var largeurUtile =
            largeur - gauche - droite;

        var hauteurUtile =
            hauteur - haut - bas;

        maximum =
            Math.max(
                4,
                Math.ceil(
                    maximum / 4
                ) * 4
            );

        ctx.font = "10px Arial";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        for (
            i = 0;
            i <= 4;
            i += 1
        ) {

            var y =
                haut +
                hauteurUtile *
                i /
                4;

            var valeur =
                maximum -
                maximum *
                i /
                4;

            ctx.beginPath();

            ctx.moveTo(
                gauche,
                y
            );

            ctx.lineTo(
                largeur - droite,
                y
            );

            ctx.strokeStyle =
                "#e2e8f0";

            ctx.stroke();

            ctx.fillStyle =
                "#94a3b8";

            ctx.fillText(
                String(
                    Math.round(valeur)
                ),
                gauche - 8,
                y
            );

        }

        function obtenirX(position) {

            return (
                gauche +
                largeurUtile *
                position /
                (
                    jours.length - 1
                )
            );

        }

        function obtenirY(valeur) {

            return (
                haut +
                hauteurUtile -
                hauteurUtile *
                valeur /
                maximum
            );

        }

        ctx.beginPath();

        jours.forEach(
            function (
                jour,
                position
            ) {

                var x =
                    obtenirX(position);

                var y =
                    obtenirY(
                        jour.valeur
                    );

                if (position === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

            }
        );

        ctx.strokeStyle =
            "#16a34a";

        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.stroke();

        ctx.lineTo(
            obtenirX(
                jours.length - 1
            ),
            haut + hauteurUtile
        );

        ctx.lineTo(
            obtenirX(0),
            haut + hauteurUtile
        );

        ctx.closePath();

        var degrade =
            ctx.createLinearGradient(
                0,
                haut,
                0,
                haut + hauteurUtile
            );

        degrade.addColorStop(
            0,
            "rgba(22, 163, 74, 0.25)"
        );

        degrade.addColorStop(
            1,
            "rgba(22, 163, 74, 0.02)"
        );

        ctx.fillStyle =
            degrade;

        ctx.fill();

        ctx.fillStyle =
            "#64748b";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "top";

        [
            0,
            7,
            14,
            21,
            29
        ].forEach(
            function (position) {

                ctx.fillText(
                    jours[position]
                        .date
                        .toLocaleDateString(
                            "fr-FR",
                            {
                                day:
                                    "2-digit",

                                month:
                                    "2-digit"
                            }
                        ),
                    obtenirX(position),
                    haut +
                    hauteurUtile +
                    14
                );

            }
        );

    }

    function dessinerRepartition(
        collectes
    ) {

        var canvas =
            element(
                "graphiqueTypesDechets"
            );

        var message =
            element(
                "messageGraphiqueTypes"
            );

        var legende =
            element(
                "legendeTypesDechets"
            );

        var dessin =
            preparerCanvas(canvas);

        if (!dessin) {
            return;
        }

        var repartition = {};

        collectes.forEach(
            function (collecte) {

                var type =
                    obtenirTypeCollecte(
                        collecte
                    );

                if (!repartition[type]) {
                    repartition[type] = 0;
                }

                repartition[type] += 1;

            }
        );

        var donnees =
            Object.keys(
                repartition
            ).map(
                function (libelle) {

                    return {
                        libelle:
                            libelle,

                        valeur:
                            repartition[
                                libelle
                            ]
                    };

                }
            );

        var total = 0;

        donnees.forEach(
            function (donnee) {

                total +=
                    donnee.valeur;

            }
        );

        message.classList.toggle(
            "cache",
            total > 0
        );

        legende.innerHTML = "";

        if (!total) {
            return;
        }

        var couleurs = [
            "#16a34a",
            "#2563eb",
            "#f97316",
            "#7c3aed",
            "#0891b2",
            "#db2777",
            "#ca8a04",
            "#475569"
        ];

        var ctx =
            dessin.contexte;

        var centreX =
            dessin.largeur / 2;

        var centreY =
            dessin.hauteur / 2;

        var rayon =
            Math.min(
                dessin.largeur,
                dessin.hauteur
            ) * 0.32;

        var rayonInterieur =
            rayon * 0.58;

        var angleDepart =
            -Math.PI / 2;

        donnees.forEach(
            function (
                donnee,
                index
            ) {

                var proportion =
                    donnee.valeur /
                    total;

                var angleFin =
                    angleDepart +
                    proportion *
                    Math.PI *
                    2;

                ctx.beginPath();

                ctx.arc(
                    centreX,
                    centreY,
                    rayon,
                    angleDepart,
                    angleFin
                );

                ctx.arc(
                    centreX,
                    centreY,
                    rayonInterieur,
                    angleFin,
                    angleDepart,
                    true
                );

                ctx.closePath();

                ctx.fillStyle =
                    couleurs[
                        index %
                        couleurs.length
                    ];

                ctx.fill();

                angleDepart =
                    angleFin;

                var item =
                    document.createElement(
                        "div"
                    );

                var couleur =
                    document.createElement(
                        "span"
                    );

                var libelle =
                    document.createElement(
                        "span"
                    );

                var valeur =
                    document.createElement(
                        "strong"
                    );

                item.className =
                    "element-legende";

                couleur.className =
                    "couleur-legende";

                libelle.className =
                    "texte-legende";

                valeur.className =
                    "valeur-legende";

                couleur.style.backgroundColor =
                    couleurs[
                        index %
                        couleurs.length
                    ];

                libelle.textContent =
                    donnee.libelle;

                valeur.textContent =
                    Math.round(
                        proportion * 100
                    ) +
                    " %";

                item.appendChild(couleur);
                item.appendChild(libelle);
                item.appendChild(valeur);

                legende.appendChild(item);

            }
        );

        ctx.fillStyle =
            "#0f172a";

        ctx.font =
            "700 26px Arial";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            String(total),
            centreX,
            centreY - 8
        );

        ctx.fillStyle =
            "#64748b";

        ctx.font =
            "11px Arial";

        ctx.fillText(
            "collectes",
            centreX,
            centreY + 17
        );

    }

    function afficherGraphiques(
        collectes
    ) {

        dernieresCollectes =
            collectes.slice();

        dessinerEvolution(
            collectes
        );

        dessinerRepartition(
            collectes
        );

    }

    function normaliserStatutCommandCenter(
        valeur
    ) {

        return String(
            valeur || ""
        )
            .trim()
            .toLowerCase();

    }


    function mettreAJourCommandCenter(
        missionsJour,
        collectes,
        agents,
        tricycles,
        incidents
    ) {

        var missionsEnCours =
            missionsJour.filter(
                function (mission) {

                    return (
                        normaliserStatutCommandCenter(
                            mission.statut
                        ) === "en_cours"
                    );

                }
            ).length;


        var missionsTerminees =
            missionsJour.filter(
                function (mission) {

                    var statut =
                        normaliserStatutCommandCenter(
                            mission.statut
                        );

                    return (
                        statut === "terminee" ||
                        statut === "validee" ||
                        statut === "valide"
                    );

                }
            ).length;


        var collectesAction =
            collectes.filter(
                function (collecte) {

                    var statut =
                        normaliserStatutCommandCenter(
                            collecte.statut
                        );

                    return (
                        statut === "en_attente" ||
                        statut === "planifiee"
                    );

                }
            ).length;


        var collectesEchec =
            collectes.filter(
                function (collecte) {

                    return (
                        normaliserStatutCommandCenter(
                            collecte.statut
                        ) === "echec"
                    );

                }
            ).length;


        var agentsDisponibles =
            agents.filter(
                function (agent) {

                    return (
                        normaliserStatutCommandCenter(
                            agent.statut
                        ) !== "suspendu" &&
                        estDisponible(agent)
                    );

                }
            ).length;


        var agentsSuspendus =
            agents.filter(
                function (agent) {

                    return (
                        normaliserStatutCommandCenter(
                            agent.statut
                        ) === "suspendu"
                    );

                }
            ).length;


        var tricyclesDisponibles =
            tricycles.filter(
                function (tricycle) {

                    return estDisponible(
                        tricycle
                    );

                }
            ).length;


        var tricyclesMaintenance =
            tricycles.filter(
                function (tricycle) {

                    return (
                        normaliserStatutCommandCenter(
                            tricycle.statut
                        ) === "maintenance"
                    );

                }
            ).length;


        definirTexte(
            "ccMissionsJour",
            formaterNombre(
                missionsJour.length
            )
        );


        definirTexte(
            "ccMissionsDetail",
            missionsEnCours +
            " en cours ? " +
            missionsTerminees +
            " termin?e(s)"
        );


        definirTexte(
            "ccCollectesAction",
            formaterNombre(
                collectesAction
            )
        );


        definirTexte(
            "ccCollectesDetail",
            collectesAction
                ? "Collectes n?cessitant une action"
                : "Aucune collecte en attente"
        );


        definirTexte(
            "ccAgentsDisponibles",
            agentsDisponibles +
            " / " +
            agents.length
        );


        definirTexte(
            "ccAgentsDetail",
            agentsSuspendus
                ? agentsSuspendus +
                  " agent(s) suspendu(s)"
                : "Aucune suspension d?tect?e"
        );


        definirTexte(
            "ccTricyclesDisponibles",
            tricyclesDisponibles +
            " / " +
            tricycles.length
        );


        definirTexte(
            "ccTricyclesDetail",
            tricyclesMaintenance
                ? tricyclesMaintenance +
                  " en maintenance"
                : "Parc disponible normalement"
        );


        var incidentsCritiques =
            incidents.filter(
                function (incident) {

                    return (
                        incident.niveau === "critique" ||
                        incident.bloquant === true
                    );

                }
            ).length;


        var statutGlobal =
            element(
                "ccStatutGlobal"
            );

        var prioriteAction =
            element(
                "ccPrioriteAction"
            );

        var titrePriorite =
            "Situation op?rationnelle normale";

        var detailPriorite =
            "Aucune action urgente d?tect?e par le syst?me.";

        var lienPriorite =
            "./missions.html";

        var libelleAction =
            "Voir les missions";

        var classeStatut =
            "statut-actif";

        var texteStatut =
            missionsEnCours
                ? "Op?rations en cours"
                : "Situation sous contr?le";


        if (incidentsCritiques > 0) {

            classeStatut =
                "statut-critique";

            texteStatut =
                "Incident terrain critique";

            titrePriorite =
                "Traiter incident terrain prioritaire";

            detailPriorite =
                incidentsCritiques +
                " incident(s) critique(s) ou bloquant(s) signale(s) recemment.";

            lienPriorite =
                "./carte.html";

            libelleAction =
                "Ouvrir la carte";

        }
        else if (collectesEchec > 0) {

            classeStatut =
                "statut-critique";

            texteStatut =
                "Intervention requise";

            titrePriorite =
                "Traiter les collectes en ?chec";

            detailPriorite =
                collectesEchec +
                " collecte(s) n?cessitent une v?rification imm?diate.";

            lienPriorite =
                "./collectes.html";

            libelleAction =
                "Voir les collectes";

        }
        else if (tricyclesMaintenance > 0) {

            classeStatut =
                "statut-vigilance";

            texteStatut =
                "Capacit? r?duite";

            titrePriorite =
                "S?curiser la capacit? logistique";

            detailPriorite =
                tricyclesMaintenance +
                " tricycle(s) sont actuellement en maintenance.";

            lienPriorite =
                "./tricycles.html";

            libelleAction =
                "Voir les tricycles";

        }
        else if (agentsSuspendus > 0) {

            classeStatut =
                "statut-vigilance";

            texteStatut =
                "Ressources ? v?rifier";

            titrePriorite =
                "V?rifier les agents suspendus";

            detailPriorite =
                agentsSuspendus +
                " agent(s) sont actuellement suspendu(s).";

            lienPriorite =
                "./agents.html";

            libelleAction =
                "Voir les agents";

        }
        else if (collectesAction > 0) {

            classeStatut =
                "statut-vigilance";

            texteStatut =
                "Planification requise";

            titrePriorite =
                "Planifier les prochaines collectes";

            detailPriorite =
                collectesAction +
                " collecte(s) attendent une action op?rationnelle.";

            lienPriorite =
                "./collectes.html";

            libelleAction =
                "Planifier";

        }
        else if (missionsEnCours > 0) {

            titrePriorite =
                "Suivre les missions en cours";

            detailPriorite =
                missionsEnCours +
                " mission(s) sont actuellement sur le terrain.";

            lienPriorite =
                "./missions.html";

            libelleAction =
                "Suivre les missions";

        }


        if (statutGlobal) {

            statutGlobal.className =
                "command-center-statut " +
                classeStatut;

            statutGlobal.textContent =
                texteStatut;

        }


        definirTexte(
            "ccPrioriteTitre",
            titrePriorite
        );


        definirTexte(
            "ccPrioriteDetail",
            detailPriorite
        );


        if (prioriteAction) {

            prioriteAction.href =
                lienPriorite;

            prioriteAction.textContent =
                libelleAction;

        }


        var maintenant =
            new Date();

        definirTexte(
            "ccDerniereActualisation",
            "Actualis? ? " +
            maintenant.toLocaleTimeString(
                "fr-FR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
        );

    }

    function analyserSanteSources(
        resultats
    ) {

        var noms = [
            "R?sum?",
            "Missions",
            "Collectes",
            "Agents",
            "Tricycles",
            "Stocks"
        ];

        var indisponibles = [];

        resultats.forEach(
            function (resultat, index) {

                if (
                    !resultat ||
                    resultat.succes !== true
                ) {

                    indisponibles.push(
                        noms[index] ||
                        "Source " +
                        (index + 1)
                    );

                }

            }
        );

        return {

            total:
                noms.length,

            disponibles:
                noms.length -
                indisponibles.length,

            indisponibles:
                indisponibles,

            dashboardDisponible:
                Boolean(
                    resultats[0] &&
                    resultats[0].succes === true
                ),

            critique:
                !(
                    resultats[0] &&
                    resultats[0].succes === true
                ) ||
                indisponibles.length >= 3

        };

    }


    function afficherSanteSources(
        etat
    ) {

        var cible =
            element(
                "ccSanteSources"
            );

        if (!cible) {
            return;
        }


        if (
            etat.indisponibles.length === 0
        ) {

            cible.className =
                "command-center-sources sources-ok";

            cible.textContent =
                etat.disponibles +
                "/" +
                etat.total +
                " sources disponibles";

            return;

        }


        if (etat.critique) {

            cible.className =
                "command-center-sources sources-critiques";

            cible.textContent =
                "Vue incompl?te ? " +
                etat.disponibles +
                "/" +
                etat.total;

        }
        else {

            cible.className =
                "command-center-sources sources-partielles";

            cible.textContent =
                "Donn?es partielles ? " +
                etat.disponibles +
                "/" +
                etat.total;

        }

    }


    function appliquerAlerteSanteSources(
        etat
    ) {

        if (
            !etat ||
            etat.indisponibles.length === 0
        ) {

            return;

        }

        var statutGlobal =
            element(
                "ccStatutGlobal"
            );


        if (etat.critique) {

            if (statutGlobal) {

                statutGlobal.className =
                    "command-center-statut statut-critique";

                statutGlobal.textContent =
                    "Vue op?rationnelle incompl?te";

            }

            definirTexte(
                "ccPrioriteTitre",
                "Certaines donn?es ne sont pas disponibles"
            );

            definirTexte(
                "ccPrioriteDetail",
                "Sources indisponibles : " +
                etat.indisponibles.join(", ") +
                ". Ne pas interpr?ter les valeurs manquantes comme des z?ros."
            );

            var action =
                element(
                    "ccPrioriteAction"
                );

            if (action) {

                action.href =
                    "./dashboard.html";

                action.textContent =
                    "Actualiser";

            }

            return;

        }


        if (
            statutGlobal &&
            !statutGlobal.classList.contains(
                "statut-critique"
            )
        ) {

            statutGlobal.className =
                "command-center-statut statut-vigilance";

            statutGlobal.textContent =
                "Donn?es partielles";

        }

    }

    async function chargerDashboard() {

        cacherErreur();

        boutonActualiser.disabled =
            true;

        boutonActualiser.textContent =
            "Chargement...";

        try {

            var resultats =
                await Promise.all([

                    appelerApi(
                        "/api/dashboard"
                    ),

                    appelerApi(
                        "/api/missions"
                    ),

                    appelerApi(
                        "/api/collectes"
                    ),

                    appelerApi(
                        "/api/agents"
                    ),

                    appelerApi(
                        "/api/tricycles"
                    ),

                    appelerApi(
                        "/api/stocks"
                    )

                ]);


            var santeSources =
                analyserSanteSources(
                    resultats
                );

            afficherSanteSources(
                santeSources
            );

            var dashboard =
                resultats[0].succes
                    ? extraireObjet(
                        resultats[0].resultat
                    )
                    : {};


            var incidents =
                Array.isArray(
                    dashboard.alertes_operationnelles
                )
                    ? dashboard.alertes_operationnelles
                    : [];


            var missions =
                resultats[1].succes
                    ? extraireListe(
                        resultats[1].resultat
                    )
                    : [];

            var collectes =
                resultats[2].succes
                    ? extraireListe(
                        resultats[2].resultat
                    )
                    : [];

            var agents =
                resultats[3].succes
                    ? extraireListe(
                        resultats[3].resultat
                    )
                    : [];

            var tricycles =
                resultats[4].succes
                    ? extraireListe(
                        resultats[4].resultat
                    )
                    : [];

            var stocks =
                resultats[5].succes
                    ? extraireListe(
                        resultats[5].resultat
                    )
                    : [];

            var maintenant =
                new Date();

            var mois =
                String(
                    maintenant.getMonth() + 1
                );

            var jour =
                String(
                    maintenant.getDate()
                );

            if (mois.length < 2) {
                mois = "0" + mois;
            }

            if (jour.length < 2) {
                jour = "0" + jour;
            }

            var aujourdHui =
                maintenant.getFullYear() +
                "-" +
                mois +
                "-" +
                jour;

            var missionsJour =
                missions.filter(
                    function (mission) {

                        return (
                            normaliserDate(
                                mission.date_prevue
                            ) ===
                            aujourdHui
                        );

                    }
                );

            var missionsEnCours =
                missionsJour.filter(
                    function (mission) {

                        return (
                            mission.statut ===
                            "en_cours"
                        );

                    }
                ).length;

            var collectesAttente =
                collectes.filter(
                    function (collecte) {

                        return (
                            collecte.statut ===
                                "en_attente" ||
                            collecte.statut ===
                                "planifiee"
                        );

                    }
                );

            var agentsDisponibles =
                agents.filter(
                    function (agent) {

                        return (
                            agent.statut !==
                                "suspendu" &&
                            estDisponible(agent)
                        );

                    }
                );

            var tricyclesDisponibles =
                tricycles.filter(
                    function (tricycle) {

                        return estDisponible(
                            tricycle
                        );

                    }
                );

            var totalStock = 0;

            stocks.forEach(
                function (stock) {

                    totalStock +=
                        obtenirQuantite(stock);

                }
            );

            mettreAJourCommandCenter(
                missionsJour,
                collectes,
                agents,
                tricycles,
                incidents
            );


            appliquerAlerteSanteSources(
                santeSources
            );

            var ventes =
                dashboard.ventes || {};


            definirTexte(
                "kpiMissionsJour",
                formaterNombre(
                    missionsJour.length
                )
            );

            definirTexte(
                "detailMissionsJour",
                missionsEnCours +
                " mission(s) en cours"
            );

            definirTexte(
                "kpiCollectesAttente",
                formaterNombre(
                    collectesAttente.length
                )
            );

            definirTexte(
                "detailCollectesAttente",
                collectesAttente.length
                    ? "Collectes à planifier"
                    : "Aucune collecte à planifier"
            );

            definirTexte(
                "kpiAgentsDisponibles",
                formaterNombre(
                    agentsDisponibles.length
                )
            );

            definirTexte(
                "detailAgentsDisponibles",
                "Sur " +
                agents.length +
                " agent(s)"
            );

            definirTexte(
                "kpiTricyclesDisponibles",
                formaterNombre(
                    tricyclesDisponibles.length
                )
            );

            definirTexte(
                "detailTricyclesDisponibles",
                "Sur " +
                tricycles.length +
                " tricycle(s)"
            );

            definirTexte(
                "kpiStockTotal",
                formaterNombre(
                    totalStock,
                    2
                ) +
                " kg"
            );

            definirTexte(
                "kpiVentes",
                formaterNombre(
                    ventes.nombre ||
                    ventes.nombre_ventes ||
                    0
                )
            );

            definirTexte(
                "detailVentes",
                formaterChiffreAffairesParDevise(
                    ventes.chiffre_affaires_par_devise
                )
            );

            definirTexte(
                "kpiImpactCarbone",
                "En consolidation"
            );

            afficherStocks(stocks);

            afficherMissions(missions);

            afficherAlertes(
                missions,
                collectes,
                agents,
                tricycles,
                incidents
            );

            afficherGraphiques(
                collectes
            );

            var erreurs =
                resultats.filter(
                    function (resultat) {

                        return (
                            resultat.succes ===
                            false
                        );

                    }
                );

            if (erreurs.length) {

                afficherErreur(
                    "Certaines données n’ont pas pu être chargées."
                );

            }

        } catch (erreur) {

            console.error(
                erreur
            );

            afficherErreur(
                erreur.message ||
                "Impossible de charger le tableau de bord."
            );

        } finally {

            boutonActualiser.disabled =
                false;

            boutonActualiser.textContent =
                "Actualiser";

        }

    }

    boutonActualiser.addEventListener(
        "click",
        chargerDashboard
    );

    var minuterie = null;

    window.addEventListener(
        "resize",
        function () {

            window.clearTimeout(
                minuterie
            );

            minuterie =
                window.setTimeout(
                    function () {

                        afficherGraphiques(
                            dernieresCollectes
                        );

                    },
                    180
                );

        }
    );

    chargerDashboard();

})();