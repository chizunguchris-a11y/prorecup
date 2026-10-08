const internalAdminMiddleware = (req, res, next) => {
    const organisationInterne = String(process.env.PRORECUP_INTERNAL_ORGANISATION_ID || "").trim();
    if (!organisationInterne) {
        return res.status(503).json({ success: false, error: "La gestion des demandes client doit etre configuree." });
    }
    const organisationUtilisateur = String(req.utilisateur?.organisationId || req.utilisateur?.organisation_id || "");
    if (organisationUtilisateur !== organisationInterne) {
        return res.status(403).json({ success: false, error: "Acces reserve a l'equipe interne Pro Recup." });
    }
    return next();
};

export default internalAdminMiddleware;
