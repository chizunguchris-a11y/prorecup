BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'organisations'
          AND column_name = 'logo'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'organisations'
          AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE organisations RENAME COLUMN logo TO logo_url;
    END IF;
END
$$;

ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS numero_identification VARCHAR(150),
ADD COLUMN IF NOT EXISTS site_web TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMIT;
