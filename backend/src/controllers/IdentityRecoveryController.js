import identityRecoveryService
    from "../services/IdentityRecoveryService.js";


const contexte = (
    req
) => ({

    adresseIp:
        String(
            req.ip || ""
        ).slice(
            0,
            64
        ) ||
        null,

    userAgent:
        String(
            req.get(
                "user-agent"
            ) || ""
        ).slice(
            0,
            500
        ) ||
        null

});


const identityRecoveryController = {

    demanderMotDePasse: async (
        req,
        res
    ) => {

        try {

            await identityRecoveryService
                .demanderResetMotDePasse(
                    req.body.email,
                    contexte(
                        req
                    )
                );

        }
        catch (erreur) {

            /*
             * Toujours une reponse neutre.
             */

            console.error(
                "Recovery request error :",
                erreur.message
            );

        }


        return res.status(
            200
        ).json({
            success: true,
            message:
                "Si un compte correspond a cette adresse, des instructions de recuperation seront envoyees."
        });

    },


    reinitialiserMotDePasse: async (
        req,
        res
    ) => {

        try {

            const resultat =
                await identityRecoveryService
                    .reinitialiserMotDePasse(
                        req.body.token,
                        req.body.nouveauMotDePasse
                    );


            if (
                resultat.reason ===
                "same_password"
            ) {

                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        "Choisissez un mot de passe different de l'ancien."
                });

            }


            if (
                !resultat.success
            ) {

                return res.status(
                    400
                ).json({
                    success: false,
                    error:
                        "Le lien de recuperation est invalide ou expire."
                });

            }


            return res.status(
                200
            ).json({
                success: true,
                message:
                    "Votre mot de passe a ete modifie. Vous pouvez maintenant vous connecter."
            });

        }
        catch (erreur) {

            console.error(
                "Recovery reset error :",
                erreur.message
            );


            return res.status(
                500
            ).json({
                success: false,
                error:
                    "Impossible de terminer la recuperation pour le moment."
            });

        }

    },


    demanderAssistance: async (
        req,
        res
    ) => {

        try {

            const resultat =
                await identityRecoveryService
                    .creerAideAcces(
                        req.body,
                        contexte(
                            req
                        )
                    );


            return res.status(
                202
            ).json({
                success: true,
                message:
                    "Votre demande de recuperation a ete enregistree.",
                reference:
                    resultat.reference
            });

        }
        catch (erreur) {

            console.error(
                "Assisted recovery error :",
                erreur.message
            );


            return res.status(
                500
            ).json({
                success: false,
                error:
                    "Impossible d'enregistrer la demande de recuperation."
            });

        }

    }

};


export default identityRecoveryController;