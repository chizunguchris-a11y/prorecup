(function () {

    const api =
        window.ProRecup.api;


    const auth =
        window.ProRecup.auth;


    const chargement =
        document.getElementById(
            "ecran-chargement"
        );


    const connexion =
        document.getElementById(
            "ecran-connexion"
        );


    const application =
        document.getElementById(
            "ecran-application"
        );


    const formConnexion =
        document.getElementById(
            "form-connexion"
        );


    const boutonConnexion =
        document.getElementById(
            "bouton-connexion"
        );


    const messageConnexion =
        document.getElementById(
            "message-connexion"
        );


    const messageApplication =
        document.getElementById(
            "message-application"
        );


    const listeMissions =
        document.getElementById(
            "liste-missions"
        );


    const afficherEcran =
        function (
            ecran
        ) {

            [
                chargement,
                connexion,
                application
            ].forEach(
                element =>
                    element.classList.add(
                        "masque"
                    )
            );


            ecran.classList.remove(
                "masque"
            );

        };


    const afficherMessage =
        function (
            element,
            message,
            type
        ) {

            element.textContent =
                message;


            element.className =
                "message " +
                (
                    type === "succes"
                        ? "message-succes"
                        : "message-erreur"
                );

        };


    const masquerMessage =
        function (
            element
        ) {

            element.className =
                "message masque";

            element.textContent =
                "";

        };


    const libelleAction =
        function (
            action
        ) {

            const libelles = {

                demarrer_mission:
                    "Démarrer la mission",

                arriver_site:
                    "Je suis arrivé au site",

                demarrer_collecte:
                    "Démarrer la collecte",

                terminer_collecte:
                    "Terminer la collecte",

                terminer_mission:
                    "Terminer la mission",

                aucune:
                    "Mission terminée"

            };


            return (
                libelles[action] ||
                "Voir la mission"
            );

        };


    const nettoyer =
        function (
            valeur
        ) {

            return String(
                valeur ?? ""
            )
                .replace(
                    /&/g,
                    "&amp;"
                )
                .replace(
                    /</g,
                    "&lt;"
                )
                .replace(
                    />/g,
                    "&gt;"
                )
                .replace(
                    /"/g,
                    "&quot;"
                )
                .replace(
                    /'/g,
                    "&#039;"
                );

        };


    let terrainStore = null;
    let terrainOwner = null;
    let syncTimer = null;
    let synchronisation = null;
    let reconnexionRequise = false;
    const syncStatus = document.getElementById('statut-synchronisation');
    const syncButton = document.getElementById('bouton-synchroniser');
    const syncPanel = syncStatus?.closest('.synchronisation');
    const rejectButton = document.getElementById('bouton-refus');
    const replaceProofButton = document.getElementById('bouton-remplacer-preuve');
    const replaceProofForm = document.getElementById('remplacement-preuve');
    const cancelReplaceProof = document.getElementById('annuler-remplacement-preuve');
    const authorized = () => !reconnexionRequise && terrainOwner && auth.obtenirUtilisateur()?.id === terrainOwner &&
        !!localStorage.getItem(window.ProRecup.config.TOKEN_KEY);
    const updateQueueUI = async () => {

        if (!terrainStore) return;

        const rows =
            await terrainStore.list();

        const first =
            rows[0];

        const firstType =
            first &&
            (
                {
                    avant_collecte:
                        "photo avant collecte",

                    apres_collecte:
                        "photo après collecte"

                }[first.type] ||
                "action " +
                first.type.replaceAll(
                    "_",
                    " "
                )
            );

        const firstState =
            first &&
            (
                first.last_error === 'BLOB_ILLISIBLE'

                    ? first.post_initiated

                        ? "preuve locale illisible, vérification requise"

                        : "preuve locale illisible, remplacement requis"

                    : first.statut ===
                        "erreur"

                        ? "action refusée"

                        : first.statut ===
                            "envoi"

                            ? "envoi en cours"

                            : first.last_error ===
                                "RECONNEXION"

                                ? "reconnexion requise"

                                : first.last_error ===
                                    "UPLOAD_RESEAU"

                                    ? "réseau indisponible"

                                    : [
                                        "ERREUR_SERVEUR",
                                        "RESEAU_OU_SERVEUR"
                                    ].includes(
                                        first.last_error
                                    )

                                        ? "serveur temporairement indisponible"

                                        : first.next_attempt_at >
                                            Date.now()

                                            ? "nouvel essai prévu"

                                            : "prête à être envoyée"
            );

        const recuperation =
            first?.statut ===
            "recuperation";

        const erreur =
            rows.some(
                ligne =>
                    ligne.statut ===
                    "erreur"
            );

        const envoi =
            rows.some(
                ligne =>
                    ligne.statut ===
                    "envoi"
            );

        const horsLigne =
            !navigator.onLine;

        if (syncPanel) {

            syncPanel.hidden =
                rows.length === 0;
        }

        if (!rows.length) {

            syncStatus.textContent =
                "";

            syncButton.hidden =
                true;

            replaceProofButton.hidden =
                true;

            replaceProofForm.hidden =
                true;

            rejectButton.hidden =
                true;

            return;
        }

        const nombre =
            rows.length;

        const actions =
            nombre > 1
                ? "actions"
                : "action";

        if (recuperation) {

            syncStatus.textContent =
                "Action à vérifier — " +
                firstType +
                ", " +
                firstState;

        } else if (horsLigne) {

            syncStatus.textContent =
                nombre +
                " " +
                actions +
                " enregistrée" +
                (nombre > 1 ? "s" : "") +
                " · envoi automatique au retour du réseau";

        } else if (
            synchronisation ||
            envoi
        ) {

            syncStatus.textContent =
                "Synchronisation en cours…";

        } else if (erreur) {

            syncStatus.textContent =
                nombre +
                " " +
                actions +
                " à vérifier";

        } else {

            syncStatus.textContent =
                nombre +
                " " +
                actions +
                " à envoyer";
        }

        syncButton.hidden =
            horsLigne ||
            !!synchronisation ||
            recuperation;

        syncButton.disabled =
            !rows.length ||
            horsLigne ||
            !!synchronisation ||
            first?.statut ===
                "recuperation";

        replaceProofButton.hidden =
            first?.statut !==
                "recuperation" ||
            first?.last_error !==
                "BLOB_ILLISIBLE" ||
            first?.post_initiated ===
                true;

        if (
            first?.statut !==
            "recuperation"
        ) {
            replaceProofForm.hidden =
                true;
        }

        rejectButton.hidden =
            !erreur;
    };

    const synchroniser = async ({ forceBackoff = false } = {}) => {
        if (!terrainStore || !authorized() || synchronisation || actionEnCours) return;
        clearTimeout(syncTimer);
        const store = terrainStore;
        const avaitDesActions = (await store.list()).length > 0;
        synchronisation = store.sync(api, authorized, () => { updateQueueUI().catch(() => {}); }, { forceBackoff });
        try {
            const result = await synchronisation;
            if (result.stopped === 'auth' && navigator.onLine) {
                reconnexionRequise = true;
                afficherMessage(messageConnexion, 'Reconnectez-vous pour envoyer vos actions conservées sur cet appareil.', 'erreur');
                afficherEcran(connexion);
            } else if (result.stopped === 'erreur') {
                afficherMessage(messageApplication, 'Une action a été refusée. La suite est conservée et bloquée. Vérifiez la tournée avant de recommencer.', 'erreur');
            } else if (result.stopped === 'recuperation') {
                afficherMessage(messageApplication, result.replacementAllowed
                    ? 'La preuve photo locale est illisible. Remplacez uniquement cette photo pour reprendre la synchronisation.'
                    : 'La preuve photo locale est illisible, mais un envoi a déjà pu commencer. Faites vérifier cette preuve avant tout remplacement.', 'erreur');
            } else if (result.stopped === 'backoff' && navigator.onLine) {
                syncTimer = setTimeout(synchroniser, Math.max(1000, result.at - Date.now()));
            } else if (!result.stopped && avaitDesActions) {
                afficherMessage(messageApplication, 'Synchronisation terminée. Toutes les actions ont été envoyées.', 'succes');
            }
            if (authorized()) afficherJournee(await store.view());
        } catch (e) { afficherMessage(messageApplication, 'Synchronisation interrompue : ' + e.message, 'erreur'); }
        finally { synchronisation = null; await updateQueueUI(); }
    };
    syncButton.addEventListener('click', () => synchroniser({ forceBackoff: true }));
    replaceProofButton.addEventListener('click', () => {
        replaceProofForm.hidden = false;
        replaceProofForm.querySelector('[name="fichier-remplacement"]').click();
    });
    cancelReplaceProof.addEventListener('click', () => {
        replaceProofForm.reset();
        replaceProofForm.hidden = true;
    });
    replaceProofForm.querySelector('[name="fichier-remplacement"]').addEventListener('change', () => {
        const date = replaceProofForm.querySelector('[name="pris-le-remplacement"]');
        if (!date.value) {
            const now = new Date();
            date.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
        }
    });
    replaceProofForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!terrainStore || synchronisation || actionEnCours) return;
        const file = replaceProofForm.querySelector('[name="fichier-remplacement"]').files?.[0];
        const localDate = replaceProofForm.querySelector('[name="pris-le-remplacement"]').value;
        try {
            validerPhoto(file);
            const instant = new Date(localDate);
            if (!Number.isFinite(instant.getTime())) throw new Error('Indiquez la date et l’heure réelles de prise de la photo.');
            await terrainStore.replaceUnreadablePhoto(file, instant.toISOString());
            replaceProofForm.reset();
            replaceProofForm.hidden = true;
            afficherMessage(messageApplication, 'Nouvelle preuve enregistrée. La synchronisation reprend.', 'succes');
            await updateQueueUI();
            await synchroniser({ forceBackoff: true });
        } catch (e) {
            afficherMessage(messageApplication, e.message, 'erreur');
        }
    });
    rejectButton.addEventListener('click', async () => {
        if (synchronisation || actionEnCours || !navigator.onLine) return;
        if (!confirm('Retirer l’action refusée et toutes les actions suivantes, y compris leurs photos ? Vous devrez les saisir à nouveau.')) return;
        try {
            await terrainStore.discardRejected();
            await chargerJournee();
            await updateQueueUI();
        } catch (e) { afficherMessage(messageApplication, e.message, 'erreur'); }
    });
    let journeeCourante = null;
    let actionEnCours = false;
    let chargementJournee = null;
    const fichiersTentatives = new Map();
    const actionsAcquittees = new Set();
    const photosFormulaires = new WeakMap();
    const preparationsPhoto = new WeakSet();
    const fermerCameras = new WeakMap();
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const actionsMission = ["demarrer_mission", "terminer_mission"];
    const actionsCollecte = ["arriver_site", "demarrer_collecte", "enregistrer_pesee", "terminer_collecte"];
    const typesPhoto = ["avant_collecte", "apres_collecte", "ticket_balance"];
    const estPhoto = action => typesPhoto.includes(action);

    const preuvePresente = (collecte, type) =>
        (collecte?.preuves || []).some(preuve => preuve.type_preuve === type);

    const etapeMission = mission => {
        const collecte = (mission.collectes || []).find(item =>
            !item.progression?.collecte_terminee ||
            !preuvePresente(item, "apres_collecte")
        );
        if (mission.bloquee) return { action: "aucune" };
        if (mission.statut === "planifiee") return { action: "demarrer_mission" };
        if (mission.statut !== "en_cours") return { action: "aucune" };
        if (!collecte) return { action: "terminer_mission" };
        if (collecte.progression?.collecte_terminee)
            return { action: "apres_collecte", collecte };
        if (!collecte.progression?.arrivee)
            return { action: "arriver_site", collecte };
        if (!collecte.progression?.collecte_demarree)
            return { action: "demarrer_collecte", collecte };
        if (!preuvePresente(collecte, "avant_collecte"))
            return { action: "avant_collecte", collecte };
        if (!(collecte.pesees || []).some(pesee => pesee.type === "terrain"))
            return { action: "enregistrer_pesee", collecte };
        return { action: "terminer_collecte", collecte };
    };

    const contexteOperation = (mission, etape) => {
        const utilisateur = auth.obtenirUtilisateur()?.id;
        const action = etape.action;
        const collecte = etape.collecte?.id || null;
        if (!UUID.test(utilisateur || "") || !UUID.test(mission.id || "") ||
            ![...actionsMission, ...actionsCollecte, ...typesPhoto].includes(action) ||
            (actionsMission.includes(action) ? collecte !== null : !UUID.test(collecte || ""))) {
            throw new Error("Le contexte de cette action est invalide. Actualisez la tournée.");
        }
        return { utilisateur, mission: mission.id, collecte, action };
    };

    const cleOperation = contexte =>
        "terrain-operation-v2:" + [
            contexte.utilisateur, contexte.mission,
            contexte.collecte || "mission", contexte.action
        ].join(":");

    const validerResultat = donnees => {
        const resultat = donnees.resultat_terrain;
        const poids = donnees.poids_reel;
        const motif = typeof donnees.motif_terrain === "string"
            ? donnees.motif_terrain.trim() : "";
        if (!["collectee", "partielle", "aucune_matiere", "non_collectee"].includes(resultat))
            throw new Error("Choisissez un résultat de collecte valide.");
        const realisee = ["collectee", "partielle"].includes(resultat);
        if (typeof poids !== "number" || !Number.isFinite(poids) ||
            (realisee ? poids <= 0 : poids !== 0))
            throw new Error("Le poids doit être positif pour une collecte réalisée, et égal à zéro sinon.");
        if (resultat === "non_collectee" && !motif)
            throw new Error("Indiquez le motif de la collecte non réalisée.");
        return { resultat_terrain: resultat, poids_reel: poids, motif_terrain: motif || null };
    };

    const validerPesee = donnees => {
        const balance = (journeeCourante?.balances || []).find(item => item.id === donnees.balance_id);
        if (!balance) throw new Error("Choisissez une balance disponible.");
        const brut = Number(donnees.poids_brut);
        const codes = [...new Set(String(donnees.codes_qr || "").split(/[\s,;]+/)
            .map(code => code.trim().toUpperCase()).filter(Boolean))];
        const unites = codes.map(code => (journeeCourante?.unites_qr || []).find(unite => unite.code_qr === code));
        if (unites.some(unite => !unite)) throw new Error("Un QR est inconnu de la tournée. Synchronisez ou vérifiez le code.");
        const tareEnregistree = unites.reduce((somme, unite) => somme + Number(unite?.tare_kg || 0), 0);
        const tare = String(donnees.tare ?? "").trim() === "" ? tareEnregistree : Number(donnees.tare);
        if (![brut, tare].every(Number.isFinite) || brut < 0 || tare < 0 || tare > brut)
            throw new Error("Le poids brut et la tare sont invalides.");
        if (brut > Number(balance.capacite_max_kg))
            throw new Error("Le poids dépasse la capacité maximale de cette balance.");
        const precision = Number(balance.precision_kg);
        const aligne = valeur => Math.abs(valeur / precision - Math.round(valeur / precision)) < 1e-7;
        if (!aligne(brut) || !aligne(tare))
            throw new Error(`Respectez la précision de ${precision} kg de la balance.`);
        return { balance_id: balance.id, poids_brut: brut, tare, codes_qr: codes,
            poids_net: Math.round((brut - tare) * 1000) / 1000 };
    };

    // Une liste fermée de champs est appliquée aussi aux données restaurées.
    const filtrerPayload = (action, donnees) => {
        const photo = estPhoto(action);
        const date = photo ? donnees?.pris_le : donnees?.survenu_le;
        if (!UUID.test(donnees?.operation_id || "") ||
            typeof date !== "string" || !Number.isFinite(Date.parse(date))) {
            throw new Error("La tentative enregistrée est invalide. Actualisez la tournée.");
        }
        const gps = {
            latitude: donnees.latitude,
            longitude: donnees.longitude,
            precision_gps: donnees.precision_gps
        };
        if (!Object.values(gps).every(v => typeof v === "number" && Number.isFinite(v)) ||
            Math.abs(gps.latitude) > 90 || Math.abs(gps.longitude) > 180 || gps.precision_gps < 0) {
            throw new Error("La position GPS est invalide. Réessayez la localisation.");
        }
        const payload = { operation_id: donnees.operation_id, ...gps };
        if (photo) {
            payload.type_preuve = action;
            payload.pris_le = date;
        } else {
            payload.survenu_le = date;
            if (action === "terminer_collecte")
                Object.assign(payload, validerResultat(donnees));
            if (action === "enregistrer_pesee")
                Object.assign(payload, validerPesee(donnees));
        }
        return payload;
    };

    const lireTentative = contexte => {
        const brut = localStorage.getItem(cleOperation(contexte));
        if (!brut) return null;
        let tentative;
        try { tentative = JSON.parse(brut); } catch {
            throw new Error("La tentative enregistrée est illisible. Actualisez avant de recommencer.");
        }
        if (tentative.version !== 2 || !tentative.contexte ||
            Object.keys(contexte).some(nom => tentative.contexte[nom] !== contexte[nom])) {
            throw new Error("Cette tentative appartient à une autre action. Actualisez la tournée.");
        }
        if (estPhoto(contexte.action) && !/^[a-f0-9]{64}$/.test(tentative.empreinte || ""))
            throw new Error("La photo de cette tentative ne peut pas être identifiée.");
        return {
            version: 2,
            contexte: { ...contexte },
            payload: filtrerPayload(contexte.action, tentative.payload),
            ...(estPhoto(contexte.action) ? { empreinte: tentative.empreinte } : {})
        };
    };

    const enregistrerTentative = (contexte, donnees, empreinte) => {
        const tentative = {
            version: 2,
            contexte: { ...contexte },
            payload: filtrerPayload(contexte.action, {
                ...donnees, operation_id: crypto.randomUUID()
            }),
            ...(estPhoto(contexte.action) ? { empreinte } : {})
        };
        // Sauvegarder avant le POST : pas d'envoi si la sauvegarde échoue.
        localStorage.setItem(cleOperation(contexte), JSON.stringify(tentative));
        return tentative;
    };

    const effacerTentative = contexte => {
        const cle = cleOperation(contexte);
        localStorage.removeItem(cle);
        fichiersTentatives.delete(cle);
    };

    const erreurHttpDefinitive = erreur =>
        Number.isInteger(erreur.status) &&
        erreur.status >= 400 && erreur.status < 500 &&
        ![408, 425, 429].includes(erreur.status);

    const obtenirGps = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("La géolocalisation est indisponible sur cet appareil."));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => {
                const gps = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    precision_gps: position.coords.accuracy
                };
                if (!Object.values(gps).every(v => typeof v === "number" && Number.isFinite(v)) ||
                    Math.abs(gps.latitude) > 90 || Math.abs(gps.longitude) > 180 || gps.precision_gps < 0) {
                    reject(new Error("La position GPS reçue est invalide. Réessayez."));
                    return;
                }
                resolve(gps);
            },
            erreur => {
                const messages = {
                    1: "Accès à la localisation refusé. Autorisez-le dans les réglages du navigateur.",
                    2: "Position GPS indisponible. Déplacez-vous vers un endroit dégagé et réessayez.",
                    3: "La localisation a dépassé le délai de 15 secondes. Réessayez."
                };
                reject(new Error(messages[erreur.code] || "La localisation a échoué. Réessayez."));
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });

    const empreintePhoto = async fichier => {
        const hash = await crypto.subtle.digest("SHA-256", await fichier.arrayBuffer());
        return Array.from(new Uint8Array(hash), octet => octet.toString(16).padStart(2, "0")).join("");
    };

    const validerPhoto = fichier => {
        if (!fichier?.size) throw new Error("Prenez ou sélectionnez une photo.");
        if (fichier.size > 5 * 1024 * 1024) throw new Error("La photo ne doit pas dépasser 5 Mo.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(fichier.type))
            throw new Error("Utilisez une photo JPEG, PNG ou WebP.");
    };

    const libelleEtape = action => ({
        avant_collecte: "Prendre la photo avant collecte",
        enregistrer_pesee: "Peser la matière",
        apres_collecte: "Prendre la photo après collecte"
    })[action] || libelleAction(action);


    const afficherJournee =
        function (
            journee
        ) {

            journeeCourante = journee;

            afficherTourneeDetaillee();

            const resume =
                journee?.resume || {};


            document.getElementById(
                "stat-missions"
            ).textContent =
                resume.nombre_missions ||
                0;


            document.getElementById(
                "stat-collectes"
            ).textContent =
                resume.nombre_collectes ||
                0;


            document.getElementById(
                "stat-terminees"
            ).textContent =
                resume.collectes_terminees ||
                0;


            const missions =
                journee?.missions || [];

            const resumeJournee =
                document.getElementById(
                    "resume-journee"
                );

            if (resumeJournee) {

                resumeJournee.hidden =
                    missions.length ===
                    0;
            }


            if (
                missions.length === 0
            ) {

                listeMissions.innerHTML =
                    `
                    <div class="vide">

                        <strong>
                            Aucune mission aujourd'hui
                        </strong>

                        <p>
                            Vous êtes à jour. Une nouvelle mission apparaîtra ici automatiquement.
                        </p>

                    </div>
                    `;


                return;

            }


            listeMissions.innerHTML =
                missions
                    .map(
                        mission => {

                            const progression =
                                mission.progression ||
                                {};


                            const etape = etapeMission(mission);
                            const prochaine = etape.collecte ? { site_nom: etape.collecte.site?.nom } : mission.prochaine_collecte;


                            const site =
                                prochaine?.site_nom ||
                                "Aucun prochain arrêt";


                            return `
                                <article
                                    class="mission-carte"
                                    data-mission-id="${nettoyer(
                                        mission.id
                                    )}"
                                >

                                    <div class="mission-corps">

                                        <div class="mission-haut">

                                            <div>

                                                <span
                                                    class="badge badge-${nettoyer(
                                                        mission.statut
                                                    )}"
                                                >
                                                    ${nettoyer(
                                                        mission.statut
                                                    )}
                                                </span>

                                                <h3>
                                                    Mission du jour
                                                </h3>

                                            </div>

                                            <strong>
                                                ${Number(
                                                    progression.pourcentage ||
                                                    0
                                                )} %
                                            </strong>

                                        </div>


                                        <div class="mission-info">

                                            Tricycle :
                                            <strong>
                                                ${nettoyer(
                                                    mission.tricycle?.numero ||
                                                    "Non renseigné"
                                                )}
                                            </strong>

                                            <br>

                                            Collectes :
                                            ${Number(
                                                progression.terminees ||
                                                0
                                            )}
                                            /
                                            ${Number(
                                                progression.nombre_collectes ||
                                                0
                                            )}

                                        </div>


                                        <div class="progression">

                                            <div
                                                class="progression-barre"
                                                style="width:${Math.min(
                                                    100,
                                                    Math.max(
                                                        0,
                                                        Number(
                                                            progression.pourcentage ||
                                                            0
                                                        )
                                                    )
                                                )}%"
                                            ></div>

                                        </div>


                                        <div class="progression-texte">

                                            <span>
                                                Progression
                                            </span>

                                            <span>
                                                ${Number(
                                                    progression.restantes ||
                                                    0
                                                )}
                                                restante(s)
                                            </span>

                                        </div>


                                        <div class="prochaine-etape">

                                            <strong>
                                                Prochaine étape
                                            </strong>

                                            <span>
                                                ${nettoyer(
                                                    site
                                                )}
                                            </span>

                                        </div>

                                    </div>


                                    <div class="mission-action">

                                        ${etape.action === "terminer_collecte" && (etape.collecte?.pesees || []).some(pesee => pesee.type === "terrain") ? `
                                        <button
                                            type="button"
                                            class="bouton bouton-secondaire bouton-mission"
                                            data-mission-id="${nettoyer(mission.id)}"
                                            data-collecte-id="${nettoyer(etape.collecte.id)}"
                                            data-action="corriger_pesee"
                                        >
                                            Corriger la pesée
                                        </button>` : ""}

                                        <button
                                            type="button"
                                            class="bouton bouton-principal bouton-mission"
                                            data-mission-id="${nettoyer(
                                                mission.id
                                            )}"
                                            data-action="${nettoyer(
                                                etape.action
                                            )}"
                                            ${etape.action === "aucune" ? "disabled" : ""}
                                        >
                                            ${nettoyer(
                                                libelleEtape(
                                                    etape.action
                                                )
                                            )}
                                        </button>

                                    </div>

                                </article>
                            `;

                        }
                    )
                    .join("");

        };


    const chargerJournee = async ({ pendantAction = false, silencieux = false } = {}) => {
        if ((actionEnCours && !pendantAction) || synchronisation) return null;
        if (chargementJournee) return chargementJournee;
        if (!silencieux) masquerMessage(messageApplication);
        chargementJournee = (async () => {
            try {
                if (!navigator.onLine) throw Object.assign(new Error('Hors ligne'), { code: 'NETWORK_ERROR' });
                const reponse = await api.get("/terrain/journee");
                const journee = reponse?.data || reponse;
                listeMissions.querySelectorAll(".saisie-terrain").forEach(formulaire =>
                    fermerCameras.get(formulaire)?.());
                await terrainStore.saveDay(journee);
                const locale = await terrainStore.view();
                afficherJournee(locale);
                return locale;
            } catch (erreur) {
                if (terrainStore && window.ProRecup.offline.retryable(erreur)) {
                    const locale = await terrainStore.view();
                    afficherJournee(locale);
                    if (!silencieux) afficherMessage(messageApplication, 'Tournée locale — les nouvelles actions seront conservées sur cet appareil.', 'succes');
                    return locale;
                }
                if (!silencieux) afficherMessage(messageApplication, erreur.message, "erreur");
                if (erreur.status === 401 || erreur.status === 403) {
                    clearTimeout(syncTimer);
                    auth.deconnexion();
                    afficherEcran(connexion);
                }
                return null;
            }
        })();
        try { return await chargementJournee; }
        finally { chargementJournee = null; }
    };


    const entrerApplication =
        async function (
            session
        ) {

            const utilisateur =
                session?.utilisateur ||
                auth.obtenirUtilisateur();


            const nom =
                utilisateur?.nom ||
                "Agent";


            document.getElementById(
                "bonjour-agent"
            ).textContent =
                "Bonjour, " + nom;


            afficherEcran(
                application
            );


            const owner = auth.obtenirUtilisateur()?.id;
            reconnexionRequise = false;
            if (terrainOwner !== owner) {
                terrainStore?.close();
                terrainOwner = owner;
                // Account association stays with the existing session storage, outside IndexedDB.
                const key = 'terrain-vault-v1:' + owner;
                let vault = localStorage.getItem(key);
                if (!vault) { vault = crypto.randomUUID(); localStorage.setItem(key, vault); }
                terrainStore = await window.ProRecup.offline.open('terrain-v1-' + vault);
            }
            await chargerJournee();
            await updateQueueUI();
            await synchroniser();

        };


    formConnexion.addEventListener(
        "submit",
        async function (
            evenement
        ) {

            evenement.preventDefault();


            masquerMessage(
                messageConnexion
            );


            const email =
                document.getElementById(
                    "email"
                )
                    .value
                    .trim();


            const motDePasse =
                document.getElementById(
                    "mot-de-passe"
                )
                    .value;


            boutonConnexion.disabled =
                true;


            boutonConnexion.textContent =
                "Connexion...";


            try {

                const session =
                    await auth.connexion(
                        email,
                        motDePasse
                    );


                formConnexion.reset();


                await entrerApplication(
                    session
                );

            } catch (erreur) {

                afficherMessage(
                    messageConnexion,
                    erreur.message,
                    "erreur"
                );

            } finally {

                boutonConnexion.disabled =
                    false;


                boutonConnexion.textContent =
                    "Se connecter";

            }

        }
    );


    document
        .getElementById(
            "bouton-deconnexion"
        )
        .addEventListener(
            "click",
            function () {

                if (synchronisation || actionEnCours) return;
                clearTimeout(syncTimer);
                auth.deconnexion();

                afficherEcran(
                    connexion
                );

            }
        );


    document
        .getElementById(
            "bouton-actualiser"
        )
        .addEventListener(
            "click",
            chargerJournee
        );


    const mettreAJourReseau =
        function () {

            const element =
                document.getElementById(
                    "etat-reseau"
                );


            if (
                navigator.onLine
            ) {

                element.textContent =
                    "● En ligne";

                element.classList.remove(
                    "hors-ligne"
                );

            } else {

                element.textContent =
                    "● Hors ligne";

                element.classList.add(
                    "hors-ligne"
                );

            }

        };


    window.addEventListener(
        "online",
        function () {

            mettreAJourReseau();

            synchroniser();

        }
    );


    window.addEventListener(
        "offline",
        mettreAJourReseau
    );


    const fermerSaisie = formulaire => {
        if (!formulaire) return;
        fermerCameras.get(formulaire)?.();
        formulaire.remove();
    };

    const preparerPhoto = formulaire => {
        const fichierInput = formulaire.querySelector('[name="fichier"]');
        const dateInput = formulaire.querySelector('[name="pris_le"]');
        const video = formulaire.querySelector("video");
        const ouvrir = formulaire.querySelector("[data-camera]");
        const prendre = formulaire.querySelector("[data-photo]");
        const message = formulaire.querySelector("[data-message-photo]");
        let flux = null;
        let fermee = false;
        const arreter = () => {
            flux?.getTracks().forEach(piste => piste.stop());
            flux = null;
            video.srcObject = null;
            video.hidden = true;
            prendre.hidden = true;
        };
        fermerCameras.set(formulaire, () => { fermee = true; arreter(); });
        fichierInput.addEventListener("change", () => {
            arreter();
            dateInput.value = "";
            dateInput.readOnly = false;
            const fichier = fichierInput.files?.[0];
            photosFormulaires.set(formulaire, { fichier, pris_le: null });
            message.textContent = "Indiquez la date et l’heure réelles de prise de cette photo.";
        });
        dateInput.addEventListener("change", () => {
            if (dateInput.readOnly) return;
            const photo = photosFormulaires.get(formulaire);
            const instant = new Date(dateInput.value);
            if (photo) photo.pris_le = Number.isFinite(instant.getTime()) ? instant.toISOString() : null;
        });
        ouvrir.addEventListener("click", async () => {
            if (actionEnCours || flux) return;
            preparationsPhoto.add(formulaire);
            ouvrir.disabled = true;
            message.textContent = "Ouverture de l’appareil photo…";
            try {
                if (!navigator.mediaDevices?.getUserMedia)
                    throw new Error("Appareil photo indisponible. Importez une photo et indiquez sa date réelle.");
                const nouveauFlux = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } }, audio: false
                });
                if (fermee || !formulaire.isConnected) {
                    nouveauFlux.getTracks().forEach(piste => piste.stop());
                    return;
                }
                flux = nouveauFlux;
                video.srcObject = flux;
                video.hidden = false;
                await video.play();
                prendre.hidden = false;
                message.textContent = "Cadrez la collecte, puis prenez la photo.";
            } catch (erreur) {
                arreter();
                message.textContent = erreur.name === "NotAllowedError"
                    ? "Accès à l’appareil photo refusé. Autorisez-le ou importez une photo."
                    : erreur.message;
            } finally {
                preparationsPhoto.delete(formulaire);
                ouvrir.disabled = false;
            }
        });
        prendre.addEventListener("click", async () => {
            if (actionEnCours || !flux || !video.videoWidth) return;
            preparationsPhoto.add(formulaire);
            prendre.disabled = true;
            const prisLe = new Date();
            try {
                const canvas = document.createElement("canvas");
                const ratio = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
                canvas.width = Math.round(video.videoWidth * ratio);
                canvas.height = Math.round(video.videoHeight * ratio);
                canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
                const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
                if (!blob) throw new Error("La photo n’a pas pu être créée. Réessayez.");
                if (fermee || !formulaire.isConnected) return;
                const fichier = new File([blob], "preuve-terrain.jpg", { type: "image/jpeg" });
                validerPhoto(fichier);
                photosFormulaires.set(formulaire, { fichier, pris_le: prisLe.toISOString() });
                fichierInput.value = "";
                dateInput.value = new Date(prisLe.getTime() - prisLe.getTimezoneOffset() * 60000)
                    .toISOString().slice(0, 19);
                dateInput.readOnly = true;
                message.textContent = "Photo prise. Vous pouvez l’enregistrer ou la reprendre.";
                arreter();
            } catch (erreur) {
                message.textContent = erreur.message;
            } finally {
                preparationsPhoto.delete(formulaire);
                prendre.disabled = false;
            }
        });
    };

    const preparerScannerQr = formulaire => {
        const bouton = formulaire.querySelector("[data-scanner-qr]");
        const champ = formulaire.elements.codes_qr;
        if (!bouton || !champ) return;
        bouton.addEventListener("click", async () => {
            if (!("BarcodeDetector" in window)) {
                afficherMessage(messageApplication, "Le scan QR n’est pas disponible sur ce navigateur. Saisissez le code imprimé.", "erreur");
                champ.focus();
                return;
            }
            let flux;
            const video = document.createElement("video");
            video.playsInline = true; video.muted = true; video.className = "apercu-camera";
            formulaire.insertBefore(video, bouton.nextSibling);
            try {
                flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
                video.srcObject = flux; await video.play();
                const detecteur = new BarcodeDetector({ formats: ["qr_code"] });
                for (let essai = 0; essai < 100 && video.isConnected; essai++) {
                    const codes = await detecteur.detect(video);
                    const valeur = codes[0]?.rawValue?.trim().toUpperCase();
                    if (valeur) {
    const existants = String(champ.value || "")
        .split(/[\s,;]+/)
        .map(code => code.trim().toUpperCase())
        .filter(Boolean);

    if (!existants.includes(valeur)) {
        existants.push(valeur);
    }

    champ.value = existants.join(" ");
    champ.dispatchEvent(new Event("change"));
    break;
}
                    await new Promise(resolve => setTimeout(resolve, 120));
                }
            } catch (erreur) {
                afficherMessage(messageApplication, erreur.name === "NotAllowedError"
                    ? "Caméra refusée. Saisissez le code QR." : "Scan impossible. Saisissez le code QR.", "erreur");
            } finally { flux?.getTracks().forEach(piste => piste.stop()); video.remove(); }
        });
        champ.addEventListener("change", () => {
            const codes = String(champ.value || "").split(/[\s,;]+/).map(code => code.trim().toUpperCase()).filter(Boolean);
            const unites = codes.map(code => (journeeCourante?.unites_qr || []).find(unite => unite.code_qr === code));
            if (unites.length && unites.every(Boolean)) formulaire.elements.tare.value = unites
                .reduce((somme, unite) => somme + Number(unite.tare_kg || 0), 0);
        });
    };

    const ouvrirSaisie = (carte, action, mission, etape) => {
        fermerSaisie(carte.querySelector(".saisie-terrain"));
        const formulaire = document.createElement("form");
        formulaire.className = "saisie-terrain";
        if (action === "terminer_collecte") {
            const pesee = [...(etape.collecte?.pesees || [])].reverse().find(item => item.type === "terrain");
            formulaire.innerHTML = [
                '<label>Résultat<select name="resultat_terrain" required>',
                '<option value="collectee">Collectée</option>',
                '<option value="partielle">Partielle</option>',
                '<option value="aucune_matiere">Aucune matière</option>',
                '<option value="non_collectee">Non collectée</option>',
                '</select></label>',
                `<label>Poids réel (kg)<input name="poids_reel" type="number" min="0" step="any" inputmode="decimal" value="${nettoyer(pesee?.poids_net ?? "")}" ${pesee ? "readonly" : ""} required></label>`,
                '<label>Motif (obligatoire si non collectée)<input name="motif_terrain" type="text"></label>'
            ].join("");
        } else if (action === "enregistrer_pesee") {
            const balances = (journeeCourante?.balances || []).filter(balance =>
                (!balance.tricycle_id || balance.tricycle_id === mission.tricycle?.id) &&
                (!balance.site_id || balance.site_id === etape.collecte?.site?.id));
            formulaire.innerHTML = [
                '<label>Balance<select name="balance_id" required><option value="">Choisir…</option>',
                ...balances.map(balance => `<option value="${nettoyer(balance.id)}">${nettoyer(balance.numero_interne)} — max ${Number(balance.capacite_max_kg)} kg, précision ${Number(balance.precision_kg)} kg</option>`),
                '</select></label>',
                '<label>Poids affiché / brut (kg)<input name="poids_brut" type="number" min="0" step="any" inputmode="decimal" required></label>',
                '<label>Code QR du sac, bac ou lot<input name="codes_qr" type="text" autocomplete="off" placeholder="PR-C-…"></label>',
                '<button class="bouton-secondaire" type="button" data-scanner-qr>Scanner le QR</button>',
                '<label>Tare — contenant vide (kg)<input name="tare" type="number" min="0" step="any" inputmode="decimal" placeholder="Calculée depuis le QR"></label>',
                '<p>Le poids net sera calculé automatiquement : poids affiché − tare.</p>',
                '<label>Ticket de balance (optionnel, recommandé)<input name="ticket_balance" type="file" accept="image/jpeg,image/png,image/webp"></label>'
            ].join("");
        } else {
            formulaire.innerHTML = [
                '<button class="bouton-secondaire" type="button" data-camera>Ouvrir l’appareil photo</button>',
                '<video playsinline muted hidden aria-label="Aperçu de l’appareil photo"></video>',
                '<button class="bouton-secondaire" type="button" data-photo hidden>Prendre la photo</button>',
                '<label>Ou importer une photo<input name="fichier" type="file" accept="image/jpeg,image/png,image/webp"></label>',
                '<label>Date et heure réelles de prise<input name="pris_le" type="datetime-local" step="1"></label>',
                '<p data-message-photo role="status">La date est enregistrée à la prise de vue. Pour une photo importée, renseignez sa date réelle.</p>'
            ].join("");
        }
        formulaire.insertAdjacentHTML("beforeend",
            '<button class="bouton bouton-principal" type="submit">Enregistrer / Réessayer</button>' +
            '<button class="bouton-secondaire" type="button" data-annuler>Fermer</button>');
        carte.append(formulaire);
        formulaire.querySelector("[data-annuler]").addEventListener("click", () => fermerSaisie(formulaire));
        if (estPhoto(action)) preparerPhoto(formulaire);
        if (action === "enregistrer_pesee") preparerScannerQr(formulaire);
        return formulaire;
    };

    const executerAction = async (mission, etape, formulaire) => {
        // L'instant est pris au clic, avant le GPS et tout accès réseau.
        const instantAction = new Date().toISOString();
        const contexte = contexteOperation(mission, etape);
        const cle = cleOperation(contexte);
        if (actionsAcquittees.has(cle)) return;
        const photo = estPhoto(contexte.action);
        let tentative = lireTentative(contexte);
        let fichier;
        if (tentative) {
            // Une réponse incertaine est rejouée à l'identique, sans redemander le GPS.
            if (photo) {
                fichier = photosFormulaires.get(formulaire)?.fichier ||
                    fichiersTentatives.get(cle);
                validerPhoto(fichier);
                if (await empreintePhoto(fichier) !== tentative.empreinte)
                    throw new Error("Cette tentative attend la photo d’origine. Resélectionnez-la pour réessayer, ou actualisez la tournée.");
            }
            if (contexte.action === "enregistrer_pesee") {
                const ticket = formulaire?.elements.ticket_balance?.files?.[0];
                if (ticket?.size) validerPhoto(ticket);
                fichier = ticket?.size ? ticket : null;
            }
        } else {
            let donnees;
            let empreinte;
            if (photo) {
                const capture = photosFormulaires.get(formulaire);
                fichier = capture?.fichier;
                validerPhoto(fichier);
                if (!capture.pris_le || !Number.isFinite(Date.parse(capture.pris_le)))
                    throw new Error("Indiquez la date et l’heure réelles de prise de la photo.");
                if (Date.parse(capture.pris_le) > Date.now() + 5000)
                    throw new Error("La date de prise de la photo ne peut pas être dans le futur.");
                empreinte = await empreintePhoto(fichier);
                donnees = { type_preuve: contexte.action, pris_le: capture.pris_le };
            } else {
                donnees = { survenu_le: instantAction };
                if (contexte.action === "terminer_collecte") {
                    const champs = Object.fromEntries(new FormData(formulaire));
                    if (typeof champs.poids_reel !== "string" || !champs.poids_reel.trim())
                        throw new Error("Indiquez le poids réel, y compris zéro.");
                    Object.assign(donnees, validerResultat({
                        resultat_terrain: champs.resultat_terrain,
                        poids_reel: Number(champs.poids_reel),
                        motif_terrain: champs.motif_terrain
                    }));
                }
                if (contexte.action === "enregistrer_pesee") {
                    const champs = Object.fromEntries(new FormData(formulaire));
                    Object.assign(donnees, validerPesee(champs));
                    const ticket = formulaire.elements.ticket_balance?.files?.[0];
                    if (ticket?.size) validerPhoto(ticket);
                    fichier = ticket?.size ? ticket : null;
                }
            }
            Object.assign(donnees, await obtenirGps());
            tentative = enregistrerTentative(contexte, donnees, empreinte);
        }
        if (photo) fichiersTentatives.set(cle, fichier);
        await terrainStore.enqueue(contexte, filtrerPayload(contexte.action, tentative.payload), fichier);
        if (contexte.action === "enregistrer_pesee" && fichier) {
            const ticketContexte = { ...contexte, action: "ticket_balance" };
            const ticketPayload = {
                operation_id: crypto.randomUUID(),
                pesee_operation_id: tentative.payload.operation_id,
                type_preuve: "ticket_balance",
                pris_le: instantAction,
                latitude: tentative.payload.latitude,
                longitude: tentative.payload.longitude,
                precision_gps: tentative.payload.precision_gps
            };
            await terrainStore.enqueue(ticketContexte, ticketPayload, fichier);
        }
        effacerTentative(contexte);
        afficherJournee(await terrainStore.view());
        await updateQueueUI();

    };

    const gererClicMission = async evenement => {
        const bouton = evenement.target.closest(".bouton-mission");

        if (
            !bouton ||
            bouton.disabled ||
            actionEnCours ||
            chargementJournee
        ) return;

        const mission =
            journeeCourante?.missions?.find(
                item =>
                    item.id ===
                    bouton.dataset.missionId
            );

        if (!mission) return;

        let etape =
            etapeMission(mission);

        if (
            bouton.dataset.action ===
            "corriger_pesee"
        ) {
            const collecte =
                (mission.collectes || [])
                    .find(
                        item =>
                            item.id ===
                            bouton.dataset.collecteId
                    );

            if (
                !collecte ||
                collecte.progression
                    ?.collecte_terminee
            ) return;

            etape = {
                action:
                    "enregistrer_pesee",
                collecte
            };
        }

        if (
            etape.action ===
            "aucune"
        ) return;

        try {
            const cle =
                cleOperation(
                    contexteOperation(
                        mission,
                        etape
                    )
                );

            if (
                actionsAcquittees.has(cle)
            ) {
                await chargerJournee();
                afficherTourneeDetaillee();
                return;
            }

            const carte =
                bouton.closest(
                    ".mission-carte"
                );

            if (
                [
                    "terminer_collecte",
                    "enregistrer_pesee",
                    ...typesPhoto
                ].includes(etape.action)
            ) {
                const formulaire =
                    ouvrirSaisie(
                        carte,
                        etape.action,
                        mission,
                        etape
                    );

                formulaire.addEventListener(
                    "submit",
                    async event => {
                        event.preventDefault();

                        await lancer(
                            mission,
                            etape,
                            formulaire
                        );

                        afficherTourneeDetaillee();
                    }
                );

            } else {
                await lancer(
                    mission,
                    etape
                );

                afficherTourneeDetaillee();
            }

        } catch (erreur) {
            afficherMessage(
                messageApplication,
                erreur.message,
                "erreur"
            );
        }
    };

    listeMissions.addEventListener(
        "click",
        gererClicMission
    );

    document
        .getElementById("contenu-tournee")
        ?.addEventListener(
            "click",
            gererClicMission
        );

    const lancer = async (mission, etape, formulaire) => {
        if (actionEnCours || chargementJournee || synchronisation) return;
        if (formulaire && preparationsPhoto.has(formulaire)) {
            afficherMessage(messageApplication, "Terminez la prise de photo avant d’enregistrer.", "erreur");
            return;
        }
        actionEnCours = true;
        const controles = [
            ...listeMissions.querySelectorAll("button, input, select"),
            ...(document.getElementById("contenu-tournee")
                ?.querySelectorAll("button, input, select") || []),
            document.getElementById("bouton-actualiser"),
            document.getElementById("bouton-deconnexion")
        ].filter(Boolean);
        const etatsInitiaux = controles.map(element => [element, element.disabled]);
        // Construire la tentative avant de désactiver les champs (FormData exclut les champs désactivés).
        const requete = executerAction(mission, etape, formulaire);
        controles.forEach(element => { element.disabled = true; });
        afficherMessage(messageApplication, "Enregistrement en cours…", "succes");
        try {
            await requete;
            fermerCameras.get(formulaire)?.();
            afficherMessage(messageApplication, 'Action et photo éventuelle enregistrées sur cet appareil. En attente de synchronisation.', 'succes');
        } catch (erreur) {
            const incertaine = erreur.code === "NETWORK_ERROR" || erreur.status >= 500 ||
                [408, 425, 429].includes(erreur.status);
            afficherMessage(messageApplication,
                incertaine
                    ? "Enregistrement non confirmé. Réessayez : les données et la photo d’origine seront renvoyées sans créer de doublon."
                    : erreur.message, "erreur");
        } finally {
            etatsInitiaux.forEach(([element, disabled]) => { element.disabled = disabled; });
            actionEnCours = false;
            synchroniser();
        }
    };


    const afficherTourneeDetaillee = () => {
        const conteneur =
            document.getElementById(
                "contenu-tournee"
            );

        if (!conteneur) return;

        const missions =
            journeeCourante?.missions ||
            [];

        if (!missions.length) {
            conteneur.innerHTML = `
                <div class="vide">
                    <strong>
                        Aucune tournée aujourd'hui
                    </strong>

                    <p>
                        Votre prochaine mission apparaîtra ici automatiquement.
                    </p>
                </div>
            `;

            return;
        }

        const libellesEtat = {
            a_faire:
                "À faire",

            sur_site:
                "Sur le site",

            en_collecte:
                "Collecte en cours",

            terminee:
                "Terminée"
        };

        const libellesMission = {
            planifiee:
                "Planifiée",

            en_cours:
                "En cours",

            terminee:
                "Terminée",

            annulee:
                "Annulée"
        };

        const heureCourte = valeur => {
            if (!valeur) return "—";

            return String(valeur)
                .slice(0, 5);
        };

        conteneur.innerHTML =
            missions.map(mission => {

                const progression =
                    mission.progression ||
                    {};

                const etape =
                    etapeMission(mission);

                const collecteActiveId =
                    etape.collecte?.id ||
                    null;

                const collectes =
                    [
                        ...(
                            mission.collectes ||
                            []
                        )
                    ].sort(
                        (a, b) =>
                            Number(
                                a.ordre_collecte ||
                                0
                            ) -
                            Number(
                                b.ordre_collecte ||
                                0
                            )
                    );

                const listeCollectes =
                    collectes.length
                        ? collectes
                            .map(collecte => {

                                const client =
                                    collecte
                                        .client
                                        ?.nom ||
                                    "Client non renseigné";

                                const matiere =
                                    collecte
                                        .type_dechet
                                        ?.nom ||
                                    "Matière non renseignée";

                                const site =
                                    collecte
                                        .site
                                        ?.nom ||
                                    "Site non renseigné";

                                const adresse =
                                    collecte
                                        .site
                                        ?.adresse ||
                                    "";

                                const zone =
                                    collecte
                                        .site
                                        ?.zone_geographique ||
                                    "";

                                const responsable =
                                    collecte
                                        .site
                                        ?.responsable_nom ||
                                    "";

                                const poidsEstime =
                                    collecte
                                        .poids
                                        ?.estime_kg;

                                const poidsReel =
                                    collecte
                                        .poids
                                        ?.reel_kg;

                                const etat =
                                    libellesEtat[
                                        collecte.etat
                                    ] ||
                                    collecte.etat ||
                                    "À faire";

                                const estActuelle =
                                    collecteActiveId ===
                                    collecte.id &&
                                    etape.action !==
                                    "aucune";

                                const progressionCollecte =
                                    collecte.progression ||
                                    {};

                                let suivi =
                                    "À rejoindre";

                                if (
                                    progressionCollecte
                                        .arrivee
                                ) {
                                    suivi =
                                        "Arrivé sur le site";
                                }

                                if (
                                    progressionCollecte
                                        .collecte_demarree
                                ) {
                                    suivi =
                                        "Collecte démarrée";
                                }

                                if (
                                    progressionCollecte
                                        .collecte_terminee
                                ) {
                                    suivi =
                                        "Collecte terminée";
                                }

                                const nombrePreuves =
                                    Number(
                                        collecte
                                            .nombre_preuves ??
                                        (
                                            collecte
                                                .preuves ||
                                            []
                                        ).length
                                    );

                                return `
                                    <div class="prochaine-etape">

                                        <strong>
                                            Arrêt ${Number(
                                                collecte
                                                    .ordre_collecte ||
                                                0
                                            )}
                                            ${
                                                estActuelle
                                                    ? " · Étape actuelle"
                                                    : ""
                                            }
                                        </strong>

                                        <span>
                                            <strong>
                                                ${nettoyer(client)}
                                            </strong>
                                        </span>

                                        <span>
                                            ${nettoyer(site)}
                                        </span>

                                        ${
                                            adresse
                                                ? `
                                                <span>
                                                    ${nettoyer(adresse)}
                                                </span>
                                                `
                                                : ""
                                        }

                                        ${
                                            zone
                                                ? `
                                                <span>
                                                    Zone :
                                                    ${nettoyer(zone)}
                                                </span>
                                                `
                                                : ""
                                        }

                                        ${
                                            responsable
                                                ? `
                                                <span>
                                                    Responsable :
                                                    ${nettoyer(responsable)}
                                                </span>
                                                `
                                                : ""
                                        }

                                        <span>
                                            Matière :
                                            ${nettoyer(matiere)}
                                        </span>

                                        <span>
                                            Poids estimé :
                                            ${
                                                poidsEstime ??
                                                "—"
                                            }
                                            kg
                                        </span>

                                        ${
                                            poidsReel !==
                                                null &&
                                            poidsReel !==
                                                undefined
                                                ? `
                                                <span>
                                                    Poids réel :
                                                    ${Number(
                                                        poidsReel
                                                    )}
                                                    kg
                                                </span>
                                                `
                                                : ""
                                        }

                                        <span>
                                            État :
                                            ${nettoyer(etat)}
                                        </span>

                                        <span>
                                            Suivi :
                                            ${nettoyer(suivi)}
                                        </span>

                                        <span>
                                            Preuves :
                                            ${nombrePreuves}
                                        </span>

                                        ${
                                            estActuelle
                                                ? `
                                                <span>
                                                    Prochaine action :
                                                    <strong>
                                                        ${nettoyer(
                                                            libelleEtape(
                                                                etape.action
                                                            )
                                                        )}
                                                    </strong>
                                                </span>
                                                `
                                                : ""
                                        }

                                    </div>
                                `;
                            })
                            .join("")
                        : `
                            <div class="vide">
                                <p>
                                    Aucune collecte associée
                                    à cette mission.
                                </p>
                            </div>
                        `;

                const correctionPesee =
                    etape.action ===
                        "terminer_collecte" &&
                    (
                        etape.collecte
                            ?.pesees ||
                        []
                    ).some(
                        pesee =>
                            pesee.type ===
                            "terrain"
                    )
                        ? `
                            <button
                                type="button"
                                class="bouton bouton-secondaire bouton-mission"
                                data-mission-id="${nettoyer(
                                    mission.id
                                )}"
                                data-collecte-id="${nettoyer(
                                    etape.collecte.id
                                )}"
                                data-action="corriger_pesee"
                            >
                                Corriger la pesée
                            </button>
                        `
                        : "";

                return `
                    <article
                        class="mission-carte"
                        data-mission-id="${nettoyer(
                            mission.id
                        )}"
                    >

                        <div class="mission-corps">

                            <div class="mission-haut">

                                <div>
                                    <span
                                        class="badge badge-${nettoyer(
                                            mission.statut
                                        )}"
                                    >
                                        ${nettoyer(
                                            libellesMission[
                                                mission.statut
                                            ] ||
                                            mission.statut
                                        )}
                                    </span>

                                    <h3>
                                        Mission du jour
                                    </h3>
                                </div>

                                <strong>
                                    ${Number(
                                        progression
                                            .pourcentage ||
                                        0
                                    )} %
                                </strong>

                            </div>

                            <div class="mission-info">

                                Tricycle :
                                <strong>
                                    ${nettoyer(
                                        mission
                                            .tricycle
                                            ?.numero ||
                                        "Non renseigné"
                                    )}
                                </strong>

                                <br>

                                Plaque :
                                ${nettoyer(
                                    mission
                                        .tricycle
                                        ?.plaque ||
                                    "Non renseignée"
                                )}

                                ${
                                    mission
                                        .tricycle
                                        ?.capacite_kg !==
                                        null &&
                                    mission
                                        .tricycle
                                        ?.capacite_kg !==
                                        undefined
                                        ? `
                                        <br>
                                        Capacité :
                                        ${Number(
                                            mission
                                                .tricycle
                                                .capacite_kg
                                        )}
                                        kg
                                        `
                                        : ""
                                }

                                <br>

                                Départ prévu :
                                ${nettoyer(
                                    heureCourte(
                                        mission
                                            .heure_depart_prevue
                                    )
                                )}

                                · Retour prévu :
                                ${nettoyer(
                                    heureCourte(
                                        mission
                                            .heure_retour_prevue
                                    )
                                )}

                                <br>

                                Collectes :
                                ${Number(
                                    progression
                                        .terminees ||
                                    0
                                )}
                                /
                                ${Number(
                                    progression
                                        .nombre_collectes ||
                                    collectes.length
                                )}

                            </div>

                            <div class="progression">
                                <div
                                    class="progression-barre"
                                    style="width:${Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            Number(
                                                progression
                                                    .pourcentage ||
                                                0
                                            )
                                        )
                                    )}%"
                                ></div>
                            </div>

                            ${listeCollectes}

                        </div>

                        <div class="mission-action">

                            ${correctionPesee}

                            <button
                                type="button"
                                class="bouton bouton-principal bouton-mission"
                                data-mission-id="${nettoyer(
                                    mission.id
                                )}"
                                data-action="${nettoyer(
                                    etape.action
                                )}"
                                ${
                                    etape.action ===
                                    "aucune"
                                        ? "disabled"
                                        : ""
                                }
                            >
                                ${nettoyer(
                                    libelleEtape(
                                        etape.action
                                    )
                                )}
                            </button>

                        </div>

                    </article>
                `;
            })
            .join("");
    };

    const afficherIncident = (
        missionSelectionneeId = null
    ) => {
        const conteneur =
            document.getElementById(
                "contenu-incident"
            );

        if (!conteneur) return;

        const missions =
            (
                journeeCourante
                    ?.missions ||
                []
            ).filter(
                mission =>
                    mission.statut ===
                    "en_cours"
            );

        if (!missions.length) {
            conteneur.innerHTML = `
                <div class="vide">
                    <strong>
                        Aucune mission en cours
                    </strong>

                    <p>
                        Démarrez une mission depuis l'onglet Tournée pour pouvoir signaler un incident.
                    </p>
                </div>
            `;

            return;
        }

        const mission =
            missions.find(
                item =>
                    item.id ===
                    missionSelectionneeId
            ) ||
            missions[0];

        const collectes =
            [
                ...(
                    mission.collectes ||
                    []
                )
            ].sort(
                (a, b) =>
                    Number(
                        a.ordre_collecte ||
                        0
                    ) -
                    Number(
                        b.ordre_collecte ||
                        0
                    )
            );

        const optionsMissions =
            missions
                .map(
                    (item, index) => {
                        const tricycle =
                            item.tricycle
                                ?.numero ||
                            "sans tricycle";

                        return `
                            <option
                                value="${nettoyer(
                                    item.id
                                )}"
                                ${
                                    item.id ===
                                    mission.id
                                        ? "selected"
                                        : ""
                                }
                            >
                                Mission ${index + 1}
                                · ${nettoyer(
                                    tricycle
                                )}
                            </option>
                        `;
                    }
                )
                .join("");

        const optionsCollectes =
            collectes
                .map(
                    collecte => {
                        const client =
                            collecte
                                .client
                                ?.nom ||
                            "Client";

                        const site =
                            collecte
                                .site
                                ?.nom ||
                            "Site";

                        return `
                            <option
                                value="${nettoyer(
                                    collecte.id
                                )}"
                            >
                                Arrêt ${Number(
                                    collecte
                                        .ordre_collecte ||
                                    0
                                )}
                                · ${nettoyer(client)}
                                · ${nettoyer(site)}
                            </option>
                        `;
                    }
                )
                .join("");

        conteneur.innerHTML = `
            <form
                id="form-incident"
                class="incident-formulaire"
                novalidate
            >

                <div class="incident-resume">
                    <strong>
                        Incident pendant la mission
                    </strong>

                    <span>
                        Tricycle :
                        ${nettoyer(
                            mission.tricycle
                                ?.numero ||
                            "Non renseigné"
                        )}
                    </span>

                    <span>
                        ${
                            collectes.length
                        }
                        collecte(s) dans cette mission
                    </span>
                </div>

                <div class="incident-grille">

                    <label class="incident-champ">
                        <span>
                            Mission concernée
                        </span>

                        <select
                            id="incident-mission"
                            name="mission_id"
                            required
                        >
                            ${optionsMissions}
                        </select>
                    </label>

                    <label class="incident-champ">
                        <span>
                            Collecte concernée
                        </span>

                        <select
                            name="collecte_id"
                        >
                            <option value="">
                                Incident général sur la mission
                            </option>

                            ${optionsCollectes}
                        </select>
                    </label>

                    <label class="incident-champ">
                        <span>
                            Type d'incident
                        </span>

                        <select
                            name="categorie"
                            required
                        >
                            <option value="">
                                Sélectionner
                            </option>

                            <option value="panne_tricycle">
                                Panne du tricycle
                            </option>

                            <option value="accident">
                                Accident
                            </option>

                            <option value="client_absent">
                                Client absent
                            </option>

                            <option value="acces_refuse">
                                Accès refusé
                            </option>

                            <option value="dechets_non_conformes">
                                Déchets non conformes
                            </option>

                            <option value="securite">
                                Problème de sécurité
                            </option>

                            <option value="autre">
                                Autre
                            </option>
                        </select>
                    </label>

                    <label class="incident-champ">
                        <span>
                            Gravité
                        </span>

                        <select
                            name="gravite"
                            required
                        >
                            <option value="">
                                Sélectionner
                            </option>

                            <option value="faible">
                                Faible
                            </option>

                            <option value="moyenne">
                                Moyenne
                            </option>

                            <option value="elevee">
                                Élevée
                            </option>

                            <option value="critique">
                                Critique
                            </option>
                        </select>
                    </label>

                    <label class="incident-checkbox">

                        <input
                            type="checkbox"
                            name="bloquant"
                        >

                        <span>
                            <strong>
                                Incident bloquant
                            </strong>

                            <small>
                                Cochez si cet incident
                                empêche la poursuite normale
                                de la mission.
                            </small>
                        </span>

                    </label>

                    <label
                        class="
                            incident-champ
                            incident-champ-large
                        "
                    >
                        <span>
                            Description de l'incident
                        </span>

                        <textarea
                            name="description"
                            rows="5"
                            minlength="5"
                            required
                            placeholder="Décrivez clairement ce qui s'est passé..."
                        ></textarea>
                    </label>

                    <div class="incident-gps">
                        <strong>
                            Position GPS
                        </strong>

                        <span>
                            Votre position sera enregistrée
                            automatiquement au moment
                            du signalement.
                        </span>
                    </div>

                    <button
                        type="submit"
                        class="bouton bouton-principal incident-envoyer"
                    >
                        Signaler l'incident
                    </button>

                </div>

            </form>
        `;
    };


    const gererSoumissionIncident =
        async evenement => {

            const formulaire =
                evenement.target.closest(
                    "#form-incident"
                );

            if (!formulaire) return;

            evenement.preventDefault();

            if (
                actionEnCours ||
                chargementJournee
            ) {
                return;
            }

            if (!terrainStore) {
                afficherMessage(
                    messageApplication,
                    "Le stockage Terrain n'est pas disponible.",
                    "erreur"
                );

                return;
            }

            const donneesFormulaire =
                new FormData(formulaire);

            const missionId =
                String(
                    donneesFormulaire.get(
                        "mission_id"
                    ) || ""
                );

            const collecteId =
                String(
                    donneesFormulaire.get(
                        "collecte_id"
                    ) || ""
                ) || null;

            const categorie =
                String(
                    donneesFormulaire.get(
                        "categorie"
                    ) || ""
                )
                    .trim()
                    .toLowerCase();

            const gravite =
                String(
                    donneesFormulaire.get(
                        "gravite"
                    ) || ""
                )
                    .trim()
                    .toLowerCase();

            const description =
                String(
                    donneesFormulaire.get(
                        "description"
                    ) || ""
                )
                    .trim();

            const bloquant =
                donneesFormulaire.has(
                    "bloquant"
                );

            const missions =
                journeeCourante
                    ?.missions ||
                [];

            const mission =
                missions.find(
                    item =>
                        item.id ===
                        missionId
                );

            if (
                !mission ||
                !UUID.test(
                    mission.id ||
                    ""
                )
            ) {
                afficherMessage(
                    messageApplication,
                    "La mission sélectionnée est invalide.",
                    "erreur"
                );

                return;
            }

            if (
                mission.statut !==
                "en_cours"
            ) {
                afficherMessage(
                    messageApplication,
                    "Un incident ne peut être signalé que pendant une mission en cours.",
                    "erreur"
                );

                return;
            }

            if (
                collecteId &&
                !(
                    mission.collectes ||
                    []
                ).some(
                    collecte =>
                        collecte.id ===
                        collecteId &&
                        UUID.test(
                            collecte.id ||
                            ""
                        )
                )
            ) {
                afficherMessage(
                    messageApplication,
                    "La collecte sélectionnée n'appartient pas à cette mission.",
                    "erreur"
                );

                return;
            }

            const categories =
                [
                    "panne_tricycle",
                    "accident",
                    "client_absent",
                    "acces_refuse",
                    "dechets_non_conformes",
                    "securite",
                    "autre"
                ];

            const gravites =
                [
                    "faible",
                    "moyenne",
                    "elevee",
                    "critique"
                ];

            if (
                !categories.includes(
                    categorie
                )
            ) {
                afficherMessage(
                    messageApplication,
                    "Choisissez un type d'incident.",
                    "erreur"
                );

                return;
            }

            if (
                !gravites.includes(
                    gravite
                )
            ) {
                afficherMessage(
                    messageApplication,
                    "Choisissez la gravité de l'incident.",
                    "erreur"
                );

                return;
            }

            if (
                description.length < 5
            ) {
                afficherMessage(
                    messageApplication,
                    "Décrivez l'incident en au moins 5 caractères.",
                    "erreur"
                );

                return;
            }

            const bouton =
                formulaire.querySelector(
                    'button[type="submit"]'
                );

            const controles =
                [
                    ...formulaire
                        .querySelectorAll(
                            "button, input, select, textarea"
                        )
                ];

            const etats =
                controles.map(
                    element => [
                        element,
                        element.disabled
                    ]
                );

            /*
             * Instant réel du signalement :
             * capturé AVANT l'attente GPS.
             */
            const survenuLe =
                new Date()
                    .toISOString();

            /*
             * UUID créé une seule fois
             * pour cet incident.
             */
            const operationId =
                crypto.randomUUID();

            actionEnCours = true;

            controles.forEach(
                element => {
                    element.disabled = true;
                }
            );

            if (bouton) {
                bouton.textContent =
                    "Localisation GPS…";
            }

            afficherMessage(
                messageApplication,
                "Localisation GPS de l'incident en cours…",
                "succes"
            );

            try {
                const gps =
                    await obtenirGps();

                const utilisateur =
                    auth
                        .obtenirUtilisateur()
                        ?.id ||
                    null;

                const contexte = {
                    utilisateur,
                    mission:
                        mission.id,
                    collecte:
                        collecteId,
                    action:
                        "signaler_incident"
                };

                const payload = {
                    operation_id:
                        operationId,

                    survenu_le:
                        survenuLe,

                    collecte_id:
                        collecteId,

                    categorie,

                    gravite,

                    bloquant,

                    description,

                    mode:
                        navigator.onLine
                            ? "online"
                            : "offline",

                    latitude:
                        gps.latitude,

                    longitude:
                        gps.longitude,

                    precision_gps:
                        gps.precision_gps
                };

                /*
                 * Aucun POST direct ici.
                 * L'incident est enregistré
                 * localement d'abord.
                 */
                await terrainStore.enqueue(
                    contexte,
                    payload
                );

                await updateQueueUI();

                afficherMessage(
                    messageApplication,
                    navigator.onLine
                        ? "Incident enregistré sur cet appareil. Synchronisation demandée."
                        : "Incident enregistré hors connexion. Il sera synchronisé automatiquement dès que possible.",
                    "succes"
                );

                formulaire.reset();

                afficherIncident(
                    mission.id
                );

                /*
                 * La file offline reste
                 * la source de vérité.
                 */
                synchroniser();

            } catch (erreur) {

                afficherMessage(
                    messageApplication,
                    erreur.message ||
                    "Impossible d'enregistrer l'incident.",
                    "erreur"
                );

            } finally {

                etats.forEach(
                    (
                        [
                            element,
                            disabled
                        ]
                    ) => {
                        element.disabled =
                            disabled;
                    }
                );

                if (
                    bouton &&
                    document.body
                        .contains(bouton)
                ) {
                    bouton.textContent =
                        "Signaler l'incident";
                }

                actionEnCours = false;
            }
        };


    const conteneurIncident =
        document.getElementById(
            "contenu-incident"
        );

    conteneurIncident
        ?.addEventListener(
            "submit",
            gererSoumissionIncident
        );

    conteneurIncident
        ?.addEventListener(
            "change",
            evenement => {

                if (
                    evenement.target
                        ?.id !==
                    "incident-mission"
                ) {
                    return;
                }

                afficherIncident(
                    evenement.target.value
                );
            }
        );

    let profilTerrainMemoire = null;


    const formaterDateProfil = valeur => {

        if (!valeur) {
            return "Non renseignée";
        }

        const date =
            new Date(valeur);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Non renseignée";
        }

        return new Intl.DateTimeFormat(
            "fr-FR",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        ).format(date);
    };


    const libelleRoleProfil = role => {

        const valeur =
            String(
                role || ""
            )
                .trim()
                .toLowerCase();

        if (
            valeur ===
            "agent_valorisation_carbone"
        ) {
            return "Agent de valorisation carbone";
        }

        if (!valeur) {
            return "Agent terrain";
        }

        return valeur
            .replaceAll("_", " ");
    };


    const initialesProfil = nom => {

        const parties =
            String(
                nom || "Agent"
            )
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2);

        const initiales =
            parties
                .map(
                    partie =>
                        partie.charAt(0)
                )
                .join("")
                .toUpperCase();

        return initiales || "A";
    };


    const valeurProfil = valeur => {

        if (
            valeur === null ||
            valeur === undefined ||
            String(valeur).trim() === ""
        ) {
            return "Non renseigné";
        }

        return String(valeur);
    };


    const rendreProfil =
        (
            contexte,
            horsLigne = false
        ) => {

            const conteneur =
                document.getElementById(
                    "contenu-profil"
                );

            if (!conteneur) return;

            const utilisateurLocal =
                auth.obtenirUtilisateur() ||
                {};

            const utilisateur =
                contexte?.utilisateur ||
                utilisateurLocal;

            const agent =
                contexte?.agent ||
                {};

            const organisation =
                contexte?.organisation ||
                {};

            const nom =
                utilisateur?.nom ||
                utilisateurLocal?.nom ||
                "Agent";

            const role =
                utilisateur?.role ||
                utilisateurLocal?.role ||
                utilisateurLocal?.role_nom;

            const statut =
                valeurProfil(
                    agent?.statut
                );

            const disponibilite =
                agent?.disponible === true
                    ? "Disponible"
                    : agent?.disponible === false
                        ? "Indisponible"
                        : "Non renseignée";

            const etatSession =
                horsLigne
                    ? "Mode hors ligne"
                    : "Session vérifiée";

            const detailSession =
                horsLigne
                    ? "Les informations disponibles sur cet appareil sont affichées."
                    : "Votre identité Terrain a été vérifiée auprès du serveur.";

            conteneur.innerHTML = `
                <div class="profil-carte">

                    <div class="profil-entete">

                        <div
                            class="profil-avatar"
                            aria-hidden="true"
                        >
                            ${nettoyer(
                                initialesProfil(
                                    nom
                                )
                            )}
                        </div>

                        <div class="profil-identite">

                            <strong>
                                ${nettoyer(nom)}
                            </strong>

                            <span>
                                ${nettoyer(
                                    libelleRoleProfil(
                                        role
                                    )
                                )}
                            </span>

                            <span class="profil-badge">
                                ${nettoyer(
                                    etatSession
                                )}
                            </span>

                        </div>

                    </div>

                    <div class="profil-section">

                        <h3>
                            Informations personnelles
                        </h3>

                        <div class="profil-grille">

                            <div class="profil-ligne">
                                <span class="profil-etiquette">
                                    Email
                                </span>

                                <strong class="profil-valeur">
                                    ${nettoyer(
                                        valeurProfil(
                                            utilisateur
                                                ?.email
                                        )
                                    )}
                                </strong>
                            </div>

                            <div class="profil-ligne">
                                <span class="profil-etiquette">
                                    Téléphone du compte
                                </span>

                                <strong class="profil-valeur">
                                    ${nettoyer(
                                        valeurProfil(
                                            utilisateur
                                                ?.telephone
                                        )
                                    )}
                                </strong>
                            </div>

                            <div class="profil-ligne">
                                <span class="profil-etiquette">
                                    Téléphone agent
                                </span>

                                <strong class="profil-valeur">
                                    ${nettoyer(
                                        valeurProfil(
                                            agent
                                                ?.telephone
                                        )
                                    )}
                                </strong>
                            </div>

                            <div class="profil-ligne">
                                <span class="profil-etiquette">
                                    Rôle
                                </span>

                                <strong class="profil-valeur">
                                    ${nettoyer(
                                        libelleRoleProfil(
                                            role
                                        )
                                    )}
                                </strong>
                            </div>

                        </div>

                    </div>

                    <div class="profil-section">

                        <h3>
                            Statut terrain
                        </h3>

                        <div class="profil-grille">

                            <div class="profil-ligne">
                                <span class="profil-etiquette">
                                    Statut
                                </span>

                                <strong class="profil-valeur">
                                    ${nettoyer(
                                        statut
                                    )}
                                </strong>
                            </div>

                            <div class="profil-ligne">
                                <span class="profil-etiquette">
                                    Disponibilité
                                </span>

                                <strong class="profil-valeur">
                                    ${nettoyer(
                                        disponibilite
                                    )}
                                </strong>
                            </div>

                            <div class="profil-ligne">
                                <span class="profil-etiquette">
                                    Date d'embauche
                                </span>

                                <strong class="profil-valeur">
                                    ${nettoyer(
                                        formaterDateProfil(
                                            agent
                                                ?.date_embauche
                                        )
                                    )}
                                </strong>
                            </div>

                        </div>

                    </div>

                    <div class="profil-session">

                        <strong>
                            ${nettoyer(
                                etatSession
                            )}
                        </strong>

                        <span>
                            ${nettoyer(
                                detailSession
                            )}
                        </span>

                    </div>

                    <div class="profil-actions">

                        <button
                            type="button"
                            id="profil-actualiser"
                            class="bouton bouton-principal"
                        >
                            Actualiser mon profil
                        </button>

                        <button
                            type="button"
                            id="profil-deconnexion"
                            class="bouton profil-bouton-deconnexion"
                        >
                            Se déconnecter
                        </button>

                    </div>

                </div>
            `;
        };


    const afficherProfil =
        async (
            forcer = false
        ) => {

            const conteneur =
                document.getElementById(
                    "contenu-profil"
                );

            if (!conteneur) return;

            if (
                profilTerrainMemoire &&
                !forcer
            ) {
                rendreProfil(
                    profilTerrainMemoire,
                    !navigator.onLine
                );

                return;
            }

            conteneur.innerHTML = `
                <div class="profil-chargement">
                    Chargement du profil…
                </div>
            `;

            try {

                const reponse =
                    await api.get(
                        "/terrain/me"
                    );

                const contexte =
                    reponse?.data ||
                    reponse;

                profilTerrainMemoire =
                    contexte;

                rendreProfil(
                    contexte,
                    false
                );

            } catch (erreur) {

                if (
                    erreur.status === 401 ||
                    erreur.status === 403
                ) {
                    clearTimeout(
                        syncTimer
                    );

                    auth.deconnexion();

                    afficherEcran(
                        connexion
                    );

                    return;
                }

                if (
                    erreur.code ===
                    "NETWORK_ERROR"
                ) {
                    rendreProfil(
                        profilTerrainMemoire ||
                        {
                            utilisateur:
                                auth.obtenirUtilisateur()
                                    || {}
                        },
                        true
                    );

                    return;
                }

                conteneur.innerHTML = `
                    <div class="vide">
                        <strong>
                            Profil temporairement indisponible
                        </strong>

                        <p>
                            ${nettoyer(
                                erreur.message ||
                                "Impossible de récupérer votre profil."
                            )}
                        </p>

                        <button
                            type="button"
                            id="profil-actualiser"
                            class="bouton bouton-principal"
                        >
                            Réessayer
                        </button>
                    </div>
                `;
            }
        };


    const contenuProfil =
        document.getElementById(
            "contenu-profil"
        );

    contenuProfil
        ?.addEventListener(
            "click",
            async evenement => {

                const actualiser =
                    evenement.target.closest(
                        "#profil-actualiser"
                    );

                if (actualiser) {

                    if (
                        actionEnCours ||
                        synchronisation
                    ) {
                        return;
                    }

                    actualiser.disabled =
                        true;

                    await afficherProfil(
                        true
                    );

                    return;
                }

                const deconnexion =
                    evenement.target.closest(
                        "#profil-deconnexion"
                    );

                if (deconnexion) {

                    document
                        .getElementById(
                            "bouton-deconnexion"
                        )
                        ?.click();
                }
            }
        );

