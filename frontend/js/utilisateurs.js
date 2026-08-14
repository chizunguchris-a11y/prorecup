(function () {

    "use strict";

    if (!window.ProRecup) {

        console.error(
            "Le module ProRecup est introuvable."
        );

        return;

    }

    if (!ProRecup.protegerPage()) {
        return;
    }

    ProRecup.initialiserUtilisateur();
    ProRecup.initialiserDeconnexion();

    const element = (
        id
    ) => document.getElementById(id);

    const corpsTableau =
        element(
            "corpsTableauUtilisateurs"
        );

    const modale =
        element(
            "modaleUtilisateur"
        );

    const formulaire =
        element(
            "formulaireUtilisateur"
        );

    const zoneErreur =
        element(
            "erreurUtilisateurs"
        );

    const boutonNouvelUtilisateur =
        element(
            "boutonNouvelUtilisateur"
        );

    const boutonFermerModale =
        element(
            "boutonFermerModaleUtilisateur"
        );

    const fondModale =
        element(
            "fondModaleUtilisateur"
        );

    let utilisateurs = [];
    let roles = [];

    let roleUtilisateurConnecte =
        null;

    let estAdministrateur =
        false;

    function afficherErreur(
        message
    ) {

        if (!zoneErreur) {
            return;
        }

        zoneErreur.textContent =
            message ||
            "Une erreur est survenue.";

        zoneErreur.classList.remove(
            "cache"
        );

    }

    function cacherErreur() {

        if (!zoneErreur) {
            return;
        }

        zoneErreur.textContent =
            "";

        zoneErreur.classList.add(
            "cache"
        );

    }

    function normaliserRole(
        valeur
    ) {

        return String(
            valeur || ""
        )
            .trim()
            .toLowerCase();

    }

    function normaliserBooleen(
        valeur
    ) {

        return (
            valeur === true ||
            valeur === "true" ||
            valeur === 1 ||
            valeur === "1"
        );

    }

    function extraireListe(
        resultat
    ) {

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

        return [];

    }

    function viderElement(
        cible
    ) {

        while (
            cible &&
            cible.firstChild
        ) {

            cible.removeChild(
                cible.firstChild
            );

        }

    }

    function creerOption(
        valeur,
        libelle
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            valeur;

        option.textContent =
            libelle;

        return option;

    }

    async function chargerProfilConnecte() {

        const resultat =
            await ProRecup.requete(
                "/api/auth/me"
            );

        const profil =
            resultat?.data ||
            resultat?.utilisateur ||
            resultat ||
            {};

        roleUtilisateurConnecte =
            normaliserRole(
                profil.role ||
                profil.role_nom
            );

        estAdministrateur =
            roleUtilisateurConnecte ===
            "admin";

        appliquerPermissionsInterface();

    }

    function appliquerPermissionsInterface() {

        /*
         * Admin :
         * accès complet.
         *
         * Manager :
         * consultation uniquement.
         */

        if (
            boutonNouvelUtilisateur
        ) {

            boutonNouvelUtilisateur.classList.toggle(
                "cache",
                !estAdministrateur
            );

            boutonNouvelUtilisateur.disabled =
                !estAdministrateur;

        }

    }

    function remplirRoles() {

        const selectRole =
            element(
                "roleId"
            );

        const filtreRole =
            element(
                "filtreRoleUtilisateur"
            );

        if (!filtreRole) {
            return;
        }

        viderElement(
            filtreRole
        );

        filtreRole.appendChild(
            creerOption(
                "",
                "Tous les rôles"
            )
        );

        /*
         * Le manager n'a pas besoin de charger
         * /api/roles pour administrer des comptes.
         * On construit son filtre directement
         * depuis les utilisateurs visibles.
         */
        if (!estAdministrateur) {

            const nomsRoles =
                [
                    ...new Set(
                        utilisateurs
                            .map(
                                (
                                    utilisateur
                                ) => {

                                    return normaliserRole(
                                        utilisateur.role_nom ||
                                        utilisateur.role
                                    );

                                }
                            )
                            .filter(Boolean)
                    )
                ]
                    .sort();

            nomsRoles.forEach(
                (
                    role
                ) => {

                    filtreRole.appendChild(
                        creerOption(
                            role,
                            role
                        )
                    );

                }
            );

            return;

        }

        /*
         * Partie réservée à l'admin :
         * rôle du formulaire de création/modification.
         */

        if (selectRole) {

            viderElement(
                selectRole
            );

            selectRole.appendChild(
                creerOption(
                    "",
                    "Sélectionner un rôle"
                )
            );

        }

        roles.forEach(
            (
                role
            ) => {

                if (
                    !role?.id ||
                    !role?.nom
                ) {

                    return;

                }

                if (selectRole) {

                    selectRole.appendChild(
                        creerOption(
                            role.id,
                            role.nom
                        )
                    );

                }

                filtreRole.appendChild(
                    creerOption(
                        normaliserRole(
                            role.nom
                        ),
                        role.nom
                    )
                );

            }
        );

    }

    function ouvrirModale(
        utilisateur = null
    ) {

        if (!estAdministrateur) {

            afficherErreur(
                "Seul un administrateur peut gérer les utilisateurs."
            );

            return;

        }

        if (
            !formulaire ||
            !modale
        ) {

            return;

        }

        formulaire.reset();

        cacherErreur();

        const utilisateurId =
            element(
                "utilisateurId"
            );

        const titre =
            element(
                "titreModaleUtilisateur"
            );

        const zoneMotDePasse =
            element(
                "zoneMotDePasse"
            );

        const motDePasse =
            element(
                "motDePasse"
            );

        if (utilisateurId) {

            utilisateurId.value =
                utilisateur?.id ||
                "";

        }

        if (titre) {

            titre.textContent =
                utilisateur
                    ? "Modifier l’utilisateur"
                    : "Nouvel utilisateur";

        }

        if (zoneMotDePasse) {

            zoneMotDePasse.classList.toggle(
                "cache",
                Boolean(
                    utilisateur
                )
            );

        }

        if (motDePasse) {

            motDePasse.required =
                !utilisateur;

            motDePasse.value =
                "";

        }

        if (utilisateur) {

            element("nom").value =
                utilisateur.nom ||
                "";

            element("email").value =
                utilisateur.email ||
                "";

            element("telephone").value =
                utilisateur.telephone ||
                "";

            element("photoUrl").value =
                utilisateur.photo_url ||
                "";

            element("roleId").value =
                utilisateur.role_id ||
                "";

        }

        modale.classList.remove(
            "cache"
        );

        document.body.style.overflow =
            "hidden";

        window.setTimeout(
            () => {

                element("nom")
                    ?.focus();

            },
            50
        );

    }

    function fermerModale() {

        if (!modale) {
            return;
        }

        modale.classList.add(
            "cache"
        );

        document.body.style.overflow =
            "";

        formulaire?.reset();

    }

    function creerBouton(
        texte,
        classe,
        action
    ) {

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

    }

    function creerCelluleIdentite(
        utilisateur
    ) {

        const cellule =
            document.createElement(
                "td"
            );

        const conteneur =
            document.createElement(
                "div"
            );

        conteneur.className =
            "identite-utilisateur";

        const avatar =
            document.createElement(
                "div"
            );

        avatar.className =
            "avatar-liste";

        avatar.textContent =
            String(
                utilisateur.nom ||
                "U"
            )
                .charAt(0)
                .toUpperCase();

        const informations =
            document.createElement(
                "div"
            );

        const nom =
            document.createElement(
                "strong"
            );

        nom.textContent =
            utilisateur.nom ||
            "Utilisateur sans nom";

        const email =
            document.createElement(
                "span"
            );

        email.textContent =
            utilisateur.email ||
            "Adresse e-mail non renseignée";

        informations.appendChild(
            nom
        );

        informations.appendChild(
            email
        );

        conteneur.appendChild(
            avatar
        );

        conteneur.appendChild(
            informations
        );

        cellule.appendChild(
            conteneur
        );

        return cellule;

    }

    function creerCelluleTexte(
        valeur
    ) {

        const cellule =
            document.createElement(
                "td"
            );

        cellule.textContent =
            valeur ||
            "—";

        return cellule;

    }

    function creerCelluleStatut(
        actif
    ) {

        const cellule =
            document.createElement(
                "td"
            );

        const badge =
            document.createElement(
                "span"
            );

        badge.className =
            actif
                ? "badge badge-actif"
                : "badge badge-inactif";

        badge.textContent =
            actif
                ? "Actif"
                : "Inactif";

        cellule.appendChild(
            badge
        );

        return cellule;

    }

    async function changerStatut(
        utilisateur
    ) {

        if (!estAdministrateur) {

            afficherErreur(
                "Seul un administrateur peut modifier le statut d'un utilisateur."
            );

            return;

        }

        cacherErreur();

        const actifActuel =
            normaliserBooleen(
                utilisateur.actif
            );

        const nouvelEtat =
            !actifActuel;

        const confirmation =
            window.confirm(
                nouvelEtat
                    ? `Activer le compte de ${utilisateur.nom || "cet utilisateur"} ?`
                    : `Désactiver le compte de ${utilisateur.nom || "cet utilisateur"} ?`
            );

        if (!confirmation) {
            return;
        }

        try {

            await ProRecup.requete(
                `/api/utilisateurs/${utilisateur.id}/statut`,
                {
                    method:
                        "PATCH",

                    body:
                        JSON.stringify({
                            actif:
                                nouvelEtat
                        })
                }
            );

            ProRecup.afficherNotification(
                nouvelEtat
                    ? "Utilisateur activé avec succès."
                    : "Utilisateur désactivé avec succès.",
                "succes"
            );

            await chargerUtilisateurs();

        } catch (erreurRequete) {

            afficherErreur(
                erreurRequete.message
            );

        }

    }

    function obtenirUtilisateursFiltres() {

        const recherche =
            String(
                element(
                    "rechercheUtilisateurs"
                )?.value ||
                ""
            )
                .trim()
                .toLowerCase();

        const role =
            String(
                element(
                    "filtreRoleUtilisateur"
                )?.value ||
                ""
            )
                .trim()
                .toLowerCase();

        const statut =
            String(
                element(
                    "filtreStatutUtilisateur"
                )?.value ||
                ""
            );

        return utilisateurs.filter(
            (
                utilisateur
            ) => {

                const nom =
                    String(
                        utilisateur.nom ||
                        ""
                    )
                        .toLowerCase();

                const email =
                    String(
                        utilisateur.email ||
                        ""
                    )
                        .toLowerCase();

                const telephone =
                    String(
                        utilisateur.telephone ||
                        ""
                    )
                        .toLowerCase();

                const roleUtilisateur =
                    normaliserRole(
                        utilisateur.role_nom ||
                        utilisateur.role
                    );

                const actif =
                    normaliserBooleen(
                        utilisateur.actif
                    );

                const correspondRecherche =
                    !recherche ||
                    nom.includes(
                        recherche
                    ) ||
                    email.includes(
                        recherche
                    ) ||
                    telephone.includes(
                        recherche
                    );

                const correspondRole =
                    !role ||
                    roleUtilisateur ===
                    role;

                const correspondStatut =
                    !statut ||
                    (
                        statut ===
                        "actif" &&
                        actif
                    ) ||
                    (
                        statut ===
                        "inactif" &&
                        !actif
                    );

                return (
                    correspondRecherche &&
                    correspondRole &&
                    correspondStatut
                );

            }
        );

    }

    function afficherUtilisateurs() {

        if (!corpsTableau) {
            return;
        }

        viderElement(
            corpsTableau
        );

        const liste =
            obtenirUtilisateursFiltres();

        if (!liste.length) {

            const ligne =
                document.createElement(
                    "tr"
                );

            const cellule =
                document.createElement(
                    "td"
                );

            cellule.colSpan =
                6;

            cellule.className =
                "etat-vide";

            cellule.textContent =
                utilisateurs.length
                    ? "Aucun utilisateur ne correspond aux filtres."
                    : "Aucun utilisateur enregistré.";

            ligne.appendChild(
                cellule
            );

            corpsTableau.appendChild(
                ligne
            );

            return;

        }

        liste.forEach(
            (
                utilisateur
            ) => {

                const actif =
                    normaliserBooleen(
                        utilisateur.actif
                    );

                const ligne =
                    document.createElement(
                        "tr"
                    );

                ligne.appendChild(
                    creerCelluleIdentite(
                        utilisateur
                    )
                );

                ligne.appendChild(
                    creerCelluleTexte(
                        utilisateur.telephone
                    )
                );

                ligne.appendChild(
                    creerCelluleTexte(
                        utilisateur.role_nom ||
                        utilisateur.role
                    )
                );

                ligne.appendChild(
                    creerCelluleStatut(
                        actif
                    )
                );

                ligne.appendChild(
                    creerCelluleTexte(
                        utilisateur.dernier_acces
                            ? ProRecup.formaterDate(
                                utilisateur.dernier_acces
                            )
                            : "Jamais"
                    )
                );

                const actions =
                    document.createElement(
                        "td"
                    );

                actions.className =
                    "actions-ligne";

                if (estAdministrateur) {

                    actions.appendChild(
                        creerBouton(
                            "Modifier",
                            "bouton-modifier",
                            () => {

                                ouvrirModale(
                                    utilisateur
                                );

                            }
                        )
                    );

                    actions.appendChild(
                        creerBouton(
                            actif
                                ? "Désactiver"
                                : "Activer",
                            "bouton-statut",
                            () => {

                                changerStatut(
                                    utilisateur
                                );

                            }
                        )
                    );

                } else {

                    const lectureSeule =
                        document.createElement(
                            "span"
                        );

                    lectureSeule.textContent =
                        "Consultation";

                    lectureSeule.className =
                        "texte-lecture-seule";

                    actions.appendChild(
                        lectureSeule
                    );

                }

                ligne.appendChild(
                    actions
                );

                corpsTableau.appendChild(
                    ligne
                );

            }
        );

    }

    async function chargerRoles() {

        if (!estAdministrateur) {

            roles = [];

            remplirRoles();

            return;

        }

        const resultat =
            await ProRecup.requete(
                "/api/roles"
            );

        roles =
            extraireListe(
                resultat
            );

        remplirRoles();

    }

    async function chargerUtilisateurs() {

        cacherErreur();

        if (corpsTableau) {

            corpsTableau.innerHTML =
                `
                    <tr>
                        <td colspan="6" class="etat-vide">
                            Chargement des utilisateurs...
                        </td>
                    </tr>
                `;

        }

        try {

            const resultat =
                await ProRecup.requete(
                    "/api/utilisateurs"
                );

            utilisateurs =
                extraireListe(
                    resultat
                );

            remplirRoles();

            afficherUtilisateurs();

        } catch (erreurRequete) {

            utilisateurs =
                [];

            afficherUtilisateurs();

            afficherErreur(
                erreurRequete.message ||
                "Impossible de charger les utilisateurs."
            );

        }

    }

    async function enregistrerUtilisateur(
        evenement
    ) {

        evenement.preventDefault();

        if (!estAdministrateur) {

            afficherErreur(
                "Seul un administrateur peut enregistrer un utilisateur."
            );

            return;

        }

        cacherErreur();

        const utilisateurId =
            String(
                element(
                    "utilisateurId"
                )?.value ||
                ""
            );

        const nom =
            String(
                element("nom")?.value ||
                ""
            ).trim();

        const email =
            String(
                element("email")?.value ||
                ""
            ).trim();

        const telephone =
            String(
                element("telephone")?.value ||
                ""
            ).trim();

        const photoUrl =
            String(
                element("photoUrl")?.value ||
                ""
            ).trim();

        const roleId =
            String(
                element("roleId")?.value ||
                ""
            );

        const motDePasse =
            String(
                element("motDePasse")?.value ||
                ""
            );

        if (
            !nom ||
            !email ||
            !roleId
        ) {

            afficherErreur(
                "Le nom, l’adresse e-mail et le rôle sont obligatoires."
            );

            return;

        }

        if (
            !utilisateurId &&
            motDePasse.length < 8
        ) {

            afficherErreur(
                "Le mot de passe initial doit contenir au moins 8 caractères."
            );

            return;

        }

        const donnees = {

            nom,

            email,

            telephone:
                telephone ||
                null,

            photo_url:
                photoUrl ||
                null,

            role_id:
                roleId

        };

        if (!utilisateurId) {

            donnees.motDePasse =
                motDePasse;

            donnees.actif =
                true;

        }

        const bouton =
            element(
                "boutonEnregistrerUtilisateur"
            );

        if (bouton) {

            bouton.disabled =
                true;

            bouton.textContent =
                "Enregistrement...";

        }

        try {

            await ProRecup.requete(
                utilisateurId
                    ? `/api/utilisateurs/${utilisateurId}`
                    : "/api/utilisateurs",
                {
                    method:
                        utilisateurId
                            ? "PUT"
                            : "POST",

                    body:
                        JSON.stringify(
                            donnees
                        )
                }
            );

            fermerModale();

            ProRecup.afficherNotification(
                utilisateurId
                    ? "Utilisateur modifié avec succès."
                    : "Utilisateur créé avec succès.",
                "succes"
            );

            await chargerUtilisateurs();

        } catch (erreurRequete) {

            afficherErreur(
                erreurRequete.message ||
                "Impossible d'enregistrer l'utilisateur."
            );

        } finally {

            if (bouton) {

                bouton.disabled =
                    false;

                bouton.textContent =
                    "Enregistrer";

            }

        }

    }

    formulaire?.addEventListener(
        "submit",
        enregistrerUtilisateur
    );

    boutonNouvelUtilisateur
        ?.addEventListener(
            "click",
            () => {

                ouvrirModale();

            }
        );

    boutonFermerModale
        ?.addEventListener(
            "click",
            fermerModale
        );

    fondModale
        ?.addEventListener(
            "click",
            fermerModale
        );

    document.addEventListener(
        "keydown",
        (
            evenement
        ) => {

            if (
                evenement.key ===
                "Escape" &&
                !modale?.classList.contains(
                    "cache"
                )
            ) {

                fermerModale();

            }

        }
    );

    [
        "rechercheUtilisateurs",
        "filtreRoleUtilisateur",
        "filtreStatutUtilisateur"
    ].forEach(
        (
            id
        ) => {

            const cible =
                element(
                    id
                );

            if (!cible) {
                return;
            }

            cible.addEventListener(
                id ===
                "rechercheUtilisateurs"
                    ? "input"
                    : "change",
                afficherUtilisateurs
            );

        }
    );

    async function initialiserPage() {

        try {

            /*
             * On récupère d'abord le rôle.
             */
            await chargerProfilConnecte();

            /*
             * Puis les utilisateurs de
             * l'organisation.
             */
            await chargerUtilisateurs();

            /*
             * L'admin récupère la liste complète
             * des rôles pour créer/modifier.
             *
             * Le manager ne fait pas cette requête.
             */
            if (estAdministrateur) {

                await chargerRoles();

                afficherUtilisateurs();

            }

        } catch (erreurInitialisation) {

            console.error(
                erreurInitialisation
            );

            afficherErreur(
                erreurInitialisation.message ||
                "Impossible d'initialiser la page Utilisateurs."
            );

        }

    }

    initialiserPage();

})();