BEGIN;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM contenants)
       OR EXISTS (SELECT 1 FROM lot_contenants)
       OR EXISTS (SELECT 1 FROM pesees_unites)
       OR EXISTS (SELECT 1 FROM tracabilite_matiere_evenements)
       OR EXISTS (SELECT 1 FROM lots WHERE collecte_id IS NULL) THEN
        RAISE EXCEPTION 'Rollback QR/Lots refusé : des données V1 existent. Nettoyez ou exportez-les explicitement avant de retirer le schéma.';
    END IF;
END $$;
DROP TABLE IF EXISTS tracabilite_matiere_evenements;
DROP TABLE IF EXISTS pesees_unites;
DROP TABLE IF EXISTS lot_contenants;
DROP TABLE IF EXISTS contenants;
ALTER TABLE lots ALTER COLUMN collecte_id SET NOT NULL,
    DROP COLUMN IF EXISTS modifie_le, DROP COLUMN IF EXISTS cree_le,
    DROP COLUMN IF EXISTS client_courant_id, DROP COLUMN IF EXISTS site_courant_id,
    DROP COLUMN IF EXISTS operation_id, DROP COLUMN IF EXISTS tare_kg,
    DROP COLUMN IF EXISTS code_qr, DROP COLUMN IF EXISTS organisation_id;
COMMIT;