const vuesInternes = {
    accueil: document.getElementById("vue-accueil"),
    tournee: document.getElementById("vue-tournee"),
    incident: document.getElementById("vue-incident"),
    profil: document.getElementById("vue-profil")
};

const boutonsNavigation = {
    accueil: document.getElementById("nav-accueil"),
    tournee: document.getElementById("nav-tournee"),
    incident: document.getElementById("nav-incident"),
    profil: document.getElementById("nav-profil")
};

const afficherVueInterne = nom => {
    const vue = vuesInternes[nom];
    if (!vue) return;

    Object.values(vuesInternes).forEach(element => {
        if (element) element.classList.add("masque");
    });

    vue.classList.remove("masque");

    window.scrollTo(0, 0);

    if (nom === "tournee") {
        afficherTourneeDetaillee();
    }

    if (nom === "incident") {
        afficherIncident();
    }

    if (nom === "profil") {
        afficherProfil();
    }

    Object.entries(boutonsNavigation).forEach(([cle, bouton]) => {
        if (bouton) bouton.classList.toggle("actif", cle === nom);
    });
};

Object.entries(boutonsNavigation).forEach(([nom, bouton]) => {
    if (!bouton) return;

    bouton.addEventListener("click", () => {
        afficherVueInterne(nom);
    });
});

    const demarrer =
        async function () {

            mettreAJourReseau();


            const session =
                await auth.restaurer();


            if (!session) {

                afficherEcran(
                    connexion
                );

                return;

            }


            await entrerApplication(
                session
            );

        };


    if ('serviceWorker' in navigator && window.isSecureContext) {
        navigator.serviceWorker.register('./sw.js?v=1-15').catch(() => {
            afficherMessage(messageApplication, 'Le cache hors ligne n’a pas pu être installé. Réessayez avec une connexion.', 'erreur');
        });
    }
    demarrer().catch(e => { afficherEcran(connexion); afficherMessage(messageConnexion, e.message, 'erreur'); });

})();
