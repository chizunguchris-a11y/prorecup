import organisationService from '../services/organisationService.js';

const organisationController = {
  create: async (req, res) => {
    try {
      const { nom } = req.body;
      const nouvelleOrganisation = await organisationService.createOrganisation(nom);
      return res.status(201).json({
        success: true,
        message: "Organisation créée avec succès !",
        data: nouvelleOrganisation
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  // Nouvelle action pour lister les organisations
  getAll: async (req, res) => {
    try {
      const organisations = await organisationService.getAllOrganisations();
      return res.status(200).json({
        success: true,
        data: organisations
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

export default organisationController;