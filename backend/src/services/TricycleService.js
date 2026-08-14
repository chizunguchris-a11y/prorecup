import tricycleRepository
    from "../repositories/TricycleRepository.js";

import ApiError
    from "../utils/ApiError.js";

class TricycleService {

    validerDonnees(
        tricycle
    ) {

        if (
            !tricycle.numero_interne ||
            !String(
                tricycle.numero_interne
            ).trim()
        ) {
            throw new ApiError(
                400,
                "Le numéro interne du tricycle est obligatoire."
            );
        }

        if (
            !tricycle.capacite_kg ||
            Number(
                tricycle.capacite_kg
            ) <= 0
        ) {
            throw new ApiError(
                400,
                "La capacité du tricycle doit être supérieure à zéro."
            );
        }

        const etatsAutorises = [
            "bon",
            "moyen",
            "mauvais"
        ];

        if (
            tricycle.etat &&
            !etatsAutorises.includes(
                tricycle.etat
            )
        ) {
            throw new ApiError(
                400,
                "L'état du tricycle est invalide."
            );
        }

    }

    async verifierUnicite(
        tricycle,
        organisationId,
        tricycleId = null
    ) {

        const numeroExistant =
            await tricycleRepository
                .trouverParNumeroInterne(
                    tricycle.numero_interne,
                    organisationId
                );

        if (
            numeroExistant &&
            numeroExistant.id !== tricycleId
        ) {
            throw new ApiError(
                409,
                "Ce numéro interne est déjà utilisé par un autre tricycle."
            );
        }

        if (
            tricycle.plaque_identification
        ) {

            const plaqueExistante =
                await tricycleRepository
                    .trouverParPlaque(
                        tricycle.plaque_identification,
                        organisationId
                    );

            if (
                plaqueExistante &&
                plaqueExistante.id !== tricycleId
            ) {
                throw new ApiError(
                    409,
                    "Cette plaque d'identification est déjà utilisée."
                );
            }

        }

    }

    async creer(
        organisationId,
        donnees
    ) {

        if (!organisationId) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        this.validerDonnees(
            donnees
        );

        await this.verifierUnicite(
            donnees,
            organisationId
        );

        return await tricycleRepository
            .creer(
                {
                    organisation_id:
                        organisationId,

                    numero_interne:
                        String(
                            donnees.numero_interne
                        ).trim(),

                    plaque_identification:
                        donnees
                            .plaque_identification,

                    marque:
                        donnees.marque,

                    modele:
                        donnees.modele,

                    capacite_kg:
                        Number(
                            donnees.capacite_kg
                        ),

                    statut:
                        donnees.statut ||
                        "disponible",

                    etat:
                        donnees.etat ||
                        "bon",

                    date_mise_en_service:
                        donnees
                            .date_mise_en_service,

                    observations:
                        donnees.observations
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

        return await tricycleRepository
            .listerParOrganisation(
                organisationId
            );

    }

    async modifier(
        id,
        organisationId,
        donnees
    ) {

        const tricycleExistant =
            await tricycleRepository
                .trouverParIdPourOrganisation(
                    id,
                    organisationId
                );

        if (!tricycleExistant) {
            throw new ApiError(
                404,
                "Tricycle introuvable."
            );
        }

        const tricycleModifie = {

            numero_interne:
                donnees.numero_interne !== undefined
                    ? String(
                        donnees.numero_interne
                    ).trim()
                    : tricycleExistant
                        .numero_interne,

            plaque_identification:
                donnees.plaque_identification !== undefined
                    ? donnees
                        .plaque_identification
                    : tricycleExistant
                        .plaque_identification,

            marque:
                donnees.marque !== undefined
                    ? donnees.marque
                    : tricycleExistant.marque,

            modele:
                donnees.modele !== undefined
                    ? donnees.modele
                    : tricycleExistant.modele,

            capacite_kg:
                donnees.capacite_kg !== undefined
                    ? Number(
                        donnees.capacite_kg
                    )
                    : Number(
                        tricycleExistant
                            .capacite_kg
                    ),

            etat:
                donnees.etat !== undefined
                    ? donnees.etat
                    : tricycleExistant.etat,

            date_mise_en_service:
                donnees
                    .date_mise_en_service !==
                undefined
                    ? donnees
                        .date_mise_en_service
                    : tricycleExistant
                        .date_mise_en_service,

            observations:
                donnees.observations !== undefined
                    ? donnees.observations
                    : tricycleExistant
                        .observations

        };

        this.validerDonnees(
            tricycleModifie
        );

        await this.verifierUnicite(
            tricycleModifie,
            organisationId,
            id
        );

        return await tricycleRepository
            .modifier(
                id,
                organisationId,
                tricycleModifie
            );

    }

    async modifierStatut(
        id,
        organisationId,
        statut
    ) {

        const statutsAutorises = [
            "disponible",
            "en_mission",
            "en_panne",
            "maintenance",
            "hors_service"
        ];

        if (
            !statutsAutorises.includes(
                statut
            )
        ) {
            throw new ApiError(
                400,
                "Le statut du tricycle est invalide."
            );
        }

        const tricycle =
            await tricycleRepository
                .trouverParIdPourOrganisation(
                    id,
                    organisationId
                );

        if (!tricycle) {
            throw new ApiError(
                404,
                "Tricycle introuvable."
            );
        }

        if (
            statut === "disponible" &&
            tricycle.etat === "mauvais"
        ) {
            throw new ApiError(
                409,
                "Un tricycle en mauvais état ne peut pas être déclaré disponible."
            );
        }

        return await tricycleRepository
            .modifierStatut(
                id,
                organisationId,
                statut
            );

    }

}

export default new TricycleService();