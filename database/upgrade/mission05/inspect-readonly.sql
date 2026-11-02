-- Mission 05 reconstruction: catalogue only; no schema/data modifications.
-- Review the target first. Never use this to justify automatic upgrades.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name,
       current_user AS connected_as,
       current_setting('server_version') AS postgres_version;

-- Tables and columns relevant to the missing canonical contract.
SELECT table_schema, table_name, column_name, data_type,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_name IN (
    'organisations', 'roles', 'utilisateurs', 'agents',
    'sites_de_collecte', 'clients', 'collectes',
    'missions', 'mission_evenements', 'pesees', 'lots',
    'contenants', 'stocks', 'ventes', 'refresh_tokens'
  )
ORDER BY table_schema, table_name, ordinal_position;

-- Check actual roles/indexes, not assumptions from old migration names.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       con.conname AS constraint_name,
       con.contype AS constraint_type,
       con.convalidated AS validated,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY schema_name, table_name, constraint_name;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog','information_schema')
ORDER BY schemaname, tablename, indexname;

SELECT n.nspname AS schema_name, c.relname AS table_name,
       t.tgname AS trigger_name, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal
  AND n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY schema_name, table_name, trigger_name;
COMMIT;
