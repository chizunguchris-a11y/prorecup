import facteurCarboneRepository
    from "../repositories/FacteurCarboneRepository.js";

import impactCarboneRepository
    from "../repositories/ImpactCarboneRepository.js";

import ApiError
    from "../utils/ApiError.js";

class ImpactCarboneService {

    async calculerPourVente(
        vente,
        typeDechetId,
        client
    ) {

        if (!vente?.id) {
            throw new ApiError(
                400,
                "La vente est obligatoire."
            );
        }

        if (!typeDechetId) {
            throw new ApiError(
                400,
                "Le type de déchet est obligatoire."
            );
        }

        if (
            !vente.quantite ||
            Number(vente.quantite) <= 0
        ) {
            throw new ApiError(
                400,
                "La quantité vendue doit être supérieure à zéro."
            );
        }

        const impactExistant =
            await impactCarboneRepository
                .trouverParVenteId(
                    vente.id,
                    client
                );

        if (impactExistant) {
            throw new ApiError(
                409,
                "Un impact carbone existe déjà pour cette vente."
            );
        }

        const dateReference =
            vente.date_vente ||
            new Date();

        const facteur =
            await facteurCarboneRepository
                .trouverFacteurApplicable(
                    typeDechetId,
                    dateReference,
                    client
                );

        if (!facteur) {
            throw new ApiError(
                404,
                "Aucun facteur carbone applicable n'a été trouvé."
            );
        }

        const quantiteKg =
            Number(vente.quantite);

        const facteurUtilise =
            Number(
                facteur
                    .facteur_kg_co2e_par_kg
            );

        const co2eEstimeKg =
            Number(
                (
                    quantiteKg *
                    facteurUtilise
                ).toFixed(6)
            );

        return await impactCarboneRepository
            .creer(
                {
                    vente_id:
                        vente.id,

                    facteur_carbone_id:
                        facteur.id,

                    quantite_kg:
                        quantiteKg,

                    facteur_utilise:
                        facteurUtilise,

                    co2e_estime_kg:
                        co2eEstimeKg
                },
                client
            );

    }

    async listerParOrganisation(
        organisationId
    ) {

        if (!organisationId) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        return await impactCarboneRepository
            .listerParOrganisation(
                organisationId
            );

    }

}

export default new ImpactCarboneService();