BEGIN;

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS secteur_activite TEXT;

-- Normaliser les variantes existantes de "Entreprise".
UPDATE clients
SET type_client = 'entreprise'
WHERE LOWER(TRIM(type_client)) = 'entreprise';

-- Hôpital Central est une institution du secteur de la santé.
-- L'ID sécurise la donnée actuelle ; le nom rend la migration
-- réutilisable sur une base où l'UUID serait différent.
UPDATE clients
SET
    type_client = 'institution',
    secteur_activite = COALESCE(
        NULLIF(TRIM(secteur_activite), ''),
        'sante'
    )
WHERE id = '33fa1670-2318-45cb-9097-2b6dba9f4ad7'::uuid
   OR LOWER(TRIM(nom)) = LOWER('Hôpital Central');

COMMIT;
