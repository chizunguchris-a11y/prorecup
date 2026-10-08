BEGIN;

-- Registre de sessions révocables. Le JWT ne contient qu'un identifiant
-- aléatoire ; seul son SHA-256 est conservé en base.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expire_le TIMESTAMPTZ NOT NULL,
    revoque BOOLEAN NOT NULL DEFAULT false,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoque_le TIMESTAMPTZ,
    adresse_ip TEXT,
    navigateur TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_hash
ON refresh_tokens (token_hash);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_utilisateur_actif
ON refresh_tokens (utilisateur_id, expire_le DESC)
WHERE revoque = false;

COMMIT;
