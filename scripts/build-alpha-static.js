const fs = require("node:fs");
const path = require("node:path");

const racine = path.resolve(__dirname, "..");
const sortie = path.join(racine, "alpha-dist");
fs.rmSync(sortie, { recursive: true, force: true });
fs.cpSync(path.join(racine, "frontend"), sortie, { recursive: true });
fs.cpSync(path.join(racine, "agent-app"), path.join(sortie, "agent-app"), {
    recursive: true,
    filter: (source) => !/\.(?:backup-|bak-)/i.test(source)
});
console.log("ALPHA_STATIC_BUILD_READY=true");
