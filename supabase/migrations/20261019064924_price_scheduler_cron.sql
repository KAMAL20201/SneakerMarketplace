-- Requires approval to enable the two Supabase scheduling extensions.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Database-owner setup only. The secret is generated and kept in Vault; it is
-- never returned to clients, printed, or embedded in the Cron job definition.
CREATE FUNCTION pricing_private.configure_scheduler(p_function_url text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE secret_id uuid;
BEGIN
  IF p_function_url IS NULL OR p_function_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/process-price-changes$' THEN
    RAISE EXCEPTION 'Enter the deployed Supabase price worker URL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'price_scheduler_token') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'price_scheduler_token');
  END IF;
  SELECT id INTO secret_id FROM vault.secrets WHERE name = 'price_scheduler_url';
  IF secret_id IS NULL THEN
    PERFORM vault.create_secret(p_function_url, 'price_scheduler_url');
  ELSE
    PERFORM vault.update_secret(secret_id, p_function_url);
  END IF;
  PERFORM cron.schedule('apply-scheduled-prices', '* * * * *', $command$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'price_scheduler_url'),
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-scheduler-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'price_scheduler_token')),
      body := '{}'::jsonb,
      timeout_milliseconds := 50000
    );
  $command$);
END;
$$;
REVOKE ALL ON FUNCTION pricing_private.configure_scheduler(text) FROM PUBLIC, anon, authenticated, service_role;
