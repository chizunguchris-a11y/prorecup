BEGIN;

-- Correctif du trigger différé partagé entre ventes et vente_lots.
-- La migration 20260926_05 est déjà appliquée en production : on ne la rejoue pas.
-- CREATE OR REPLACE conserve les triggers existants et remplace uniquement
-- l'implémentation de la fonction appelée par ces triggers.

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
    IF TG_TABLE_NAME = 'ventes' THEN
        IF TG_OP = 'DELETE' THEN
            vente_cible := OLD.id;
        ELSE
            vente_cible := NEW.id;
        END IF;

    ELSIF TG_TABLE_NAME = 'vente_lots' THEN
        IF TG_OP = 'DELETE' THEN
            vente_cible := OLD.vente_id;
        ELSE
            vente_cible := NEW.vente_id;
        END IF;

    ELSE
        RAISE EXCEPTION
            'verifier_allocations_vente_complete() appelée depuis une table inattendue : %',
            TG_TABLE_NAME;
    END IF;

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

    IF statut_provenance = 'non_determinee'
       AND total_allocations <> 0 THEN

        RAISE EXCEPTION
            'Une vente à provenance non déterminée ne peut pas porter d''allocation de lot.';
    END IF;

    IF statut_provenance = 'complete'
       AND total_allocations <> quantite_vente THEN

        RAISE EXCEPTION
            'Allocations incomplètes pour la vente % : % kg alloués sur % kg.',
            vente_cible,
            total_allocations,
            quantite_vente;
    END IF;

    RETURN NULL;
END;
$$;

COMMIT;