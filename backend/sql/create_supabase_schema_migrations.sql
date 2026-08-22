-- Fixes dashboard log: 42P01 relation "supabase_migrations.schema_migrations" does not exist
-- The Studio polls this table for CLI migration history. This project loads data via
-- Python (loadData.py), so the table was never created.
--
-- Run in the Supabase Dashboard → SQL Editor (as postgres), then refresh Database → Migrations.

CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);

GRANT USAGE ON SCHEMA supabase_migrations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE supabase_migrations.schema_migrations TO postgres;
