-- =====================================================
-- PRO RECUP
-- TABLE : utilisateurs
-- =====================================================

CREATE TABLE utilisateurs (
    id UUID PRIMARY KEY,

    organisation_id UUID NOT NULL,
    role_id UUID NOT NULL,

    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,

    sexe VARCHAR(20),

    telephone VARCHAR(30) NOT NULL,
    telephone_verifie_le TIMESTAMP,

    email VARCHAR(255),
    email_verifie_le TIMESTAMP,

    mot_de_passe_hash TEXT NOT NULL,

    photo_profil TEXT,

    langue VARCHAR(10) NOT NULL DEFAULT 'fr',

    actif BOOLEAN NOT NULL DEFAULT TRUE,

    derniere_connexion TIMESTAMP,
    derniere_activite_le TIMESTAMP,

    cree_le TIMESTAMP NOT NULL,
    modifie_le TIMESTAMP NOT NULL,
    supprime_le TIMESTAMP,

    CONSTRAINT fk_utilisateurs_organisation
        FOREIGN KEY (organisation_id)
        REFERENCES organisations(id),

    CONSTRAINT fk_utilisateurs_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id),

    CONSTRAINT uq_utilisateurs_email
        UNIQUE (organisation_id, email),

    CONSTRAINT ck_utilisateurs_langue
        CHECK (langue IN ('fr', 'en'))
);

CREATE INDEX idx_utilisateurs_organisation
    ON utilisateurs(organisation_id);

CREATE INDEX idx_utilisateurs_role
    ON utilisateurs(role_id);

CREATE INDEX idx_utilisateurs_telephone
    ON utilisateurs(telephone);

CREATE INDEX idx_utilisateurs_email
    ON utilisateurs(email);

CREATE INDEX idx_utilisateurs_actif
    ON utilisateurs(actif);