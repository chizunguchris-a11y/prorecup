BEGIN;

CREATE TABLE IF NOT EXISTS client_onboarding_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_nom VARCHAR(180) NOT NULL,
    nom_contact VARCHAR(150) NOT NULL,
    email_contact VARCHAR(254) NOT NULL,
    telephone_contact VARCHAR(40),
    pays VARCHAR(100) NOT NULL,
    ville VARCHAR(100),
    identifiant_legal VARCHAR(100),
    message TEXT,
    statut VARCHAR(40) NOT NULL DEFAULT 'en_attente_verification',
    notes_internes TEXT,
    traite_par UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    adresse_ip VARCHAR(64),
    user_agent VARCHAR(500),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_client_onboarding_statut CHECK (
        statut IN ('en_attente_verification','en_attente_validation','actif','suspendu','refuse')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_client_onboarding_email_active
ON client_onboarding_requests (LOWER(email_contact))
WHERE statut IN ('en_attente_verification','en_attente_validation','actif');

CREATE UNIQUE INDEX IF NOT EXISTS uq_client_onboarding_legal_active
ON client_onboarding_requests (LOWER(identifiant_legal))
WHERE identifiant_legal IS NOT NULL
  AND statut IN ('en_attente_verification','en_attente_validation','actif');

CREATE INDEX IF NOT EXISTS idx_client_onboarding_statut_date
ON client_onboarding_requests (statut, cree_le DESC);

COMMIT;
