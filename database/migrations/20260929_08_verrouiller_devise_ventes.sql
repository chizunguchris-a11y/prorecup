-- Verrouillage final de la devise des ventes.
-- Toutes les ventes doivent maintenant porter explicitement
-- un code devise valide.

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM ventes
        WHERE devise IS NULL
           OR devise !~ '^[A-Z]{3}$'
    ) THEN

        RAISE EXCEPTION
            'Impossible de verrouiller ventes.devise : donnees invalides ou NULL.';

    END IF;

END
$$;

ALTER TABLE ventes
    ALTER COLUMN devise SET NOT NULL;

COMMENT ON COLUMN ventes.devise IS
    'Code ISO alphabetique sur 3 lettres de la devise propre a la vente.';
