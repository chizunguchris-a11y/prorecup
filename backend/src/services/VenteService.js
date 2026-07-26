import pool from "../config/db.js";

import venteRepository
    from "../repositories/VenteRepository.js";

import stockRepository
    from "../repositories/StockRepository.js";

import mouvementStockService
    from "./MouvementStockService.js";

import impactCarboneService
    from "./ImpactCarboneService.js";

import ApiError
    from "../utils/ApiError.js";

class VenteService {

    async creer(vente) {

        if (!vente.organisation_id) {
            throw new ApiError(
                400,
                "L'organisation est obligatoire."
            );
        }

        if (!vente.stock_id) {
            throw new ApiError(
                400,
                "Le stock est obligatoire."
            );
        }

        if (
            !vente.quantite ||
            Number(vente.quantite) <= 0
        ) {
            throw new ApiError(
                400,
                "La quantité vendue doit être supérieure à zéro."
            );
        }

        if (
            vente.prix_unitaire === undefined ||
            Number(vente.prix_unitaire) < 0
        ) {
            throw new ApiError(
                400,
                "Le prix unitaire doit être supérieur ou égal à zéro."
            );
        }

        if (!vente.acheteur_nom) {
            throw new ApiError(
                400,
                "Le nom de l'acheteur est obligatoire."
            );
        }

        const quantiteVendue =
            Number(vente.quantite);

        const prixUnitaire =
            Number(vente.prix_unitaire);

        const client =
            await pool.connect();

        try {

            await client.query("BEGIN");

            const stock =
                await stockRepository
                    .trouverParIdPourMiseAJour(
                        vente.stock_id,
                        vente.organisation_id,
                        client
                    );

            if (!stock) {
                throw new ApiError(
                    404,
                    "Stock introuvable pour cette organisation."
                );
            }

            const quantiteDisponible =
                Number(stock.quantite);

            if (
                quantiteDisponible <
                quantiteVendue
            ) {
                throw new ApiError(
                    409,
                    `Stock insuffisant. Quantité disponible : ${quantiteDisponible} ${stock.unite}.`
                );
            }

            const montantTotal =
                Number(
                    (
                        quantiteVendue *
                        prixUnitaire
                    ).toFixed(2)
                );

            const nouvelleQuantite =
                quantiteDisponible -
                quantiteVendue;

            const nouvelleVente =
                await venteRepository.creer(
                    {
                        ...vente,
                        quantite:
                            quantiteVendue,
                        prix_unitaire:
                            prixUnitaire,
                        montant_total:
                            montantTotal,
                        statut:
                            "confirmee"
                    },
                    client
                );

            const stockMisAJour =
                await stockRepository
                    .mettreAJour(
                        stock.id,
                        nouvelleQuantite,
                        client
                    );

            const mouvement =
                await mouvementStockService
                    .enregistrerSortie(
                        stock.id,
                        nouvelleVente.id,
                        quantiteVendue,
                        client
                    );

            const impactCarbone =
                await impactCarboneService
                    .calculerPourVente(
                        nouvelleVente,
                        stock.type_dechet_id,
                        client
                    );

            await client.query("COMMIT");

            return {
                vente:
                    nouvelleVente,

                stock:
                    stockMisAJour,

                mouvement,

                impact_carbone:
                    impactCarbone
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

        return await venteRepository
            .listerParOrganisation(
                organisationId
            );

    }

}

export default new VenteService();