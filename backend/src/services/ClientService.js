import clientRepository
    from "../repositories/ClientRepository.js";

import ApiError
    from "../utils/ApiError.js";

class ClientService {

    validerDonnees(client) {

        if (
            !client.nom ||
            !String(client.nom).trim()
        ) {
            throw new ApiError(
                400,
                "Le nom du client est obligatoire."
            );
        }

        if (
            client.contact_email &&
            !String(client.contact_email)
                .includes("@")
        ) {
            throw new ApiError(
                400,
                "L'adresse e-mail du client est invalide."
            );
        }

    }

    async creer(client) {

        this.validerDonnees(client);

        if (!client.organisation_id) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        return await clientRepository.creer(
            {
                ...client,
                nom:
                    String(client.nom).trim()
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

        return await clientRepository
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
                "L'identifiant du client est obligatoire."
            );
        }

        if (!organisationId) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        this.validerDonnees(donnees);

        const clientExistant =
            await clientRepository
                .trouverParIdPourOrganisation(
                    id,
                    organisationId
                );

        if (!clientExistant) {
            throw new ApiError(
                404,
                "Client introuvable."
            );
        }

        return await clientRepository.modifier(
            id,
            organisationId,
            {
                nom:
                    String(donnees.nom).trim(),

                type_client:
                    donnees.type_client,

                contact_email:
                    donnees.contact_email,

                contact_telephone:
                    donnees.contact_telephone,

                adresse_siege:
                    donnees.adresse_siege
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
                "L'identifiant du client est obligatoire."
            );
        }

        if (!organisationId) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        const client =
            await clientRepository
                .trouverParIdPourOrganisation(
                    id,
                    organisationId
                );

        if (!client) {
            throw new ApiError(
                404,
                "Client introuvable."
            );
        }

        const nombreCollectes =
            await clientRepository
                .compterCollectesLiees(
                    id,
                    organisationId
                );

        if (nombreCollectes > 0) {
            throw new ApiError(
                409,
                `Ce client ne peut pas être supprimé, car il est lié à ${nombreCollectes} collecte(s).`
            );
        }

        return await clientRepository.supprimer(
            id,
            organisationId
        );

    }

}

export default new ClientService();