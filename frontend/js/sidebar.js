(function initialiserBarreLaterale() {

    "use strict";

    const navigation =
        document.querySelector(
            ".navigation"
        );

    if (!navigation) {
        return;
    }

    const utilisateur =
        window.ProRecup
            ? ProRecup.obtenirUtilisateur()
            : null;

    const role =
        String(
            utilisateur?.role ||
            utilisateur?.role_nom ||
            ""
        )
            .trim()
            .toLowerCase();

    const tousLesRoles = [
        "admin",
        "manager",
        "agent"
    ];

    const liens = [

        {
            fichier:
                "dashboard.html",

            libelle:
                "Tableau de bord",

            roles:
                tousLesRoles
        },

        {
            fichier:
                "clients.html",

            libelle:
                "Clients",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "sites.html",

            libelle:
                "Sites de collecte",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "collectes.html",

            libelle:
                "Collectes",

            roles:
                tousLesRoles
        },

        {
            fichier:
                "lots.html",

            libelle:
                "Lots",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "stocks.html",

            libelle:
                "Stocks",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "ventes.html",

            libelle:
                "Ventes",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "impact-carbone.html",

            libelle:
                "Impact carbone",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "agents.html",

            libelle:
                "Agents",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "tricycles.html",

            libelle:
                "Tricycles",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "planning.html",

            libelle:
                "Planning",

            roles:
                tousLesRoles
        },

        {
            fichier:
                "carte.html",

            libelle:
                "Carte GPS",

            roles:
                tousLesRoles
        },

        {
            fichier:
                "notifications.html",

            libelle:
                "Notifications",

            roles:
                tousLesRoles,

            compteurNotifications:
                true
        },

        {
            fichier:
                "rapports.html",

            libelle:
                "Rapports",

            roles: [
                "admin",
                "manager"
            ]
        },

        {
            fichier:
                "audits.html",

            libelle:
                "Journal d’audit",

            roles: [
                "admin",
                "manager"
            ]
        },

	{
    	     fichier:
        	"parametres.html",

    	     libelle:
        	"Paramètres",

    	     roles: [
        	"admin",
        	"manager"
    	     ]
	},

	{
    	     fichier:
        	"utilisateurs.html",

    	     libelle:
        	"Utilisateurs",

    	     roles: [
        	"admin",
        	"manager"
    	     ]
	},

        {
            fichier:
                "missions.html",

            libelle:
                "Missions",

            roles:
                tousLesRoles
        }

    ];

    const fichierActuel =
        window.location.pathname
            .split("/")
            .pop() ||
        "dashboard.html";

    const pageConnue =
        liens.find(
            (lien) =>
                lien.fichier ===
                fichierActuel
        );

    if (
        pageConnue &&
        !pageConnue.roles.includes(
            role
        )
    ) {

        window.location.replace(
            "./403.html"
        );

        return;

    }

    navigation.innerHTML =
        "";

    liens
        .filter(
            (lien) =>
                lien.roles.includes(
                    role
                )
        )
        .forEach(
            (lien) => {

                const element =
                    document.createElement(
                        "a"
                    );

                element.href =
                    `./${lien.fichier}`;

                element.className =
                    "lien-navigation";

                const libelle =
                    document.createElement(
                        "span"
                    );

                libelle.className =
                    "libelle-navigation";

                libelle.textContent =
                    lien.libelle;

                element.appendChild(
                    libelle
                );

                if (
                    lien.compteurNotifications
                ) {

                    const badge =
                        document.createElement(
                            "span"
                        );

                    badge.id =
                        "badgeNotificationsNonLues";

                    badge.className =
                        "badge-notifications cache";

                    badge.textContent =
                        "0";

                    element.appendChild(
                        badge
                    );

                }

                if (
                    fichierActuel ===
                    lien.fichier
                ) {

                    element.classList.add(
                        "actif"
                    );

                    element.setAttribute(
                        "aria-current",
                        "page"
                    );

                }

                navigation.appendChild(
                    element
                );

            }
        );

    async function actualiserCompteurNotifications() {

        const badge =
            document.getElementById(
                "badgeNotificationsNonLues"
            );

        if (
            !badge ||
            !window.ProRecup ||
            !ProRecup.obtenirToken()
        ) {
            return;
        }

        try {

            const resultat =
                await ProRecup.requete(
                    "/api/notifications/non-lues/compteur"
                );

            const total =
                Number(
                    resultat.data?.total ||
                    0
                );

            badge.textContent =
                total > 99
                    ? "99+"
                    : String(total);

            badge.classList.toggle(
                "cache",
                total <= 0
            );

        } catch (erreur) {

            console.warn(
                "Compteur des notifications indisponible :",
                erreur.message
            );

        }

    }

    window.actualiserCompteurNotifications =
        actualiserCompteurNotifications;

    document.addEventListener(
        "prorecup:notifications-modifiees",
        actualiserCompteurNotifications
    );

    actualiserCompteurNotifications();

    window.setInterval(
        actualiserCompteurNotifications,
        30000
    );

})();