(function () {

    const estLocal =
        location.protocol === "file:" ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1";


    window.ProRecup = window.ProRecup || {};


    window.ProRecup.config = {

        API_BASE_URL:
            estLocal
                ? "http://127.0.0.1:5000/api"
                : "https://prorecup-backend.onrender.com/api",

        ROLE_TERRAIN:
            "agent_valorisation_carbone",

        TOKEN_KEY:
            "prorecup_terrain_token",

        USER_KEY:
            "prorecup_terrain_utilisateur"

    };

})();