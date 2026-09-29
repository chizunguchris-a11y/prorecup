import bcrypt from "bcryptjs";

import pool
    from "../config/db.js";

import clientCompteRepository
    from "../repositories/ClientCompteRepository.js";

import ApiError
    from "../utils/ApiError.js";

const normaliserTexteOptionnel = (
    valeur
) => {

    const texte =
        String(
            valeur || ""
        ).trim();

    return texte || null;

};

class ClientCompteService {

    validerDonnees(
        clientId,
        organisationId,
        donnees
    ) {

        if (!clientId) {

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

        const nom =
            String(
                donnees?.nom || ""
            ).trim();

        if (!nom) {

            throw new ApiError(
                400,
                "Le nom de l'utilisateur client est obligatoire."
            );

        }

        const email =
            String(
                donnees?.email || ""
            )
                .trim()
                .toLowerCase();

        if (
            !email ||
            !email.includes("@")
        ) {

            throw new ApiError(
                400,
                "L'adresse e-mail est invalide."
            );

        }

        const motDePasse =
            String(
                donnees?.motDePasse || ""
            );

        if (
            motDePasse.length < 8
        ) {

            throw new ApiError(
                400,
                "Le mot de passe doit contenir au moins 8 caract\u00e8res."
            );

        }

        return {
            nom,
            email,
            motDePasse,
            telephone:
                normaliserTexteOptionnel(
                    donnees?.telephone
                )
        };

    }

    async creer(
        clientId,
        organisationId,
        donnees
    ) {

        const donneesValidees =
            this.validerDonnees(
                clientId,
                organisationId,
                donnees
            );

        const connexion =
            await pool.connect();

        try {

            await connexion.query(
                "BEGIN"
            );

            const client =
                await clientCompteRepository
                    .trouverClientPourOrganisation(
                        clientId,
                        organisationId,
                        connexion
                    );

            if (!client) {

                throw new ApiError(
                    404,
                    "Client introuvable dans cette organisation."
                );

            }

            const rolesClient =
                await clientCompteRepository
                    .listerRolesClientGlobaux(
                        connexion
                    );

            if (
                rolesClient.length !== 1
            ) {

                throw new ApiError(
                    500,
                    "La configuration du r\u00f4le client est invalide."
                );

            }

            const utilisateurExistant =
                await clientCompteRepository
                    .trouverUtilisateurParEmail(
                        donneesValidees.email,
                        connexion
                    );

            if (utilisateurExistant) {

                throw new ApiError(
                    409,
                    "Cette adresse e-mail est d\u00e9j\u00e0 utilis\u00e9e."
                );

            }

            const motDePasseHache =
                await bcrypt.hash(
                    donneesValidees
                        .motDePasse,
                    12
                );

            const utilisateur =
                await clientCompteRepository
                    .creerUtilisateurClient(
                        {
                            nom:
                                donneesValidees
                                    .nom,

                            email:
                                donneesValidees
                                    .email,

                            mot_de_passe:
                                motDePasseHache,

                            telephone:
                                donneesValidees
                                    .telephone,

                            organisation_id:
                                organisationId,

                            role_id:
                                rolesClient[0].id
                        },
                        connexion
                    );

            const liaison =
                await clientCompteRepository
                    .lierUtilisateurAuClient(
                        {
                            organisation_id:
                                organisationId,

                            client_id:
                                client.id,

                            utilisateur_id:
                                utilisateur.id
                        },
                        connexion
                    );

            await connexion.query(
                "COMMIT"
            );

            return {
                client: {
                    id:
                        client.id,

                    nom:
                        client.nom
                },

                utilisateur,

                liaison
            };

        }
        catch (erreur) {

            try {

                await connexion.query(
                    "ROLLBACK"
                );

            }
            catch {}

            if (
                erreur instanceof ApiError
            ) {
                throw erreur;
            }

            if (
                erreur.code === "23505"
            ) {

                throw new ApiError(
                    409,
                    "Cette adresse e-mail est d\u00e9j\u00e0 utilis\u00e9e."
                );

            }

            if (
                erreur.code === "23503"
            ) {

                throw new ApiError(
                    409,
                    "Impossible de rattacher ce compte au client."
                );

            }

            if (
                erreur.code === "22P02"
            ) {

                throw new ApiError(
                    400,
                    "Identifiant invalide."
                );

            }

            throw erreur;

        }
        finally {

            connexion.release();

        }

    }

}

export default new ClientCompteService();
