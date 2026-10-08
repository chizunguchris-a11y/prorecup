import {
    createHash,
    randomBytes,
    randomUUID
} from "crypto";

import bcrypt
    from "bcryptjs";

import pool
    from "../config/db.js";

import identityRecoveryRepository
    from "../repositories/IdentityRecoveryRepository.js";

import recoveryEmailService
    from "./RecoveryEmailService.js";


const DUREE_RESET_MS =
    30 *
    60 *
    1000;


const hacher = (
    valeur
) => {

    return createHash(
        "sha256"
    )
        .update(
            String(
                valeur
            )
        )
        .digest(
            "hex"
        );

};


const masquerEmail = (
    email
) => {

    const valeur =
        String(
            email || ""
        ).trim();


    const parties =
        valeur.split(
            "@"
        );


    if (
        parties.length !== 2
    ) {

        return null;

    }


    return (
        (
            parties[0].charAt(
                0
            ) ||
            "*"
        ) +
        "***@" +
        parties[1]
    );

};


const normaliserProduit = (
    produit
) => {

    const permis =
        new Set([
            "backoffice",
            "portail_client",
            "agent_terrain"
        ]);


    const valeur =
        String(
            produit || ""
        )
            .trim()
            .toLowerCase();


    return permis.has(
        valeur
    )
        ? valeur
        : "inconnu";

};


class IdentityRecoveryService {

    async demanderResetMotDePasse(
        email,
        contexte = {}
    ) {

        const utilisateur =
            await identityRecoveryRepository
                .trouverUtilisateurParEmail(
                    String(
                        email || ""
                    )
                        .trim()
                        .toLowerCase()
                );


        /*
         * Reponse volontairement identique
         * pour compte inexistant, suspendu
         * ou compte valide.
         */

        if (
            !utilisateur ||
            utilisateur.actif === false
        ) {

            return {
                accepted: true
            };

        }


        const token =
            randomBytes(
                32
            ).toString(
                "hex"
            );


        const connexion =
            await pool.connect();


        try {

            await connexion.query(
                "BEGIN"
            );


            await identityRecoveryRepository
                .invaliderTokens(
                    utilisateur.id,
                    "password_reset",
                    connexion
                );


            await identityRecoveryRepository
                .creerToken(
                    {
                        id:
                            randomUUID(),

                        utilisateurId:
                            utilisateur.id,

                        purpose:
                            "password_reset",

                        channel:
                            "email",

                        tokenHash:
                            hacher(
                                token
                            ),

                        destinationHint:
                            masquerEmail(
                                utilisateur.email
                            ),

                        expireLe:
                            new Date(
                                Date.now() +
                                DUREE_RESET_MS
                            ),

                        adresseIp:
                            contexte.adresseIp,

                        userAgent:
                            contexte.userAgent
                    },
                    connexion
                );


            await identityRecoveryRepository
                .purgerTokensAnciens(
                    connexion
                );


            await connexion.query(
                "COMMIT"
            );

        }
        catch (erreur) {

            try {

                await connexion.query(
                    "ROLLBACK"
                );

            }
            catch {}


            throw erreur;

        }
        finally {

            connexion.release();

        }


        await recoveryEmailService
            .envoyerLienMotDePasse({
                email:
                    utilisateur.email,

                nom:
                    utilisateur.nom,

                token
            });


        return {
            accepted: true
        };

    }


    async reinitialiserMotDePasse(
        token,
        nouveauMotDePasse
    ) {

        const connexion =
            await pool.connect();


        try {

            await connexion.query(
                "BEGIN"
            );


            const demande =
                await identityRecoveryRepository
                    .trouverTokenValide(
                        hacher(
                            token
                        ),
                        "password_reset",
                        connexion
                    );


            if (!demande) {

                await connexion.query(
                    "ROLLBACK"
                );


                return {
                    success: false,
                    reason:
                        "invalid_or_expired"
                };

            }


            const utilisateur =
                await identityRecoveryRepository
                    .verrouillerUtilisateur(
                        demande.utilisateur_id,
                        connexion
                    );


            if (
                !utilisateur ||
                utilisateur.actif === false
            ) {

                await connexion.query(
                    "ROLLBACK"
                );


                return {
                    success: false,
                    reason:
                        "invalid_or_expired"
                };

            }


            if (
                await bcrypt.compare(
                    String(
                        nouveauMotDePasse
                    ),
                    utilisateur.mot_de_passe
                )
            ) {

                await connexion.query(
                    "ROLLBACK"
                );


                return {
                    success: false,
                    reason:
                        "same_password"
                };

            }


            const hash =
                await bcrypt.hash(
                    String(
                        nouveauMotDePasse
                    ),
                    12
                );


            await identityRecoveryRepository
                .modifierMotDePasse(
                    utilisateur.id,
                    hash,
                    connexion
                );


            await identityRecoveryRepository
                .invaliderTokens(
                    utilisateur.id,
                    "password_reset",
                    connexion
                );


            await connexion.query(
                "COMMIT"
            );


            return {
                success: true,
                utilisateurId:
                    utilisateur.id
            };

        }
        catch (erreur) {

            try {

                await connexion.query(
                    "ROLLBACK"
                );

            }
            catch {}


            throw erreur;

        }
        finally {

            connexion.release();

        }

    }


    async creerAideAcces(
        donnees,
        contexte = {}
    ) {

        const identifiant =
            String(
                donnees.identifiantConnu ||
                ""
            ).trim();


        let utilisateur =
            null;


        if (identifiant) {

            utilisateur =
                await identityRecoveryRepository
                    .trouverUtilisateurParIdentifiant(
                        identifiant
                    );

        }


        const demande =
            await identityRecoveryRepository
                .creerDemandeAssistee({
                    id:
                        randomUUID(),

                    utilisateurId:
                        utilisateur?.id ||
                        null,

                    type:
                        donnees.type,

                    nomDeclare:
                        String(
                            donnees.nom ||
                            ""
                        ).trim() ||
                        null,

                    organisationDeclaree:
                        String(
                            donnees.organisation ||
                            ""
                        ).trim() ||
                        null,

                    telephoneContact:
                        String(
                            donnees.telephoneContact ||
                            ""
                        ).trim() ||
                        null,

                    emailContact:
                        String(
                            donnees.emailContact ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ||
                        null,

                    message:
                        String(
                            donnees.message ||
                            ""
                        ).trim() ||
                        null,

                    produitSource:
                        normaliserProduit(
                            donnees.produitSource
                        ),

                    adresseIp:
                        contexte.adresseIp,

                    userAgent:
                        contexte.userAgent
                });


        return {
            reference:
                "REC-" +
                String(
                    demande.id
                )
                    .slice(
                        0,
                        8
                    )
                    .toUpperCase()
        };

    }

}


export default new IdentityRecoveryService();