(function () {

    "use strict";


    const parId =
        function (id) {

            return document.getElementById(
                id
            );
        };


    const nombre =
        function (valeur) {

            if (
                valeur === null ||
                valeur === undefined ||
                valeur === ""
            ) {
                return null;
            }

            const resultat =
                Number(
                    valeur
                );

            return Number.isFinite(
                resultat
            )
                ? resultat
                : null;
        };


    const formatNombre =
        function (
            valeur,
            decimals
        ) {

            const n =
                nombre(
                    valeur
                );

            if (n === null) {
                return "\u2014";
            }

            return new Intl.NumberFormat(
                "fr-FR",
                {
                    maximumFractionDigits:
                        decimals === undefined
                            ? 3
                            : decimals
                }
            ).format(
                n
            );
        };


    const formatKg =
        function (valeur) {

            const n =
                nombre(
                    valeur
                );

            return n === null
                ? "\u2014"
                : (
                    formatNombre(
                        n,
                        3
                    ) +
                    " kg"
                );
        };


    const extraire =
        function (reponse) {

            let valeur =
                reponse;

            for (
                let niveau = 0;
                niveau < 3;
                niveau += 1
            ) {

                if (
                    valeur &&
                    !Array.isArray(valeur) &&
                    valeur.data !== undefined
                ) {

                    valeur =
                        valeur.data;

                    continue;
                }

                break;
            }

            return valeur;
        };


    const enTableau =
        function (
            reponse,
            cles
        ) {

            const valeur =
                extraire(
                    reponse
                );

            if (
                Array.isArray(
                    valeur
                )
            ) {

                return valeur;
            }


            if (!valeur) {
                return [];
            }


            for (
                const cle
                of cles
            ) {

                if (
                    Array.isArray(
                        valeur[cle]
                    )
                ) {

                    return valeur[cle];
                }
            }


            return [];
        };


    const dateCle =
        function (valeur) {

            if (!valeur) {
                return null;
            }


            const brute =
                String(
                    valeur
                ).trim();


            const direct =
                brute.match(
                    /^(\d{4}-\d{2}-\d{2})/
                );


            if (direct) {
                return direct[1];
            }


            const date =
                new Date(
                    brute
                );


            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {

                return null;
            }


            const annee =
                String(
                    date.getFullYear()
                );

            const mois =
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );

            const jour =
                String(
                    date.getDate()
                ).padStart(
                    2,
                    "0"
                );


            return (
                annee +
                "-" +
                mois +
                "-" +
                jour
            );
        };


    const dateCollecte =
        function (collecte) {

            const candidates = [
                collecte.date_collecte,
                collecte.date_collecte_prevue,
                collecte.date_prevue,
                collecte.terminee_le,
                collecte.termine_le,
                collecte.realisee_le,
                collecte.poids_reel_saisi_le,
                collecte.cree_le,
                collecte.created_at,
                collecte.date
            ];


            for (
                const candidate
                of candidates
            ) {

                const cle =
                    dateCle(
                        candidate
                    );

                if (cle) {
                    return cle;
                }
            }


            return null;
        };


    const allocations =
        function (vente) {

            if (
                Array.isArray(
                    vente.allocations_lots
                )
            ) {

                return vente.allocations_lots;
            }


            if (
                typeof vente.allocations_lots ===
                    "string"
            ) {

                try {

                    const valeur =
                        JSON.parse(
                            vente.allocations_lots
                        );

                    return Array.isArray(
                        valeur
                    )
                        ? valeur
                        : [];

                }
                catch (_) {

                    return [];
                }
            }


            return [];
        };


    const devise =
        function (valeur) {

            const resultat =
                String(
                    valeur ||
                    "NON_RENSEIGNEE"
                )
                    .trim()
                    .toUpperCase();

            return resultat ||
                "NON_RENSEIGNEE";
        };


    const afficherMessage =
        function (
            message,
            type
        ) {

            const zone =
                parId(
                    "prPiloteMessage"
                );

            if (!zone) {
                return;
            }


            zone.className =
                "pr-pilote-message";


            if (
                type ===
                "error"
            ) {

                zone.classList.add(
                    "is-error"
                );
            }


            if (
                type ===
                "success"
            ) {

                zone.classList.add(
                    "is-success"
                );
            }


            zone.textContent =
                message ||
                "";
        };


    const definir =
        function (
            id,
            valeur,
            note
        ) {

            const element =
                parId(id);

            if (element) {

                element.textContent =
                    valeur;
            }


            if (
                note !== undefined
            ) {

                const noteElement =
                    parId(
                        id + "Note"
                    );

                if (noteElement) {

                    noteElement.textContent =
                        note;
                }
            }
        };


    const ajouterQualite =
        function (
            libelle,
            valeur
        ) {

            const zone =
                parId(
                    "prPiloteQuality"
                );

            if (!zone) {
                return;
            }


            const ligne =
                document.createElement(
                    "div"
                );

            ligne.className =
                "pr-pilote-quality-row";


            const label =
                document.createElement(
                    "span"
                );

            label.textContent =
                libelle;


            const resultat =
                document.createElement(
                    "strong"
                );

            resultat.textContent =
                valeur;


            ligne.append(
                label,
                resultat
            );


            zone.appendChild(
                ligne
            );
        };


    const afficherMonnaie =
        function (
            groupes
        ) {

            const zone =
                parId(
                    "prPiloteMoney"
                );

            if (!zone) {
                return;
            }


            zone.replaceChildren();


            const entrees =
                Array.from(
                    groupes.entries()
                )
                    .sort(
                        function (a, b) {
                            return a[0]
                                .localeCompare(
                                    b[0]
                                );
                        }
                    );


            if (
                entrees.length ===
                0
            ) {

                const vide =
                    document.createElement(
                        "p"
                    );

                vide.className =
                    "pr-pilote-message";

                vide.textContent =
                    "Aucun chiffre d'affaires attribuable aux lots du pilote.";

                zone.appendChild(
                    vide
                );

                return;
            }


            entrees.forEach(
                function (
                    entree
                ) {

                    const code =
                        entree[0];

                    const groupe =
                        entree[1];


                    const ligne =
                        document.createElement(
                            "div"
                        );

                    ligne.className =
                        "pr-pilote-money-row";


                    const copie =
                        document.createElement(
                            "div"
                        );


                    const titre =
                        document.createElement(
                            "strong"
                        );

                    titre.textContent =
                        code;


                    const detail =
                        document.createElement(
                            "small"
                        );


                    if (
                        groupe.montantsInconnus >
                        0
                    ) {

                        detail.textContent =
                            "Montant partiel : certaines allocations n'ont pas de montant exploitable.";
                    }
                    else {

                        const revenuKg =
                            groupe.kg > 0
                                ? (
                                    groupe.montant /
                                    groupe.kg
                                  )
                                : null;


                        detail.textContent =
                            "Revenu/kg : " +
                            (
                                revenuKg === null
                                    ? "\u2014"
                                    : (
                                        formatNombre(
                                            revenuKg,
                                            2
                                        ) +
                                        " " +
                                        code +
                                        "/kg"
                                      )
                            );
                    }


                    copie.append(
                        titre,
                        detail
                    );


                    const valeur =
                        document.createElement(
                            "div"
                        );

                    valeur.className =
                        "pr-pilote-money-value";


                    const montant =
                        document.createElement(
                            "strong"
                        );

                    montant.textContent =
                        (
                            formatNombre(
                                groupe.montant,
                                2
                            ) +
                            " " +
                            code
                        );


                    const kgVendus =
                        document.createElement(
                            "small"
                        );

                    kgVendus.textContent =
                        (
                            formatKg(
                                groupe.kg
                            ) +
                            " attribues"
                        );


                    valeur.append(
                        montant,
                        kgVendus
                    );


                    ligne.append(
                        copie,
                        valeur
                    );


                    zone.appendChild(
                        ligne
                    );
                }
            );
        };


    const analyser =
        function (
            collectes,
            lots,
            ventes,
            debut,
            fin
        ) {

            let datesInconnues =
                0;


            const filtreActif =
                Boolean(
                    debut ||
                    fin
                );


            const cohorteCollectes =
                collectes.filter(
                    function (collecte) {

                        if (
                            !filtreActif
                        ) {
                            return true;
                        }


                        const date =
                            dateCollecte(
                                collecte
                            );


                        if (!date) {

                            datesInconnues +=
                                1;

                            return false;
                        }


                        if (
                            debut &&
                            date < debut
                        ) {
                            return false;
                        }


                        if (
                            fin &&
                            date > fin
                        ) {
                            return false;
                        }


                        return true;
                    }
                );


            const collectesMesurees =
                cohorteCollectes.filter(
                    function (collecte) {

                        const poids =
                            nombre(
                                collecte.poids_reel
                            );

                        return (
                            poids !== null &&
                            poids > 0
                        );
                    }
                );


            const collecteIds =
                new Set(
                    cohorteCollectes
                        .map(
                            function (collecte) {
                                return collecte.id;
                            }
                        )
                        .filter(Boolean)
                );


            const lotsCohorte =
                lots.filter(
                    function (lot) {

                        return collecteIds.has(
                            lot.collecte_id
                        );
                    }
                );


            const lotIds =
                new Set(
                    lotsCohorte
                        .map(
                            function (lot) {
                                return lot.id;
                            }
                        )
                        .filter(Boolean)
                );


            const poidsCollecte =
                collectesMesurees.reduce(
                    function (
                        total,
                        collecte
                    ) {

                        return (
                            total +
                            (
                                nombre(
                                    collecte.poids_reel
                                ) || 0
                            )
                        );
                    },
                    0
                );


            let restantConnu =
                0;

            let lotsSoldeInconnu =
                0;


            lotsCohorte.forEach(
                function (lot) {

                    const restant =
                        nombre(
                            lot.quantite_restante_kg
                        );


                    if (
                        restant === null
                    ) {

                        lotsSoldeInconnu +=
                            1;
                    }
                    else {

                        restantConnu +=
                            restant;
                    }
                }
            );


            let vendu =
                0;

            let ventesSansProvenance =
                0;

            const revenus =
                new Map();


            ventes
                .filter(
                    function (vente) {

                        return (
                            String(
                                vente.statut || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            "confirmee"
                        );
                    }
                )
                .forEach(
                    function (vente) {

                        const provenance =
                            allocations(
                                vente
                            );


                        if (
                            provenance.length ===
                            0
                        ) {

                            ventesSansProvenance +=
                                1;

                            return;
                        }


                        provenance.forEach(
                            function (allocation) {

                                if (
                                    !lotIds.has(
                                        allocation.lot_id
                                    )
                                ) {
                                    return;
                                }


                                const quantite =
                                    nombre(
                                        allocation.quantite_kg
                                    );


                                if (
                                    quantite === null ||
                                    quantite <= 0
                                ) {
                                    return;
                                }


                                vendu +=
                                    quantite;


                                const code =
                                    devise(
                                        vente.devise
                                    );


                                if (
                                    !revenus.has(
                                        code
                                    )
                                ) {

                                    revenus.set(
                                        code,
                                        {
                                            montant:
                                                0,

                                            kg:
                                                0,

                                            montantsInconnus:
                                                0
                                        }
                                    );
                                }


                                const groupe =
                                    revenus.get(
                                        code
                                    );


                                groupe.kg +=
                                    quantite;


                                const totalVente =
                                    nombre(
                                        vente.montant_total
                                    );

                                const quantiteVente =
                                    nombre(
                                        vente.quantite
                                    );

                                const prixUnitaire =
                                    nombre(
                                        vente.prix_unitaire
                                    );


                                let montantAllocation =
                                    null;


                                if (
                                    totalVente !== null &&
                                    quantiteVente !== null &&
                                    quantiteVente > 0
                                ) {

                                    montantAllocation =
                                        totalVente *
                                        (
                                            quantite /
                                            quantiteVente
                                        );
                                }
                                else if (
                                    prixUnitaire !==
                                    null
                                ) {

                                    montantAllocation =
                                        prixUnitaire *
                                        quantite;
                                }


                                if (
                                    montantAllocation ===
                                    null
                                ) {

                                    groupe
                                        .montantsInconnus +=
                                            1;
                                }
                                else {

                                    groupe.montant +=
                                        montantAllocation;
                                }
                            }
                        );
                    }
                );


            const tauxEcoulement =
                poidsCollecte > 0
                    ? (
                        vendu /
                        poidsCollecte *
                        100
                      )
                    : null;


            return {

                cohorteCollectes,
                collectesMesurees,
                lotsCohorte,

                poidsCollecte,
                vendu,

                restantConnu,
                lotsSoldeInconnu,

                tauxEcoulement,

                datesInconnues,
                ventesSansProvenance,

                revenus
            };
        };


    const charger =
        async function () {

            const bouton =
                parId(
                    "prPiloteRefresh"
                );


            if (
                !window.ProRecup ||
                typeof ProRecup.requete !==
                    "function"
            ) {

                afficherMessage(
                    "Le client API Pro Recup est indisponible.",
                    "error"
                );

                return;
            }


            const debut =
                String(
                    parId(
                        "dateDebutRapport"
                    )?.value ||
                    ""
                );


            const fin =
                String(
                    parId(
                        "dateFinRapport"
                    )?.value ||
                    ""
                );


            if (
                debut &&
                fin &&
                debut > fin
            ) {

                afficherMessage(
                    "La date de debut doit preceder la date de fin.",
                    "error"
                );

                return;
            }


            if (bouton) {
                bouton.disabled = true;
            }


            afficherMessage(
                "Calcul des indicateurs reels du pilote..."
            );


            try {

                const reponses =
                    await Promise.all([
                        ProRecup.requete(
                            "/api/collectes"
                        ),
                        ProRecup.requete(
                            "/api/lots"
                        ),
                        ProRecup.requete(
                            "/api/ventes"
                        )
                    ]);


                const collectes =
                    enTableau(
                        reponses[0],
                        [
                            "collectes",
                            "items",
                            "resultats"
                        ]
                    );


                const lots =
                    enTableau(
                        reponses[1],
                        [
                            "lots",
                            "items",
                            "resultats"
                        ]
                    );


                const ventes =
                    enTableau(
                        reponses[2],
                        [
                            "ventes",
                            "items",
                            "resultats"
                        ]
                    );


                const resultat =
                    analyser(
                        collectes,
                        lots,
                        ventes,
                        debut,
                        fin
                    );


                definir(
                    "prPiloteCollecte",
                    formatKg(
                        resultat.poidsCollecte
                    ),
                    (
                        resultat.collectesMesurees.length +
                        " collecte(s) avec poids reel"
                    )
                );


                definir(
                    "prPiloteVendu",
                    formatKg(
                        resultat.vendu
                    ),
                    "Quantite issue des lots de la cohorte vendue a ce jour"
                );


                definir(
                    "prPiloteEcoulement",
                    resultat.tauxEcoulement ===
                        null
                        ? "\u2014"
                        : (
                            formatNombre(
                                resultat.tauxEcoulement,
                                1
                            ) +
                            " %"
                          ),
                    "Kg vendus / kg reellement collectes"
                );


                definir(
                    "prPiloteRestant",
                    resultat.lotsSoldeInconnu >
                        0
                        ? (
                            formatKg(
                                resultat.restantConnu
                            ) +
                            " connus"
                          )
                        : formatKg(
                            resultat.restantConnu
                          ),
                    resultat.lotsSoldeInconnu >
                        0
                        ? (
                            resultat.lotsSoldeInconnu +
                            " lot(s) avec solde non determine"
                          )
                        : "Solde actuel des lots de la cohorte"
                );


                const periode =
                    parId(
                        "prPilotePeriode"
                    );


                if (periode) {

                    if (
                        debut ||
                        fin
                    ) {

                        periode.textContent =
                            (
                                "Cohorte de collectes : " +
                                (
                                    debut ||
                                    "debut"
                                ) +
                                " -> " +
                                (
                                    fin ||
                                    "aujourd'hui"
                                )
                            );
                    }
                    else {

                        periode.textContent =
                            "Cohorte : toutes les collectes disponibles";
                    }
                }


                afficherMonnaie(
                    resultat.revenus
                );


                const qualite =
                    parId(
                        "prPiloteQuality"
                    );


                if (qualite) {
                    qualite.replaceChildren();
                }


                ajouterQualite(
                    "Collectes dans la cohorte",
                    String(
                        resultat
                            .cohorteCollectes
                            .length
                    )
                );


                ajouterQualite(
                    "Collectes avec poids reel",
                    String(
                        resultat
                            .collectesMesurees
                            .length
                    )
                );


                ajouterQualite(
                    "Lots rattaches",
                    String(
                        resultat
                            .lotsCohorte
                            .length
                    )
                );


                ajouterQualite(
                    "Lots au solde inconnu",
                    String(
                        resultat
                            .lotsSoldeInconnu
                    )
                );


                ajouterQualite(
                    "Collectes sans date exploitable exclues",
                    String(
                        resultat
                            .datesInconnues
                    )
                );


                ajouterQualite(
                    "Ventes confirmees sans provenance lot",
                    String(
                        resultat
                            .ventesSansProvenance
                    )
                );


                ajouterQualite(
                    "Marge / benefice",
                    "Non disponible"
                );


                if (
                    resultat.tauxEcoulement !==
                        null &&
                    resultat.tauxEcoulement >
                        100.05
                ) {

                    afficherMessage(
                        "Attention : le ratio vendu / collecte depasse 100 %. Une incoherence de donnees ou un stock historique doit etre verifie.",
                        "error"
                    );
                }
                else {

                    afficherMessage(
                        "Indicateurs reconstruits uniquement a partir des donnees operationnelles tracees.",
                        "success"
                    );
                }

            }
            catch (erreur) {

                afficherMessage(
                    erreur?.message ||
                    "Impossible de calculer l'economie du pilote.",
                    "error"
                );
            }
            finally {

                if (bouton) {
                    bouton.disabled = false;
                }
            }
        };


    const construire =
        function () {

            if (
                parId(
                    "prPiloteEconomique"
                )
            ) {
                return;
            }


            const zone =
                parId(
                    "zoneImpressionRapport"
                );


            if (!zone) {
                return;
            }


            const section =
                document.createElement(
                    "section"
                );


            section.id =
                "prPiloteEconomique";

            section.className =
                "pr-pilote";


            section.innerHTML = `
                <div class="pr-pilote-head">

                    <div>

                        <span class="pr-pilote-eyebrow">
                            ECONOMIE DU PILOTE
                        </span>

                        <h2 class="pr-pilote-title">
                            Performance matiere et revenus traces
                        </h2>

                        <p class="pr-pilote-subtitle">
                            Les indicateurs suivent la cohorte de collectes
                            selectionnee : collecte reelle, lots associes,
                            quantites vendues et chiffre d'affaires
                            attribuable. Aucun benefice n'est invente.
                        </p>

                    </div>

                    <span class="pr-pilote-badge">
                        Donnees reelles
                    </span>

                </div>


                <div class="pr-pilote-toolbar">

                    <span
                        class="pr-pilote-periode"
                        id="prPilotePeriode"
                    >
                        Cohorte : toutes les collectes disponibles
                    </span>

                    <button
                        type="button"
                        class="pr-pilote-refresh"
                        id="prPiloteRefresh"
                    >
                        Actualiser
                    </button>

                </div>


                <p
                    class="pr-pilote-message"
                    id="prPiloteMessage"
                ></p>


                <div class="pr-pilote-kpis">

                    <article class="pr-pilote-kpi">

                        <span>
                            Kg collectes
                        </span>

                        <strong id="prPiloteCollecte">
                            \u2014
                        </strong>

                        <small id="prPiloteCollecteNote">
                            Poids reel
                        </small>

                    </article>


                    <article class="pr-pilote-kpi">

                        <span>
                            Kg vendus
                        </span>

                        <strong id="prPiloteVendu">
                            \u2014
                        </strong>

                        <small id="prPiloteVenduNote">
                            Via allocations de lots
                        </small>

                    </article>


                    <article class="pr-pilote-kpi">

                        <span>
                            Taux d'ecoulement
                        </span>

                        <strong id="prPiloteEcoulement">
                            \u2014
                        </strong>

                        <small id="prPiloteEcoulementNote">
                            Vendu / collecte reelle
                        </small>

                    </article>


                    <article class="pr-pilote-kpi">

                        <span>
                            Stock restant
                        </span>

                        <strong id="prPiloteRestant">
                            \u2014
                        </strong>

                        <small id="prPiloteRestantNote">
                            Lots de la cohorte
                        </small>

                    </article>

                </div>


                <div class="pr-pilote-grid">

                    <article class="pr-pilote-panel">

                        <div class="pr-pilote-panel-head">

                            <strong>
                                Chiffre d'affaires attribuable
                            </strong>

                            <span>
                                Chaque devise reste separee.
                                Aucun total USD + CDF.
                            </span>

                        </div>

                        <div
                            class="pr-pilote-money"
                            id="prPiloteMoney"
                        ></div>

                    </article>


                    <article class="pr-pilote-panel">

                        <div class="pr-pilote-panel-head">

                            <strong>
                                Qualite des donnees
                            </strong>

                            <span>
                                Ce qui est mesurable et ce qui reste incomplet.
                            </span>

                        </div>

                        <div
                            class="pr-pilote-quality"
                            id="prPiloteQuality"
                        ></div>


                        <div class="pr-pilote-warning">

                            <strong>
                                Rentabilite non calculee
                            </strong>

                            <p>
                                Les depenses, salaires, carburant,
                                transport et autres couts operationnels
                                ne sont pas encore modelises dans
                                Pro Recup. Le chiffre d'affaires ne doit
                                donc jamais etre presente comme un benefice.
                            </p>

                        </div>

                    </article>

                </div>
            `;


            zone.insertAdjacentElement(
                "afterbegin",
                section
            );


            parId(
                "prPiloteRefresh"
            )?.addEventListener(
                "click",
                charger
            );


            parId(
                "dateDebutRapport"
            )?.addEventListener(
                "change",
                charger
            );


            parId(
                "dateFinRapport"
            )?.addEventListener(
                "change",
                charger
            );


            charger();
        };


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            construire,
            {
                once:
                    true
            }
        );
    }
    else {

        construire();
    }

})();