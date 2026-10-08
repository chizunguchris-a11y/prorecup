BEGIN;
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS invitation_en_attente BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE identity_recovery_tokens ALTER COLUMN destination_hint TYPE VARCHAR(254);
COMMIT;
