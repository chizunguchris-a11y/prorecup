import bcrypt from "bcryptjs";

import utilisateurRepository
    from "../repositories/utilisateurRepository.js";

import ApiError
    from "../utils/ApiError.js";

const normaliserEmail = (
    email
) => {

    return String(
        email || ""
    )
        .trim()
        .toLowerCase();

};

const normaliserTexte = (
    valeur
) => {

    if (
        valeur === null ||
        valeur === undefined
    ) {

        return null;

    }

    const texte =
        String(
            valeur
        ).trim();

    return texte || null;

};

class UtilisateurService {

    validerNom(
        nom
    ) {

        if (
            !nom ||
            !String(
                nom
            ).trim()
        ) {

            throw new ApiError(
                400,
                "Le nom de l'utilisateur est obligatoire."
            );

        }

    }

    validerEmail(
        email
    ) {

        const emailNormalise =
            normaliserEmail(
                email
            );

        if (!emailNormalise) {

            throw new ApiError(
                400,
                "L'adresse e-mail est obligatoire."
            );

        }

        const expression =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !expression.test(
                emailNormalise
            )
        ) {

            throw new ApiError(
                400,
                "L'adresse e-mail est invalide."
            );

        }

        return emailNormalise;

    }

    validerMotDePasse(
        motDePasse
    ) {

        if (
            !motDePasse ||
            String(
                motDePasse
            ).length < 8
        ) {

            throw new ApiError(
                400,
                "Le mot de passe doit contenir au moins 8 caractères."
            );

        }

    }

    validerRole(
        roleId
    ) {

        if (!roleId) {

            throw new ApiError(
                400,
                "Le rôle de l'utilisateur est obligatoire."
            );

        }

    }

    async inscrireUtilisateur(
        nom,
        email,
        motDePasse,
        organisationId
    ) {

        /*
         * Méthode conservée pour compatibilité
         * avec l'ancien contrôleur d'inscription.
         */

        this.validerNom(
            nom
        );

        const emailNormalise =
            this.validerEmail(
                email
            );

        this.validerMotDePasse(
            motDePasse
        );

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        const utilisateurExistant =
            await utilisateurRepository
                .findByEmail(
                    emailNormalise
                );

        if (utilisateurExistant) {

            throw new ApiError(
                409,
                "Cette adresse e-mail est déjà utilisée."
            );

        }

        const motDePasseHache =
            await bcrypt.hash(
                String(
                    motDePasse
                ),
                12
            );

        return utilisateurRepository
            .create(
                String(
                    nom
                ).trim(),
                emailNormalise,
                motDePasseHache,
                organisationId
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

        return utilisateurRepository
            .listerParOrganisation(
                organisationId
            );

    }

    async creerPourOrganisation(
        organisationId,
        donnees
    ) {

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        this.validerNom(
            donnees.nom
        );

        const email =
            this.validerEmail(
                donnees.email
            );

        this.validerMotDePasse(
            donnees.motDePasse
        );

        this.validerRole(
            donnees.role_id
        );

        /*
         * L'e-mail reste unique dans l'ensemble
         * de Pro Récup, pas uniquement dans
         * l'organisation.
         */
        const utilisateurExistant =
            await utilisateurRepository
                .findByEmail(
                    email
                );

        if (utilisateurExistant) {

            throw new ApiError(
                409,
                "Cette adresse e-mail est déjà utilisée."
            );

        }

        const motDePasseHache =
            await bcrypt.hash(
                String(
                    donnees.motDePasse
                ),
                12
            );

        const utilisateur =
            await utilisateurRepository
                .creerPourOrganisation(
                    {
                        nom:
                            String(
                                donnees.nom
                            ).trim(),

                        email,

                        mot_de_passe:
                            motDePasseHache,

                        telephone:
                            normaliserTexte(
                                donnees.telephone
                            ),

                        photo_url:
                            normaliserTexte(
                                donnees.photo_url
                            ),

                        organisation_id:
                            organisationId,

                        role_id:
                            donnees.role_id,

                        actif:
                            donnees.actif !==
                            false
                    }
                );

        return utilisateurRepository
            .trouverParIdPourOrganisation(
                utilisateur.id,
                organisationId
            );

    }

    async modifierPourOrganisation(
        utilisateurId,
        organisationId,
        donnees
    ) {

        if (!utilisateurId) {

            throw new ApiError(
                400,
                "L'identifiant de l'utilisateur est obligatoire."
            );

        }

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        const utilisateurExistant =
            await utilisateurRepository
                .trouverParIdPourOrganisation(
                    utilisateurId,
                    organisationId
                );

        if (!utilisateurExistant) {

            throw new ApiError(
                404,
                "Utilisateur introuvable dans cette organisation."
            );

        }

        const nom =
            donnees.nom !==
            undefined
                ? String(
                    donnees.nom
                ).trim()
                : utilisateurExistant.nom;

        this.validerNom(
            nom
        );

        const email =
            donnees.email !==
            undefined
                ? this.validerEmail(
                    donnees.email
                )
                : utilisateurExistant.email;

        const roleId =
            donnees.role_id !==
            undefined
                ? donnees.role_id
                : utilisateurExistant.role_id;

        this.validerRole(
            roleId
        );

        const emailExiste =
            await utilisateurRepository
                .emailExistePourAutreUtilisateur(
                    email,
                    utilisateurId
                );

        if (emailExiste) {

            throw new ApiError(
                409,
                "Cette adresse e-mail est déjà utilisée."
            );

        }

        const utilisateur =
            await utilisateurRepository
                .modifierPourOrganisation(
                    utilisateurId,
                    organisationId,
                    {
                        nom,

                        email,

                        telephone:
                            donnees.telephone !==
                            undefined
                                ? normaliserTexte(
                                    donnees.telephone
                                )
                                : utilisateurExistant
                                    .telephone,

                        photo_url:
                            donnees.photo_url !==
                            undefined
                                ? normaliserTexte(
                                    donnees.photo_url
                                )
                                : utilisateurExistant
                                    .photo_url,

                        role_id:
                            roleId
                    }
                );

        if (!utilisateur) {

            throw new ApiError(
                404,
                "Utilisateur introuvable."
            );

        }

        return {
            ancienEtat:
                utilisateurExistant,

            nouvelEtat:
                await utilisateurRepository
                    .trouverParIdPourOrganisation(
                        utilisateurId,
                        organisationId
                    )
        };

    }

    async changerStatut(
        utilisateurId,
        organisationId,
        actif,
        utilisateurConnecteId
    ) {

        if (!utilisateurId) {

            throw new ApiError(
                400,
                "L'identifiant de l'utilisateur est obligatoire."
            );

        }

        if (!organisationId) {

            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );

        }

        if (
            typeof actif !==
            "boolean"
        ) {

            throw new ApiError(
                400,
                "Le statut actif doit être un booléen."
            );

        }

        const utilisateurExistant =
            await utilisateurRepository
                .trouverParIdPourOrganisation(
                    utilisateurId,
                    organisationId
                );

        if (!utilisateurExistant) {

            throw new ApiError(
                404,
                "Utilisateur introuvable dans cette organisation."
            );

        }

        /*
         * Un administrateur connecté ne doit pas
         * pouvoir désactiver son propre compte.
         */
        if (
            utilisateurConnecteId &&
            utilisateurId ===
            utilisateurConnecteId &&
            actif === false
        ) {

            throw new ApiError(
                409,
                "Vous ne pouvez pas désactiver votre propre compte."
            );

        }

        if (
            utilisateurExistant.actif ===
            actif
        ) {

            return {
                ancienEtat:
                    utilisateurExistant,

                nouvelEtat:
                    utilisateurExistant
            };

        }

        await utilisateurRepository
            .changerStatut(
                utilisateurId,
                organisationId,
                actif
            );

        const utilisateurMisAJour =
            await utilisateurRepository
                .trouverParIdPourOrganisation(
                    utilisateurId,
                    organisationId
                );

        return {
            ancienEtat:
                utilisateurExistant,

            nouvelEtat:
                utilisateurMisAJour
        };

    }

}

export default new UtilisateurService();