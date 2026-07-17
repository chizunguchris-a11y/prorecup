class ValidationService {

    verifierChampObligatoire(valeur, nomChamp) {

        if (!valeur) {
            console.log("Le champ " + nomChamp + " est obligatoire.");
            return false;
        }

        return true;
    }

}

module.exports = ValidationService;