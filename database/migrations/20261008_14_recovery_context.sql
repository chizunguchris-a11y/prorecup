ALTER TABLE account_recovery_requests
ADD COLUMN IF NOT EXISTS
    produit_source VARCHAR(30)
    NOT NULL
    DEFAULT 'inconnu';


DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'ck_account_recovery_produit_source'
    ) THEN

        ALTER TABLE account_recovery_requests
        ADD CONSTRAINT
            ck_account_recovery_produit_source
        CHECK (
            produit_source IN (
                'backoffice',
                'portail_client',
                'agent_terrain',
                'inconnu'
            )
        );

    END IF;

END $$;


CREATE INDEX IF NOT EXISTS
    idx_account_recovery_source
ON account_recovery_requests(
    produit_source,
    statut,
    cree_le
);