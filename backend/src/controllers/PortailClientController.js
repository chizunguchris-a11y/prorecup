import asyncHandler
    from "../middlewares/asyncHandler.js";

import portailClientRepository
    from "../repositories/PortailClientRepository.js";

import terrainStorageService
    from "../services/TerrainStorageService.js";

import ApiError
    from "../utils/ApiError.js";

import ApiResponse
    from "../utils/ApiResponse.js";


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


const validerUuid = (
    valeur,
    libelle
) => {

    if (
        !UUID_REGEX.test(
            String(
                valeur || ""
            )
        )
    ) {

        throw new ApiError(
            400,
            `${libelle} invalide.`
        );

    }

};


const portailClientController = {

    me: (
        req,
        res
    ) => {

        return ApiResponse.success(
            res,
            "Contexte portail client récupéré avec succès.",
            {
                utilisateur: {
                    id:
                        req.portailClient
                            .utilisateur_id,

                    nom:
                        req.portailClient
                            .utilisateur_nom,

                    email:
                        req.portailClient
                            .utilisateur_email,

                    telephone:
                        req.portailClient
                            .utilisateur_telephone,

                    photo_url:
                        req.portailClient
                            .utilisateur_photo_url
                },

                organisation_id:
                    req.portailClient
                        .organisation_id,

                role:
                    req.portailClient.role,

                clients:
                    req.portailClient.clients
            }
        );

    },


    sites: asyncHandler(
        async (req, res) => {

            const sites =
                await portailClientRepository
                    .listerSitesAutorises(
                        req.portailClient
                            .utilisateur_id,
                        req.portailClient
                            .organisation_id
                    );

            return ApiResponse.success(
                res,
                "Sites du portail client recuperes avec succes.",
                sites
            );

        }
    ),


    collectes: asyncHandler(
        async (req, res) => {

            const collectes =
                await portailClientRepository
                    .listerCollectesAutorisees(
                        req.portailClient
                            .utilisateur_id,
                        req.portailClient
                            .organisation_id
                    );

            return ApiResponse.success(
                res,
                "Collectes du portail client recuperees avec succes.",
                collectes
            );

        }
    ),


    detailCollecte: asyncHandler(
        async (req, res) => {

            validerUuid(
                req.params.id,
                "Identifiant de collecte"
            );

            const collecte =
                await portailClientRepository
                    .trouverCollecteAutorisee(
                        req.portailClient
                            .utilisateur_id,
                        req.portailClient
                            .organisation_id,
                        req.params.id
                    );

            if (!collecte) {

                throw new ApiError(
                    404,
                    "Collecte introuvable."
                );

            }

            return ApiResponse.success(
                res,
                "Detail de la collecte recupere avec succes.",
                collecte
            );

        }
    ),


    urlPreuve: asyncHandler(
        async (req, res) => {

            validerUuid(
                req.params.id,
                "Identifiant de collecte"
            );

            validerUuid(
                req.params.preuveId,
                "Identifiant de preuve"
            );

            const preuve =
                await portailClientRepository
                    .trouverPreuveAutorisee(
                        req.portailClient
                            .utilisateur_id,
                        req.portailClient
                            .organisation_id,
                        req.params.id,
                        req.params.preuveId
                    );

            if (!preuve) {

                throw new ApiError(
                    404,
                    "Preuve introuvable."
                );

            }

            const signature =
                await terrainStorageService
                    .creerUrlSignee(
                        preuve.storage_path,
                        300
                    );

            return ApiResponse.success(
                res,
                "URL de preuve generee avec succes.",
                {
                    preuve: {
                        id:
                            preuve.id,

                        collecte_id:
                            preuve.collecte_id,

                        mission_id:
                            preuve.mission_id,

                        type_preuve:
                            preuve.type_preuve,

                        mime_type:
                            preuve.mime_type,

                        taille_octets:
                            preuve.taille_octets,

                        pris_le:
                            preuve.pris_le
                    },

                    url:
                        signature.url,

                    expire_dans_secondes:
                        signature
                            .expire_dans_secondes
                }
            );

        }
    )

};


export default portailClientController;
