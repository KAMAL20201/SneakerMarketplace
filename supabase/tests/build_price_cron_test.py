"""Check Cron setup with rollback-only temporary Vault/Cron/HTTP mocks.

Usage: python3 supabase/tests/build_price_cron_test.py > /tmp/price-cron-test.sql
No extensions, real secrets, network requests or live Cron jobs are changed.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
migration = (root / "supabase/migrations/20261019064924_price_scheduler_cron.sql").read_text()
migration = migration.replace("CREATE EXTENSION IF NOT EXISTS pg_cron;", "")
migration = migration.replace("CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;", "")
migration = migration.replace("pricing_private.", "pg_temp.")
migration = migration.replace("vault.create_secret", "pg_temp.create_secret").replace("vault.update_secret", "pg_temp.update_secret")
migration = migration.replace("vault.secrets", "pg_temp.secrets").replace("vault.decrypted_secrets", "pg_temp.decrypted_secrets")
migration = migration.replace("cron.schedule", "pg_temp.cron_schedule").replace("net.http_post", "pg_temp.http_post")

print("""
BEGIN;
CREATE TEMP TABLE secrets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE, secret text);
CREATE TEMP VIEW decrypted_secrets AS SELECT id, name, secret AS decrypted_secret FROM secrets;
CREATE TEMP TABLE jobs (name text PRIMARY KEY, schedule text, command text);
CREATE TEMP TABLE requests (url text, headers jsonb, body jsonb, timeout integer);
CREATE FUNCTION pg_temp.create_secret(p_secret text, p_name text) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE secret_id uuid;
BEGIN INSERT INTO pg_temp.secrets(name, secret) VALUES (p_name, p_secret) RETURNING id INTO secret_id; RETURN secret_id; END;
$$;
CREATE FUNCTION pg_temp.update_secret(p_id uuid, p_secret text) RETURNS void LANGUAGE sql AS $$
  UPDATE pg_temp.secrets SET secret=p_secret WHERE id=p_id;
$$;
CREATE FUNCTION pg_temp.cron_schedule(p_name text, p_schedule text, p_command text) RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pg_temp.jobs VALUES(p_name,p_schedule,p_command)
  ON CONFLICT(name) DO UPDATE SET schedule=excluded.schedule, command=excluded.command;
  RETURN 1;
END;
$$;
CREATE FUNCTION pg_temp.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds integer) RETURNS bigint LANGUAGE plpgsql AS $$
BEGIN INSERT INTO pg_temp.requests VALUES(url,headers,body,timeout_milliseconds); RETURN 1; END;
$$;
""")
print(migration)
print("""
SELECT pg_temp.configure_scheduler('https://example.supabase.co/functions/v1/process-price-changes');
SELECT pg_temp.configure_scheduler('https://example.supabase.co/functions/v1/process-price-changes');
DO $$
DECLARE job_command text; token text; caught boolean := false;
BEGIN
  IF (SELECT count(*) FROM pg_temp.jobs) <> 1 THEN RAISE EXCEPTION 'Setup must be idempotent'; END IF;
  IF (SELECT count(*) FROM pg_temp.secrets) <> 2 THEN RAISE EXCEPTION 'Expected URL and token secrets'; END IF;
  SELECT decrypted_secret INTO token FROM pg_temp.decrypted_secrets WHERE name='price_scheduler_token';
  IF length(token) <> 64 THEN RAISE EXCEPTION 'Expected random 256-bit token'; END IF;
  SELECT command INTO job_command FROM pg_temp.jobs WHERE schedule='* * * * *';
  IF job_command IS NULL OR strpos(job_command,token) > 0 THEN RAISE EXCEPTION 'Cron must reference Vault without embedding credentials'; END IF;
  EXECUTE job_command;
  IF NOT EXISTS (SELECT 1 FROM pg_temp.requests WHERE headers->>'x-scheduler-token'=token
    AND url='https://example.supabase.co/functions/v1/process-price-changes' AND timeout=50000) THEN
    RAISE EXCEPTION 'Cron must authenticate the HTTP request';
  END IF;
  BEGIN PERFORM pg_temp.configure_scheduler('https://outside.example/worker'); EXCEPTION WHEN OTHERS THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'External URLs must be rejected'; END IF;
  caught := false;
  BEGIN PERFORM pg_temp.configure_scheduler(NULL); EXCEPTION WHEN OTHERS THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Null URLs must be rejected'; END IF;
  IF has_function_privilege('authenticated', 'pg_temp.configure_scheduler(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Clients cannot configure Cron';
  END IF;
END;
$$;
ROLLBACK;
SELECT 'All price Cron configuration checks passed (fixtures rolled back)' AS result;
""")
