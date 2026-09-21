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


    const afficherJournee =
        function (
            journee
        ) {

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


                            const prochaine =
                                mission.prochaine_collecte;


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
                                                mission.action_suivante
                                            )}"
                                        >
                                            ${nettoyer(
                                                libelleAction(
                                                    mission.action_suivante
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


    const chargerJournee =
        async function () {

            masquerMessage(
                messageApplication
            );


            try {

                const reponse =
                    await api.get(
                        "/terrain/journee"
                    );


                const journee =
                    reponse?.data ||
                    reponse;


                afficherJournee(
                    journee
                );


                return journee;

            } catch (erreur) {

                afficherMessage(
                    messageApplication,
                    erreur.message,
                    "erreur"
                );


                if (
                    erreur.status === 401 ||
                    erreur.status === 403
                ) {

                    auth.deconnexion();

                    afficherEcran(
                        connexion
                    );

                }


                return null;

            }

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


            await chargerJournee();

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

            chargerJournee();

        }
    );


    window.addEventListener(
        "offline",
        mettreAJourReseau
    );


    /*
     * Les boutons mission seront branchés
     * à l'étape suivante.
     */
    listeMissions.addEventListener(
        "click",
        function (
            evenement
        ) {

            const bouton =
                evenement.target.closest(
                    ".bouton-mission"
                );


            if (!bouton) {
                return;
            }


            afficherMessage(
                messageApplication,
                "Le moteur de tournée est prêt. Nous allons maintenant brancher cette action.",
                "succes"
            );

        }
    );


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


    demarrer();

})();