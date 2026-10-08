import clientOnboardingRepository from "../repositories/ClientOnboardingRepository.js";

const contexte = req => ({
    adresseIp: String(req.ip || "").slice(0, 64) || null,
    userAgent: String(req.get("user-agent") || "").slice(0, 500) || null
});

const clientOnboardingController = {
    creer: async (req, res) => {
        try {
            await clientOnboardingRepository.creer({ ...req.body, ...contexte(req) });
        } catch (erreur) {
            if (erreur.code !== "23505") {
                console.error("Client onboarding request error:", erreur.message);
                return res.status(500).json({ success: false, error: "Impossible d'enregistrer la demande pour le moment." });
            }
        }
        return res.status(202).json({
            success: true,
            message: "Votre demande a ete recue. L'equipe Pro Recup verifiera les informations avant toute creation d'espace."
        });
    },

    lister: async (req, res) => {
        try {
            const demandes = await clientOnboardingRepository.lister(req.query);
            return res.status(200).json({ success: true, data: demandes });
        } catch (erreur) {
            console.error("Client onboarding list error:", erreur.message);
            return res.status(500).json({ success: false, error: "Impossible de charger les demandes." });
        }
    },

    modifierStatut: async (req, res) => {
        try {
            const utilisateurId = req.utilisateur?.id || req.utilisateur?.utilisateur_id;
            const demande = await clientOnboardingRepository.modifierStatut(
                req.params.id, req.body.statut, req.body.notesInternes, utilisateurId
            );
            if (!demande) return res.status(404).json({ success: false, error: "Demande introuvable." });
            return res.status(200).json({ success: true, data: demande });
        } catch (erreur) {
            console.error("Client onboarding update error:", erreur.message);
            return res.status(500).json({ success: false, error: "Impossible de mettre a jour la demande." });
        }
    }
};

export default clientOnboardingController;
