import notificationRepository
    from "../repositories/NotificationRepository.js";

import ApiError
    from "../utils/ApiError.js";

class NotificationService {

    validerType(
        type
    ) {

        const typesAutorises = [
            "information",
            "succes",
            "alerte",
            "erreur"
        ];

        if (
            !typesAutorises.includes(
                type
            )
        ) {

            throw new ApiError(
                400,
                "Le type de notification est invalide."
            );

        }

    }

    async creer(
        notification,
        connexion
    ) {

        if (!notification.organisation_id) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        if (!notification.categorie) {

            throw new ApiError(
                400,
                "La catégorie est obligatoire."
            );

        }

        if (!notification.titre) {

            throw new ApiError(
                400,
                "Le titre est obligatoire."
            );

        }

        if (!notification.message) {

            throw new ApiError(
                400,
                "Le message est obligatoire."
            );

        }

        this.validerType(
            notification.type ||
            "information"
        );

        return notificationRepository.creer(
            {
                ...notification,

                type:
                    notification.type ||
                    "information"
            },
            connexion
        );

    }

    async creerSilencieusement(
        notification,
        connexion
    ) {

        try {

            return await this.creer(
                notification,
                connexion
            );

        } catch (erreur) {

            console.error(
                "Création de notification impossible :",
                erreur.message
            );

            return null;

        }

    }

    async lister(
        filtres
    ) {

        if (!filtres.organisation_id) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        if (!filtres.utilisateur_id) {

            throw new ApiError(
                400,
                "L'utilisateur est obligatoire."
            );

        }

        const [
            notifications,
            total
        ] =
            await Promise.all([

                notificationRepository.lister(
                    filtres
                ),

                notificationRepository.compter(
                    filtres
                )

            ]);

        return {
            notifications,
            total
        };

    }

    async compterNonLues(
        organisationId,
        utilisateurId
    ) {

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        if (!utilisateurId) {

            throw new ApiError(
                400,
                "L'utilisateur est obligatoire."
            );

        }

        return notificationRepository
            .compterNonLues(
                organisationId,
                utilisateurId
            );

    }

    async marquerCommeLue(
        notificationId,
        organisationId,
        utilisateurId
    ) {

        const notification =
            await notificationRepository
                .marquerCommeLue(
                    notificationId,
                    organisationId,
                    utilisateurId
                );

        if (!notification) {

            throw new ApiError(
                404,
                "Notification introuvable."
            );

        }

        return notification;

    }

    async marquerToutesCommeLues(
        organisationId,
        utilisateurId
    ) {

        return notificationRepository
            .marquerToutesCommeLues(
                organisationId,
                utilisateurId
            );

    }

    async supprimer(
        notificationId,
        organisationId,
        utilisateurId
    ) {

        const notification =
            await notificationRepository
                .supprimer(
                    notificationId,
                    organisationId,
                    utilisateurId
                );

        if (!notification) {

            throw new ApiError(
                404,
                "Notification introuvable."
            );

        }

        return notification;

    }

}

export default new NotificationService();