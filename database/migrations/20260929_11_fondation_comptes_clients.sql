BEGIN;

-- ============================================================
-- P3 — Fondation des comptes clients du portail Pro Récup
-- ============================================================

-- Un seul rôle système "client" doit exister.
DO $$
DECLARE
    nombre_roles_client INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER
    INTO nombre_roles_client
    FROM roles
    WHERE LOWER(TRIM(nom)) = 'client';

    IF nombre_roles_client > 1 THEN
        RAISE EXCEPTION
            'Plusieurs rôles client existent déjà.';
    END IF;
END
$$;

-- Le rôle client est un rôle système global.
INSERT INTO roles (
    nom,
    description,
    actif
)
SELECT
    'client',
    'Utilisateur externe autorisé à accéder au portail client Pro Récup.',
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM roles
    WHERE LOWER(TRIM(nom)) = 'client'
);

-- ============================================================
-- Clés composites nécessaires à l'isolation organisationnelle.
-- ============================================================

ALTER TABLE clients
ADD CONSTRAINT clients_id_organisation_key
UNIQUE (
    id,
    organisation_id
);

ALTER TABLE utilisateurs
ADD CONSTRAINT utilisateurs_id_organisation_key
UNIQUE (
    id,
    organisation_id
);

-- ============================================================
-- Liaison entre comptes utilisateurs et clients.
--
-- organisation_id est volontairement présent dans cette table.
-- Les clés étrangères composites empêchent de rattacher :
--
-- utilisateur organisation A
--              à
-- client organisation B
-- ============================================================

CREATE TABLE client_utilisateurs (
    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    organisation_id UUID NOT NULL,

    client_id UUID NOT NULL,

    utilisateur_id UUID NOT NULL,

    actif BOOLEAN NOT NULL
        DEFAULT TRUE,

    cree_le TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    modifie_le TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT client_utilisateurs_client_utilisateur_key
        UNIQUE (
            client_id,
            utilisateur_id
        ),

    CONSTRAINT client_utilisateurs_organisation_fkey
        FOREIGN KEY (
            organisation_id
        )
        REFERENCES organisations(id)
        ON DELETE CASCADE,

    CONSTRAINT client_utilisateurs_client_org_fkey
        FOREIGN KEY (
            client_id,
            organisation_id
        )
        REFERENCES clients(
            id,
            organisation_id
        )
        ON DELETE CASCADE,

    CONSTRAINT client_utilisateurs_utilisateur_org_fkey
        FOREIGN KEY (
            utilisateur_id,
            organisation_id
        )
        REFERENCES utilisateurs(
            id,
            organisation_id
        )
        ON DELETE CASCADE
);

-- Recherche rapide des clients d'un utilisateur.
CREATE INDEX idx_client_utilisateurs_utilisateur
ON client_utilisateurs (
    organisation_id,
    utilisateur_id,
    actif
);

-- Recherche rapide des utilisateurs d'un client.
CREATE INDEX idx_client_utilisateurs_client
ON client_utilisateurs (
    organisation_id,
    client_id,
    actif
);

COMMIT;
