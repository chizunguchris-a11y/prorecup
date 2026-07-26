import utilisateurService from '../services/utilisateurService.js';

const utilisateurController = {
  register: async (req, res) => {
    try {
      const { nom, email, motDePasse, organisationId } = req.body;
      
      // On envoie les données au service pour traitement et hachage
      const nouvelUtilisateur = await utilisateurService.inscrireUtilisateur(
        nom, 
        email, 
        motDePasse, 
        organisationId
      );

      // Si tout s'est bien passé, on renvoie une réponse de succès (201 Created)
      return res.status(201).json({
        success: true,
        message: "Utilisateur inscrit avec succès !",
        data: nouvelUtilisateur
      });
    } catch (error) {
      // En cas d'erreur (champs manquants, email déjà pris...), on renvoie un code 400
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
};

export default utilisateurController;