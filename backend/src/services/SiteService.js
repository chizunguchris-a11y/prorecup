import siteRepository
    from "../repositories/SiteRepository.js";

import ApiError
    from "../utils/ApiError.js";

class SiteService {

    validerDonnees(site) {

        if (
            !site.nom ||
            !String(site.nom).trim()
        ) {
            throw new ApiError(
                400,
                "Le nom du site est obligatoire."
            );
        }

    }

    async creer(site) {

        this.validerDonnees(site);

        if (!site.organisation_id) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        return await siteRepository.creer(
            {
                ...site,

                nom:
                    String(site.nom).trim()
            }
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

        return await siteRepository
            .listerParOrganisation(
                organisationId
            );

    }

    async modifier(
        id,
        organisationId,
        donnees
    ) {

        if (!id) {
            throw new ApiError(
                400,
                "L'identifiant du site est obligatoire."
            );
        }

        if (!organisationId) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        this.validerDonnees(donnees);

        const siteExistant =
            await siteRepository
                .trouverParIdPourOrganisation(
                    id,
                    organisationId
                );

        if (!siteExistant) {
            throw new ApiError(
                404,
                "Site de collecte introuvable."
            );
        }

        return await siteRepository.modifier(
            id,
            organisationId,
            {
                nom:
                    String(donnees.nom).trim(),

                adresse:
                    donnees.adresse,

                zone_geographique:
                    donnees.zone_geographique,

                responsable_nom:
                    donnees.responsable_nom
            }
        );

    }

    async supprimer(
        id,
        organisationId
    ) {

        if (!id) {
            throw new ApiError(
                400,
                "L'identifiant du site est obligatoire."
            );
        }

        if (!organisationId) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        const site =
            await siteRepository
                .trouverParIdPourOrganisation(
                    id,
                    organisationId
                );

        if (!site) {
            throw new ApiError(
                404,
                "Site de collecte introuvable."
            );
        }

        const nombreCollectes =
            await siteRepository
                .compterCollectesLiees(
                    id,
                    organisationId
                );

        if (nombreCollectes > 0) {
            throw new ApiError(
                409,
                `Ce site ne peut pas être supprimé, car il est lié à ${nombreCollectes} collecte(s).`
            );
        }

        return await siteRepository.supprimer(
            id,
            organisationId
        );

    }

}

export default new SiteService();