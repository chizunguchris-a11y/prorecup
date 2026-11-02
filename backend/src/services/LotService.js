import { kilos, grammes } from './TracabiliteRules.js';
import stockRepository from '../repositories/StockRepository.js';
import pool from "../config/db.js";

import lotRepository
    from "../repositories/LotRepository.js";

import collecteRepository
    from "../repositories/CollecteRepository.js";

import stockService
    from "./StockService.js";

import ApiError
    from "../utils/ApiError.js";
import { randomUUID } from "node:crypto";
import traceabiliteRepository from "../repositories/TraceabiliteMatiereRepository.js";

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

        lot = { ...lot, poids_reel: kilos(lot.poids_reel) };

        const client =
            await pool.connect();

        try {

            await client.query("BEGIN");

            const collecte =
                await collecteRepository
                    .trouverParIdPourOrganisation(
                        lot.collecte_id,
                        lot.organisation_id,
                        client,
                        true
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
                if (lotExistant.organisation_id !== lot.organisation_id || lotExistant.type_dechet_id !== lot.type_dechet_id ||
                    grammes(lotExistant.poids_reel) !== grammes(lot.poids_reel))
                    throw new ApiError(409, 'Un lot existe déjà pour cette collecte avec des données différentes.');
                const stock = await stockRepository.trouverParTypeDechet(lot.organisation_id, lot.type_dechet_id, client);
                await client.query('COMMIT');
                return { lot: lotExistant, stock, deja_traitee: true };
            }
            const [origine] = await traceabiliteRepository.originesPourMiseAJour(lot.organisation_id, [lot.collecte_id], client);
            if (!origine || (origine.parcours_present && !origine.parcours_complet))
                throw new ApiError(409, 'Le parcours terrain doit être terminé et synchronisé avant la création du lot.');
            if (grammes(kilos(collecte.poids_reel)) !== grammes(lot.poids_reel))
                throw new ApiError(409, 'Le poids du lot doit correspondre au poids validé de la collecte.');
            if (await traceabiliteRepository.contenantsPourCollecte(lot.organisation_id, lot.collecte_id, client))
                throw new ApiError(409, 'Cette collecte porte des contenants QR : utilisez leur regroupement pour conserver la filiation.');

            const nouveauLot =
                await lotRepository.creer(
                    {
                        collecte_id:
                            lot.collecte_id,

                        organisation_id:
                            lot.organisation_id,

                        type_dechet_id:
                            lot.type_dechet_id,

                        poids_reel:
                            Number(
                                lot.poids_reel
                            ),

                        statut_lot:
			"en_stock",

                        code_qr:
                            "PR-L-" + randomUUID().replaceAll("-", "").toUpperCase(),

                        site_courant_id:
                            collecte.site_id,

                        client_courant_id:
                            collecte.client_id
                    },
                    client
                );

            await traceabiliteRepository.creerEvenement({
                organisation_id: lot.organisation_id,
                lot_id: nouveauLot.id,
                type_evenement: "creation",
                operation_id: randomUUID(),
                collecte_id: collecte.id,
                site_id: collecte.site_id,
                client_id: collecte.client_id,
                utilisateur_id: lot.utilisateur_id,
                survenu_le: nouveauLot.cree_le || new Date().toISOString(),
                details: { code_qr: nouveauLot.code_qr }
            }, client);

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

            if (stock.tracabilite_lots_active !== true) {
                nouveauLot.quantite_restante_kg = null;
            }

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
