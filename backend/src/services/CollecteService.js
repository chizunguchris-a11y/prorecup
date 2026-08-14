import collecteRepository
    from "../repositories/CollecteRepository.js";

import ApiError
    from "../utils/ApiError.js";

class CollecteService {

    validerDonneesCreation(
        collecte
    ) {

        if (!collecte.site_id) {

            throw new ApiError(
                400,
                "Le site de collecte est obligatoire."
            );

        }

        if (!collecte.client_id) {

            throw new ApiError(
                400,
                "Le client est obligatoire."
            );

        }

        if (!collecte.type_dechet_id) {

            throw new ApiError(
                400,
                "Le type de déchet est obligatoire."
            );

        }

        if (
            collecte.poids_estime ===
                undefined ||
            collecte.poids_estime ===
                null ||
            collecte.poids_estime ===
                "" ||
            Number(
                collecte.poids_estime
            ) <= 0
        ) {

            throw new ApiError(
                400,
                "Le poids estimé doit être supérieur à zéro."
            );

        }

        if (
            Number.isNaN(
                Number(
                    collecte.poids_estime
                )
            )
        ) {

            throw new ApiError(
                400,
                "Le poids estimé doit être un nombre valide."
            );

        }

    }

    async creer(
        collecte
    ) {

        this.validerDonneesCreation(
            collecte
        );

        return collecteRepository.creer(
            collecte
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

        return collecteRepository
            .listerParOrganisation(
                organisationId
            );

    }

    async trouverParIdPourOrganisation(
        id,
        organisationId
    ) {

        if (!id) {

            throw new ApiError(
                400,
                "L'identifiant de la collecte est obligatoire."
            );

        }

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        return collecteRepository
            .trouverParIdPourOrganisation(
                id,
                organisationId
            );

    }

    async valider(
        id,
        organisationId
    ) {

        if (!id) {

            throw new ApiError(
                400,
                "L'identifiant de la collecte est obligatoire."
            );

        }

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        const collecte =
            await collecteRepository
                .trouverParIdPourOrganisation(
                    id,
                    organisationId
                );

        if (!collecte) {

            throw new ApiError(
                404,
                "Collecte introuvable pour cette organisation."
            );

        }

        if (
            collecte.statut ===
            "valide"
        ) {

            throw new ApiError(
                409,
                "Cette collecte est déjà validée."
            );

        }

        const collecteValidee =
            await collecteRepository
                .validerCollecte(
                    id
                );

        if (!collecteValidee) {

            throw new ApiError(
                404,
                "Collecte introuvable."
            );

        }

        return collecteValidee;

    }

}

export default new CollecteService();