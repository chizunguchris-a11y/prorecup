if (!window.ProRecup) {

    throw new Error(
        "La bibliothèque commune ProRecup est introuvable."
    );

}

ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const boutonNouvelleCollecte =
    document.getElementById(
        "boutonNouvelleCollecte"
    );

const boutonActualiser =
    document.getElementById(
        "boutonActualiser"
    );

const boutonFermerModale =
    document.getElementById(
        "boutonFermerModale"
    );

const boutonAnnuler =
    document.getElementById(
        "boutonAnnuler"
    );

const boutonEnregistrer =
    document.getElementById(
        "boutonEnregistrer"
    );

const fenetreCollecte =
    document.getElementById(
        "fenetreCollecte"
    );

const formulaireCollecte =
    document.getElementById(
        "formulaireCollecte"
    );

const champRecherche =
    document.getElementById(
        "champRecherche"
    );

const filtreStatut =
    document.getElementById(
        "filtreStatut"
    );

const corpsTableauCollectes =
    document.getElementById(
        "corpsTableauCollectes"
    );

const nombreCollectes =
    document.getElementById(
        "nombreCollectes"
    );

const nombreEnAttente =
    document.getElementById(
        "nombreEnAttente"
    );

const nombreValidees =
    document.getElementById(
        "nombreValidees"
    );

const erreurFormulaire =
    document.getElementById(
        "erreurFormulaire"
    );

const selectClient =
    document.getElementById(
        "client_id"
    );

const selectSite =
    document.getElementById(
        "site_id"
    );

const selectTypeDechet =
    document.getElementById(
        "type_dechet_id"
    );

let collectes = [];
let clients = [];
let sites = [];
let typesDechets = [];
let collectePeseeDepot = null;

const roleCourant = String(ProRecup.obtenirUtilisateur()?.role || ProRecup.obtenirUtilisateur()?.role_nom || "").toLowerCase();
const peutPeserDepot = ["admin", "manager"].includes(roleCourant);
const fenetrePeseeDepot = document.getElementById("fenetrePeseeDepot");
const formulairePeseeDepot = document.getElementById("formulairePeseeDepot");

const fermerPeseeDepot = () => {
    collectePeseeDepot = null;
    formulairePeseeDepot.reset();
    fenetrePeseeDepot.classList.add("cache");
    fenetrePeseeDepot.setAttribute("aria-hidden", "true");
};

const ouvrirPeseeDepot = async collecte => {
    collectePeseeDepot = collecte;
    const reponse = await ProRecup.requete("/api/collectes/balances");
    const balancesDepot = Array.isArray(reponse.data) ? reponse.data : [];
    const select = document.getElementById("balance_depot_id");
    select.innerHTML = '<option value="">Sélectionnez une balance</option>';
    balancesDepot.forEach(balance => {
        const option = document.createElement("option");
        option.value = balance.id;
        option.textContent = `${balance.numero_interne} — max ${balance.capacite_max_kg} kg, précision ${balance.precision_kg} kg`;
        select.appendChild(option);
    });
    const maintenant = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    document.getElementById("date_heure_depot").value = maintenant;
    fenetrePeseeDepot.classList.remove("cache");
    fenetrePeseeDepot.setAttribute("aria-hidden", "false");
};

const afficherErreurFormulaire = (
    message
) => {

    erreurFormulaire.textContent =
        message;

    erreurFormulaire.classList.remove(
        "cache"
    );

};

const cacherErreurFormulaire = () => {

    erreurFormulaire.textContent = "";

    erreurFormulaire.classList.add(
        "cache"
    );

};

const remplirSelect = (
    element,
    liste,
    texteParDefaut,
    obtenirTexte
) => {

    element.innerHTML = "";

    const optionDefaut =
        document.createElement("option");

    optionDefaut.value = "";

    optionDefaut.textContent =
        texteParDefaut;

    element.appendChild(
        optionDefaut
    );

    liste.forEach((item) => {

        const option =
            document.createElement("option");

        option.value = item.id;

        option.textContent =
            obtenirTexte(item);

        element.appendChild(
            option
        );

    });

};

const chargerListesFormulaire =
    async () => {

        const resultats =
            await Promise.all([
                ProRecup.requete(
                    "/api/clients"
                ),
                ProRecup.requete(
                    "/api/sites"
                ),
                ProRecup.requete(
                    "/api/types-dechets"
                )
            ]);

        clients =
            Array.isArray(resultats[0].data)
                ? resultats[0].data
                : [];

        sites =
            Array.isArray(resultats[1].data)
                ? resultats[1].data
                : [];

        typesDechets =
            Array.isArray(resultats[2].data)
                ? resultats[2].data
                : [];

        remplirSelect(
            selectClient,
            clients,
            "Sélectionnez un client",
            (client) => client.nom
        );

        remplirSelect(
            selectSite,
            sites,
            "Sélectionnez un site",
            (site) => site.nom
        );

        remplirSelect(
            selectTypeDechet,
            typesDechets,
            "Sélectionnez un type de déchet",
            (type) => type.nom
        );

    };

