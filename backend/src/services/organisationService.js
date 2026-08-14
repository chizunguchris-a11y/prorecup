import organisationRepository
    from "../repositories/organisationRepository.js";

import ApiError
    from "../utils/ApiError.js";

const normaliserEmail = (
    email
) => {

    if (!email) {
        return null;
    }

    return String(email)
        .trim()
        .toLowerCase();

};

const organisationService = {

    async createOrganisation(
        nom
    ) {

        if (
            !nom ||
            String(nom).trim() ===
                ""
        ) {

            throw new ApiError(
                400,
                "Le nom de l'organisation est obligatoire."
            );

        }

        return organisationRepository
            .create(
                String(nom).trim()
            );

    },

    async getAllOrganisations() {

        return organisationRepository
            .findAll();

    },

    async consulter(
        organisationId
    ) {

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        const organisation =
            await organisationRepository
                .findById(
                    organisationId
                );

        if (!organisation) {

            throw new ApiError(
                404,
                "Organisation introuvable."
            );

        }

        return organisation;

    },

    async modifier(
        organisationId,
        donnees
    ) {

        const organisationExistante =
            await organisationRepository
                .findById(
                    organisationId
                );

        if (!organisationExistante) {

            throw new ApiError(
                404,
                "Organisation introuvable."
            );

        }

        const nom =
            String(
                donnees.nom ||
                organisationExistante.nom
            ).trim();

        if (!nom) {

            throw new ApiError(
                400,
                "Le nom de l'organisation est obligatoire."
            );

        }

        const email =
            normaliserEmail(
                donnees.email !==
                undefined
                    ? donnees.email
                    : organisationExistante
                        .email
            );

        const emailExiste =
            await organisationRepository
                .emailExistePourAutreOrganisation(
                    email,
                    organisationId
                );

        if (emailExiste) {

            throw new ApiError(
                409,
                "Cette adresse e-mail est déjà utilisée par une autre organisation."
            );

        }

        const donneesFinales = {

            nom,

            pays:
                donnees.pays !==
                undefined
                    ? donnees.pays
                    : organisationExistante
                        .pays,

            ville:
                donnees.ville !==
                undefined
                    ? donnees.ville
                    : organisationExistante
                        .ville,

            adresse:
                donnees.adresse !==
                undefined
                    ? donnees.adresse
                    : organisationExistante
                        .adresse,

            telephone:
                donnees.telephone !==
                undefined
                    ? donnees.telephone
                    : organisationExistante
                        .telephone,

            email,

            logo_url:
                donnees.logo_url !==
                undefined
                    ? donnees.logo_url
                    : organisationExistante
                        .logo_url,

            devise:
                donnees.devise !==
                undefined
                    ? donnees.devise
                    : organisationExistante
                        .devise,

            fuseau_horaire:
                donnees.fuseau_horaire !==
                undefined
                    ? donnees.fuseau_horaire
                    : organisationExistante
                        .fuseau_horaire,

            numero_identification:
                donnees.numero_identification !==
                undefined
                    ? donnees.numero_identification
                    : organisationExistante
                        .numero_identification,

            site_web:
                donnees.site_web !==
                undefined
                    ? donnees.site_web
                    : organisationExistante
                        .site_web,

            description:
                donnees.description !==
                undefined
                    ? donnees.description
                    : organisationExistante
                        .description

        };

        const organisation =
            await organisationRepository
                .modifier(
                    organisationId,
                    donneesFinales
                );

        return {
            ancienEtat:
                organisationExistante,

            nouvelEtat:
                organisation
        };

    }

};

export default organisationService;