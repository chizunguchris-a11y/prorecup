import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import utilisateurRepository
    from "../repositories/utilisateurRepository.js";

import auditService
    from "../services/AuditService.js";

const normaliserEmail = (
    email
) => {

    return String(
        email || ""
    )
        .trim()
        .toLowerCase();

};

const obtenirUtilisateurId = (
    req
) => {

    return (
        req.utilisateur?.id ||
        req.utilisateur?.utilisateur_id ||
        req.utilisateur?.user_id ||
        null
    );

};

const obtenirOrganisationId = (
    req
) => {

    return (
        req.utilisateur?.organisationId ||
        req.utilisateur?.organisation_id ||
        req.utilisateur?.organisation ||
        null
    );

};

const enregistrerAuditSilencieusement =
    async (
        req,
        donnees
    ) => {

        try {

            await auditService
                .enregistrerDepuisRequete(
                    req,
                    donnees
                );

        } catch (erreur) {

            console.error(
                "Audit non enregistré :",
                erreur.message
            );

        }

    };

const authController = {

    inscription: async (
        req,
        res
    ) => {

        const nom =
            String(
                req.body.nom || ""
            ).trim();

        const email =
            normaliserEmail(
                req.body.email
            );

        const motDePasse =
            String(
                req.body.motDePasse || ""
            );

        const organisationId =
            req.body.organisationId;

        try {

            if (
                !nom ||
                !email ||
                !motDePasse ||
                !organisationId
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Nom, email, mot de passe et organisation sont obligatoires."
                });

            }

            if (
                motDePasse.length < 8
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Le mot de passe doit contenir au moins 8 caractères."
                });

            }

            const utilisateurExiste =
                await utilisateurRepository
                    .findByEmail(
                        email
                    );

            if (utilisateurExiste) {

                return res.status(409).json({
                    success: false,
                    error:
                        "Cet email est déjà utilisé."
                });

            }

            const motDePasseHache =
                await bcrypt.hash(
                    motDePasse,
                    12
                );

            const utilisateur =
                await utilisateurRepository
                    .create(
                        nom,
                        email,
                        motDePasseHache,
                        organisationId
                    );

            return res.status(201).json({
                success: true,
                message:
                    "Utilisateur inscrit avec succès.",
                data:
                    utilisateur
            });

        } catch (erreur) {

            console.error(
                "Erreur d'inscription :",
                erreur
            );

            return res.status(500).json({
                success: false,
                error:
                    "Impossible de créer l'utilisateur."
            });

        }

    },

    connexion: async (
        req,
        res
    ) => {

        const email =
            normaliserEmail(
                req.body.email
            );

        const motDePasse =
            String(
                req.body.motDePasse || ""
            );

        try {

            if (
                !email ||
                !motDePasse
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Email et mot de passe sont obligatoires."
                });

            }

            const utilisateur =
                await utilisateurRepository
                    .findByEmail(
                        email
                    );

            if (!utilisateur) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Email ou mot de passe incorrect."
                });

            }

            if (
                utilisateur.actif === false
            ) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Votre compte est désactivé. Contactez un administrateur."
                });

            }

            const motDePasseValide =
                await bcrypt.compare(
                    motDePasse,
                    utilisateur.mot_de_passe
                );

            if (!motDePasseValide) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Email ou mot de passe incorrect."
                });

            }

            if (!utilisateur.role_nom) {

                return res.status(403).json({
                    success: false,
                    error:
                        "Aucun rôle n'est attribué à cet utilisateur."
                });

            }

            const role =
                String(
                    utilisateur.role_nom
                )
                    .trim()
                    .toLowerCase();

            const organisationId =
                utilisateur.organisation_id;

            const token =
                jwt.sign(
                    {
                        id:
                            utilisateur.id,

                        email:
                            utilisateur.email,

                        organisationId,

                        organisation_id:
                            organisationId,

                        role,

                        roleId:
                            utilisateur.role_id
                    },
                    process.env.JWT_SECRET ||
                    "votre_cle_secrete_temporaire",
                    {
                        expiresIn:
                            "24h"
                    }
                );

            /*
             * Mise à jour non bloquante :
             * la connexion réussit même si cette opération échoue.
             */
            if (
                typeof utilisateurRepository
                    .enregistrerDernierAcces ===
                "function"
            ) {

                utilisateurRepository
                    .enregistrerDernierAcces(
                        utilisateur.id
                    )
                    .catch(
                        (erreur) => {

                            console.error(
                                "Dernier accès non enregistré :",
                                erreur.message
                            );

                        }
                    );

            }

            return res.status(200).json({
                success: true,
                message:
                    "Connexion réussie !",

                token,

                accessToken:
                    token,

                utilisateur: {
                    id:
                        utilisateur.id,

                    nom:
                        utilisateur.nom,

                    email:
                        utilisateur.email,

                    telephone:
                        utilisateur.telephone ||
                        null,

                    photo_url:
                        utilisateur.photo_url ||
                        null,

                    actif:
                        utilisateur.actif !== false,

                    dernier_acces:
                        utilisateur.dernier_acces ||
                        null,

                    organisationId,

                    organisation_id:
                        organisationId,

                    role,

                    role_nom:
                        role,

                    roleId:
                        utilisateur.role_id
                }
            });

        } catch (erreur) {

            console.error(
                "Erreur de connexion :",
                erreur
            );

            return res.status(500).json({
                success: false,
                error:
                    "Impossible d'effectuer la connexion."
            });

        }

    },

        consulterProfil: async (
        req,
        res
    ) => {

        const utilisateur =
            req.utilisateur;

        if (!utilisateur) {

            return res.status(401).json({
                success: false,
                error:
                    "Utilisateur non authentifié."
            });

        }

        return res.status(200).json({
            success: true,
            message:
                "Profil récupéré avec succès.",
            data: {
                id:
                    utilisateur.id,

                email:
                    utilisateur.email,

                organisationId:
                    utilisateur.organisationId,

                organisation_id:
                    utilisateur.organisation_id,

                role:
                    utilisateur.role,

                role_nom:
                    utilisateur.role_nom,

                roleId:
                    utilisateur.roleId
            }
        });

    },

    modifierProfil: async (
        req,
        res
    ) => {

        const utilisateurId =
            obtenirUtilisateurId(
                req
            );

        const organisationId =
            obtenirOrganisationId(
                req
            );

        try {

            const ancienProfil =
                await utilisateurRepository
                    .findById(
                        utilisateurId
                    );

            if (!ancienProfil) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Utilisateur introuvable."
                });

            }

            const nom =
                String(
                    req.body.nom ??
                    ancienProfil.nom ??
                    ""
                ).trim();

            const email =
                normaliserEmail(
                    req.body.email ??
                    ancienProfil.email
                );

            const telephone =
                req.body.telephone !==
                undefined
                    ? String(
                        req.body.telephone || ""
                    ).trim()
                    : ancienProfil.telephone;

            const photoUrl =
                req.body.photo_url !==
                undefined
                    ? String(
                        req.body.photo_url || ""
                    ).trim()
                    : ancienProfil.photo_url;

            if (
                !nom ||
                !email
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Le nom et l'adresse e-mail sont obligatoires."
                });

            }

            const emailExiste =
                await utilisateurRepository
                    .emailExistePourAutreUtilisateur(
                        email,
                        utilisateurId
                    );

            if (emailExiste) {

                return res.status(409).json({
                    success: false,
                    error:
                        "Cette adresse e-mail est déjà utilisée."
                });

            }

            const profil =
                await utilisateurRepository
                    .modifierProfil(
                        utilisateurId,
                        organisationId,
                        {
                            nom,
                            email,
                            telephone,
                            photo_url:
                                photoUrl
                        }
                    );

            if (!profil) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Utilisateur introuvable dans cette organisation."
                });

            }

            const profilComplet =
                await utilisateurRepository
                    .findById(
                        utilisateurId
                    );

            await enregistrerAuditSilencieusement(
                req,
                {
                    organisation_id:
                        organisationId,

                    utilisateur_id:
                        utilisateurId,

                    action:
                        "PROFIL_UTILISATEUR_MODIFIE",

                    ressource:
                        "utilisateur",

                    ressource_id:
                        utilisateurId,

                    ancien_etat:
                        ancienProfil,

                    nouvel_etat:
                        profilComplet,

                    succes:
                        true
                }
            );

            return res.status(200).json({
                success: true,
                message:
                    "Profil modifié avec succès.",
                data:
                    profilComplet
            });

        } catch (erreur) {

            console.error(
                "Erreur de modification du profil :",
                erreur
            );

            return res.status(500).json({
                success: false,
                error:
                    "Impossible de modifier le profil."
            });

        }

    },

    changerMotDePasse: async (
        req,
        res
    ) => {

        const utilisateurId =
            obtenirUtilisateurId(
                req
            );

        const organisationId =
            obtenirOrganisationId(
                req
            );

        const ancienMotDePasse =
            String(
                req.body.ancienMotDePasse ||
                ""
            );

        const nouveauMotDePasse =
            String(
                req.body.nouveauMotDePasse ||
                ""
            );

        const confirmationMotDePasse =
            String(
                req.body.confirmationMotDePasse ||
                ""
            );

        try {

            if (
                !ancienMotDePasse ||
                !nouveauMotDePasse ||
                !confirmationMotDePasse
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Tous les champs du mot de passe sont obligatoires."
                });

            }

            if (
                nouveauMotDePasse.length < 8
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Le nouveau mot de passe doit contenir au moins 8 caractères."
                });

            }

            if (
                nouveauMotDePasse !==
                confirmationMotDePasse
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "La confirmation du mot de passe ne correspond pas."
                });

            }

            if (
                ancienMotDePasse ===
                nouveauMotDePasse
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Le nouveau mot de passe doit être différent de l'ancien."
                });

            }

            const utilisateur =
                await utilisateurRepository
                    .findByIdAvecMotDePasse(
                        utilisateurId
                    );

            if (!utilisateur) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Utilisateur introuvable."
                });

            }

            const ancienMotDePasseValide =
                await bcrypt.compare(
                    ancienMotDePasse,
                    utilisateur.mot_de_passe
                );

            if (!ancienMotDePasseValide) {

                return res.status(400).json({
                    success: false,
                    error:
                        "L'ancien mot de passe est incorrect."
                });

            }

            const motDePasseHache =
                await bcrypt.hash(
                    nouveauMotDePasse,
                    12
                );

            await utilisateurRepository
                .updatePassword(
                    utilisateurId,
                    motDePasseHache
                );

            await enregistrerAuditSilencieusement(
                req,
                {
                    organisation_id:
                        organisationId,

                    utilisateur_id:
                        utilisateurId,

                    action:
                        "MOT_DE_PASSE_MODIFIE",

                    ressource:
                        "utilisateur",

                    ressource_id:
                        utilisateurId,

                    ancien_etat:
                        null,

                    nouvel_etat:
                        null,

                    contexte: {
                        modification_securisee:
                            true
                    },

                    succes:
                        true
                }
            );

            return res.status(200).json({
                success: true,
                message:
                    "Mot de passe modifié avec succès."
            });

        } catch (erreur) {

            console.error(
                "Erreur de changement du mot de passe :",
                erreur
            );

            return res.status(500).json({
                success: false,
                error:
                    "Impossible de modifier le mot de passe."
            });

        }

    }

};

export default authController;