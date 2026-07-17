class Utilisateur {

    constructor(nom, prenom, telephone) {
        this.nom = nom;
        this.prenom = prenom;
        this.telephone = telephone;
    }

    afficherInformations() {
        console.log("Nom : " + this.nom);
        console.log("Prénom : " + this.prenom);
        console.log("Téléphone : " + this.telephone);
    }

}

module.exports = Utilisateur;