const mettreAJourCompteurs = () => {

    nombreCollectes.textContent =
        collectes.length;

    nombreEnAttente.textContent =
        collectes.filter(
            (collecte) =>
                collecte.statut ===
                "en_attente"
        ).length;

    nombreValidees.textContent =
        collectes.filter(
            (collecte) =>
                collecte.statut ===
                "valide"
        ).length;

};

const formaterStatut = (statut) => {

    if (statut === "valide") {
        return "Validée";
    }

    return "En attente";

};

const creerCellule = (
    contenu,
    classe = ""
) => {

    const cellule =
        document.createElement("td");

    cellule.textContent =
        contenu || "Non renseigné";

    if (classe) {
        cellule.className = classe;
    }

    return cellule;

};

const validerCollecte = async (
    collecte,
    bouton
) => {

    const confirmation =
        window.confirm(
            `Valider la collecte du client "${collecte.client_nom}" ?`
        );

    if (!confirmation) {
        return;
    }

    bouton.disabled = true;
    bouton.textContent =
        "Validation...";

    try {

        await ProRecup.requete(
            `/api/collectes/${collecte.id}/valider`,
            {
                method: "PATCH"
            }
        );

        ProRecup.afficherNotification(
            "Collecte validée avec succès.",
            "succes"
        );

        await chargerCollectes();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        bouton.disabled = false;
        bouton.textContent = "Valider";

    }

};

