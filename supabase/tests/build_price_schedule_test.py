"""Generate a rollback-only integration test using isolated temporary fixtures.

Usage: python3 supabase/tests/build_price_schedule_test.py > /tmp/price-schedule-test.sql
Run that SQL using a PostgreSQL connection with Supabase roles and auth.uid().
No production product, schedule, Vault secret or Cron job is read or changed.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
migration = (root / "supabase/migrations/20261019064914_scheduled_price_changes.sql").read_text()
migration += "\n" + (root / "supabase/migrations/20261019072246_edit_pending_price_schedules.sql").read_text()
migration = migration.replace("CREATE SCHEMA IF NOT EXISTS pricing_private;", "")
migration = migration.replace("GRANT USAGE ON SCHEMA pricing_private TO authenticated, service_role;", "")
migration = migration.replace("pricing_private.", "pg_temp.").replace("public.", "pg_temp.")
migration = migration.replace("IN SCHEMA pricing_private", "IN SCHEMA pg_temp")
migration = migration.replace("REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pg_temp FROM PUBLIC, anon;", "")
migration = migration.replace("CREATE TABLE pg_temp.scheduled_price_changes", "CREATE TEMP TABLE scheduled_price_changes")
migration = migration.replace("REFERENCES auth.users(id) ON DELETE SET NULL", "")
migration = migration.replace("vault.decrypted_secrets", "pg_temp.decrypted_secrets")

print("""
BEGIN;
CREATE TEMP TABLE admin_users (user_id uuid PRIMARY KEY);
CREATE TEMP TABLE product_listings (
  id uuid PRIMARY KEY, title text, price numeric, preorder_price numeric,
  status text DEFAULT 'active', is_deleted boolean DEFAULT false, updated_at timestamptz
);
CREATE TEMP TABLE product_variants (id uuid PRIMARY KEY, listing_id uuid REFERENCES product_listings, price numeric);
CREATE TEMP TABLE product_listing_sizes (id uuid PRIMARY KEY, listing_id uuid REFERENCES product_listings, price numeric, quantity integer DEFAULT 3);
CREATE TEMP TABLE product_variant_sizes (id uuid PRIMARY KEY, variant_id uuid REFERENCES product_variants, price numeric CHECK (price < 20000), quantity integer DEFAULT 2);
CREATE TEMP TABLE decrypted_secrets (name text, decrypted_secret text);
INSERT INTO decrypted_secrets VALUES ('price_scheduler_token', repeat('t', 64));
INSERT INTO admin_users VALUES ('10000000-0000-0000-0000-000000000001');
INSERT INTO product_listings (id, title, price, preorder_price)
SELECT ('20000000-0000-0000-0000-' || lpad(number::text, 12, '0'))::uuid, 'Fixture ' || number, 100, CASE WHEN number = 1 THEN 90 END
FROM generate_series(1,8) number;
INSERT INTO product_variants VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', NULL),
('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 100);
INSERT INTO product_variant_sizes (id, variant_id, price) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 100),
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 100);
INSERT INTO product_listing_sizes (id, listing_id, price) VALUES
('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 110),
('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 100);
DO $bootstrap$
DECLARE temp_schema text := pg_my_temp_schema()::regnamespace::text;
BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated, service_role, anon', temp_schema);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA %I TO authenticated, service_role', temp_schema);
END;
$bootstrap$;
""")
print(migration)
print("""
CREATE FUNCTION pg_temp.assert(p_ok boolean, p_message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF p_ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Test failed: %', p_message; END IF; END;
$$;
CREATE FUNCTION pg_temp.expect_error(p_sql text, p_message text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE caught boolean := false;
BEGIN
  BEGIN EXECUTE p_sql; EXCEPTION WHEN OTHERS THEN caught := true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Expected rejection: %', p_message; END IF;
END;
$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000001"}', true);
INSERT INTO pg_temp.scheduled_price_changes (listing_id, new_price, effective_at)
SELECT id, CASE WHEN title = 'Fixture 5' THEN 30000 ELSE 200 END, now() + interval '1 day'
FROM pg_temp.product_listings;
SELECT pg_temp.assert((SELECT count(*) = 8 FROM pg_temp.scheduled_price_changes), 'admin creates schedules');
SELECT pg_temp.assert((SELECT previous_price = 100 AND product_title = 'Fixture 1' AND created_by = auth.uid() AND expected_prices IS NOT NULL
 FROM pg_temp.scheduled_price_changes WHERE product_title = 'Fixture 1'), 'server captures audit and snapshot');
SELECT pg_temp.expect_error($q$INSERT INTO pg_temp.scheduled_price_changes (listing_id,new_price,effective_at)
 VALUES ('20000000-0000-0000-0000-000000000001',300,now()+interval '1 day')$q$, 'duplicate pending');
UPDATE pg_temp.scheduled_price_changes SET new_price=250, effective_at=now()+interval '2 days' WHERE product_title='Fixture 1';
SELECT pg_temp.assert((SELECT new_price=250 AND effective_at=now()+interval '2 days' AND previous_price=100 AND expected_prices=pg_temp.price_snapshot(listing_id)
  FROM pg_temp.scheduled_price_changes WHERE product_title='Fixture 1'), 'admin edits price/time while preserving original snapshot');
SELECT pg_temp.assert((SELECT scheduled_price_notice->>'new_price'='250' FROM pg_temp.product_listings WHERE title='Fixture 1'), 'notice follows edits');
UPDATE pg_temp.scheduled_price_changes SET new_price=200 WHERE product_title='Fixture 1';
SELECT pg_temp.expect_error($q$UPDATE pg_temp.scheduled_price_changes SET product_title='Forged title' WHERE product_title='Fixture 1'$q$, 'immutable schedule identity');
SELECT pg_temp.expect_error($q$UPDATE pg_temp.scheduled_price_changes SET expected_prices='{}' WHERE product_title='Fixture 1'$q$, 'immutable price snapshot');
SELECT pg_temp.expect_error($q$UPDATE pg_temp.scheduled_price_changes SET effective_at=now()-interval '1 minute' WHERE product_title='Fixture 1'$q$, 'edited time must be future');
SELECT pg_temp.expect_error($q$UPDATE pg_temp.scheduled_price_changes SET status='applied' WHERE product_title='Fixture 1'$q$, 'admin cannot mark applied');
UPDATE pg_temp.scheduled_price_changes SET status='cancelled' WHERE product_title='Fixture 3';
SELECT pg_temp.assert((SELECT scheduled_price_notice IS NULL FROM pg_temp.product_listings WHERE title='Fixture 3'), 'cancelled notice clears');
SELECT pg_temp.expect_error($q$UPDATE pg_temp.scheduled_price_changes SET new_price=999 WHERE product_title='Fixture 3'$q$, 'cancelled schedule cannot be edited');
SELECT pg_temp.expect_error($q$UPDATE pg_temp.scheduled_price_changes SET status='pending' WHERE product_title='Fixture 3'$q$, 'cannot revive cancelled');
SELECT pg_temp.expect_error($q$INSERT INTO pg_temp.scheduled_price_changes (listing_id,new_price,effective_at)
 VALUES ('20000000-0000-0000-0000-000000000003',300,now()-interval '1 day')$q$, 'past time');
SELECT pg_temp.expect_error($q$INSERT INTO pg_temp.scheduled_price_changes (listing_id,new_price,effective_at)
 VALUES ('20000000-0000-0000-0000-000000000003',-1,now()+interval '1 day')$q$, 'negative price');
SELECT pg_temp.expect_error($q$SELECT pg_temp.process_due_price_changes(repeat('t',64))$q$, 'admin cannot execute worker');
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000002"}', true);
SELECT pg_temp.assert((SELECT count(*)=0 FROM pg_temp.scheduled_price_changes), 'nonadmin cannot read');
UPDATE pg_temp.scheduled_price_changes SET new_price=999;
SELECT pg_temp.expect_error($q$INSERT INTO pg_temp.scheduled_price_changes (listing_id,new_price,effective_at)
 VALUES ('20000000-0000-0000-0000-000000000003',300,now()+interval '1 day')$q$, 'nonadmin cannot create');
RESET ROLE;
UPDATE pg_temp.scheduled_price_changes SET effective_at=now()-interval '1 minute' WHERE product_title <> 'Fixture 6';
UPDATE pg_temp.product_listings SET price=150 WHERE title='Fixture 4';
UPDATE pg_temp.product_listings SET is_deleted=true WHERE title='Fixture 7';
INSERT INTO pg_temp.product_listing_sizes (id,listing_id,price) VALUES
 ('50000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000008',100);
SET LOCAL ROLE service_role;
SELECT pg_temp.expect_error($q$SELECT pg_temp.process_due_price_changes('invalid-token')$q$, 'invalid token');
SELECT pg_temp.assert(pg_temp.process_due_price_changes(repeat('t',64)) = '{"applied":2,"failed":4}'::jsonb, 'worker applies and isolates failures');
SELECT pg_temp.assert(pg_temp.process_due_price_changes(repeat('t',64)) = '{"applied":0,"failed":0}'::jsonb, 'worker is idempotent');
RESET ROLE;
SELECT pg_temp.assert((SELECT price=200 AND preorder_price=200 FROM pg_temp.product_listings WHERE title='Fixture 1'), 'base and preorder prices');
SELECT pg_temp.assert((SELECT price IS NULL FROM pg_temp.product_variants WHERE id='30000000-0000-0000-0000-000000000001'), 'nullable colour price remains nullable');
SELECT pg_temp.assert((SELECT price=200 AND quantity=2 FROM pg_temp.product_variant_sizes WHERE id='40000000-0000-0000-0000-000000000001'), 'size price updated without changing stock');
SELECT pg_temp.assert((SELECT price=200 AND quantity=3 FROM pg_temp.product_listing_sizes WHERE id='50000000-0000-0000-0000-000000000001'), 'legacy sizes updated');
SELECT pg_temp.assert((SELECT price=100 FROM pg_temp.product_listings WHERE title='Fixture 3'), 'cancelled product unchanged');
SELECT pg_temp.assert((SELECT price=150 FROM pg_temp.product_listings WHERE title='Fixture 4'), 'manual price not overwritten');
SELECT pg_temp.assert((SELECT price=100 FROM pg_temp.product_listings WHERE title='Fixture 5'), 'failed write rolls base price back');
SELECT pg_temp.assert((SELECT price=100 FROM pg_temp.product_variants WHERE id='30000000-0000-0000-0000-000000000005'), 'failed write rolls colour price back');
SELECT pg_temp.assert((SELECT status='pending' FROM pg_temp.scheduled_price_changes WHERE product_title='Fixture 6'), 'future stays pending');
SELECT pg_temp.assert((SELECT bool_and(completed_at IS NOT NULL AND error_message IS NOT NULL) FROM pg_temp.scheduled_price_changes WHERE status='failed'), 'failures recorded');
SELECT pg_temp.assert((SELECT scheduled_price_notice IS NULL FROM pg_temp.product_listings WHERE title='Fixture 4'), 'failed notice clears');
SELECT pg_temp.assert((SELECT scheduled_price_notice->>'new_price'='200' FROM pg_temp.product_listings WHERE title='Fixture 1'), 'applied notice remains accurate');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000001"}', true);
SELECT pg_temp.expect_error($q$UPDATE pg_temp.scheduled_price_changes SET new_price=999 WHERE product_title='Fixture 1'$q$, 'applied schedule cannot be edited');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.expect_error($q$SELECT * FROM pg_temp.scheduled_price_changes$q$, 'anon cannot read');
SELECT pg_temp.expect_error($q$SELECT pg_temp.process_due_price_changes(repeat('t',64))$q$, 'anon cannot execute worker');
RESET ROLE;
ROLLBACK;
SELECT 'All price schedule integration checks passed (fixtures rolled back)' AS result;
""")
