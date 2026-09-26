import pool from "../config/db.js";
import stockRepository from "../repositories/StockRepository.js";
import lotRepository from "../repositories/LotRepository.js";
import mouvementStockRepository from "../repositories/MouvementStockRepository.js";
import mouvementStockService from "./MouvementStockService.js";
import ApiError from "../utils/ApiError.js";

class StockService {
    async ajouterAuStock(
        organisationId,
        typeDechetId,
        quantiteAjoutee,
        lotId,
        client
    ) {
        if (!organisationId) {
            throw new ApiError(400, "L'organisation est obligatoire.");
        }
        if (!typeDechetId) {
            throw new ApiError(400, "Le type de déchet est obligatoire.");
        }
        if (!lotId) {
            throw new ApiError(400, "Le lot est obligatoire.");
        }
        if (!quantiteAjoutee || Number(quantiteAjoutee) <= 0) {
            throw new ApiError(400, "La quantité doit être supérieure à zéro.");
        }

        if (client) {
            return this.ajouterDansTransaction(
                organisationId,
                typeDechetId,
                Number(quantiteAjoutee),
                lotId,
                client
            );
        }

        const connexion = await pool.connect();
        try {
            await connexion.query("BEGIN");
            const stock = await this.ajouterDansTransaction(
                organisationId,
                typeDechetId,
                Number(quantiteAjoutee),
                lotId,
                connexion
            );
            await connexion.query("COMMIT");
            return stock;
        } catch (erreur) {
            await connexion.query("ROLLBACK");
            throw erreur;
        } finally {
            connexion.release();
        }
    }

    async ajouterDansTransaction(
        organisationId,
        typeDechetId,
        quantite,
        lotId,
        client
    ) {
        // Même ordre que les ventes : stock d'abord, lot ensuite.
        let stockExistant = await stockRepository.trouverParTypeDechetPourMiseAJour(
            organisationId,
            typeDechetId,
            client
        );

        const lot = await lotRepository.trouverParIdPourEntree(
            lotId,
            organisationId,
            client
        );
        if (!lot) {
            throw new ApiError(404, "Le lot est introuvable dans cette organisation.");
        }
        if (lot.type_dechet_id !== typeDechetId) {
            throw new ApiError(409, "La matière du lot ne correspond pas au stock.");
        }
        if (await mouvementStockRepository.existeEntreePourLot(lotId, client)) {
            throw new ApiError(409, "Ce lot possède déjà une entrée en stock.");
        }

        const quantiteRestante = lot.quantite_restante_kg === null ||
            lot.quantite_restante_kg === undefined
            ? null
            : Number(lot.quantite_restante_kg);
        const lotIntegralementTraceable =
            quantiteRestante !== null &&
            Math.abs(Number(lot.poids_reel) - quantiteRestante) < 0.0005 &&
            Math.abs(quantite - quantiteRestante) < 0.0005 &&
            lot.statut_lot === "en_stock";

        let activationNouveauStock = false;
        if (!stockExistant && lotIntegralementTraceable) {
            const etatLots = await lotRepository.sommeQuantitesRestantes(
                organisationId,
                typeDechetId,
                client
            );
            activationNouveauStock =
                Number(etatLots.lots_non_initialises) === 0 &&
                Number(etatLots.lots_statuts_inconnus) === 0 &&
                Math.abs(Number(etatLots.total) - quantite) < 0.0005;
        }

        let stock;

        if (!stockExistant) {
            stock = await stockRepository.creer(
                organisationId,
                typeDechetId,
                quantite,
                activationNouveauStock,
                client
            );

            // Une insertion concurrente peut avoir gagné la contrainte unique.
            if (!stock) {
                stockExistant = await stockRepository.trouverParTypeDechetPourMiseAJour(
                    organisationId,
                    typeDechetId,
                    client
                );
            }
        }

        if (stockExistant) {
            if (stockExistant.tracabilite_lots_active && !lotIntegralementTraceable) {
                throw new ApiError(
                    409,
                    "Un stock traçable n'accepte qu'un lot neuf, intégralement initialisé et de quantité identique."
                );
            }

            stock = await stockRepository.mettreAJour(
                stockExistant.id,
                Number(stockExistant.quantite) + quantite,
                client
            );
        }

        if (stock.tracabilite_lots_active !== true && quantiteRestante !== null) {
            const lotLegacy = await lotRepository.marquerQuantiteRestanteNonDeterminee(
                lotId,
                organisationId,
                client
            );
            if (!lotLegacy) {
                throw new ApiError(409, "Impossible de rendre indéterminée la quantité restante du lot legacy.");
            }
        }

        await mouvementStockService.enregistrerEntree(
            stock.id,
            lotId,
            quantite,
            client
        );

        return stock;
    }

    async listerParOrganisation(organisationId) {
        if (!organisationId) {
            throw new ApiError(400, "L'organisation est obligatoire.");
        }
        return stockRepository.listerParOrganisation(organisationId);
    }
}

export default new StockService();
