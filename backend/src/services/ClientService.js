import clientRepository
    from "../repositories/ClientRepository.js";

import ApiError
    from "../utils/ApiError.js";

const TYPES_CLIENT_AUTORISES = [
    "entreprise",
    "institution",
    "menage",
    "association",
    "collectivite"
];

const normaliserTypeClient = (
    valeur
) =>
    String(
        valeur || ""
    )
        .trim()
        .toLowerCase();

const normaliserTexteOptionnel = (
    valeur
) => {

    const texte =
        String(
            valeur || ""
        ).trim();

    return texte || null;

};

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

        const typeClient =
            normaliserTypeClient(
                client.type_client
            );

        if (
            !TYPES_CLIENT_AUTORISES.includes(
                typeClient
            )
        ) {

            throw new ApiError(
                400,
                "Le type de client est invalide."
            );

        }

        const secteurActivite =
            normaliserTexteOptionnel(
                client.secteur_activite
            );

        if (
            secteurActivite &&
            secteurActivite.length > 100
        ) {

            throw new ApiError(
                400,
                "Le secteur d'activité ne doit pas dépasser 100 caractères."
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
                    String(client.nom).trim(),

                type_client:
                    normaliserTypeClient(
                        client.type_client
                    ),

                secteur_activite:
                    normaliserTexteOptionnel(
                        client.secteur_activite
                    )
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
                    normaliserTypeClient(
                        donnees.type_client
                    ),

                secteur_activite:
                    normaliserTexteOptionnel(
                        donnees.secteur_activite
                    ),

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