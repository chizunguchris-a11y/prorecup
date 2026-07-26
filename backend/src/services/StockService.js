import stockRepository from "../repositories/StockRepository.js";
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
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        if (!typeDechetId) {
            throw new ApiError(
                400,
                "Le type de déchet est obligatoire."
            );
        }

        if (!lotId) {
            throw new ApiError(
                400,
                "Le lot est obligatoire."
            );
        }

        if (!quantiteAjoutee || Number(quantiteAjoutee) <= 0) {
            throw new ApiError(
                400,
                "La quantité doit être supérieure à zéro."
            );
        }

        const quantite = Number(quantiteAjoutee);

        const stockExistant =
            await stockRepository.trouverParTypeDechet(
                organisationId,
                typeDechetId,
                client
            );

        let stock;

        if (!stockExistant) {

            stock = await stockRepository.creer(
                organisationId,
                typeDechetId,
                quantite,
                client
            );

        } else {

            const nouvelleQuantite =
                Number(stockExistant.quantite) + quantite;

            stock = await stockRepository.mettreAJour(
                stockExistant.id,
                nouvelleQuantite,
                client
            );

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
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        return await stockRepository.listerParOrganisation(
            organisationId
        );
    }

}

export default new StockService();