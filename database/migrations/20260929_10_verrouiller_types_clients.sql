BEGIN;

-- Toutes les données existantes doivent déjà être normalisées
-- avant l'activation de ces contraintes.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM clients
        WHERE type_client IS NULL
           OR type_client NOT IN (
                'entreprise',
                'institution',
                'menage',
                'association',
                'collectivite'
           )
    ) THEN
        RAISE EXCEPTION
            'Impossible de verrouiller clients.type_client : des valeurs invalides subsistent.';
    END IF;
END
$$;

ALTER TABLE clients
ALTER COLUMN type_client SET NOT NULL;

ALTER TABLE clients
DROP CONSTRAINT IF EXISTS clients_type_client_check;

ALTER TABLE clients
ADD CONSTRAINT clients_type_client_check
CHECK (
    type_client IN (
        'entreprise',
        'institution',
        'menage',
        'association',
        'collectivite'
    )
);

COMMIT;
