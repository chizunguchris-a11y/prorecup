console.log("missions.js chargé");

(function () {

    "use strict";

    if (!window.ProRecup) {

        throw new Error(
            "La bibliothèque commune ProRecup est introuvable."
        );

    }

    if (!ProRecup.protegerPage()) {
        return;
    }

    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    const obtenirElement = (
        id
    ) => document.getElementById(id);

    const boutonNouvelleMission =
        obtenirElement(
            "boutonNouvelleMission"
        );

    const boutonActualiser =
        obtenirElement(
            "boutonActualiser"
        );

    const champRecherche =
        obtenirElement(
            "champRecherche"
        );

    const filtreStatut =
        obtenirElement(
            "filtreStatut"
        );

    const corpsTableauMissions =
        obtenirElement(
            "corpsTableauMissions"
        );

    const nombreMissions =
        obtenirElement(
            "nombreMissions"
        );

    const nombrePlanifiees =
        obtenirElement(
            "nombrePlanifiees"
        );

    const nombreEnCours =
        obtenirElement(
            "nombreEnCours"
        );

    const nombreTerminees =
        obtenirElement(
            "nombreTerminees"
        );

    const fenetreMission =
        obtenirElement(
            "fenetreMission"
        );

    const formulaireMission =
        obtenirElement(
            "formulaireMission"
        );

    const titreModaleMission =
        obtenirElement(
            "titreModaleMission"
        );

    const boutonFermerMission =
        obtenirElement(
            "boutonFermerMission"
        );

    const boutonAnnulerMission =
        obtenirElement(
            "boutonAnnulerMission"
        );

    const boutonEnregistrerMission =
        obtenirElement(
            "boutonEnregistrerMission"
        );

    const erreurFormulaireMission =
        obtenirElement(
            "erreurFormulaireMission"
        );

    const champMissionId =
        obtenirElement(
            "missionId"
        );

    const champAgent =
        obtenirElement(
            "agent_id"
        );

    const champTricycle =
        obtenirElement(
            "tricycle_id"
        );

    const champDatePrevue =
        obtenirElement(
            "date_prevue"
        );

    const champHeureDepart =
        obtenirElement(
            "heure_depart_prevue"
        );

    const champHeureRetour =
        obtenirElement(
            "heure_retour_prevue"
        );

    const champObservations =
        obtenirElement(
            "observations"
        );

    const fenetreCollectesMission =
        obtenirElement(
            "fenetreCollectesMission"
        );

    const boutonFermerCollectes =
        obtenirElement(
            "boutonFermerCollectes"
        );

    const titreCollectesMission =
        obtenirElement(
            "titreCollectesMission"
        );

    const zoneAjoutCollecte =
        obtenirElement(
            "zoneAjoutCollecte"
        );

    const champCollecte =
        obtenirElement(
            "collecte_id"
        );

    const champOrdreCollecte =
        obtenirElement(
            "ordre_collecte"
        );

    const boutonAjouterCollecte =
        obtenirElement(
            "boutonAjouterCollecte"
        );

    const erreurCollectesMission =
        obtenirElement(
            "erreurCollectesMission"
        );

    const corpsCollectesMission =
        obtenirElement(
            "corpsCollectesMission"
        );

    const fenetreEvenementsMission =
        obtenirElement(
            "fenetreEvenementsMission"
        );

    const boutonFermerEvenements =
        obtenirElement(
            "boutonFermerEvenements"
        );

    const titreEvenementsMission =
        obtenirElement(
            "titreEvenementsMission"
        );

    const listeEvenementsMission =
        obtenirElement(
            "listeEvenementsMission"
        );

    let missions = [];
    let agents = [];
    let tricycles = [];
    let collectes = [];

    let missionSelectionnee =
        null;

    const extraireListe = (
        resultat
    ) => {

        if (
            Array.isArray(
                resultat
            )
        ) {
            return resultat;
        }

        if (
            Array.isArray(
                resultat?.data
            )
        ) {
            return resultat.data;
        }

        if (
            Array.isArray(
                resultat?.data?.data
            )
        ) {
            return resultat.data.data;
        }

        if (
            Array.isArray(
                resultat?.resultats
            )
        ) {
            return resultat.resultats;
        }

        return [];

    };

    const afficherErreur = (
        element,
        message
    ) => {

        if (!element) {
            return;
        }

        element.textContent =
            message;

        element.classList.remove(
            "cache"
        );

    };

    const cacherErreur = (
        element
    ) => {

        if (!element) {
            return;
        }

        element.textContent =
            "";

        element.classList.add(
            "cache"
        );

    };

    const ouvrirModale = (
        modale
    ) => {

        if (!modale) {
            return;
        }

        modale.classList.remove(
            "cache"
        );

        modale.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

    };

    const fermerModale = (
        modale
    ) => {

        if (!modale) {
            return;
        }

        modale.classList.add(
            "cache"
        );

        modale.setAttribute(
            "aria-hidden",
            "true"
        );

        const modaleOuverte =
            document.querySelector(
                ".modale:not(.cache)"
            );

        if (!modaleOuverte) {

            document.body.style.overflow =
                "";

        }

    };

    const formaterDateSimple = (
        date
    ) => {

        if (!date) {
            return "Non renseignée";
        }

        const correspondance =
            String(date).match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );

        if (correspondance) {

            return (
                `${correspondance[3]}/` +
                `${correspondance[2]}/` +
                `${correspondance[1]}`
            );

        }

        return ProRecup.formaterDate(
            date
        );

    };

    const obtenirDatePourChamp = (
        date
    ) => {

        if (!date) {
            return "";
        }

        const correspondance =
            String(date).match(
                /^(\d{4}-\d{2}-\d{2})/
            );

        return correspondance
            ? correspondance[1]
            : "";

    };

    const formaterHeure = (
        heure
    ) => {

        if (!heure) {
            return "—";
        }

        return String(heure).slice(
            0,
            5
        );

    };

    const formaterStatut = (
        statut
    ) => {

        const libelles = {

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

    };

    const formaterTypeEvenement = (
        type
    ) => {

        const libelles = {

            mission_demarree:
                "Mission démarrée",

            position_enregistree:
                "Position GPS",

            arrivee_site:
                "Arrivée sur site",

            collecte_demarree:
                "Collecte démarrée",

            collecte_terminee:
                "Collecte terminée",

            incident_signale:
                "Incident signalé",

            mission_terminee:
                "Mission terminée"

        };

        return (
            libelles[type] ||
            type ||
            "Événement"
        );

    };

    const creerBouton = (
        texte,
        classe,
        action
    ) => {

        const bouton =
            document.createElement(
                "button"
            );

        bouton.type =
            "button";

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

    const creerEtiquette = (
        texte,
        classe
    ) => {

        const etiquette =
            document.createElement(
                "span"
            );

        etiquette.className =
            `etiquette ${classe}`;

        etiquette.textContent =
            texte;

        return etiquette;

    };

    const mettreAJourResume =
        () => {

            nombreMissions.textContent =
                missions.length;

            nombrePlanifiees.textContent =
                missions.filter(
                    (mission) =>
                        mission.statut ===
                        "planifiee"
                ).length;

            nombreEnCours.textContent =
                missions.filter(
                    (mission) =>
                        mission.statut ===
                        "en_cours"
                ).length;

            nombreTerminees.textContent =
                missions.filter(
                    (mission) =>
                        mission.statut ===
                        "terminee"
                ).length;

        };

    const chargerReferences =
        async () => {

            const resultats =
                await Promise.all([
                    ProRecup.requete(
                        "/api/agents"
                    ),

                    ProRecup.requete(
                        "/api/tricycles"
                    ),

                    ProRecup.requete(
                        "/api/collectes"
                    )
                ]);

            agents =
                extraireListe(
                    resultats[0]
                );

            tricycles =
                extraireListe(
                    resultats[1]
                );

            collectes =
                extraireListe(
                    resultats[2]
                );

        };

    const afficherEtatChargement =
        () => {

            corpsTableauMissions.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="etat-tableau"
                    >
                        <span class="indicateur-chargement"></span>
                    </td>
                </tr>
            `;

        };

    const afficherMissions = (
        liste
    ) => {

        corpsTableauMissions.innerHTML =
            "";

        if (!liste.length) {

            corpsTableauMissions.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="etat-tableau"
                    >
                        Aucune mission trouvée.
                    </td>
                </tr>
            `;

            return;

        }

        liste.forEach(
            (mission) => {

                const ligne =
                    document.createElement(
                        "tr"
                    );

                const celluleDate =
                    document.createElement(
                        "td"
                    );

                celluleDate.textContent =
                    formaterDateSimple(
                        mission.date_prevue
                    );

                const celluleAgent =
                    document.createElement(
                        "td"
                    );

                const agentNom =
                    document.createElement(
                        "strong"
                    );

                agentNom.textContent =
                    mission.agent_nom ||
                    "Agent non renseigné";

                const agentEmail =
                    document.createElement(
                        "span"
                    );

                agentEmail.className =
                    "texte-secondaire";

                agentEmail.textContent =
                    mission.agent_email ||
                    "";

                celluleAgent.appendChild(
                    agentNom
                );

                celluleAgent.appendChild(
                    agentEmail
                );

                const celluleTricycle =
                    document.createElement(
                        "td"
                    );

                const numero =
                    document.createElement(
                        "strong"
                    );

                numero.textContent =
                    mission.tricycle_numero ||
                    "Non renseigné";

                const plaque =
                    document.createElement(
                        "span"
                    );

                plaque.className =
                    "texte-secondaire";

                plaque.textContent =
                    mission.plaque_identification ||
                    "";

                celluleTricycle.appendChild(
                    numero
                );

                celluleTricycle.appendChild(
                    plaque
                );

                const celluleHoraires =
                    document.createElement(
                        "td"
                    );

                celluleHoraires.textContent =
                    `${formaterHeure(
                        mission.heure_depart_prevue
                    )} → ${formaterHeure(
                        mission.heure_retour_prevue
                    )}`;

                const celluleStatut =
                    document.createElement(
                        "td"
                    );

                celluleStatut.appendChild(
                    creerEtiquette(
                        formaterStatut(
                            mission.statut
                        ),
                        `statut-${mission.statut}`
                    )
                );

                const celluleCollectes =
                    document.createElement(
                        "td"
                    );

                celluleCollectes.textContent =
                    String(
                        Number(
                            mission.nombre_collectes ||
                            0
                        )
                    );

                const celluleActions =
                    document.createElement(
                        "td"
                    );

                celluleActions.className =
                    "actions-ligne";

                celluleActions.appendChild(
                    creerBouton(
                        "Collectes",
                        "collectes",
                        () => {

                            console.log(
                                "Ouverture de la fenêtre Collectes"
                            );

                            ouvrirCollectesMission(
                                mission
                            );

                        }
                    )
                );

                celluleActions.appendChild(
                    creerBouton(
                        "Événements",
                        "evenements",
                        () =>
                            ouvrirEvenementsMission(
                                mission
                            )
                    )
                );

                if (
                    mission.statut ===
                    "planifiee"
                ) {

                    celluleActions.appendChild(
                        creerBouton(
                            "Modifier",
                            "modifier",
                            () =>
                                ouvrirModificationMission(
                                    mission
                                )
                        )
                    );

                    celluleActions.appendChild(
                        creerBouton(
                            "Démarrer",
                            "demarrer",
                            () =>
                                changerStatutMission(
                                    mission,
                                    "en_cours"
                                )
                        )
                    );

                    celluleActions.appendChild(
                        creerBouton(
                            "Annuler",
                            "annuler",
                            () =>
                                changerStatutMission(
                                    mission,
                                    "annulee"
                                )
                        )
                    );

                }

                if (
                    mission.statut ===
                    "en_cours"
                ) {

                    celluleActions.appendChild(
                        creerBouton(
                            "Terminer",
                            "terminer",
                            () =>
                                changerStatutMission(
                                    mission,
                                    "terminee"
                                )
                        )
                    );

                }

                [
                    celluleDate,
                    celluleAgent,
                    celluleTricycle,
                    celluleHoraires,
                    celluleStatut,
                    celluleCollectes,
                    celluleActions
                ].forEach(
                    (cellule) =>
                        ligne.appendChild(
                            cellule
                        )
                );

                corpsTableauMissions.appendChild(
                    ligne
                );

            }
        );

    };

    const filtrerMissions =
        () => {

            const recherche =
                champRecherche.value
                    .trim()
                    .toLowerCase();

            const statut =
                filtreStatut.value;

            const liste =
                missions.filter(
                    (mission) => {

                        const contenu = [
                            mission.agent_nom,
                            mission.agent_email,
                            mission.tricycle_numero,
                            mission.plaque_identification,
                            mission.date_prevue,
                            mission.statut,
                            formaterStatut(
                                mission.statut
                            )
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();

                        return (
                            (
                                !recherche ||
                                contenu.includes(
                                    recherche
                                )
                            ) &&
                            (
                                !statut ||
                                mission.statut ===
                                statut
                            )
                        );

                    }
                );

            afficherMissions(
                liste
            );

        };

    const chargerMissions =
        async () => {

            boutonActualiser.disabled =
                true;

            boutonActualiser.textContent =
                "Chargement...";

            afficherEtatChargement();

            try {

                const resultat =
                    await ProRecup.requete(
                        "/api/missions"
                    );

                missions =
                    extraireListe(
                        resultat
                    ).map(
                        (mission) => ({
                            ...mission,

                            nombre_collectes:
                                Number(
                                    mission.nombre_collectes ||
                                    0
                                )
                        })
                    );

                mettreAJourResume();
                filtrerMissions();

            } catch (erreur) {

                corpsTableauMissions.innerHTML = `
                    <tr>
                        <td
                            colspan="7"
                            class="etat-tableau"
                        >
                            Impossible de charger les missions.
                        </td>
                    </tr>
                `;

                ProRecup.afficherNotification(
                    erreur.message,
                    "erreur"
                );

            } finally {

                boutonActualiser.disabled =
                    false;

                boutonActualiser.textContent =
                    "Actualiser";

            }

        };

    const remplirSelectAgents = (
        agentSelectionneId = null
    ) => {

        champAgent.innerHTML =
            '<option value="">Sélectionner un agent</option>';

        agents
            .filter(
                (agent) =>
                    (
                        agent.statut ===
                            "actif" &&
                        agent.disponible ===
                            true
                    ) ||
                    agent.id ===
                        agentSelectionneId
            )
            .forEach(
                (agent) => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        agent.id;

                    option.textContent =
                        `${agent.nom || "Agent"} — ` +
                        `${agent.telephone || agent.email || "sans contact"}`;

                    champAgent.appendChild(
                        option
                    );

                }
            );

        champAgent.value =
            agentSelectionneId ||
            "";

    };

    const remplirSelectTricycles = (
        tricycleSelectionneId = null
    ) => {

        champTricycle.innerHTML =
            '<option value="">Sélectionner un tricycle</option>';

        tricycles
            .filter(
                (tricycle) =>
                    (
                        tricycle.statut ===
                            "disponible" &&
                        tricycle.etat !==
                            "mauvais"
                    ) ||
                    tricycle.id ===
                        tricycleSelectionneId
            )
            .forEach(
                (tricycle) => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        tricycle.id;

                    option.textContent =
                        `${tricycle.numero_interne || "Tricycle"} — ` +
                        `${tricycle.plaque_identification || "sans plaque"}`;

                    champTricycle.appendChild(
                        option
                    );

                }
            );

        champTricycle.value =
            tricycleSelectionneId ||
            "";

    };

    const ouvrirNouvelleMission =
        () => {

            formulaireMission.reset();

            champMissionId.value =
                "";

            titreModaleMission.textContent =
                "Nouvelle mission";

            remplirSelectAgents();
            remplirSelectTricycles();

            cacherErreur(
                erreurFormulaireMission
            );

            ouvrirModale(
                fenetreMission
            );

        };

    const ouvrirModificationMission = (
        mission
    ) => {

        formulaireMission.reset();

        champMissionId.value =
            mission.id;

        titreModaleMission.textContent =
            "Modifier la mission";

        remplirSelectAgents(
            mission.agent_id
        );

        remplirSelectTricycles(
            mission.tricycle_id
        );

        champDatePrevue.value =
            obtenirDatePourChamp(
                mission.date_prevue
            );

        champHeureDepart.value =
            formaterHeure(
                mission.heure_depart_prevue
            ) === "—"
                ? ""
                : formaterHeure(
                    mission.heure_depart_prevue
                );

        champHeureRetour.value =
            formaterHeure(
                mission.heure_retour_prevue
            ) === "—"
                ? ""
                : formaterHeure(
                    mission.heure_retour_prevue
                );

        champObservations.value =
            mission.observations ||
            "";

        cacherErreur(
            erreurFormulaireMission
        );

        ouvrirModale(
            fenetreMission
        );

    };

    const changerStatutMission =
        async (
            mission,
            statut
        ) => {

            const messages = {

                en_cours:
                    "Démarrer cette mission ?",

                terminee:
                    "Terminer cette mission ?",

                annulee:
                    "Annuler cette mission ?"

            };

            if (
                !window.confirm(
                    messages[statut] ||
                    "Confirmer cette action ?"
                )
            ) {
                return;
            }

            try {

                await ProRecup.requete(
                    `/api/missions/${mission.id}/statut`,
                    {
                        method:
                            "PATCH",

                        body:
                            JSON.stringify({
                                statut
                            })
                    }
                );

                ProRecup.afficherNotification(
                    "Statut de la mission modifié.",
                    "succes"
                );

                await Promise.all([
                    chargerReferences(),
                    chargerMissions()
                ]);

            } catch (erreur) {

                ProRecup.afficherNotification(
                    erreur.message,
                    "erreur"
                );

            }

        };

    const chargerCollectesDisponibles =
        async () => {

            champCollecte.disabled =
                true;

            champCollecte.innerHTML = `
                <option value="">
                    Chargement des collectes...
                </option>
            `;

            try {

                console.log(
                    "Chargement des collectes..."
                );

                const resultat =
                    await ProRecup.requete(
                        "/api/collectes"
                    );

                collectes =
                    extraireListe(
                        resultat
                    );

                console.log(
                    "Réponse complète /api/collectes :",
                    resultat
                );

                console.log(
                    "Collectes extraites :",
                    collectes
                );

                const normaliserStatut = (
                    valeur
                ) => {

                    return String(
                        valeur || ""
                    )
                        .trim()
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(
                            /[\u0300-\u036f]/g,
                            ""
                        )
                        .replace(
                            /[\s-]+/g,
                            "_"
                        );

                };

                const collectesEnAttente =
                    collectes.filter(
                        (
                            collecte
                        ) => {

                            return (
                                normaliserStatut(
                                    collecte.statut
                                ) ===
                                "en_attente"
                            );

                        }
                    );

                champCollecte.innerHTML =
                    "";

                const optionInitiale =
                    document.createElement(
                        "option"
                    );

                optionInitiale.value =
                    "";

                optionInitiale.textContent =
                    collectesEnAttente.length
                        ? "Sélectionner une collecte"
                        : "Aucune collecte en attente disponible";

                champCollecte.appendChild(
                    optionInitiale
                );

                collectesEnAttente.forEach(
                    (
                        collecte
                    ) => {

                        const option =
                            document.createElement(
                                "option"
                            );

                        option.value =
                            collecte.id;

                        const client =
                            collecte.client_nom ||
                            collecte.client?.nom ||
                            "Client non renseigné";

                        const site =
                            collecte.site_nom ||
                            collecte.site?.nom ||
                            "Site non renseigné";

                        const dechet =
                            collecte.type_dechet ||
                            collecte.type_dechet_nom ||
                            collecte.dechet_nom ||
                            "Déchet non renseigné";

                        const poids =
                            collecte.poids_estime
                                ? `${ProRecup.formaterNombre(
                                    collecte.poids_estime
                                )} kg`
                                : "poids non renseigné";

                        option.textContent =
                            `${client} — ${site} — ${dechet} — ${poids}`;

                        champCollecte.appendChild(
                            option
                        );

                    }
                );

                champCollecte.disabled =
                    collectesEnAttente.length ===
                    0;

                boutonAjouterCollecte.disabled =
                    collectesEnAttente.length ===
                    0;

                console.log(
                    "Collectes en attente disponibles :",
                    collectesEnAttente
                );

            } catch (erreur) {

                console.error(
                    "Erreur lors du chargement des collectes :",
                    erreur
                );

                collectes =
                    [];

                champCollecte.innerHTML = `
                    <option value="">
                        Impossible de charger les collectes
                    </option>
                `;

                champCollecte.disabled =
                    true;

                boutonAjouterCollecte.disabled =
                    true;

                afficherErreur(
                    erreurCollectesMission,
                    erreur.message ||
                    "Impossible de charger les collectes disponibles."
                );

            }

        };

    const afficherCollectesMission = (
        liste
    ) => {

        corpsCollectesMission.innerHTML =
            "";

        if (!liste.length) {

            corpsCollectesMission.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="etat-tableau"
                    >
                        Aucune collecte associée.
                    </td>
                </tr>
            `;

            return;

        }

        liste.forEach(
            (collecte) => {

                const ligne =
                    document.createElement(
                        "tr"
                    );

                const celluleOrdre =
                    document.createElement(
                        "td"
                    );

                const champOrdre =
                    document.createElement(
                        "input"
                    );

                champOrdre.type =
                    "number";

                champOrdre.min =
                    "1";

                champOrdre.className =
                    "champ-ordre";

                champOrdre.value =
                    collecte.ordre_collecte ||
                    1;

                champOrdre.disabled =
                    missionSelectionnee
                        ?.statut !==
                    "planifiee";

                celluleOrdre.appendChild(
                    champOrdre
                );

                ligne.appendChild(
                    celluleOrdre
                );

                [
                    collecte.client_nom,
                    collecte.site_nom,
                    collecte.type_dechet,
                    `${ProRecup.formaterNombre(
                        collecte.poids_estime
                    )} kg`,
                    collecte.statut_collecte ||
                    collecte.statut
                ].forEach(
                    (valeur) => {

                        const cellule =
                            document.createElement(
                                "td"
                            );

                        cellule.textContent =
                            valeur ||
                            "—";

                        ligne.appendChild(
                            cellule
                        );

                    }
                );

                const celluleActions =
                    document.createElement(
                        "td"
                    );

                celluleActions.className =
                    "actions-ligne";

                if (
                    missionSelectionnee
                        ?.statut ===
                    "planifiee"
                ) {

                    celluleActions.appendChild(
                        creerBouton(
                            "Enregistrer l’ordre",
                            "ordre",
                            () =>
                                modifierOrdreCollecte(
                                    collecte.collecte_id ||
                                    collecte.id,
                                    champOrdre.value
                                )
                        )
                    );

                    celluleActions.appendChild(
                        creerBouton(
                            "Retirer",
                            "retirer",
                            () =>
                                retirerCollecteMission(
                                    collecte.collecte_id ||
                                    collecte.id
                                )
                        )
                    );

                } else {

                    celluleActions.textContent =
                        "Mission non modifiable";

                }

                ligne.appendChild(
                    celluleActions
                );

                corpsCollectesMission.appendChild(
                    ligne
                );

            }
        );

    };

    const chargerCollectesMission =
        async () => {

            if (!missionSelectionnee) {
                return;
            }

            const resultat =
                await ProRecup.requete(
                    `/api/missions/${missionSelectionnee.id}/collectes`
                );

            const liste =
                extraireListe(
                    resultat
                );

            afficherCollectesMission(
                liste
            );

            champOrdreCollecte.value =
                Math.max(
                    1,
                    liste.length + 1
                );

        };

    const ouvrirCollectesMission =
        async (
            mission
        ) => {

            missionSelectionnee =
                mission;

            titreCollectesMission.textContent =
                `Collectes — ${formaterDateSimple(
                    mission.date_prevue
                )}`;

            zoneAjoutCollecte.classList.toggle(
                "cache",
                mission.statut !==
                "planifiee"
            );

            cacherErreur(
                erreurCollectesMission
            );

            ouvrirModale(
                fenetreCollectesMission
            );

            champCollecte.disabled =
                false;

            boutonAjouterCollecte.disabled =
                false;

            try {

                await Promise.all([
                    chargerCollectesDisponibles(),
                    chargerCollectesMission()
                ]);

            } catch (erreur) {

                afficherErreur(
                    erreurCollectesMission,
                    erreur.message
                );

            }

        };

    const modifierOrdreCollecte =
        async (
            collecteId,
            ordre
        ) => {

            const nouvelOrdre =
                Number(ordre);

            if (
                !Number.isInteger(
                    nouvelOrdre
                ) ||
                nouvelOrdre < 1
            ) {

                afficherErreur(
                    erreurCollectesMission,
                    "L’ordre doit être supérieur ou égal à 1."
                );

                return;

            }

            try {

                await ProRecup.requete(
                    `/api/missions/${missionSelectionnee.id}/collectes/${collecteId}/ordre`,
                    {
                        method:
                            "PATCH",

                        body:
                            JSON.stringify({
                                ordre_collecte:
                                    nouvelOrdre
                            })
                    }
                );

                ProRecup.afficherNotification(
                    "Ordre modifié.",
                    "succes"
                );

                await chargerCollectesMission();

            } catch (erreur) {

                afficherErreur(
                    erreurCollectesMission,
                    erreur.message
                );

            }

        };

    const retirerCollecteMission =
        async (
            collecteId
        ) => {

            if (
                !window.confirm(
                    "Retirer cette collecte de la mission ?"
                )
            ) {
                return;
            }

            try {

                await ProRecup.requete(
                    `/api/missions/${missionSelectionnee.id}/collectes/${collecteId}`,
                    {
                        method:
                            "DELETE"
                    }
                );

                ProRecup.afficherNotification(
                    "Collecte retirée.",
                    "succes"
                );

                await Promise.all([
                    chargerCollectesMission(),
                    chargerCollectesDisponibles(),
                    chargerMissions()
                ]);

            } catch (erreur) {

                afficherErreur(
                    erreurCollectesMission,
                    erreur.message
                );

            }

        };

    const afficherEvenements = (
        liste
    ) => {

        listeEvenementsMission.innerHTML =
            "";

        if (!liste.length) {

            listeEvenementsMission.innerHTML =
                '<div class="etat-tableau">Aucun événement enregistré.</div>';

            return;

        }

        liste.forEach(
            (evenement) => {

                const carte =
                    document.createElement(
                        "article"
                    );

                carte.className =
                    "carte-evenement";

                const entete =
                    document.createElement(
                        "div"
                    );

                entete.className =
                    "entete-evenement";

                const titre =
                    document.createElement(
                        "strong"
                    );

                titre.textContent =
                    formaterTypeEvenement(
                        evenement.type_evenement
                    );

                const date =
                    document.createElement(
                        "span"
                    );

                date.textContent =
                    ProRecup.formaterDate(
                        evenement.cree_le ||
                        evenement.date_evenement
                    );

                entete.appendChild(
                    titre
                );

                entete.appendChild(
                    date
                );

                carte.appendChild(
                    entete
                );

                if (
                    evenement.collecte_id
                ) {

                    const contexte =
                        document.createElement(
                            "p"
                        );

                    contexte.className =
                        "contexte-evenement";

                    contexte.textContent =
                        `Collecte : ${evenement.collecte_id}`;

                    carte.appendChild(
                        contexte
                    );

                }

                if (
                    evenement.latitude !==
                        null &&
                    evenement.latitude !==
                        undefined &&
                    evenement.longitude !==
                        null &&
                    evenement.longitude !==
                        undefined
                ) {

                    const position =
                        document.createElement(
                            "p"
                        );

                    position.className =
                        "position-evenement";

                    position.textContent =
                        `GPS : ${evenement.latitude}, ${evenement.longitude}`;

                    carte.appendChild(
                        position
                    );

                }

                if (
                    evenement.observations
                ) {

                    const observations =
                        document.createElement(
                            "p"
                        );

                    observations.className =
                        "observations-evenement";

                    observations.textContent =
                        evenement.observations;

                    carte.appendChild(
                        observations
                    );

                }

                listeEvenementsMission.appendChild(
                    carte
                );

            }
        );

    };

    const ouvrirEvenementsMission =
        async (
            mission
        ) => {

            missionSelectionnee =
                mission;

            titreEvenementsMission.textContent =
                `Événements — ${formaterDateSimple(
                    mission.date_prevue
                )}`;

            ouvrirModale(
                fenetreEvenementsMission
            );

            listeEvenementsMission.innerHTML =
                '<div class="etat-tableau">Chargement...</div>';

            try {

                const resultat =
                    await ProRecup.requete(
                        `/api/missions/${mission.id}/evenements`
                    );

                afficherEvenements(
                    extraireListe(
                        resultat
                    )
                );

            } catch (erreur) {

                listeEvenementsMission.innerHTML =
                    `<div class="message-formulaire">${erreur.message}</div>`;

            }

        };

    formulaireMission.addEventListener(
        "submit",
        async (
            evenement
        ) => {

            evenement.preventDefault();

            cacherErreur(
                erreurFormulaireMission
            );

            const missionId =
                champMissionId.value;

            const donnees = {

                agent_id:
                    champAgent.value,

                tricycle_id:
                    champTricycle.value,

                date_prevue:
                    champDatePrevue.value,

                heure_depart_prevue:
                    champHeureDepart.value ||
                    null,

                heure_retour_prevue:
                    champHeureRetour.value ||
                    null,

                observations:
                    champObservations.value
                        .trim()
            };

            if (
                !donnees.agent_id ||
                !donnees.tricycle_id ||
                !donnees.date_prevue
            ) {

                afficherErreur(
                    erreurFormulaireMission,
                    "L’agent, le tricycle et la date sont obligatoires."
                );

                return;

            }

            if (
                donnees.heure_depart_prevue &&
                donnees.heure_retour_prevue &&
                donnees.heure_retour_prevue <=
                    donnees.heure_depart_prevue
            ) {

                afficherErreur(
                    erreurFormulaireMission,
                    "L’heure de retour doit être postérieure à l’heure de départ."
                );

                return;

            }

            boutonEnregistrerMission.disabled =
                true;

            boutonEnregistrerMission.textContent =
                "Enregistrement...";

            try {

                await ProRecup.requete(
                    missionId
                        ? `/api/missions/${missionId}`
                        : "/api/missions",
                    {
                        method:
                            missionId
                                ? "PUT"
                                : "POST",

                        body:
                            JSON.stringify(
                                donnees
                            )
                    }
                );

                fermerModale(
                    fenetreMission
                );

                ProRecup.afficherNotification(
                    missionId
                        ? "Mission modifiée avec succès."
                        : "Mission créée avec succès.",
                    "succes"
                );

                await Promise.all([
                    chargerReferences(),
                    chargerMissions()
                ]);

            } catch (erreur) {

                afficherErreur(
                    erreurFormulaireMission,
                    erreur.message
                );

            } finally {

                boutonEnregistrerMission.disabled =
                    false;

                boutonEnregistrerMission.textContent =
                    "Enregistrer la mission";

            }

        }
    );

    boutonAjouterCollecte.addEventListener(
        "click",
        async () => {

            cacherErreur(
                erreurCollectesMission
            );

            const collecteId =
                champCollecte.value;

            const ordre =
                Number(
                    champOrdreCollecte.value
                );

            if (!collecteId) {

                afficherErreur(
                    erreurCollectesMission,
                    "Veuillez sélectionner une collecte."
                );

                return;

            }

            if (
                !Number.isInteger(
                    ordre
                ) ||
                ordre < 1
            ) {

                afficherErreur(
                    erreurCollectesMission,
                    "L’ordre doit être supérieur ou égal à 1."
                );

                return;

            }

            boutonAjouterCollecte.disabled =
                true;

            try {

                await ProRecup.requete(
                    `/api/missions/${missionSelectionnee.id}/collectes`,
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify({
                                collecte_id:
                                    collecteId,

                                ordre_collecte:
                                    ordre
                            })
                    }
                );

                ProRecup.afficherNotification(
                    "Collecte ajoutée.",
                    "succes"
                );

                await Promise.all([
                    chargerCollectesDisponibles(),
                    chargerCollectesMission(),
                    chargerMissions()
                ]);

            } catch (erreur) {

                afficherErreur(
                    erreurCollectesMission,
                    erreur.message
                );

            } finally {

                boutonAjouterCollecte.disabled =
                    false;

            }

        }
    );

    boutonNouvelleMission.addEventListener(
        "click",
        ouvrirNouvelleMission
    );

    boutonActualiser.addEventListener(
        "click",
        async () => {

            await Promise.all([
                chargerReferences(),
                chargerMissions()
            ]);

        }
    );

    champRecherche.addEventListener(
        "input",
        filtrerMissions
    );

    filtreStatut.addEventListener(
        "change",
        filtrerMissions
    );

    boutonFermerMission.addEventListener(
        "click",
        () =>
            fermerModale(
                fenetreMission
            )
    );

    boutonAnnulerMission.addEventListener(
        "click",
        () =>
            fermerModale(
                fenetreMission
            )
    );

    boutonFermerCollectes.addEventListener(
        "click",
        () =>
            fermerModale(
                fenetreCollectesMission
            )
    );

    boutonFermerEvenements.addEventListener(
        "click",
        () =>
            fermerModale(
                fenetreEvenementsMission
            )
    );

    document.querySelectorAll(
        ".fond-modale"
    ).forEach(
        (
            fond
        ) => {

            fond.addEventListener(
                "click",
                () => {

                    const modale =
                        fond.closest(
                            ".modale"
                        );

                    fermerModale(
                        modale
                    );

                }
            );

        }
    );

    document.addEventListener(
        "keydown",
        (
            evenement
        ) => {

            if (
                evenement.key !==
                "Escape"
            ) {
                return;
            }

            document
                .querySelectorAll(
                    ".modale:not(.cache)"
                )
                .forEach(
                    fermerModale
                );

        }
    );

    Promise.all([
        chargerReferences(),
        chargerMissions()
    ]).catch(
        (
            erreur
        ) => {

            ProRecup.afficherNotification(
                erreur.message,
                "erreur"
            );

        }
    );

})();