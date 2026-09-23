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
    const rejectButton = document.getElementById('bouton-refus');
    const replaceProofButton = document.getElementById('bouton-remplacer-preuve');
    const replaceProofForm = document.getElementById('remplacement-preuve');
    const cancelReplaceProof = document.getElementById('annuler-remplacement-preuve');
    const authorized = () => !reconnexionRequise && terrainOwner && auth.obtenirUtilisateur()?.id === terrainOwner &&
        !!localStorage.getItem(window.ProRecup.config.TOKEN_KEY);
    const updateQueueUI = async () => {
        if (!terrainStore) return;
        const rows = await terrainStore.list();
        const first = rows[0];
        const firstType = first && ({ avant_collecte: 'photo avant collecte', apres_collecte: 'photo après collecte' }[first.type] || 'action ' + first.type.replaceAll('_', ' '));
        const firstState = first && (first.last_error === 'BLOB_ILLISIBLE' ?
            first.post_initiated ? 'preuve locale illisible, vérification requise avant remplacement' : 'preuve locale illisible, remplacement requis' :
            first.statut === 'erreur' ? 'refusée' : first.statut === 'envoi' ? 'envoi en cours' :
            first.last_error === 'RECONNEXION' ? 'reconnexion requise' : first.last_error === 'UPLOAD_RESEAU' ? 'réseau indisponible, nouvel essai prévu' :
            ['ERREUR_SERVEUR', 'RESEAU_OU_SERVEUR'].includes(first.last_error) ? 'serveur indisponible, nouvel essai prévu' :
            first.next_attempt_at > Date.now() ? 'nouvel essai différé' : 'prête');
        syncStatus.textContent = rows.length + ' action(s) en attente' +
            (first ? ' — première : ' + firstType + ', ' + firstState : '');
        syncButton.hidden = !rows.length;
        syncButton.disabled = !rows.length || !navigator.onLine || !!synchronisation || first?.statut === 'recuperation';
        replaceProofButton.hidden = first?.statut !== 'recuperation' || first?.last_error !== 'BLOB_ILLISIBLE' || first?.post_initiated === true;
        if (first?.statut !== 'recuperation') replaceProofForm.hidden = true;
        rejectButton.hidden = !rows.some(r => r.statut === 'erreur');
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
    const actionsCollecte = ["arriver_site", "demarrer_collecte", "terminer_collecte"];
    const typesPhoto = ["avant_collecte", "apres_collecte"];
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
        apres_collecte: "Prendre la photo après collecte"
    })[action] || libelleAction(action);


    const afficherJournee =
        function (
            journee
        ) {

            journeeCourante = journee;

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
                            Lorsqu'une mission vous sera affectée,
                            elle apparaîtra ici.
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

    const ouvrirSaisie = (carte, action) => {
        fermerSaisie(carte.querySelector(".saisie-terrain"));
        const formulaire = document.createElement("form");
        formulaire.className = "saisie-terrain";
        if (action === "terminer_collecte") {
            formulaire.innerHTML = [
                '<label>Résultat<select name="resultat_terrain" required>',
                '<option value="collectee">Collectée</option>',
                '<option value="partielle">Partielle</option>',
                '<option value="aucune_matiere">Aucune matière</option>',
                '<option value="non_collectee">Non collectée</option>',
                '</select></label>',
                '<label>Poids réel (kg)<input name="poids_reel" type="number" min="0" step="any" inputmode="decimal" required></label>',
                '<label>Motif (obligatoire si non collectée)<input name="motif_terrain" type="text"></label>'
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
            }
            Object.assign(donnees, await obtenirGps());
            tentative = enregistrerTentative(contexte, donnees, empreinte);
        }
        if (photo) fichiersTentatives.set(cle, fichier);
        await terrainStore.enqueue(contexte, filtrerPayload(contexte.action, tentative.payload), fichier);
        effacerTentative(contexte);
        afficherJournee(await terrainStore.view());
        await updateQueueUI();

    };

    listeMissions.addEventListener("click", async evenement => {
        const bouton = evenement.target.closest(".bouton-mission");
        if (!bouton || bouton.disabled || actionEnCours || chargementJournee) return;
        const mission = journeeCourante?.missions?.find(item => item.id === bouton.dataset.missionId);
        if (!mission) return;
        const etape = etapeMission(mission);
        if (etape.action === "aucune") return;
        try {
            const cle = cleOperation(contexteOperation(mission, etape));
            if (actionsAcquittees.has(cle)) {
                await chargerJournee();
                return;
            }
            const carte = bouton.closest(".mission-carte");
            if (["terminer_collecte", ...typesPhoto].includes(etape.action)) {
                const formulaire = ouvrirSaisie(carte, etape.action);
                formulaire.addEventListener("submit", async event => {
                    event.preventDefault();
                    await lancer(mission, etape, formulaire);
                });
            } else {
                await lancer(mission, etape);
            }
        } catch (erreur) {
            afficherMessage(messageApplication, erreur.message, "erreur");
        }
    });

    const lancer = async (mission, etape, formulaire) => {
        if (actionEnCours || chargementJournee || synchronisation) return;
        if (formulaire && preparationsPhoto.has(formulaire)) {
            afficherMessage(messageApplication, "Terminez la prise de photo avant d’enregistrer.", "erreur");
            return;
        }
        actionEnCours = true;
        const controles = [
            ...listeMissions.querySelectorAll("button, input, select"),
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
        navigator.serviceWorker.register('./sw.js?v=1-4').catch(() => {
            afficherMessage(messageApplication, 'Le cache hors ligne n’a pas pu être installé. Réessayez avec une connexion.', 'erreur');
        });
    }
    demarrer().catch(e => { afficherEcran(connexion); afficherMessage(messageConnexion, e.message, 'erreur'); });

})();
