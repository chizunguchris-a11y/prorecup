import organisationRepository from '../repositories/organisationRepository.js';

const organisationService = {
  createOrganisation: async (nom) => {
    if (!nom || nom.trim() === '') {
      throw new Error("Le nom de l'organisation est obligatoire.");
    }
    return await organisationRepository.create(nom);
  },

  // Nouvelle fonction de liaison pour le service
  getAllOrganisations: async () => {
    return await organisationRepository.findAll();
  }
};

export default organisationService;