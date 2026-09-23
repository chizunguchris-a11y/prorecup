if (!window.ProRecup) throw new Error("La bibliothèque commune ProRecup est introuvable.");
ProRecup.protegerPage();
ProRecup.initialiserUtilisateur();
ProRecup.initialiserDeconnexion();

const element = id => document.getElementById(id);
const corps = element("corpsTableauBalances");
const modale = element("fenetreBalance");
const formulaire = element("formulaireBalance");
const erreurFormulaire = element("erreurFormulaire");
let balances = [];
let tricycles = [];
let sites = [];
let balanceModifiee = null;

const valeurDate = valeur => valeur ? String(valeur).slice(0, 10) : "";
const fermer = () => { modale.classList.add("cache"); formulaire.reset(); balanceModifiee = null; erreurFormulaire.classList.add("cache"); };

const remplirAffectation = () => {
    const type = element("type_affectation").value;
    const select = element("affectation_id");
    const liste = type === "tricycle" ? tricycles : type === "site" ? sites : [];
    select.innerHTML = `<option value="">${type ? "Sélectionner" : "Choisir d'abord une affectation"}</option>`;
    liste.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = type === "tricycle" ? item.numero_interne : item.nom;
        select.appendChild(option);
    });
    select.disabled = !type;
};

const ouvrir = balance => {
    balanceModifiee = balance || null;
    element("titreBalance").textContent = balance ? "Modifier la balance" : "Nouvelle balance";
    formulaire.reset();
    if (balance) {
        ["numero_interne", "type", "capacite_max_kg", "precision_kg"].forEach(cle => { element(cle).value = balance[cle] ?? ""; });
        element("date_calibrage").value = valeurDate(balance.date_calibrage);
        element("prochain_calibrage").value = valeurDate(balance.prochain_calibrage);
        element("type_affectation").value = balance.tricycle_id ? "tricycle" : balance.site_id ? "site" : "";
        remplirAffectation();
        element("affectation_id").value = balance.tricycle_id || balance.site_id || "";
    } else remplirAffectation();
    modale.classList.remove("cache");
};

const changerStatut = async balance => {
    const statut = balance.statut === "active" ? "hors_service" : "active";
    await ProRecup.requete(`/api/balances/${encodeURIComponent(balance.id)}/statut`, {
        method: "PATCH", body: JSON.stringify({ statut })
    });
    ProRecup.afficherNotification(statut === "active" ? "Balance activée." : "Balance désactivée.", "succes");
    await charger();
};

const afficher = () => {
    corps.innerHTML = "";
    if (!balances.length) { corps.innerHTML = '<tr><td colspan="7">Aucune balance enregistrée.</td></tr>'; return; }
    balances.forEach(balance => {
        const ligne = document.createElement("tr");
        const valeurs = [balance.numero_interne, balance.type,
            `${ProRecup.formaterNombre(balance.capacite_max_kg)} kg / ${ProRecup.formaterNombre(balance.precision_kg)} kg`,
            `${valeurDate(balance.date_calibrage) || "Non renseigné"} → ${valeurDate(balance.prochain_calibrage) || "Non renseigné"}`,
            balance.tricycle_numero ? `Tricycle ${balance.tricycle_numero}` : balance.site_nom ? `Site ${balance.site_nom}` : "Non affectée"];
        valeurs.forEach(valeur => { const cellule = document.createElement("td"); cellule.textContent = valeur; ligne.appendChild(cellule); });
        const statut = document.createElement("td"); statut.innerHTML = `<span class="badge-balance ${balance.statut === "active" ? "active" : ""}">${balance.statut}</span>`; ligne.appendChild(statut);
        const actions = document.createElement("td"); actions.className = "actions-balance";
        const modifier = document.createElement("button"); modifier.textContent = "Modifier"; modifier.addEventListener("click", () => ouvrir(balance));
        const basculer = document.createElement("button"); basculer.textContent = balance.statut === "active" ? "Désactiver" : "Activer"; basculer.addEventListener("click", () => changerStatut(balance).catch(e => ProRecup.afficherNotification(e.message, "erreur")));
        actions.append(modifier, basculer); ligne.appendChild(actions); corps.appendChild(ligne);
    });
};

const charger = async () => {
    element("boutonActualiser").disabled = true;
    try {
        const [reponseBalances, reponseTricycles, reponseSites] = await Promise.all([
            ProRecup.requete("/api/balances"), ProRecup.requete("/api/tricycles"), ProRecup.requete("/api/sites")]);
        balances = Array.isArray(reponseBalances.data) ? reponseBalances.data : [];
        tricycles = Array.isArray(reponseTricycles.data) ? reponseTricycles.data : [];
        sites = Array.isArray(reponseSites.data) ? reponseSites.data : [];
        afficher();
    } catch (erreur) { ProRecup.afficherNotification(erreur.message, "erreur"); }
    finally { element("boutonActualiser").disabled = false; }
};

formulaire.addEventListener("submit", async evenement => {
    evenement.preventDefault();
    const typeAffectation = element("type_affectation").value;
    const donnees = Object.fromEntries(new FormData(formulaire).entries());
    donnees.tricycle_id = typeAffectation === "tricycle" ? element("affectation_id").value || null : null;
    donnees.site_id = typeAffectation === "site" ? element("affectation_id").value || null : null;
    try {
        await ProRecup.requete(balanceModifiee ? `/api/balances/${encodeURIComponent(balanceModifiee.id)}` : "/api/balances", {
            method: balanceModifiee ? "PUT" : "POST", body: JSON.stringify(donnees)
        });
        ProRecup.afficherNotification("Balance enregistrée.", "succes"); fermer(); await charger();
    } catch (erreur) { erreurFormulaire.textContent = erreur.message; erreurFormulaire.classList.remove("cache"); }
});
element("type_affectation").addEventListener("change", remplirAffectation);
element("boutonNouvelleBalance").addEventListener("click", () => ouvrir());
element("boutonActualiser").addEventListener("click", charger);
element("boutonFermerModale").addEventListener("click", fermer);
element("boutonAnnuler").addEventListener("click", fermer);
charger();
