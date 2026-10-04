(function () {

    "use strict";


    const parId =
        function (id) {

            return document.getElementById(
                id
            );
        };


    const extraireDonnees =
        function (reponse) {

            if (
                reponse &&
                reponse.data !== undefined
            ) {

                if (
                    reponse.data &&
                    reponse.data.data !== undefined
                ) {

                    return reponse.data.data;
                }

                return reponse.data;
            }

            if (
                reponse &&
                reponse.donnees !== undefined
            ) {

                return reponse.donnees;
            }

            return reponse;
        };


    const enTableau =
        function (valeur) {

            const donnee =
                extraireDonnees(
                    valeur
                );

            if (
                Array.isArray(
                    donnee
                )
            ) {
                return donnee;
            }

            if (
                donnee &&
                Array.isArray(
                    donnee.items
                )
            ) {
                return donnee.items;
            }

            if (
                donnee &&
                Array.isArray(
                    donnee.resultats
                )
            ) {
                return donnee.resultats;
            }

            if (
                donnee &&
                Array.isArray(
                    donnee.lots
                )
            ) {
                return donnee.lots;
            }

            if (
                donnee &&
                Array.isArray(
                    donnee.ventes
                )
            ) {
                return donnee.ventes;
            }

            return [];
        };


    const nombre =
        function (
            valeur
        ) {

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


    const kg =
        function (
            valeur
        ) {

            const resultat =
                nombre(
                    valeur
                );

            if (resultat === null) {
                return "\u2014";
            }

            return (
                new Intl.NumberFormat(
                    "fr-FR",
                    {
                        maximumFractionDigits:
                            3
                    }
                ).format(
                    resultat
                ) +
                " kg"
            );
        };


    const date =
        function (
            valeur
        ) {

            if (!valeur) {
                return "\u2014";
            }

            const objet =
                new Date(
                    valeur
                );

            if (
                Number.isNaN(
                    objet.getTime()
                )
            ) {
                return String(
                    valeur
                );
            }

            return new Intl.DateTimeFormat(
                "fr-FR",
                {
                    dateStyle:
                        "medium"
                }
            ).format(
                objet
            );
        };


    const api =
        async function (
            chemin
        ) {

            if (
                !window.ProRecup ||
                typeof window.ProRecup.requete !==
                    "function"
            ) {

                throw new Error(
                    "Client API Pro Recup indisponible."
                );
            }

            return await window.ProRecup.requete(
                chemin
            );
        };


    const trouverLot =
        function (
            lots,
            code
        ) {

            const attendu =
                String(
                    code
                )
                    .trim()
                    .toLowerCase();

            return lots.find(
                function (lot) {

                    return String(
                        lot.code_qr ||
                        lot.code ||
                        ""
                    )
                        .trim()
                        .toLowerCase() ===
                        attendu;
                }
            ) || null;
        };


    const allocations =
        function (
            vente
        ) {

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


    const ventesDuLot =
        function (
            ventes,
            lot
        ) {

            return ventes
                .map(
                    function (vente) {

                        const correspondances =
                            allocations(
                                vente
                            )
                                .filter(
                                    function (allocation) {

                                        return (
                                            allocation.lot_id ===
                                                lot.id ||
                                            String(
                                                allocation.code_qr ||
                                                ""
                                            ) ===
                                                String(
                                                    lot.code_qr ||
                                                    ""
                                                )
                                        );
                                    }
                                );

                        if (
                            correspondances.length ===
                            0
                        ) {
                            return null;
                        }

                        return {
                            vente,
                            allocations:
                                correspondances
                        };
                    }
                )
                .filter(Boolean);
        };


    const trouverCollecte =
        function (
            collectes,
            collecteId
        ) {

            return collectes.find(
                function (collecte) {

                    return (
                        collecte.id ===
                        collecteId
                    );
                }
            ) || null;
        };


    const creerStage =
        function (
            titre,
            principal,
            detail,
            complet
        ) {

            const article =
                document.createElement(
                    "article"
                );

            article.className =
                "pr-trace-stage";

            if (complet) {

                article.classList.add(
                    "is-complete"
                );
            }

            const label =
                document.createElement(
                    "div"
                );

            label.className =
                "pr-trace-stage-label";

            label.innerHTML =
                '<span class="pr-trace-dot"></span>' +
                titre;


            const fort =
                document.createElement(
                    "strong"
                );

            fort.textContent =
                principal ||
                "\u2014";


            const texte =
                document.createElement(
                    "p"
                );

            texte.textContent =
                detail ||
                "";


            article.append(
                label,
                fort,
                texte
            );


            return article;
        };


    const afficherMessage =
        function (
            message,
            type
        ) {

            const zone =
                parId(
                    "prTraceMessage"
                );

            if (!zone) {
                return;
            }

            zone.className =
                "pr-trace-message";

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
                message || "";
        };


    const majKpi =
        function (
            id,
            valeur
        ) {

            const element =
                parId(id);

            if (element) {

                element.textContent =
                    valeur;
            }
        };


    const rendre =
        function (
            lot,
            collecte,
            ventes
        ) {

            const resultat =
                parId(
                    "prTraceResult"
                );

            const chaine =
                parId(
                    "prTraceChain"
                );

            const listeVentes =
                parId(
                    "prTraceSalesList"
                );

            if (
                !resultat ||
                !chaine ||
                !listeVentes
            ) {
                return;
            }


            const poidsLot =
                nombre(
                    lot.poids_reel
                );

            const restant =
                nombre(
                    lot.quantite_restante_kg
                );


            const provenance =
                ventesDuLot(
                    ventes,
                    lot
                );


            const vendu =
                provenance.reduce(
                    function (
                        total,
                        ligne
                    ) {

                        const sousTotal =
                            ligne.allocations.reduce(
                                function (
                                    somme,
                                    allocation
                                ) {

                                    return (
                                        somme +
                                        (
                                            nombre(
                                                allocation.quantite_kg
                                            ) || 0
                                        )
                                    );
                                },
                                0
                            );

                        return (
                            total +
                            sousTotal
                        );
                    },
                    0
                );


            majKpi(
                "prTraceCode",
                lot.code_qr ||
                "\u2014"
            );

            majKpi(
                "prTracePoids",
                kg(
                    poidsLot
                )
            );

            majKpi(
                "prTraceVendu",
                kg(
                    vendu
                )
            );

            majKpi(
                "prTraceRestant",
                restant === null
                    ? "\u2014"
                    : kg(restant)
            );


            chaine.replaceChildren();


            chaine.append(
                creerStage(
                    "1. Collecte",
                    collecte
                        ? (
                            collecte.reference ||
                            collecte.id ||
                            "Collecte documentee"
                          )
                        : (
                            lot.collecte_id ||
                            "Collecte liee"
                          ),
                    collecte
                        ? (
                            "Statut : " +
                            (
                                collecte.statut ||
                                "\u2014"
                            ) +
                            " \u00b7 Poids reel : " +
                            kg(
                                collecte.poids_reel
                            )
                          )
                        : "Identifiant conserve dans le lot.",
                    Boolean(
                        lot.collecte_id
                    )
                ),

                creerStage(
                    "2. Lot",
                    lot.code_qr ||
                    lot.id,
                    (
                        "Statut : " +
                        (
                            lot.statut_lot ||
                            "\u2014"
                        ) +
                        " \u00b7 Poids initial : " +
                        kg(
                            lot.poids_reel
                        )
                    ),
                    true
                ),

                creerStage(
                    "3. Stock",
                    lot.statut_lot ===
                        "vendu"
                        ? "Sorti du stock"
                        : "Matiere suivie en stock",
                    restant === null
                        ? "Quantite restante non determinee pour ce lot."
                        : (
                            "Quantite restante : " +
                            kg(restant)
                          ),
                    Boolean(
                        lot.statut_lot
                    )
                ),

                creerStage(
                    "4. Vente",
                    provenance.length > 0
                        ? (
                            provenance.length +
                            (
                                provenance.length > 1
                                    ? " ventes liees"
                                    : " vente liee"
                            )
                          )
                        : "Aucune vente liee",
                    provenance.length > 0
                        ? (
                            "Quantite attribuee : " +
                            kg(vendu)
                          )
                        : "Le lot n'apparait dans aucune allocation de vente.",
                    provenance.length > 0
                )
            );


            listeVentes.replaceChildren();


            if (
                provenance.length ===
                0
            ) {

                const vide =
                    document.createElement(
                        "p"
                    );

                vide.className =
                    "pr-trace-message";

                vide.textContent =
                    "Aucune vente n'est encore rattachee a ce lot.";

                listeVentes.appendChild(
                    vide
                );
            }
            else {

                provenance.forEach(
                    function (ligne) {

                        const allocationKg =
                            ligne.allocations.reduce(
                                function (
                                    total,
                                    allocation
                                ) {

                                    return (
                                        total +
                                        (
                                            nombre(
                                                allocation.quantite_kg
                                            ) || 0
                                        )
                                    );
                                },
                                0
                            );


                        const element =
                            document.createElement(
                                "div"
                            );

                        element.className =
                            "pr-trace-sale";


                        const copie =
                            document.createElement(
                                "div"
                            );


                        const reference =
                            document.createElement(
                                "strong"
                            );

                        reference.textContent =
                            ligne.vente.reference_vente ||
                            ligne.vente.id ||
                            "Vente";


                        const detail =
                            document.createElement(
                                "small"
                            );

                        detail.textContent =
                            (
                                (
                                    ligne.vente.acheteur_nom ||
                                    "Acheteur non renseigne"
                                ) +
                                " \u00b7 " +
                                date(
                                    ligne.vente.date_vente
                                ) +
                                " \u00b7 " +
                                (
                                    ligne.vente.statut ||
                                    "\u2014"
                                )
                            );


                        copie.append(
                            reference,
                            detail
                        );


                        const quantite =
                            document.createElement(
                                "span"
                            );

                        quantite.className =
                            "pr-trace-sale-qty";

                        quantite.textContent =
                            kg(
                                allocationKg
                            );


                        element.append(
                            copie,
                            quantite
                        );


                        listeVentes.appendChild(
                            element
                        );
                    }
                );
            }


            resultat.hidden =
                false;


            afficherMessage(
                "Chaine de provenance reconstruite a partir des donnees operationnelles.",
                "success"
            );
        };


    const rechercher =
        async function () {

            const champ =
                parId(
                    "prTraceInput"
                );

            const bouton =
                parId(
                    "prTraceButton"
                );

            const resultat =
                parId(
                    "prTraceResult"
                );

            const code =
                String(
                    champ?.value ||
                    ""
                ).trim();


            if (!code) {

                afficherMessage(
                    "Saisissez ou scannez un code QR de lot.",
                    "error"
                );

                return;
            }


            if (bouton) {
                bouton.disabled = true;
            }


            if (resultat) {
                resultat.hidden = true;
            }


            afficherMessage(
                "Reconstruction de la chaine de tracabilite..."
            );


            try {

                const reponses =
                    await Promise.all([
                        api("/api/lots"),
                        api("/api/collectes"),
                        api("/api/ventes")
                    ]);


                const lots =
                    enTableau(
                        reponses[0]
                    );

                const collectes =
                    enTableau(
                        reponses[1]
                    );

                const ventes =
                    enTableau(
                        reponses[2]
                    );


                const lot =
                    trouverLot(
                        lots,
                        code
                    );


                if (!lot) {

                    throw new Error(
                        "Aucun lot ne correspond a ce code dans votre organisation."
                    );
                }


                const collecte =
                    trouverCollecte(
                        collectes,
                        lot.collecte_id
                    );


                rendre(
                    lot,
                    collecte,
                    ventes
                );

            }
            catch (erreur) {

                afficherMessage(
                    erreur?.message ||
                    "Impossible de reconstruire la tracabilite.",
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
                    "prTraceConsole"
                )
            ) {
                return;
            }


            const main =
                document.querySelector(
                    "main"
                );

            if (!main) {
                return;
            }


            const section =
                document.createElement(
                    "section"
                );

            section.id =
                "prTraceConsole";

            section.className =
                "pr-trace";


            section.innerHTML = `
                <div class="pr-trace-head">

                    <div>

                        <span class="pr-trace-eyebrow">
                            TRAÇABILITÉ MATIÈRE
                        </span>

                        <h2 class="pr-trace-title">
                            Collecte → Lot → Stock → Vente
                        </h2>

                        <p class="pr-trace-subtitle">
                            Saisissez le code QR d'un lot pour reconstruire
                            sa provenance et voir les quantités attribuées
                            aux ventes sans mélanger les matières.
                        </p>

                    </div>

                    <span class="pr-trace-badge">
                        Chaîne vérifiable
                    </span>

                </div>


                <div class="pr-trace-search">

                    <input
                        id="prTraceInput"
                        type="text"
                        autocomplete="off"
                        placeholder="Code QR du lot"
                        aria-label="Code QR du lot"
                    >

                    <button
                        id="prTraceButton"
                        type="button"
                    >
                        Retracer
                    </button>

                </div>


                <p
                    class="pr-trace-message"
                    id="prTraceMessage"
                >
                    Aucun lot sélectionné.
                </p>


                <div
                    class="pr-trace-result"
                    id="prTraceResult"
                    hidden
                >

                    <div class="pr-trace-summary">

                        <article class="pr-trace-kpi">
                            <span>Lot</span>
                            <strong id="prTraceCode">—</strong>
                        </article>

                        <article class="pr-trace-kpi">
                            <span>Poids initial</span>
                            <strong id="prTracePoids">—</strong>
                        </article>

                        <article class="pr-trace-kpi">
                            <span>Déjà vendu</span>
                            <strong id="prTraceVendu">—</strong>
                        </article>

                        <article class="pr-trace-kpi">
                            <span>Restant</span>
                            <strong id="prTraceRestant">—</strong>
                        </article>

                    </div>


                    <div
                        class="pr-trace-chain"
                        id="prTraceChain"
                    ></div>


                    <section class="pr-trace-sales">

                        <div class="pr-trace-sales-head">

                            <strong>
                                Ventes rattachées au lot
                            </strong>

                            <span>
                                Allocation réelle via vente_lots
                            </span>

                        </div>

                        <div id="prTraceSalesList"></div>

                    </section>

                </div>
            `;


            const premiereSection =
                Array.from(
                    main.children
                ).find(
                    function (element) {

                        return (
                            element.tagName ===
                            "SECTION"
                        );
                    }
                );


            if (premiereSection) {

                premiereSection.insertAdjacentElement(
                    "afterend",
                    section
                );
            }
            else {

                main.prepend(
                    section
                );
            }


            parId(
                "prTraceButton"
            )?.addEventListener(
                "click",
                rechercher
            );


            parId(
                "prTraceInput"
            )?.addEventListener(
                "keydown",
                function (evenement) {

                    if (
                        evenement.key ===
                        "Enter"
                    ) {

                        evenement.preventDefault();

                        rechercher();
                    }
                }
            );
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