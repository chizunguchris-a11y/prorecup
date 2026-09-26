import pool from "../config/db.js";
import venteRepository from "../repositories/VenteRepository.js";
import venteLotRepository from "../repositories/VenteLotRepository.js";
import stockRepository from "../repositories/StockRepository.js";
import lotRepository from "../repositories/LotRepository.js";
import mouvementStockService from "./MouvementStockService.js";
import impactCarboneService from "./ImpactCarboneService.js";
import ApiError from "../utils/ApiError.js";

const normaliserKg = valeur => Number(Number(valeur).toFixed(3));
const quantitesEgales = (gauche, droite) =>
    Math.abs(Number(gauche) - Number(droite)) < 0.0005;

class VenteService {
    construirePlanFifo(lots, quantiteDemandee) {
        let restantAAllouer = normaliserKg(quantiteDemandee);
        const allocations = [];

        for (const lot of lots) {
            if (restantAAllouer <= 0) break;
            const disponible = normaliserKg(lot.quantite_restante_kg);
            const quantite = normaliserKg(Math.min(disponible, restantAAllouer));
            if (quantite > 0) {
                allocations.push({ lot, quantite_kg: quantite });
                restantAAllouer = normaliserKg(restantAAllouer - quantite);
            }
        }

        return { allocations, restantAAllouer };
    }

