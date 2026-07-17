const UtilisateurRepository = require("../repositories/UtilisateurRepository");

class UtilisateurService {

    constructor() {
        this.repository = new UtilisateurRepository();
    }

    creerUtilisateur(donnees) {

        console.log("Vérification des données...");

        const utilisateur = this.repository.sauvegarder(donnees);

        console.log("Utilisateur créé avec succès.");

        return utilisateur;

    }

}

module.exports = UtilisateurService;