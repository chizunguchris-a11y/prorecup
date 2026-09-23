import balanceRepository from "../repositories/BalanceRepository.js";
import ApiError from "../utils/ApiError.js";
import { normaliserBalance, STATUTS_BALANCE } from "./BalanceRules.js";

const traduireErreur = erreur => {
    const messages = {
        NUMERO_INVALIDE: "Le numéro interne de la balance est obligatoire.",
        TYPE_INVALIDE: "Le type de balance est invalide.",
        MESURES_INVALIDES: "La capacité et la précision de la balance sont invalides.",
        AFFECTATION_DOUBLE: "Une balance ne peut être affectée à la fois à un tricycle et à un site.",
        AFFECTATION_INVALIDE: "L'affectation de la balance est invalide.",
        CALIBRAGE_INVALIDE: "Les dates de calibrage sont invalides."
    };
    return new ApiError(400, messages[erreur.message] || "Les données de la balance sont invalides.");
};

export class BalanceService {
    constructor(repository = balanceRepository) {
        this.repository = repository;
    }

    async lister(organisationId) {
        return this.repository.lister(organisationId);
    }

    async preparer(organisationId, entree) {
        let donnees;
        try { donnees = normaliserBalance(entree); } catch (erreur) { throw traduireErreur(erreur); }
        if (!await this.repository.affectationValide(
            donnees.tricycle_id, donnees.site_id, organisationId))
            throw new ApiError(400, "Le tricycle ou le site n'appartient pas à cette organisation.");
        return donnees;
    }

    async creer(organisationId, entree) {
        const donnees = await this.preparer(organisationId, entree);
        try {
            return await this.repository.creer(organisationId, { ...donnees, statut: "active" });
        } catch (erreur) {
            if (erreur.code === "23505") throw new ApiError(409, "Ce numéro de balance est déjà utilisé.");
            throw erreur;
        }
    }

    async modifier(id, organisationId, entree) {
        if (!await this.repository.trouver(id, organisationId))
            throw new ApiError(404, "Balance introuvable.");
        const donnees = await this.preparer(organisationId, entree);
        try { return await this.repository.modifier(id, organisationId, donnees); }
        catch (erreur) {
            if (erreur.code === "23505") throw new ApiError(409, "Ce numéro de balance est déjà utilisé.");
            throw erreur;
        }
    }

    async modifierStatut(id, organisationId, statut) {
        const valeur = String(statut || "").trim().toLowerCase();
        if (!STATUTS_BALANCE.includes(valeur)) throw new ApiError(400, "Statut de balance invalide.");
        const balance = await this.repository.modifierStatut(id, organisationId, valeur);
        if (!balance) throw new ApiError(404, "Balance introuvable.");
        return balance;
    }
}

export default new BalanceService();
