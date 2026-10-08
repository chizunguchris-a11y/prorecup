BEGIN;

ALTER TABLE utilisateurs
ADD COLUMN IF NOT EXISTS invitation_statut VARCHAR(20);

ALTER TABLE utilisateurs
DROP CONSTRAINT IF EXISTS ck_utilisateurs_invitation_statut;

ALTER TABLE utilisateurs
ADD CONSTRAINT ck_utilisateurs_invitation_statut
CHECK (
    invitation_statut IS NULL
    OR invitation_statut IN ('en_attente', 'annulee', 'utilisee')
);

UPDATE utilisateurs
SET invitation_statut = 'en_attente'
WHERE invitation_en_attente = true
  AND invitation_statut IS NULL;

CREATE INDEX IF NOT EXISTS idx_utilisateurs_invitation_statut
ON utilisateurs (organisation_id, invitation_statut)
WHERE invitation_statut IS NOT NULL;

COMMIT;
