class Utilisateur {

    constructor(nom, prenom, telephone) {
        this.nom = nom;
        this.prenom = prenom;
        this.telephone = telephone;
    }

    afficherInformations() {
        console.log(
            "Informations utilisateur masquees dans les journaux."
        );
    }

}

module.exports = Utilisateur;