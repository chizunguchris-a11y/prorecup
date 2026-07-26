import pool from "../config/db.js";

import lotRepository
    from "../repositories/LotRepository.js";

import collecteRepository
    from "../repositories/CollecteRepository.js";

import stockService
    from "./StockService.js";

import ApiError
    from "../utils/ApiError.js";

class LotService {

    async creer(lot) {

        if (!lot.organisation_id) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        if (!lot.collecte_id) {
            throw new ApiError(
                400,
                "La collecte est obligatoire."
            );
        }

        if (!lot.type_dechet_id) {
            throw new ApiError(
                400,
                "Le type de déchet est obligatoire."
            );
        }

        if (
            !lot.poids_reel ||
            Number(lot.poids_reel) <= 0
        ) {
            throw new ApiError(
                400,
                "Le poids réel doit être supérieur à zéro."
            );
        }

        const client =
            await pool.connect();

        try {

            await client.query("BEGIN");

            const collecte =
                await collecteRepository
                    .trouverParId(
                        lot.collecte_id,
                        client
                    );

            if (!collecte) {
                throw new ApiError(
                    404,
                    "La collecte est introuvable."
                );
            }

            if (
                collecte.organisation_id !==
                lot.organisation_id
            ) {
                throw new ApiError(
                    403,
                    "Cette collecte n'appartient pas à votre organisation."
                );
            }

            if (collecte.statut !== "valide") {
                throw new ApiError(
                    409,
                    "La collecte doit être validée avant de créer un lot."
                );
            }

            if (
                collecte.type_dechet_id !==
                lot.type_dechet_id
            ) {
                throw new ApiError(
                    409,
                    "Le type de déchet du lot doit correspondre à celui de la collecte."
                );
            }

            const lotExistant =
                await lotRepository
                    .trouverParCollecteId(
                        lot.collecte_id,
                        client
                    );

            if (lotExistant) {
                throw new ApiError(
                    409,
                    "Un lot existe déjà pour cette collecte."
                );
            }

            const nouveauLot =
                await lotRepository.creer(
                    {
                        collecte_id:
                            lot.collecte_id,

                        type_dechet_id:
                            lot.type_dechet_id,

                        poids_reel:
                            Number(
                                lot.poids_reel
                            ),

                        statut_lot:
                            lot.statut_lot ||
                            "en_stock"
                    },
                    client
                );

            const stock =
                await stockService
                    .ajouterAuStock(
                        lot.organisation_id,
                        lot.type_dechet_id,
                        Number(
                            lot.poids_reel
                        ),
                        nouveauLot.id,
                        client
                    );

            await client.query("COMMIT");

            return {
                lot: nouveauLot,
                stock
            };

        } catch (erreur) {

            await client.query(
                "ROLLBACK"
            );

            throw erreur;

        } finally {

            client.release();

        }

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

        return await lotRepository
            .listerParOrganisation(
                organisationId
            );

    }

}

export default new LotService();