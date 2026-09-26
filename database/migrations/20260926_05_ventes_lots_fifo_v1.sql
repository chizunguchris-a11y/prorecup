BEGIN;

ALTER TABLE lots
    ADD COLUMN quantite_restante_kg NUMERIC(12,3);

ALTER TABLE lots
    ADD CONSTRAINT lots_quantite_restante_valide
        CHECK (
            quantite_restante_kg IS NULL
            OR (
                quantite_restante_kg >= 0
                AND poids_reel IS NOT NULL
                AND quantite_restante_kg <= poids_reel
            )
        ) NOT VALID,
    ADD CONSTRAINT lots_statut_vente_valide
        CHECK (statut_lot IN ('en_stock', 'partiellement_vendu', 'vendu', 'transforme')) NOT VALID,
    ADD CONSTRAINT lots_quantite_statut_coherent
        CHECK (
            quantite_restante_kg IS NULL
            OR (
                statut_lot IS NOT NULL
                AND (
                    statut_lot = 'transforme'
                    OR (statut_lot = 'en_stock' AND quantite_restante_kg = poids_reel)
                    OR (statut_lot = 'partiellement_vendu' AND quantite_restante_kg > 0 AND quantite_restante_kg < poids_reel)
                    OR (statut_lot = 'vendu' AND quantite_restante_kg = 0)
                )
            )
        ) NOT VALID,
    ADD CONSTRAINT lots_organisation_id_unique
        UNIQUE (organisation_id, id);

ALTER TABLE ventes
    ADD COLUMN provenance_lots_statut VARCHAR(20) NOT NULL DEFAULT 'non_determinee',
    ADD CONSTRAINT ventes_provenance_lots_statut_valide
        CHECK (provenance_lots_statut IN ('non_determinee', 'complete')),
    ADD CONSTRAINT ventes_organisation_id_unique
        UNIQUE (organisation_id, id);

ALTER TABLE stocks
    ADD COLUMN tracabilite_lots_active BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE vente_lots
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    vente_id UUID NOT NULL,
    lot_id UUID NOT NULL,
    quantite_kg NUMERIC(12,3) NOT NULL,
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vente_lots_quantite_positive CHECK (quantite_kg > 0),
    CONSTRAINT vente_lots_vente_lot_unique UNIQUE (vente_id, lot_id),
    CONSTRAINT vente_lots_vente_organisation_fk
        FOREIGN KEY (organisation_id, vente_id)
        REFERENCES ventes (organisation_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT vente_lots_lot_organisation_fk
        FOREIGN KEY (organisation_id, lot_id)
        REFERENCES lots (organisation_id, id)
        ON DELETE RESTRICT
);

CREATE INDEX vente_lots_vente_idx
    ON vente_lots (vente_id);
CREATE INDEX vente_lots_lot_date_idx
    ON vente_lots (lot_id, cree_le);
CREATE INDEX vente_lots_organisation_lot_idx
    ON vente_lots (organisation_id, lot_id);
CREATE INDEX IF NOT EXISTS mouvements_stock_lot_idx
    ON mouvements_stock (lot_id);
CREATE INDEX IF NOT EXISTS mouvements_stock_stock_date_idx
    ON mouvements_stock (stock_id, date_mouvement);
CREATE UNIQUE INDEX mouvements_stock_entree_lot_unique_idx
    ON mouvements_stock (lot_id)
    WHERE type_mouvement = 'ENTREE' AND lot_id IS NOT NULL;

ALTER TABLE mouvements_stock
    ADD CONSTRAINT mouvements_stock_references_valides
        CHECK (
            (type_mouvement = 'ENTREE' AND lot_id IS NOT NULL AND vente_id IS NULL)
            OR
            (type_mouvement = 'SORTIE' AND lot_id IS NULL AND vente_id IS NOT NULL)
        ) NOT VALID;

CREATE OR REPLACE FUNCTION verifier_coherence_vente_lot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    vente_type_dechet UUID;
    lot_type_dechet UUID;
BEGIN
    SELECT s.type_dechet_id
      INTO vente_type_dechet
      FROM ventes v
      JOIN stocks s
        ON s.id = v.stock_id
       AND s.organisation_id = v.organisation_id
     WHERE v.id = NEW.vente_id
       AND v.organisation_id = NEW.organisation_id;

    SELECT l.type_dechet_id
      INTO lot_type_dechet
      FROM lots l
     WHERE l.id = NEW.lot_id
       AND l.organisation_id = NEW.organisation_id;

    IF vente_type_dechet IS NULL OR lot_type_dechet IS NULL THEN
        RAISE EXCEPTION 'Allocation vente/lot introuvable dans l''organisation.';
    END IF;

    IF vente_type_dechet <> lot_type_dechet THEN
        RAISE EXCEPTION 'La matière du lot ne correspond pas à celle de la vente.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER vente_lots_coherence_avant_ecriture
BEFORE INSERT OR UPDATE ON vente_lots
FOR EACH ROW
EXECUTE FUNCTION verifier_coherence_vente_lot();

CREATE OR REPLACE FUNCTION verifier_allocations_vente_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    vente_cible UUID;
    quantite_vente NUMERIC(12,3);
    statut_provenance VARCHAR(20);
    total_allocations NUMERIC(12,3);
