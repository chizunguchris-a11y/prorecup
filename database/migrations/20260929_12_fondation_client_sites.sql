BEGIN;

-- ============================================================
-- P3.8a
-- Fondation de l'association plusieurs-a-plusieurs
-- entre les clients et les sites de collecte.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Garde-fou :
-- tous les sites doivent appartenir a une organisation.
-- ------------------------------------------------------------

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM sites_de_collecte
        WHERE organisation_id IS NULL
    ) THEN

        RAISE EXCEPTION
            'Impossible de verrouiller les sites : organisation_id NULL detecte.';

    END IF;

END
$$;


ALTER TABLE sites_de_collecte
    ALTER COLUMN organisation_id
    SET NOT NULL;


-- ------------------------------------------------------------
-- 2. Cle composite requise pour les FK tenant-safe.
-- ------------------------------------------------------------

ALTER TABLE sites_de_collecte
    ADD CONSTRAINT
        sites_de_collecte_id_organisation_key
    UNIQUE (
        id,
        organisation_id
    );


-- ------------------------------------------------------------
-- 3. Table d'association client <-> site.
--
-- Un site peut etre lie a plusieurs clients.
-- Un client peut disposer de plusieurs sites.
-- ------------------------------------------------------------

CREATE TABLE client_sites (

    id UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid(),

    organisation_id UUID
        NOT NULL,

    client_id UUID
        NOT NULL,

    site_id UUID
        NOT NULL,

    actif BOOLEAN
        NOT NULL
        DEFAULT TRUE,

    cree_le TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    modifie_le TIMESTAMPTZ
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP,


    CONSTRAINT client_sites_client_site_key
        UNIQUE (
            client_id,
            site_id
        ),


    CONSTRAINT client_sites_organisation_fkey
        FOREIGN KEY (
            organisation_id
        )
        REFERENCES organisations(id)
        ON DELETE CASCADE,


    CONSTRAINT client_sites_client_org_fkey
        FOREIGN KEY (
            client_id,
            organisation_id
        )
        REFERENCES clients(
            id,
            organisation_id
        )
        ON DELETE CASCADE,


    CONSTRAINT client_sites_site_org_fkey
        FOREIGN KEY (
            site_id,
            organisation_id
        )
        REFERENCES sites_de_collecte(
            id,
            organisation_id
        )
        ON DELETE CASCADE

);


-- ------------------------------------------------------------
-- 4. Index utiles au portail et au back-office.
-- ------------------------------------------------------------

CREATE INDEX
    client_sites_organisation_client_actif_idx
ON client_sites (
    organisation_id,
    client_id,
    actif
);


CREATE INDEX
    client_sites_organisation_site_actif_idx
ON client_sites (
    organisation_id,
    site_id,
    actif
);


-- ------------------------------------------------------------
-- 5. Garde-fou historique :
-- aucune association inter-organisation ne doit exister.
-- ------------------------------------------------------------

DO $$
BEGIN

    IF EXISTS (

        SELECT 1

        FROM collectes co

        JOIN sites_de_collecte s
          ON s.id = co.site_id

        JOIN clients c
          ON c.id = co.client_id

        WHERE co.client_id IS NOT NULL
          AND co.site_id IS NOT NULL
          AND s.organisation_id
              IS DISTINCT FROM
              c.organisation_id

    ) THEN

        RAISE EXCEPTION
            'Backfill client_sites impossible : association historique inter-organisation detectee.';

    END IF;

END
$$;


-- ------------------------------------------------------------
-- 6. Backfill :
-- on reprend chaque couple client/site deja prouve
-- par au moins une collecte historique.
--
-- Le site partage de Gombe produira donc plusieurs liaisons.
-- ------------------------------------------------------------

INSERT INTO client_sites (
    organisation_id,
    client_id,
    site_id,
    actif
)

SELECT DISTINCT
    s.organisation_id,
    co.client_id,
    co.site_id,
    TRUE

FROM collectes co

JOIN sites_de_collecte s
  ON s.id = co.site_id

JOIN clients c
  ON c.id = co.client_id

WHERE co.client_id IS NOT NULL
  AND co.site_id IS NOT NULL
  AND s.organisation_id =
      c.organisation_id

ON CONFLICT (
    client_id,
    site_id
)
DO NOTHING;


COMMIT;
