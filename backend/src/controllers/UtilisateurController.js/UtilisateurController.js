const UtilisateurService = require("../services/UtilisateurService");

class UtilisateurController {

    constructor() {
        this.utilisateurService = new UtilisateurService();
    }

    creerUtilisateur() {

        const donnees = {
            nom: "Kabeya",
            prenom: "Chris",
            telephone: "+243999999999"
        };

        this.utilisateurService.creerUtilisateur(donnees);

    }

}

module.exports = UtilisateurController;