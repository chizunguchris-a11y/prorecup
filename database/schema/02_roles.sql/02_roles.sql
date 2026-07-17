-- =====================================================
-- PRO RECUP
-- TABLE : roles
-- =====================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY,

    organisation_id UUID NOT NULL,

    nom VARCHAR(100) NOT NULL,
    description TEXT,

    actif BOOLEAN NOT NULL DEFAULT TRUE,

    cree_le TIMESTAMP NOT NULL,
    modifie_le TIMESTAMP NOT NULL,
    supprime_le TIMESTAMP,

    CONSTRAINT fk_roles_organisation
        FOREIGN KEY (organisation_id)
        REFERENCES organisations(id),

    CONSTRAINT uq_roles_nom
        UNIQUE (organisation_id, nom)
);