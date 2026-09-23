BEGIN;

CREATE TABLE balances
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    numero_interne VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'numerique',
    capacite_max_kg NUMERIC(12,3) NOT NULL,
    precision_kg NUMERIC(12,3) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'active',
    date_calibrage DATE,
    prochain_calibrage DATE,
    tricycle_id UUID REFERENCES tricycles(id),
    site_id UUID REFERENCES sites_de_collecte(id),
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT balances_numero_organisation_unique UNIQUE (organisation_id, numero_interne),
    CONSTRAINT balances_capacite_valide CHECK (capacite_max_kg > 0),
    CONSTRAINT balances_precision_valide CHECK (precision_kg > 0 AND precision_kg <= capacite_max_kg),
    CONSTRAINT balances_type_valide CHECK (type IN ('numerique', 'mecanique')),
    CONSTRAINT balances_statut_valide CHECK (statut IN ('active', 'maintenance', 'hors_service')),
    CONSTRAINT balances_affectation_unique CHECK (NOT (tricycle_id IS NOT NULL AND site_id IS NOT NULL)),
    CONSTRAINT balances_calibrage_valide CHECK (prochain_calibrage IS NULL OR date_calibrage IS NULL OR prochain_calibrage >= date_calibrage)
);

CREATE INDEX IF NOT EXISTS balances_organisation_statut_idx
ON balances(organisation_id, statut);

CREATE TABLE pesees
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    collecte_id UUID NOT NULL REFERENCES collectes(id),
    mission_id UUID NOT NULL REFERENCES missions(id),
    agent_id UUID REFERENCES agents(id),
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id),
    balance_id UUID NOT NULL REFERENCES balances(id),
    poids_brut NUMERIC(12,3) NOT NULL,
    tare NUMERIC(12,3) NOT NULL DEFAULT 0,
    poids_net NUMERIC(12,3) GENERATED ALWAYS AS (poids_brut - tare) STORED,
    date_heure TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    precision_gps NUMERIC(10,2),
    operation_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    remplace_pesee_id UUID REFERENCES pesees(id),
    preuve_id UUID REFERENCES preuves_collecte(id),
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pesees_operation_unique UNIQUE (operation_id),
    CONSTRAINT pesees_type_valide CHECK (type IN ('terrain', 'depot')),
    CONSTRAINT pesees_poids_valides CHECK (poids_brut >= 0 AND tare >= 0 AND poids_brut >= tare),
    CONSTRAINT pesees_latitude_valide CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT pesees_longitude_valide CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT pesees_precision_gps_valide CHECK (precision_gps IS NULL OR precision_gps >= 0)
);

CREATE INDEX IF NOT EXISTS pesees_collecte_date_idx
ON pesees(collecte_id, type, date_heure DESC, cree_le DESC);

CREATE INDEX IF NOT EXISTS pesees_mission_idx
ON pesees(mission_id);

CREATE INDEX IF NOT EXISTS pesees_organisation_idx
ON pesees(organisation_id);

COMMIT;
