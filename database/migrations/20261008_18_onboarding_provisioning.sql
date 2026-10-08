BEGIN;
ALTER TABLE client_onboarding_requests ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE client_onboarding_requests ADD COLUMN IF NOT EXISTS premier_utilisateur_id UUID REFERENCES utilisateurs(id);
ALTER TABLE client_onboarding_requests ADD COLUMN IF NOT EXISTS organisation_operatrice_id UUID REFERENCES organisations(id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_client ON client_onboarding_requests(client_id) WHERE client_id IS NOT NULL;
COMMIT;
