import mouvementStockRepository
    from "../repositories/MouvementStockRepository.js";

class MouvementStockService {

    async enregistrerEntree(
        stockId,
        lotId,
        quantite,
        client
    ) {

        if (!stockId) {
            throw new Error("Le stock est obligatoire.");
        }

        if (!lotId) {
            throw new Error(
                "Le lot est obligatoire pour une entrée en stock."
            );
        }

        if (!quantite || Number(quantite) <= 0) {
            throw new Error(
                "La quantité du mouvement doit être supérieure à zéro."
            );
        }

        return await mouvementStockRepository.creer(
            {
                stock_id: stockId,
                lot_id: lotId,
                vente_id: null,
                type_mouvement: "ENTREE",
                quantite: Number(quantite)
            },
            client
        );
    }

    async enregistrerSortie(
        stockId,
        venteId,
        quantite,
        client
    ) {

        if (!stockId) {
            throw new Error("Le stock est obligatoire.");
        }

        if (!venteId) {
            throw new Error(
                "La vente est obligatoire pour une sortie de stock."
            );
        }

        if (!quantite || Number(quantite) <= 0) {
            throw new Error(
                "La quantité du mouvement doit être supérieure à zéro."
            );
        }

        return await mouvementStockRepository.creer(
            {
                stock_id: stockId,
                lot_id: null,
                vente_id: venteId,
                type_mouvement: "SORTIE",
                quantite: Number(quantite)
            },
            client
        );
    }

    async listerParStock(stockId) {

        if (!stockId) {
            throw new Error("Le stock est obligatoire.");
        }

        return await mouvementStockRepository.listerParStock(
            stockId
        );
    }

}

export default new MouvementStockService();