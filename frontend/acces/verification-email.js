(function () {
    "use strict";

    const message = document.getElementById("verification-message");
    const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
    const destinations = {
        backoffice: "../index.html",
        portail_client: "../portail-client/index.html",
        agent_terrain: "../../agent-app/index.html"
    };

    history.replaceState(null, "", location.pathname);

    const afficher = (texte, erreur, produit) => {
        message.replaceChildren(document.createTextNode(texte));
        message.classList.toggle("is-error", Boolean(erreur));
        if (!erreur && destinations[produit]) {
            const lien = document.createElement("a");
            lien.className = "primary-button";
            lien.href = destinations[produit];
            lien.textContent = "Accéder à la connexion";
            message.append(document.createElement("br"), lien);
        }
    };

    if (!/^[a-f0-9]{64}$/.test(token)) {
        afficher("Ce lien est incomplet ou invalide. Demandez un nouveau lien depuis votre compte.", true);
        return;
    }

    fetch(window.PRORECUP_API_URL + "/api/identity/account/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(15000)
    }).then(async response => {
        const resultat = await response.json();
        if (!response.ok) throw new Error(resultat.error || resultat.message);
        afficher(resultat.message, false, resultat.produit);
    }).catch(erreur => {
        afficher(erreur.message || "Vérification impossible pour le moment.", true);
    });
}());
