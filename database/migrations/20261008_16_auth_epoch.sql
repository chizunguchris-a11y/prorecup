BEGIN;

ALTER TABLE utilisateurs
ADD COLUMN IF NOT EXISTS auth_epoch INTEGER NOT NULL DEFAULT 1;

ALTER TABLE utilisateurs
DROP CONSTRAINT IF EXISTS ck_utilisateurs_auth_epoch;

ALTER TABLE utilisateurs
ADD CONSTRAINT ck_utilisateurs_auth_epoch
CHECK (auth_epoch >= 1);

COMMIT;
