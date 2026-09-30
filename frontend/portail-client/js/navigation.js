(() => {

    const navigation =
        document.getElementById(
            "portailNavigation"
        );


    if (!navigation) {
        return;
    }


    const pageActive =
        String(
            navigation.dataset.page ||
            ""
        );


    const liens = [
        {
            page:
                "accueil",

            href:
                "./accueil.html",

            label:
                "Accueil"
        },
        {
            page:
                "collectes",

            href:
                "./collectes.html",

            label:
                "Collectes"
        },
        {
            page:
                "sites",

            href:
                "./sites.html",

            label:
                "Sites"
        },
        {
            page:
                "impact",

            href:
                "./impact.html",

            label:
                "Impact"
        },

        {
            page:
                "compte",

            href:
                "./compte.html",

            label:
                "Compte"
        },
    ];


    liens.forEach(
        function (
            definition
        ) {

            const lien =
                document.createElement(
                    "a"
                );


            lien.href =
                definition.href;


            lien.textContent =
                definition.label;


            lien.className =
                "cockpit-nav-link";


            if (
                pageActive ===
                definition.page
            ) {

                lien.classList.add(
                    "active"
                );


                lien.setAttribute(
                    "aria-current",
                    "page"
                );

            }


            navigation.appendChild(
                lien
            );

        }
    );

})();
