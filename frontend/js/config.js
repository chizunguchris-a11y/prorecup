window.PRORECUP_API_URL =

    ["localhost", "127.0.0.1"].includes(location.hostname)
        ? "http://127.0.0.1:5000"
        : location.hostname === "prorecup-alpha.onrender.com"
            ? "https://prorecup-alpha-backend.onrender.com"
            : "https://prorecup-backend.onrender.com";
