import collecteRepository
    from "../repositories/CollecteRepository.js";

import ApiError
    from "../utils/ApiError.js";

import terrainStorageService
    from "./TerrainStorageService.js";

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

        const seuil = Number(
            process.env.PESEE_ECART_SEUIL_POURCENT || 5
        );

        return collecteRepository
            .listerParOrganisation(
                organisationId,
                Number.isFinite(seuil) && seuil >= 0 ? seuil : 5
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

    async obtenirUrlPreuve(
        collecteId,
        preuveId,
        organisationId
    ) {
        const preuve = await collecteRepository.trouverPreuvePourOrganisation(
            collecteId, preuveId, organisationId
        );
        if (!preuve) throw new ApiError(404, "Preuve introuvable pour cette organisation.");
        const signature = await terrainStorageService.creerUrlSignee(preuve.storage_path, 300);
        return { preuve: { id: preuve.id, type_preuve: preuve.type_preuve,
            mime_type: preuve.mime_type, pris_le: preuve.pris_le },
            url: signature.url, expire_dans_secondes: signature.expire_dans_secondes };
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