BEGIN
    vente_cible := CASE
        WHEN TG_TABLE_NAME = 'ventes' THEN COALESCE(NEW.id, OLD.id)
        ELSE COALESCE(NEW.vente_id, OLD.vente_id)
    END;

    SELECT quantite, provenance_lots_statut
      INTO quantite_vente, statut_provenance
      FROM ventes
     WHERE id = vente_cible;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(quantite_kg), 0)
      INTO total_allocations
     FROM vente_lots
     WHERE vente_id = vente_cible;

    IF statut_provenance = 'non_determinee' AND total_allocations <> 0 THEN
        RAISE EXCEPTION
            'Une vente à provenance non déterminée ne peut pas porter d''allocation de lot.';
    END IF;

    IF statut_provenance = 'complete' AND total_allocations <> quantite_vente THEN
        RAISE EXCEPTION
            'Allocations incomplètes pour la vente % : % kg alloués sur % kg.',
            vente_cible, total_allocations, quantite_vente;
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ventes_allocations_complete_verification
AFTER INSERT OR UPDATE ON ventes
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verifier_allocations_vente_complete();

CREATE CONSTRAINT TRIGGER vente_lots_total_verification
AFTER INSERT OR UPDATE OR DELETE ON vente_lots
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verifier_allocations_vente_complete();

CREATE OR REPLACE FUNCTION verifier_stock_lots_traceable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    organisation_cible UUID;
    type_dechet_cible UUID;
    quantite_stock NUMERIC(12,3);
    stock_cible UUID;
    trace_active BOOLEAN;
    total_lots NUMERIC(12,3);
    lots_non_initialises BIGINT;
    lots_sans_entree BIGINT;
    lots_statuts_inconnus BIGINT;
    entrees_incoherentes BIGINT;
BEGIN
    organisation_cible := COALESCE(NEW.organisation_id, OLD.organisation_id);
    type_dechet_cible := COALESCE(NEW.type_dechet_id, OLD.type_dechet_id);

    SELECT id, quantite, tracabilite_lots_active
      INTO stock_cible, quantite_stock, trace_active
      FROM stocks
     WHERE organisation_id = organisation_cible
       AND type_dechet_id = type_dechet_cible;

    IF NOT FOUND OR trace_active IS NOT TRUE THEN
        RETURN NULL;
    END IF;

    SELECT
        COALESCE(SUM(quantite_restante_kg)
            FILTER (WHERE statut_lot IN ('en_stock', 'partiellement_vendu', 'vendu')), 0),
        COUNT(*) FILTER (
            WHERE statut_lot IS DISTINCT FROM 'transforme'
              AND quantite_restante_kg IS NULL
        ),
        COUNT(*) FILTER (
            WHERE statut_lot IS DISTINCT FROM 'transforme'
              AND quantite_restante_kg IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM mouvements_stock ms
                  WHERE ms.stock_id = stock_cible
                    AND ms.lot_id = lots.id
                    AND ms.type_mouvement = 'ENTREE'
              )
        ),
        COUNT(*) FILTER (
            WHERE statut_lot IS NULL
               OR statut_lot NOT IN ('en_stock', 'partiellement_vendu', 'vendu', 'transforme')
        )
      INTO total_lots, lots_non_initialises, lots_sans_entree, lots_statuts_inconnus
      FROM lots
     WHERE organisation_id = organisation_cible
       AND type_dechet_id = type_dechet_cible;

    IF lots_non_initialises > 0 THEN
        RAISE EXCEPTION
            'Stock traçable incohérent : % lot(s) sans quantité restante.',
            lots_non_initialises;
    END IF;

    IF lots_statuts_inconnus > 0 THEN
        RAISE EXCEPTION
            'Stock traçable incohérent : % lot(s) avec un statut inconnu.',
            lots_statuts_inconnus;
    END IF;

    IF lots_sans_entree > 0 THEN
        RAISE EXCEPTION
            'Stock traçable incohérent : % lot(s) sans mouvement ENTREE.',
            lots_sans_entree;
    END IF;

    SELECT COUNT(*)
      INTO entrees_incoherentes
      FROM mouvements_stock ms
      JOIN lots l ON l.id = ms.lot_id
     WHERE ms.stock_id = stock_cible
       AND ms.type_mouvement = 'ENTREE'
       AND (
           l.organisation_id <> organisation_cible
           OR l.type_dechet_id <> type_dechet_cible
       );

    IF entrees_incoherentes > 0 THEN
        RAISE EXCEPTION
            'Stock traçable incohérent : % entrée(s) de lot d''une autre organisation ou matière.',
            entrees_incoherentes;
    END IF;

    IF total_lots <> quantite_stock THEN
        RAISE EXCEPTION
            'Stock traçable incohérent : stock % kg, lots % kg.',
            quantite_stock, total_lots;
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER stocks_lots_traceables_verification
AFTER INSERT OR UPDATE ON stocks
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verifier_stock_lots_traceable();

CREATE CONSTRAINT TRIGGER lots_stock_traceable_verification
AFTER INSERT OR UPDATE OR DELETE ON lots
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verifier_stock_lots_traceable();

COMMIT;
