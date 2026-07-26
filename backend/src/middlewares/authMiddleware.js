import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: "Token manquant."
        });
    }

    const token = authHeader.split(" ")[1];

    try {

        const utilisateur = jwt.verify(
            token,
            process.env.JWT_SECRET || "votre_cle_secrete_temporaire"
        );

        req.utilisateur = utilisateur;

        next();

    } catch (erreur) {

        return res.status(401).json({
            success: false,
            error: "Token invalide."
        });

    }

};

export default authMiddleware;