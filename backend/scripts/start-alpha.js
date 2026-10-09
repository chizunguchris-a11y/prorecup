const requis = [
    "DATABASE_URL",
    "TEST_DATABASE_URL",
    "JWT_SECRET",
    "PRORECUP_INTERNAL_ORGANISATION_ID",
    "PRORECUP_FRONTEND_URL"
];

const absentes = requis.filter((nom) => !process.env[nom]);
if (absentes.length) {
    throw new Error(`Configuration Alpha incomplète : ${absentes.join(", ")}.`);
}
if (process.env.PRORECUP_ALPHA_MODE !== "true") {
    throw new Error("PRORECUP_ALPHA_MODE=true est obligatoire.");
}
if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
    throw new Error("Le service Alpha refuse une base différente de TEST_DATABASE_URL.");
}
const frontend = new URL(process.env.PRORECUP_FRONTEND_URL);
if (frontend.protocol !== "https:" || !frontend.hostname.includes("alpha")) {
    throw new Error("Le frontend Alpha doit être une origine HTTPS explicitement Alpha.");
}

await import("../src/server.js");
