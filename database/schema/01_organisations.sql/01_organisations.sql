-- =====================================================
-- PRO RECUP
-- TABLE : organisations
-- =====================================================

CREATE TABLE organisations (
    id UUID PRIMARY KEY,

    nom VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    nom_court VARCHAR(50),

    email VARCHAR(255),
    telephone VARCHAR(30),

    adresse TEXT,
    ville VARCHAR(100),
    pays VARCHAR(100) NOT NULL,

    devise VARCHAR(10) NOT NULL,
    fuseau_horaire VARCHAR(100) NOT NULL,

    logo TEXT,

    actif BOOLEAN NOT NULL DEFAULT TRUE,

    cree_le TIMESTAMP NOT NULL,
    modifie_le TIMESTAMP NOT NULL,
    supprime_le TIMESTAMP
);