const afficherCollectes = (
    listeCollectes
) => {

    corpsTableauCollectes.innerHTML =
        "";

    if (listeCollectes.length === 0) {

        const ligne =
            document.createElement("tr");

        const cellule =
            document.createElement("td");

        cellule.colSpan = 8;

        cellule.className =
            "etat-tableau";

        cellule.textContent =
            "Aucune collecte trouvée.";

        ligne.appendChild(cellule);

        corpsTableauCollectes
            .appendChild(ligne);

        return;

    }

    listeCollectes.forEach(
        (collecte) => {

            const ligne =
                document.createElement("tr");

            ligne.appendChild(
                creerCellule(
                    collecte.client_nom,
                    "nom-principal"
                )
            );

            ligne.appendChild(
                creerCellule(
                    collecte.site_nom
                )
            );

            ligne.appendChild(
                creerCellule(
                    collecte.type_dechet
                )
            );

            ligne.appendChild(
                creerCellule(
                    `${ProRecup.formaterNombre(
                        collecte.poids_estime
                    )} kg`
                )
            );

            const cellulePesee = document.createElement("td");
            cellulePesee.className = "cellule-pesee";
            const pesees = Array.isArray(collecte.pesees) ? collecte.pesees : [];
            if (!pesees.length) {
                cellulePesee.textContent = "Non pesée";
                cellulePesee.classList.add("texte-vide");
            } else {
                pesees.forEach(pesee => {
                    const lignePesee = document.createElement("div");
                    lignePesee.className = "detail-pesee";
                    lignePesee.textContent = `${pesee.type === "depot" ? "Dépôt" : "Terrain"} : ${ProRecup.formaterNombre(pesee.poids_net)} kg net · ${pesee.balance_numero || "balance non renseignée"} · ${pesee.agent_nom || "opérateur"} · ${new Date(pesee.date_heure).toLocaleString("fr-FR")}${pesee.latitude == null ? "" : ` · GPS ${Number(pesee.latitude).toFixed(5)}, ${Number(pesee.longitude).toFixed(5)}`} · ${pesee.est_courante ? "mesure courante" : "historique remplacé"}`;
                    cellulePesee.appendChild(lignePesee);
                });
                if (collecte.ecart_terrain_depot_pct != null) {
                    const ecart = document.createElement("strong");
                    ecart.className = collecte.anomalie_pesee ? "ecart-pesee anomalie" : "ecart-pesee";
                    ecart.textContent = `Écart terrain/dépôt : ${ProRecup.formaterNombre(collecte.ecart_terrain_depot_pct)} %${collecte.anomalie_pesee ? " — anomalie" : ""}`;
                    cellulePesee.appendChild(ecart);
                }
                (collecte.tickets_balance || []).forEach(ticket => {
                    const boutonPreuve = document.createElement("button");
                    boutonPreuve.type = "button";
                    boutonPreuve.className = "bouton-valider bouton-preuve";
                    boutonPreuve.textContent = "Voir le ticket";
                    boutonPreuve.addEventListener("click", async () => {
                        boutonPreuve.disabled = true;
                        try {
                            const reponse = await ProRecup.requete(`/api/collectes/${encodeURIComponent(collecte.id)}/preuves/${encodeURIComponent(ticket.id)}/url`);
                            const url = reponse?.data?.url;
                            if (!url) throw new Error("URL de preuve indisponible.");
                            window.open(url, "_blank", "noopener,noreferrer");
                        } catch (erreur) {
                            ProRecup.afficherNotification(erreur.message, "erreur");
                        } finally {
                            boutonPreuve.disabled = false;
                        }
                    });
                    cellulePesee.appendChild(boutonPreuve);
                });
            }
            ligne.appendChild(cellulePesee);

            ligne.appendChild(
                creerCellule(
                    collecte.agent_nom,
                    collecte.agent_nom
                        ? ""
                        : "texte-vide"
                )
            );

            const celluleStatut =
                document.createElement("td");

            const badge =
                document.createElement("span");

            badge.className =
                collecte.statut === "valide"
                    ? "badge-statut statut-valide"
                    : "badge-statut statut-attente";

            badge.textContent =
                formaterStatut(
                    collecte.statut
                );

            celluleStatut.appendChild(
                badge
            );

            ligne.appendChild(
                celluleStatut
            );

            const celluleAction =
                document.createElement("td");

            const missionId = [...pesees].reverse().find(pesee => pesee.mission_id)?.mission_id;
            if (peutPeserDepot && missionId) {
                const boutonDepot = document.createElement("button");
                boutonDepot.type = "button";
                boutonDepot.className = "bouton-valider bouton-depot";
                boutonDepot.textContent = pesees.some(pesee => pesee.type === "depot") ? "Re-peser au dépôt" : "Pesée dépôt";
                boutonDepot.addEventListener("click", () => ouvrirPeseeDepot(collecte)
                    .catch(erreur => ProRecup.afficherNotification(erreur.message, "erreur")));
                celluleAction.appendChild(boutonDepot);
            }

            if (
                collecte.statut ===
                "en_attente"
            ) {

                const bouton =
                    document.createElement(
                        "button"
                    );

                bouton.type = "button";

                bouton.className =
                    "bouton-valider";

                bouton.textContent =
                    "Valider";

                bouton.addEventListener(
                    "click",
                    () =>
                        validerCollecte(
                            collecte,
                            bouton
                        )
                );

                celluleAction.appendChild(
                    bouton
                );

            } else {

                celluleAction.textContent =
                    "Terminée";

                celluleAction.className =
                    "texte-vide";

            }

            ligne.appendChild(
                celluleAction
            );

            corpsTableauCollectes
                .appendChild(ligne);

        }
    );

};

