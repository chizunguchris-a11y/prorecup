import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import utilisateurRepository from "../repositories/utilisateurRepository.js";

const authController = {

  // 1. Inscription
  inscription: async (req, res) => {

    const { nom, email, motDePasse, organisationId } = req.body;

    try {

      if (!nom || !email || !motDePasse || !organisationId) {
        return res.status(400).json({
          success: false,
          error: "Nom, email, mot de passe et organisation sont obligatoires."
        });
      }

      const utilisateurExiste =
        await utilisateurRepository.findByEmail(email);

      if (utilisateurExiste) {
        return res.status(400).json({
          success: false,
          error: "Cet email est déjà utilisé."
        });
      }

      const sel = await bcrypt.genSalt(10);
      const motDePasseHache =
        await bcrypt.hash(motDePasse, sel);

      const nouvelUtilisateur =
        await utilisateurRepository.create(
          nom,
          email,
          motDePasseHache,
          organisationId
        );

      return res.status(201).json({
        success: true,
        message: "Utilisateur inscrit avec succès !",
        data: nouvelUtilisateur
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        error: error.message
      });

    }

  },

  // 2. Connexion
  connexion: async (req, res) => {

    const { email, motDePasse } = req.body;

    try {

      if (!email || !motDePasse) {
        return res.status(400).json({
          success: false,
          error: "Email et mot de passe sont obligatoires."
        });
      }

      const utilisateur =
        await utilisateurRepository.findByEmail(email);

      if (!utilisateur) {
        return res.status(400).json({
          success: false,
          error: "Email ou mot de passe incorrect."
        });
      }

      const motDePasseValide =
        await bcrypt.compare(
          motDePasse,
          utilisateur.mot_de_passe
        );

      if (!motDePasseValide) {
        return res.status(400).json({
          success: false,
          error: "Email ou mot de passe incorrect."
        });
      }

      const token = jwt.sign(
        {
          id: utilisateur.id,
          email: utilisateur.email,
          organisationId: utilisateur.organisation_id
        },
        process.env.JWT_SECRET || "votre_cle_secrete_temporaire",
        { expiresIn: "24h" }
      );

      return res.status(200).json({
        success: true,
        message: "Connexion réussie !",
        token,
        utilisateur: {
          id: utilisateur.id,
          nom: utilisateur.nom,
          email: utilisateur.email
        }
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        error: error.message
      });

    }

  },

  // 3. Réinitialisation temporaire du mot de passe
  resetPassword: async (req, res) => {

    const { email, nouveauMotDePasse } = req.body;

    try {

      if (!email || !nouveauMotDePasse) {
        return res.status(400).json({
          success: false,
          error: "Email et nouveau mot de passe sont obligatoires."
        });
      }

      if (nouveauMotDePasse.length < 8) {
        return res.status(400).json({
          success: false,
          error: "Le mot de passe doit contenir au moins 8 caractères."
        });
      }

      const utilisateur =
        await utilisateurRepository.findByEmail(email);

      if (!utilisateur) {
        return res.status(404).json({
          success: false,
          error: "Utilisateur introuvable."
        });
      }

      const sel = await bcrypt.genSalt(10);
      const motDePasseHache =
        await bcrypt.hash(nouveauMotDePasse, sel);

      await utilisateurRepository.updatePassword(
        utilisateur.id,
        motDePasseHache
      );

      return res.status(200).json({
        success: true,
        message: "Mot de passe réinitialisé avec succès."
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        error: error.message
      });

    }

  }

};

export default authController;