BEGIN;

ALTER TABLE collectes
    DROP CONSTRAINT IF EXISTS
    collectes_poids_reel_valide;

ALTER TABLE collectes
    ADD CONSTRAINT
    collectes_poids_reel_valide
    CHECK
    (
        poids_reel IS NULL
        OR poids_reel >= 0
    );


ALTER TABLE collectes
    ADD COLUMN IF NOT EXISTS
    resultat_terrain VARCHAR(30);

ALTER TABLE collectes
    ADD COLUMN IF NOT EXISTS
    motif_terrain TEXT;


ALTER TABLE collectes
    DROP CONSTRAINT IF EXISTS
    collectes_resultat_terrain_valide;

ALTER TABLE collectes
    ADD CONSTRAINT
    collectes_resultat_terrain_valide
    CHECK
    (
        resultat_terrain IS NULL
        OR resultat_terrain IN
        (
            'collectee',
            'partielle',
            'aucune_matiere',
            'non_collectee'
        )
    );

COMMIT;