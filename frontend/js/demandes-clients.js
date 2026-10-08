(function () {
    "use strict";

    if (!ProRecup.protegerPage()) return;
    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    const liste = document.getElementById("liste-demandes");
    const message = document.getElementById("message-page");
    const filtre = document.getElementById("filtre-statut");
    const libelles = {
        en_attente_verification: "En attente de vérification",
        en_attente_validation: "En attente de validation",
        actif: "Actif",
        suspendu: "Suspendu",
        refuse: "Refusé"
    };
    const transitions = {
        en_attente_verification: ["en_attente_validation", "refuse"],
        en_attente_validation: ["en_attente_verification", "refuse"],
        actif: ["suspendu"],
        suspendu: ["actif"],
        refuse: ["en_attente_verification"]
    };
    const typesClient = ["entreprise", "institution", "association", "collectivite", "menage"];

    const texte = (tag, valeur, classe) => {
        const element = document.createElement(tag);
        element.textContent = valeur || "—";
        if (classe) element.className = classe;
        return element;
    };

    const afficher = (valeur, erreur) => {
        message.textContent = valeur;
        message.classList.toggle("erreur", Boolean(erreur));
        message.hidden = false;
    };

    const ajouterTransition = (actions, demande) => {
        const possibles = transitions[demande.statut] || [];
        if (!possibles.length) return;
        const select = document.createElement("select");
        select.setAttribute("aria-label", "Nouveau statut");
        possibles.forEach(statut => {
            const option = document.createElement("option");
            option.value = statut;
            option.textContent = libelles[statut];
            select.append(option);
        });
        const notes = document.createElement("input");
        notes.placeholder = "Note interne";
        notes.value = demande.notes_internes || "";
        notes.maxLength = 4000;
        const bouton = texte("button", "Mettre à jour", "bouton-principal");
        bouton.type = "button";
        bouton.addEventListener("click", async () => {
            bouton.disabled = true;
            try {
                await ProRecup.requete(`/api/onboarding/client/${encodeURIComponent(demande.id)}/statut`, {
                    method: "PATCH",
                    body: JSON.stringify({ statut: select.value, notesInternes: notes.value })
                });
                afficher("Demande mise à jour.", false);
                await charger();
            } catch (erreur) {
                afficher(erreur.message || "Mise à jour impossible.", true);
            } finally {
                bouton.disabled = false;
            }
        });
        actions.append(select, notes, bouton);
    };

    const ajouterProvisionnement = (actions, demande) => {
        if (demande.statut !== "en_attente_validation" || demande.client_id) return;
        const type = document.createElement("select");
        type.setAttribute("aria-label", "Type de client à créer");
        typesClient.forEach(valeur => {
            const option = document.createElement("option");
            option.value = valeur;
            option.textContent = valeur.charAt(0).toUpperCase() + valeur.slice(1);
            type.append(option);
        });
        const bouton = texte("button", "Créer l’espace client", "bouton-principal");
        bouton.type = "button";
        bouton.addEventListener("click", async () => {
            bouton.disabled = true;
            type.disabled = true;
            try {
                const resultat = await ProRecup.requete(`/api/onboarding/client/${encodeURIComponent(demande.id)}/provision`, {
                    method: "POST",
                    body: JSON.stringify({ typeClient: type.value })
                });
                const invitation = resultat.data?.invitation;
                afficher(invitation?.code === "EMAIL_SENT"
                    ? "Espace client créé et invitation envoyée."
                    : "Espace client créé. L’invitation n’a pas été envoyée : configurez l’e-mail puis renouvelez-la.", false);
                await charger();
            } catch (erreur) {
                afficher(erreur.message || "Création de l’espace impossible.", true);
            } finally {
                bouton.disabled = false;
                type.disabled = false;
            }
        });
        actions.append(type, bouton);
    };

    const rendre = demandes => {
        liste.replaceChildren();
        if (!demandes.length) {
            afficher("Aucune demande ne correspond à ce filtre.", false);
            return;
        }
        message.hidden = true;
        demandes.forEach(demande => {
            const carte = document.createElement("article");
            carte.className = "onboarding-card";
            const head = document.createElement("div");
            head.className = "onboarding-head";
            const titre = document.createElement("div");
            titre.append(texte("h3", demande.organisation_nom), texte("strong", demande.nom_contact));
            head.append(titre, texte("span", libelles[demande.statut] || demande.statut, "etiquette"));
            const meta = document.createElement("div");
            meta.className = "onboarding-meta";
            meta.append(
                texte("span", demande.email_contact),
                texte("span", demande.telephone_contact),
                texte("span", [demande.ville, demande.pays].filter(Boolean).join(", ")),
                texte("span", demande.identifiant_legal)
            );
            carte.append(head, meta);
            if (demande.message) carte.append(texte("p", demande.message));
            if (demande.client_id) carte.append(texte("p", `Espace client créé · ${demande.client_id}`));
            const actions = document.createElement("div");
            actions.className = "onboarding-actions";
            ajouterProvisionnement(actions, demande);
            ajouterTransition(actions, demande);
            carte.append(actions);
            liste.append(carte);
        });
    };

    async function charger() {
        afficher("Chargement des demandes…", false);
        try {
            const query = filtre.value ? `?statut=${encodeURIComponent(filtre.value)}` : "";
            const resultat = await ProRecup.requete(`/api/onboarding/client${query}`);
            rendre(resultat.data || []);
        } catch (erreur) {
            liste.replaceChildren();
            afficher(erreur.message || "Impossible de charger les demandes.", true);
        }
    }

    filtre.addEventListener("change", charger);
    charger();
}());
