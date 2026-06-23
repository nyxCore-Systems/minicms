-- provision.sql — one-time setup, run on the server as the Postgres superuser.
--
-- Creates a DEDICATED database + restricted role for e-Ventschau so the
-- public-facing container never holds credentials to the core `nyxcore` DB.
-- Run once (from /opt/nyxcore where the platform compose lives):
--
--   docker compose exec -T postgres psql -U nyxcore -d postgres < provision.sql
--
-- Then set DATABASE_URL for the e-ventschau container (.env):
--   postgresql://eventschau_app:<password>@postgres:5432/eventschau

-- 1. Role (change the password before running).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eventschau_app') THEN
    CREATE ROLE eventschau_app LOGIN PASSWORD 'CHANGE_ME_strong_password';
  END IF;
END
$$;

-- 2. Dedicated database owned by the app role.
--    (CREATE DATABASE can't run inside a transaction; if it already exists
--    psql warns and continues — that's fine.)
\set ON_ERROR_STOP off
CREATE DATABASE eventschau OWNER eventschau_app;
\set ON_ERROR_STOP on

-- 3. Lock the role to its own database only.
REVOKE ALL ON DATABASE eventschau FROM PUBLIC;
GRANT CONNECT ON DATABASE eventschau TO eventschau_app;
