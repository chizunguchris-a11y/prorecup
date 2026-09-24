BEGIN;

ALTER TABLE lots
    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id),
    ADD COLUMN IF NOT EXISTS code_qr VARCHAR(80),
    ADD COLUMN IF NOT EXISTS tare_kg NUMERIC(12,3),
    ADD COLUMN IF NOT EXISTS operation_id UUID,
    ADD COLUMN IF NOT EXISTS site_courant_id UUID REFERENCES sites_de_collecte(id),
    ADD COLUMN IF NOT EXISTS client_courant_id UUID REFERENCES clients(id),
    ADD COLUMN IF NOT EXISTS cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS modifie_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE lots l
SET organisation_id = cl.organisation_id,
    site_courant_id = COALESCE(l.site_courant_id, c.site_id),
    client_courant_id = COALESCE(l.client_courant_id, c.client_id),
    code_qr = COALESCE(l.code_qr, 'PR-L-' || UPPER(REPLACE(l.id::text, '-', '')))
FROM collectes c JOIN clients cl ON cl.id = c.client_id
WHERE l.collecte_id = c.id AND (l.organisation_id IS NULL OR l.code_qr IS NULL);

ALTER TABLE lots ALTER COLUMN organisation_id SET NOT NULL, ALTER COLUMN code_qr SET NOT NULL,
    ALTER COLUMN collecte_id DROP NOT NULL;
ALTER TABLE lots
    ADD CONSTRAINT lots_code_qr_format CHECK (code_qr ~ '^PR-L-[A-Z0-9-]{6,60}$'),
    ADD CONSTRAINT lots_tare_valide CHECK (tare_kg IS NULL OR tare_kg >= 0),
    ADD CONSTRAINT lots_code_qr_unique UNIQUE (code_qr),
    ADD CONSTRAINT lots_operation_unique UNIQUE (operation_id);
CREATE INDEX IF NOT EXISTS lots_organisation_statut_idx ON lots(organisation_id, statut_lot);

CREATE TABLE contenants
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
    type_contenant VARCHAR(20) NOT NULL, code_qr VARCHAR(80) NOT NULL UNIQUE, tare_kg NUMERIC(12,3),
    statut VARCHAR(30) NOT NULL DEFAULT 'disponible', site_courant_id UUID REFERENCES sites_de_collecte(id),
    client_courant_id UUID REFERENCES clients(id), collecte_origine_id UUID REFERENCES collectes(id),
    type_dechet_id UUID REFERENCES types_dechets(id), poids_courant_kg NUMERIC(12,3),
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contenants_type_valide CHECK (type_contenant IN ('sac', 'bac')),
    CONSTRAINT contenants_code_qr_format CHECK (code_qr ~ '^PR-C-[A-Z0-9-]{6,60}$'),
    CONSTRAINT contenants_tare_valide CHECK (tare_kg IS NULL OR tare_kg >= 0),
    CONSTRAINT contenants_poids_valide CHECK (poids_courant_kg IS NULL OR poids_courant_kg >= 0),
    CONSTRAINT contenants_statut_valide CHECK (statut IN ('disponible', 'en_collecte', 'recu_depot', 'dans_lot', 'vide', 'retire'))
);
CREATE INDEX contenants_organisation_statut_idx ON contenants(organisation_id, statut);
CREATE INDEX contenants_site_client_idx ON contenants(organisation_id, site_courant_id, client_courant_id);

CREATE TABLE lot_contenants
(
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    contenant_id UUID NOT NULL REFERENCES contenants(id),
    ajoute_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (lot_id, contenant_id)
);

CREATE TABLE pesees_unites
(
    pesee_id UUID NOT NULL REFERENCES pesees(id) ON DELETE CASCADE,
    contenant_id UUID REFERENCES contenants(id), lot_id UUID REFERENCES lots(id),
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pesees_unites_cible_unique CHECK ((contenant_id IS NOT NULL)::int + (lot_id IS NOT NULL)::int = 1),
    UNIQUE (pesee_id, contenant_id), UNIQUE (pesee_id, lot_id)
);

CREATE TABLE tracabilite_matiere_evenements
(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organisation_id UUID NOT NULL REFERENCES organisations(id),
    contenant_id UUID REFERENCES contenants(id), lot_id UUID REFERENCES lots(id),
    type_evenement VARCHAR(40) NOT NULL, operation_id UUID NOT NULL,
    collecte_id UUID REFERENCES collectes(id), mission_id UUID REFERENCES missions(id), pesee_id UUID REFERENCES pesees(id),
    site_id UUID REFERENCES sites_de_collecte(id), client_id UUID REFERENCES clients(id),
    utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id), survenu_le TIMESTAMP WITH TIME ZONE NOT NULL,
    cree_le TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, details JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT tracabilite_matiere_cible_unique CHECK ((contenant_id IS NOT NULL)::int + (lot_id IS NOT NULL)::int = 1),
    CONSTRAINT tracabilite_matiere_type_valide CHECK (type_evenement IN ('creation', 'rattachement_collecte', 'pesee_terrain', 'reception_depot', 'pesee_depot', 'regroupement_lot'))
);
CREATE INDEX tracabilite_matiere_unite_idx ON tracabilite_matiere_evenements(organisation_id, contenant_id, lot_id, survenu_le DESC);
CREATE UNIQUE INDEX tracabilite_matiere_operation_contenant_unique
ON tracabilite_matiere_evenements(operation_id, type_evenement, contenant_id) WHERE contenant_id IS NOT NULL;
CREATE UNIQUE INDEX tracabilite_matiere_operation_lot_unique
ON tracabilite_matiere_evenements(operation_id, type_evenement, lot_id) WHERE lot_id IS NOT NULL;

COMMIT;
