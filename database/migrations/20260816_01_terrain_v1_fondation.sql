BEGIN;


-- =========================================================
-- PRO RECUP
-- TERRAIN V1 - FONDATION
-- 2026-08-16
--
-- Migration additive :
-- aucune colonne existante n'est supprimee ou renommee.
-- =========================================================


-- =========================================================
-- 1. GEOLOCALISATION DES SITES
-- =========================================================

ALTER TABLE sites_de_collecte
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);

ALTER TABLE sites_de_collecte
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

ALTER TABLE sites_de_collecte
    ADD COLUMN IF NOT EXISTS precision_gps_reference NUMERIC(10,2);

ALTER TABLE sites_de_collecte
    ADD COLUMN IF NOT EXISTS rayon_validation_m INTEGER
    NOT NULL DEFAULT 100;


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sites_latitude_valide'
    ) THEN

        ALTER TABLE sites_de_collecte
        ADD CONSTRAINT sites_latitude_valide
        CHECK (
            latitude IS NULL
            OR (
                latitude >= -90
                AND latitude <= 90
            )
        );

    END IF;

END
$$;


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sites_longitude_valide'
    ) THEN

        ALTER TABLE sites_de_collecte
        ADD CONSTRAINT sites_longitude_valide
        CHECK (
            longitude IS NULL
            OR (
                longitude >= -180
                AND longitude <= 180
            )
        );

    END IF;

END
$$;


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sites_precision_gps_valide'
    ) THEN

        ALTER TABLE sites_de_collecte
        ADD CONSTRAINT sites_precision_gps_valide
        CHECK (
            precision_gps_reference IS NULL
            OR precision_gps_reference >= 0
        );

    END IF;

END
$$;


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sites_rayon_validation_valide'
    ) THEN

        ALTER TABLE sites_de_collecte
        ADD CONSTRAINT sites_rayon_validation_valide
        CHECK (rayon_validation_m > 0);

    END IF;

END
$$;



-- =========================================================
-- 2. POIDS REEL DES COLLECTES
-- =========================================================

ALTER TABLE collectes
    ADD COLUMN IF NOT EXISTS poids_reel NUMERIC(12,3);

ALTER TABLE collectes
    ADD COLUMN IF NOT EXISTS poids_reel_saisi_le
    TIMESTAMP WITH TIME ZONE;

ALTER TABLE collectes
    ADD COLUMN IF NOT EXISTS poids_reel_saisi_par UUID;


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'collectes_poids_reel_valide'
    ) THEN

        ALTER TABLE collectes
        ADD CONSTRAINT collectes_poids_reel_valide
        CHECK (
            poids_reel IS NULL
            OR poids_reel > 0
        );

    END IF;

END
$$;


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'collectes_poids_reel_utilisateur_fk'
    ) THEN

        ALTER TABLE collectes
        ADD CONSTRAINT collectes_poids_reel_utilisateur_fk
        FOREIGN KEY (poids_reel_saisi_par)
        REFERENCES utilisateurs(id);

    END IF;

END
$$;



-- =========================================================
-- 3. EVENEMENTS TERRAIN OFFLINE / IDEMPOTENCE
-- =========================================================

ALTER TABLE mission_evenements
    ADD COLUMN IF NOT EXISTS operation_id UUID;

ALTER TABLE mission_evenements
    ADD COLUMN IF NOT EXISTS survenu_le
    TIMESTAMP WITH TIME ZONE;

ALTER TABLE mission_evenements
    ADD COLUMN IF NOT EXISTS recu_le
    TIMESTAMP WITH TIME ZONE;

ALTER TABLE mission_evenements
    ADD COLUMN IF NOT EXISTS contexte JSONB
    NOT NULL DEFAULT '{}'::jsonb;


-- Les anciens evenements sont consideres comme ayant
-- eu lieu au moment ou ils ont ete crees.

UPDATE mission_evenements
SET survenu_le = cree_le
WHERE survenu_le IS NULL;


UPDATE mission_evenements
SET recu_le = cree_le
WHERE recu_le IS NULL;


ALTER TABLE mission_evenements
    ALTER COLUMN survenu_le
    SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE mission_evenements
    ALTER COLUMN survenu_le
    SET NOT NULL;


ALTER TABLE mission_evenements
    ALTER COLUMN recu_le
    SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE mission_evenements
    ALTER COLUMN recu_le
    SET NOT NULL;


CREATE UNIQUE INDEX IF NOT EXISTS
    mission_evenements_operation_id_unique
ON mission_evenements(operation_id)
WHERE operation_id IS NOT NULL;



-- =========================================================
-- 4. PREUVES TERRAIN
-- =========================================================

CREATE TABLE IF NOT EXISTS preuves_collecte
(
    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    organisation_id UUID NOT NULL,

    mission_id UUID NOT NULL,

    collecte_id UUID NOT NULL,

    type_preuve VARCHAR(100) NOT NULL,

    storage_bucket VARCHAR(100) NOT NULL,

    storage_path TEXT NOT NULL,

    mime_type VARCHAR(150),

    taille_octets BIGINT,

    hash_sha256 VARCHAR(64),

    latitude NUMERIC(9,6),

    longitude NUMERIC(9,6),

    precision_gps NUMERIC(10,2),

    pris_le TIMESTAMP WITH TIME ZONE NOT NULL,

    recu_le TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    cree_par UUID NOT NULL,

    operation_id UUID NOT NULL,

    cree_le TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT preuves_collecte_organisation_fk
        FOREIGN KEY (organisation_id)
        REFERENCES organisations(id),

    CONSTRAINT preuves_collecte_mission_fk
        FOREIGN KEY (mission_id)
        REFERENCES missions(id),

    CONSTRAINT preuves_collecte_collecte_fk
        FOREIGN KEY (collecte_id)
        REFERENCES collectes(id),

    CONSTRAINT preuves_collecte_utilisateur_fk
        FOREIGN KEY (cree_par)
        REFERENCES utilisateurs(id),

    CONSTRAINT preuves_collecte_operation_unique
        UNIQUE (operation_id),

    CONSTRAINT preuves_collecte_latitude_valide
        CHECK (
            latitude IS NULL
            OR (
                latitude >= -90
                AND latitude <= 90
            )
        ),

    CONSTRAINT preuves_collecte_longitude_valide
        CHECK (
            longitude IS NULL
            OR (
                longitude >= -180
                AND longitude <= 180
            )
        ),

    CONSTRAINT preuves_collecte_precision_valide
        CHECK (
            precision_gps IS NULL
            OR precision_gps >= 0
        ),

    CONSTRAINT preuves_collecte_taille_valide
        CHECK (
            taille_octets IS NULL
            OR taille_octets >= 0
        )
);


CREATE INDEX IF NOT EXISTS
    preuves_collecte_mission_idx
ON preuves_collecte(mission_id);


CREATE INDEX IF NOT EXISTS
    preuves_collecte_collecte_idx
ON preuves_collecte(collecte_id);


CREATE INDEX IF NOT EXISTS
    preuves_collecte_organisation_idx
ON preuves_collecte(organisation_id);


CREATE INDEX IF NOT EXISTS
    preuves_collecte_pris_le_idx
ON preuves_collecte(pris_le);



COMMIT;