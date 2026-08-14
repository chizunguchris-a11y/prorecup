import agentRepository
    from "../repositories/AgentRepository.js";

import ApiError
    from "../utils/ApiError.js";

class AgentService {

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

        if (!donnees.utilisateur_id) {
            throw new ApiError(
                400,
                "L'utilisateur est obligatoire."
            );
        }

        const utilisateur =
            await agentRepository
                .trouverUtilisateurParIdPourOrganisation(
                    donnees.utilisateur_id,
                    organisationId
                );

        if (!utilisateur) {
            throw new ApiError(
                404,
                "Utilisateur introuvable dans votre organisation."
            );
        }

        const agentExistant =
            await agentRepository
                .trouverParUtilisateurId(
                    donnees.utilisateur_id
                );

        if (agentExistant) {
            throw new ApiError(
                409,
                "Cet utilisateur possède déjà un profil agent."
            );
        }

        return await agentRepository.creer(
            {
                utilisateur_id:
                    donnees.utilisateur_id,

                telephone:
                    donnees.telephone,

                photo_url:
                    donnees.photo_url,

                statut:
                    donnees.statut || "actif",

                disponible:
                    donnees.disponible !== undefined
                        ? donnees.disponible
                        : true,

                date_embauche:
                    donnees.date_embauche
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

        return await agentRepository
            .listerParOrganisation(
                organisationId
            );

    }

    async modifier(
        agentId,
        organisationId,
        donnees
    ) {

        const agent =
            await agentRepository
                .trouverParIdPourOrganisation(
                    agentId,
                    organisationId
                );

        if (!agent) {
            throw new ApiError(
                404,
                "Agent introuvable."
            );
        }

        const disponible =
            donnees.disponible !== undefined
                ? donnees.disponible
                : agent.disponible;

        return await agentRepository.modifier(
            agentId,
            organisationId,
            {
                telephone:
                    donnees.telephone,

                photo_url:
                    donnees.photo_url,

                disponible,

                date_embauche:
                    donnees.date_embauche
            }
        );

    }

    async modifierStatut(
        agentId,
        organisationId,
        statut
    ) {

        const statutsAutorises = [
            "actif",
            "inactif",
            "suspendu"
        ];

        if (
            !statutsAutorises.includes(
                statut
            )
        ) {
            throw new ApiError(
                400,
                "Le statut de l'agent est invalide."
            );
        }

        const agent =
            await agentRepository
                .trouverParIdPourOrganisation(
                    agentId,
                    organisationId
                );

        if (!agent) {
            throw new ApiError(
                404,
                "Agent introuvable."
            );
        }

        /*
         * Un agent inactif ou suspendu ne peut pas
         * rester disponible pour une mission.
         */
        const disponible =
            statut === "actif"
                ? agent.disponible
                : false;

        return await agentRepository
            .modifierStatut(
                agentId,
                organisationId,
                statut,
                disponible
            );

    }
async listerUtilisateursDisponibles(
    organisationId
) {

    if (!organisationId) {
        throw new ApiError(
            400,
            "L'organisation est obligatoire."
        );
    }

    return await agentRepository
        .listerUtilisateursDisponibles(
            organisationId
        );

}

}

export default new AgentService();

