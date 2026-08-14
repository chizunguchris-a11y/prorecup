import auditRepository
    from "../repositories/AuditRepository.js";

class AuditService {

    nettoyerObjet(
        valeur
    ) {

        if (
            valeur === null ||
            valeur === undefined
        ) {
            return null;
        }

        if (
            typeof valeur !==
            "object"
        ) {
            return valeur;
        }

        const copie =
            JSON.parse(
                JSON.stringify(
                    valeur
                )
            );

        const champsSensibles = [
            "mot_de_passe",
            "motDePasse",
            "password",
            "token",
            "authorization",
            "secret",
            "jwt"
        ];

        const nettoyerRecursivement =
            (objet) => {

                if (
                    !objet ||
                    typeof objet !==
                    "object"
                ) {
                    return;
                }

                Object.keys(
                    objet
                ).forEach(
                    (cle) => {

                        if (
                            champsSensibles.includes(
                                cle
                            )
                        ) {

                            objet[cle] =
                                "[MASQUÉ]";

                            return;

                        }

                        nettoyerRecursivement(
                            objet[cle]
                        );

                    }
                );

            };

        nettoyerRecursivement(
            copie
        );

        return copie;

    }

    extraireUtilisateur(
        req
    ) {

        const utilisateur =
            req.utilisateur || {};

        return {

            utilisateur_id:
                utilisateur.id ||
                utilisateur.utilisateur_id ||
                utilisateur.user_id ||
                null,

            organisation_id:
                utilisateur.organisation_id ||
                utilisateur.organisationId ||
                utilisateur.organisation ||
                null

        };

    }

    extraireAdresseIp(
        req
    ) {

        const ipTransmise =
            req.headers[
                "x-forwarded-for"
            ];

        if (ipTransmise) {

            return String(
                ipTransmise
            )
                .split(",")[0]
                .trim();

        }

        return (
            req.ip ||
            req.socket?.remoteAddress ||
            null
        );

    }

    async enregistrer(
        donnees
    ) {

        try {

            return await auditRepository.creer({

                organisation_id:
                    donnees.organisation_id ||
                    null,

                utilisateur_id:
                    donnees.utilisateur_id ||
                    null,

                action:
                    donnees.action,

                ressource:
                    donnees.ressource,

                ressource_id:
                    donnees.ressource_id ||
                    null,

                methode_http:
                    donnees.methode_http ||
                    null,

                route:
                    donnees.route ||
                    null,

                adresse_ip:
                    donnees.adresse_ip ||
                    null,

                navigateur:
                    donnees.navigateur ||
                    null,

                ancien_etat:
                    this.nettoyerObjet(
                        donnees.ancien_etat
                    ),

                nouvel_etat:
                    this.nettoyerObjet(
                        donnees.nouvel_etat
                    ),

                contexte:
                    this.nettoyerObjet(
                        donnees.contexte
                    ),

                succes:
                    donnees.succes !== false,

                message_erreur:
                    donnees.message_erreur ||
                    null

            });

        } catch (erreur) {

            console.error(
                "Échec d'enregistrement du journal d'audit :",
                erreur.message
            );

            return null;

        }

    }

    async enregistrerDepuisRequete(
        req,
        donnees
    ) {

        const identite =
            this.extraireUtilisateur(
                req
            );

        return this.enregistrer({

            organisation_id:
                donnees.organisation_id ||
                identite.organisation_id,

            utilisateur_id:
                donnees.utilisateur_id ||
                identite.utilisateur_id,

            action:
                donnees.action,

            ressource:
                donnees.ressource,

            ressource_id:
                donnees.ressource_id ||
                req.params?.id ||
                null,

            methode_http:
                req.method,

            route:
                req.originalUrl,

            adresse_ip:
                this.extraireAdresseIp(
                    req
                ),

            navigateur:
                req.headers[
                    "user-agent"
                ] || null,

            ancien_etat:
                donnees.ancien_etat ||
                null,

            nouvel_etat:
                donnees.nouvel_etat ||
                null,

            contexte:
                {
                    ...(donnees.contexte || {}),

                    params:
                        this.nettoyerObjet(
                            req.params
                        ),

                    query:
                        this.nettoyerObjet(
                            req.query
                        )
                },

            succes:
                donnees.succes !== false,

            message_erreur:
                donnees.message_erreur ||
                null

        });

    }

    async lister(
        filtres
    ) {

        return auditRepository.lister(
            filtres
        );

    }

    async compter(
        filtres
    ) {

        return auditRepository.compter(
            filtres
        );

    }

    async trouverParId(
        auditId,
        organisationId
    ) {

        return auditRepository.trouverParId(
            auditId,
            organisationId
        );

    }

}

export default new AuditService();