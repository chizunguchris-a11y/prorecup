import auditService
    from "../services/AuditService.js";

class AuditController {

    async lister(
        req,
        res,
        next
    ) {

        try {

            const organisationId =
                req.utilisateur.organisation_id ||
                req.utilisateur.organisationId ||
                req.utilisateur.organisation;

            const filtres = {

                organisation_id:
                    organisationId,

                utilisateur_id:
                    req.query.utilisateur_id ||
                    null,

                action:
                    req.query.action ||
                    null,

                ressource:
                    req.query.ressource ||
                    null,

                ressource_id:
                    req.query.ressource_id ||
                    null,

                recherche:
                    req.query.recherche ||
                    null,

                date_debut:
                    req.query.date_debut ||
                    null,

                date_fin:
                    req.query.date_fin ||
                    null,

                limite:
                    req.query.limite ||
                    50,

                page:
                    req.query.page ||
                    1

            };

            if (
                req.query.succes !==
                undefined
            ) {

                filtres.succes =
                    req.query.succes ===
                    "true";

            }

            const filtresResume = {
    ...filtres
};

delete filtresResume.succes;

const [
    journaux,
    total,
    totalSucces,
    totalEchecs
] =
    await Promise.all([

        auditService.lister(
            filtres
        ),

        auditService.compter(
            filtres
        ),

        auditService.compter({
            ...filtresResume,
            succes: true
        }),

        auditService.compter({
            ...filtresResume,
            succes: false
        })

    ]);

            return res.status(200).json({

                success: true,

                message:
                    "Journaux d'audit récupérés avec succès.",

                data:
                    journaux,

resume: {

    total:
        total,

    succes:
        totalSucces,

    echecs:
        totalEchecs

},

                pagination: {

                    total,

                    page:
                        Number(
                            filtres.page
                        ),

                    limite:
                        Number(
                            filtres.limite
                        ),

                    nombre_pages:
                        Math.ceil(
                            total /
                            Number(
                                filtres.limite
                            )
                        )

                }

            });

        } catch (erreur) {

            next(
                erreur
            );

        }

    }

    async consulter(
        req,
        res,
        next
    ) {

        try {

            const organisationId =
                req.utilisateur.organisation_id ||
                req.utilisateur.organisationId ||
                req.utilisateur.organisation;

            const journal =
                await auditService.trouverParId(
                    req.params.id,
                    organisationId
                );

            if (!journal) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Journal d'audit introuvable."

                });

            }

            return res.status(200).json({

                success: true,

                message:
                    "Journal d'audit récupéré avec succès.",

                data:
                    journal

            });

        } catch (erreur) {

            next(
                erreur
            );

        }

    }

}

export default new AuditController();