BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM vente_lots)
       OR EXISTS (SELECT 1 FROM ventes WHERE provenance_lots_statut = 'complete')
       OR EXISTS (SELECT 1 FROM stocks WHERE tracabilite_lots_active IS TRUE)
       OR EXISTS (SELECT 1 FROM lots WHERE quantite_restante_kg IS NOT NULL) THEN
        RAISE EXCEPTION 'Rollback ventes/lots refusé : des données traçables existent. Exportez-les et désactivez explicitement la traçabilité avant de retirer le schéma.';
    END IF;
END $$;

DROP TRIGGER IF EXISTS lots_stock_traceable_verification ON lots;
DROP TRIGGER IF EXISTS stocks_lots_traceables_verification ON stocks;
DROP TRIGGER IF EXISTS vente_lots_total_verification ON vente_lots;
DROP TRIGGER IF EXISTS ventes_allocations_complete_verification ON ventes;
DROP TRIGGER IF EXISTS vente_lots_coherence_avant_ecriture ON vente_lots;

DROP FUNCTION IF EXISTS verifier_stock_lots_traceable();
DROP FUNCTION IF EXISTS verifier_allocations_vente_complete();
DROP FUNCTION IF EXISTS verifier_coherence_vente_lot();

DROP TABLE IF EXISTS vente_lots;

ALTER TABLE mouvements_stock
    DROP CONSTRAINT IF EXISTS mouvements_stock_references_valides;

ALTER TABLE stocks
    DROP COLUMN IF EXISTS tracabilite_lots_active;

ALTER TABLE ventes
    DROP CONSTRAINT IF EXISTS ventes_organisation_id_unique,
    DROP CONSTRAINT IF EXISTS ventes_provenance_lots_statut_valide,
    DROP COLUMN IF EXISTS provenance_lots_statut;

ALTER TABLE lots
    DROP CONSTRAINT IF EXISTS lots_organisation_id_unique,
    DROP CONSTRAINT IF EXISTS lots_quantite_statut_coherent,
    DROP CONSTRAINT IF EXISTS lots_statut_vente_valide,
    DROP CONSTRAINT IF EXISTS lots_quantite_restante_valide,
    DROP COLUMN IF EXISTS quantite_restante_kg;

DROP INDEX IF EXISTS mouvements_stock_stock_date_idx;
DROP INDEX IF EXISTS mouvements_stock_lot_idx;
DROP INDEX IF EXISTS mouvements_stock_entree_lot_unique_idx;

COMMIT;