    async creer(vente) {
        if (!vente.organisation_id) {
            throw new ApiError(400, "L'organisation est obligatoire.");
        }
        if (!vente.stock_id) {
            throw new ApiError(400, "Le stock est obligatoire.");
        }
        if (!vente.quantite || Number(vente.quantite) <= 0) {
            throw new ApiError(400, "La quantité vendue doit être supérieure à zéro.");
        }
        if (vente.prix_unitaire === undefined || Number(vente.prix_unitaire) < 0) {
            throw new ApiError(400, "Le prix unitaire doit être supérieur ou égal à zéro.");
        }
        if (!vente.acheteur_nom) {
            throw new ApiError(400, "Le nom de l'acheteur est obligatoire.");
        }

        const quantiteOriginale = Number(vente.quantite);
        const quantiteVendue = normaliserKg(quantiteOriginale);
        if (!quantitesEgales(quantiteOriginale, quantiteVendue)) {
            throw new ApiError(400, "La quantité vendue est limitée à trois décimales.");
        }
        const prixUnitaire = Number(vente.prix_unitaire);
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const stock = await stockRepository.trouverParIdPourMiseAJour(
                vente.stock_id,
                vente.organisation_id,
                client
            );
            if (!stock) {
                throw new ApiError(404, "Stock introuvable pour cette organisation.");
            }

            const quantiteDisponible = normaliserKg(stock.quantite);
            if (quantiteDisponible < quantiteVendue) {
                throw new ApiError(
                    409,
                    `Stock insuffisant. Quantité disponible : ${quantiteDisponible} ${stock.unite}.`
                );
            }

            const stockTraceable = stock.tracabilite_lots_active === true;
            let plan = [];

            if (stockTraceable) {
                // Le stock est déjà verrouillé. Les lots sont ensuite verrouillés
                // dans l'ordre de leur première ENTREE, puis par UUID.
                const lots = await lotRepository.listerDisponiblesFifoPourMiseAJour(
                    vente.organisation_id,
                    stock.id,
                    stock.type_dechet_id,
                    client
                );
                const totalLots = normaliserKg(lots.reduce(
                    (total, lot) => total + Number(lot.quantite_restante_kg),
                    0
                ));

                const composition = await lotRepository.sommeQuantitesRestantes(
                    vente.organisation_id,
                    stock.type_dechet_id,
                    client
                );

                if (Number(composition.lots_non_initialises) > 0 ||
                    Number(composition.lots_statuts_inconnus) > 0) {
                    throw new ApiError(
                        409,
                        "Stock traçable incohérent : la composition contient des lots non réconciliés."
                    );
                }

                if (!quantitesEgales(totalLots, quantiteDisponible) ||
                    !quantitesEgales(composition.total, quantiteDisponible)) {
                    throw new ApiError(
                        409,
                        `Stock traçable incohérent : stock ${quantiteDisponible} kg, lots disponibles ${totalLots} kg.`
                    );
                }

                const resultatPlan = this.construirePlanFifo(lots, quantiteVendue);
                if (resultatPlan.restantAAllouer > 0) {
                    throw new ApiError(
                        409,
                        `Lots insuffisants. Quantité non allouée : ${resultatPlan.restantAAllouer} kg.`
                    );
                }
                plan = resultatPlan.allocations;
            }

            const montantTotal = Number((quantiteVendue * prixUnitaire).toFixed(2));
            let nouvelleVente = await venteRepository.creer({
                ...vente,
                quantite: quantiteVendue,
                prix_unitaire: prixUnitaire,
                montant_total: montantTotal,
                statut: "confirmee",
                provenance_lots_statut: "non_determinee"
            }, client);

            const allocationsCreees = [];
            for (const allocation of plan) {
                const allocationCreee = await venteLotRepository.creer({
                    organisation_id: vente.organisation_id,
                    vente_id: nouvelleVente.id,
                    lot_id: allocation.lot.id,
                    quantite_kg: allocation.quantite_kg
                }, client);
                allocationsCreees.push(allocationCreee);

                const lotMisAJour = await lotRepository.decrementerQuantiteRestante(
                    allocation.lot.id,
                    vente.organisation_id,
                    allocation.quantite_kg,
                    client
                );
                if (!lotMisAJour) {
                    throw new ApiError(
                        409,
                        `Le lot ${allocation.lot.code_qr || allocation.lot.id} n'est plus disponible.`
                    );
                }
            }

            const nouvelleQuantite = normaliserKg(quantiteDisponible - quantiteVendue);
            const stockMisAJour = await stockRepository.mettreAJour(
                stock.id,
                nouvelleQuantite,
                client
            );
            const mouvement = await mouvementStockService.enregistrerSortie(
                stock.id,
                nouvelleVente.id,
                quantiteVendue,
                client
            );

            const impactCarbone = await impactCarboneService.calculerPourVente(
                nouvelleVente,
                stock.type_dechet_id,
                client
            );
            const avertissements = impactCarbone ? [] : [{
                code: "CARBON_FACTOR_NOT_FOUND",
                message: "Impact carbone non calculé : aucun facteur carbone applicable."
            }];

            if (stockTraceable) {
                nouvelleVente = await venteRepository.marquerProvenanceComplete(
                    nouvelleVente.id,
                    vente.organisation_id,
                    client
                );

                const totalAllocations = await venteLotRepository.sommeParVente(
                    nouvelleVente.id,
                    vente.organisation_id,
                    client
                );
                if (!quantitesEgales(totalAllocations, quantiteVendue)) {
                    throw new Error(
                        `Invariant vente/lot violé : ${totalAllocations} kg alloués sur ${quantiteVendue} kg.`
                    );
                }

                const etatLots = await lotRepository.sommeQuantitesRestantes(
                    vente.organisation_id,
                    stock.type_dechet_id,
                    client
                );
                if (Number(etatLots.lots_non_initialises) > 0 ||
                    Number(etatLots.lots_statuts_inconnus) > 0 ||
                    !quantitesEgales(etatLots.total, nouvelleQuantite)) {
                    throw new Error(
                        `Invariant stock/lots violé : stock ${nouvelleQuantite} kg, lots ${etatLots.total} kg.`
                    );
                }
            }

            await client.query("COMMIT");

            return {
                vente: nouvelleVente,
                stock: stockMisAJour,
                mouvement,
                allocations_lots: allocationsCreees,
                impact_carbone: impactCarbone,
                avertissements
            };
        } catch (erreur) {
            await client.query("ROLLBACK");
            throw erreur;
        } finally {
            client.release();
        }
    }

    async listerParOrganisation(organisationId) {
        if (!organisationId) {
            throw new ApiError(400, "L'organisation est obligatoire.");
        }
        return venteRepository.listerParOrganisation(organisationId);
    }
}

export default new VenteService();
