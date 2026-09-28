BEGIN;

ALTER TABLE ventes
    ADD COLUMN devise VARCHAR(3);

UPDATE ventes v
SET devise = UPPER(o.devise)
FROM organisations o
WHERE o.id = v.organisation_id
  AND v.devise IS NULL;

-- L'UPDATE déclenche un constraint trigger différé sur ventes.
-- On force son exécution avant les opérations DDL suivantes.
SET CONSTRAINTS ventes_allocations_complete_verification IMMEDIATE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM ventes
        WHERE devise IS NULL
    ) THEN
        RAISE EXCEPTION
            'Migration multidevise impossible : certaines ventes existantes n''ont pas pu recevoir de devise.';
    END IF;
END
$$;

ALTER TABLE ventes
    ADD CONSTRAINT ventes_devise_format_valide
    CHECK (
        devise IS NULL
        OR devise ~ '^[A-Z]{3}$'
    );

COMMENT ON COLUMN ventes.devise IS
    'Devise ISO 4217 de la vente, figée lors de son enregistrement.';

COMMIT;
