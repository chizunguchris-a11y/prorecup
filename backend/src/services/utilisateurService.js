import bcrypt from 'bcryptjs';
import utilisateurRepository from '../repositories/utilisateurRepository.js';

const utilisateurService = {
  inscrireUtilisateur: async (nom, email, motDePasse, organisationId) => {
    // 1. Validations de base
    if (!nom || !email || !motDePasse || !organisationId) {
      throw new Error("Tous les champs (nom, email, mot de passe, organisationId) sont obligatoires.");
    }

    // 2. Vérifier si l'utilisateur existe déjà
    const utilisateurExistant = await utilisateurRepository.findByEmail(email);
    if (utilisateurExistant) {
      throw new Error("Cet email est déjà utilisé.");
    }

    // 3. Hacher le mot de passe de manière sécurisée
    const sel = await bcrypt.genSalt(10);
    const motDePasseHache = await bcrypt.hash(motDePasse, sel);

    // 4. Enregistrement en base de données via le Repository
    return await utilisateurRepository.create(nom, email, motDePasseHache, organisationId);
  }
};

export default utilisateurService;