const filtrerCollectes = () => {

    const recherche =
        champRecherche.value
            .trim()
            .toLowerCase();

    const statut =
        filtreStatut.value;

    const resultat =
        collectes.filter(
            (collecte) => {

                const contenu = [
                    collecte.client_nom,
                    collecte.site_nom,
                    collecte.type_dechet,
                    collecte.agent_nom,
                    collecte.statut,
                    collecte.poids_estime
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const correspondRecherche =
                    !recherche ||
                    contenu.includes(
                        recherche
                    );

                const correspondStatut =
                    !statut ||
                    collecte.statut ===
                        statut;

                return (
                    correspondRecherche &&
                    correspondStatut
                );

            }
        );

    afficherCollectes(resultat);

};

const afficherEtatChargement = () => {

    corpsTableauCollectes.innerHTML = `
        <tr>
            <td
                colspan="8"
                class="etat-tableau"
            >
                <span
                    class="indicateur-chargement"
                ></span>
            </td>
        </tr>
    `;

};

const chargerCollectes = async () => {

    boutonActualiser.disabled = true;

    boutonActualiser.textContent =
        "Chargement...";

    afficherEtatChargement();

    try {

        const resultat =
            await ProRecup.requete(
                "/api/collectes"
            );

        collectes =
            Array.isArray(resultat.data)
                ? resultat.data
                : [];

        mettreAJourCompteurs();
        filtrerCollectes();

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

        corpsTableauCollectes.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="etat-tableau"
                >
                    Impossible de charger les collectes.
                </td>
            </tr>
        `;

    } finally {

        boutonActualiser.disabled =
            false;

        boutonActualiser.textContent =
            "Actualiser";

    }

};

formulairePeseeDepot.addEventListener("submit", async evenement => {
    evenement.preventDefault();
    const pesees = collectePeseeDepot?.pesees || [];
    const missionId = [...pesees].reverse().find(pesee => pesee.mission_id)?.mission_id;
    if (!collectePeseeDepot || !missionId) return;
    const bouton = document.getElementById("boutonEnregistrerPeseeDepot");
    bouton.disabled = true;
    try {
        await ProRecup.requete(`/api/collectes/${encodeURIComponent(collectePeseeDepot.id)}/pesees`, {
            method: "POST",
            body: JSON.stringify({
                operation_id: crypto.randomUUID(), mission_id: missionId,
                balance_id: document.getElementById("balance_depot_id").value,
                poids_brut: Number(document.getElementById("poids_brut_depot").value),
                tare: Number(document.getElementById("tare_depot").value),
                date_heure: new Date(document.getElementById("date_heure_depot").value).toISOString()
            })
        });
        ProRecup.afficherNotification("Pesée dépôt enregistrée.", "succes");
        fermerPeseeDepot();
        await chargerCollectes();
    } catch (erreur) {
        const zone = document.getElementById("erreurPeseeDepot");
        zone.textContent = erreur.message; zone.classList.remove("cache");
    } finally { bouton.disabled = false; }
});
document.getElementById("boutonFermerPeseeDepot").addEventListener("click", fermerPeseeDepot);
document.getElementById("boutonAnnulerPeseeDepot").addEventListener("click", fermerPeseeDepot);

const ouvrirModale = async () => {

    formulaireCollecte.reset();
    cacherErreurFormulaire();

    boutonNouvelleCollecte.disabled =
        true;

    boutonNouvelleCollecte.textContent =
        "Chargement...";

    try {

        await chargerListesFormulaire();

        fenetreCollecte.classList.remove(
            "cache"
        );

        fenetreCollecte.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";

    } catch (erreur) {

        ProRecup.afficherNotification(
            erreur.message,
            "erreur"
        );

    } finally {

        boutonNouvelleCollecte.disabled =
            false;

        boutonNouvelleCollecte.textContent =
            "Nouvelle collecte";

    }

};

const fermerModale = () => {

    fenetreCollecte.classList.add(
        "cache"
    );

    fenetreCollecte.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";

    cacherErreurFormulaire();

};

formulaireCollecte.addEventListener(
    "submit",
    async (evenement) => {

        evenement.preventDefault();

        cacherErreurFormulaire();

        const donneesCollecte = {

            client_id:
                selectClient.value,

            site_id:
                selectSite.value,

            type_dechet_id:
                selectTypeDechet.value,

            poids_estime:
                Number(
                    document
                        .getElementById(
                            "poids_estime"
                        )
                        .value
                )

        };

        if (
            !donneesCollecte.client_id ||
            !donneesCollecte.site_id ||
            !donneesCollecte.type_dechet_id ||
            !donneesCollecte.poids_estime ||
            donneesCollecte.poids_estime <= 0
        ) {

            afficherErreurFormulaire(
                "Veuillez renseigner correctement tous les champs obligatoires."
            );

            return;

        }

        boutonEnregistrer.disabled =
            true;

        boutonEnregistrer.textContent =
            "Enregistrement...";

        try {

            await ProRecup.requete(
                "/api/collectes",
                {
                    method: "POST",

                    body: JSON.stringify(
                        donneesCollecte
                    )
                }
            );

            fermerModale();

            ProRecup.afficherNotification(
                "Collecte enregistrée avec succès.",
                "succes"
            );

            await chargerCollectes();

        } catch (erreur) {

            afficherErreurFormulaire(
                erreur.message
            );

        } finally {

            boutonEnregistrer.disabled =
                false;

            boutonEnregistrer.textContent =
                "Enregistrer la collecte";

        }

    }
);

boutonNouvelleCollecte.addEventListener(
    "click",
    ouvrirModale
);

boutonFermerModale.addEventListener(
    "click",
    fermerModale
);

boutonAnnuler.addEventListener(
    "click",
    fermerModale
);

fenetreCollecte
    .querySelector(".fond-modale")
    .addEventListener(
        "click",
        fermerModale
    );

boutonActualiser.addEventListener(
    "click",
    chargerCollectes
);

champRecherche.addEventListener(
    "input",
    filtrerCollectes
);

filtreStatut.addEventListener(
    "change",
    filtrerCollectes
);

document.addEventListener(
    "keydown",
    (evenement) => {

        if (
            evenement.key === "Escape" &&
            !fenetreCollecte
                .classList.contains(
                    "cache"
                )
        ) {

            fermerModale();

        }

    }
);

chargerCollectes();
