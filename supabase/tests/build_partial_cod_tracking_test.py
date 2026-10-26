"""Isolated customer tracking regression: temporary fixtures, always rolled back."""
from pathlib import Path
root = Path(__file__).resolve().parents[2]
print("BEGIN; SET LOCAL statement_timeout='20s';")
for table in ['orders', 'product_listings', 'product_variants', 'product_images', 'admin_users']:
    print(f'CREATE TEMP TABLE {table} AS SELECT * FROM public.{table} WITH NO DATA;')
print('CREATE TEMP TABLE order_tracking_tokens(token uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE, email text);')
print('ALTER TABLE pg_temp.orders ADD COLUMN IF NOT EXISTS checkout_id uuid;')
print('CREATE SCHEMA cod_tracking_test; GRANT USAGE ON SCHEMA cod_tracking_test TO anon, authenticated;')
for name in ['20261026041759_partial_cod_payment_foundation.sql','20261026050134_partial_cod_customer_tracking.sql']:
    sql = (root/'supabase/migrations'/name).read_text().replace('BEGIN;', '').replace('COMMIT;', '')
    print(sql.replace('public.', 'pg_temp.').replace('checkout_private', 'cod_tracking_test'))
print("""
INSERT INTO pg_temp.product_listings(id,title) VALUES ('10000000-0000-0000-0000-000000000001','Test sneaker');
INSERT INTO pg_temp.orders(id,product_id,status,amount,buyer_email,shipping_address,payment_type,payment_total,cod_fee,advance_amount,cod_amount)
VALUES ('a1234567-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','pending_payment',10000,'buyer@example.invalid','{}','partial_cod',10100,100,7070,3030),
('b1234567-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','confirmed',1000,'buyer@example.invalid','{}','prepaid',NULL,0,NULL,NULL),
('c1234567-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','pending_payment',1000,'buyer@example.invalid','{}','prepaid',NULL,0,NULL,NULL);
SET LOCAL ROLE anon;
DO $test$
DECLARE token uuid; result jsonb; caught boolean := false;
BEGIN
 token := pg_temp.lookup_order_tracking_token('#A1234567', ' BUYER@example.invalid ');
 IF token IS NULL THEN RAISE EXCEPTION 'Pending partial order not found'; END IF;
 result := pg_temp.get_order_tracking_details(token);
 IF result->>'order_status' <> 'pending_payment' OR (result->>'advance_amount')::numeric <> 7070 OR (result->>'cod_amount')::numeric <> 3030 OR result->>'advance_received_at' IS NOT NULL THEN RAISE EXCEPTION 'Incorrect pending snapshot: %',result; END IF;
 IF pg_temp.lookup_order_tracking_token('a1234567','wrong@example.invalid') IS NOT NULL OR pg_temp.lookup_order_tracking_token('%','buyer@example.invalid') IS NOT NULL OR pg_temp.lookup_order_tracking_token('','buyer@example.invalid') IS NOT NULL THEN RAISE EXCEPTION 'Invalid lookup allowed'; END IF;
 IF pg_temp.get_order_tracking_details(gen_random_uuid()) IS NOT NULL THEN RAISE EXCEPTION 'Invalid token allowed'; END IF;
 IF pg_temp.lookup_order_tracking_token('c1234567','buyer@example.invalid') IS NOT NULL THEN RAISE EXCEPTION 'Pending prepaid behavior changed'; END IF;
 token := pg_temp.lookup_order_tracking_token('b1234567','buyer@example.invalid');
 result := pg_temp.get_order_tracking_details(token);
 IF (result->>'amount')::numeric <> 1000 OR result->>'payment_type' <> 'prepaid' THEN RAISE EXCEPTION 'Legacy prepaid broken'; END IF;
 BEGIN PERFORM pg_temp.create_order_tracking_token('a1234567-0000-0000-0000-000000000001','wrong@example.invalid'); EXCEPTION WHEN insufficient_privilege THEN caught := true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Guest bypassed email check'; END IF;
END; $test$;
RESET ROLE;
UPDATE pg_temp.orders SET status='delivered',advance_received_at=now() WHERE payment_type='partial_cod';
DO $test$
DECLARE result jsonb;
BEGIN
 result := pg_temp.get_order_tracking_details(pg_temp.lookup_order_tracking_token('a1234567','buyer@example.invalid'));
 IF result->>'advance_received_at' IS NULL OR result->>'cod_collected_at' IS NOT NULL THEN RAISE EXCEPTION 'Delivery incorrectly implies fully paid'; END IF;
END; $test$;
UPDATE pg_temp.orders SET cod_collected_at=now() WHERE payment_type='partial_cod';
DO $test$
BEGIN
 IF pg_temp.get_order_tracking_details(pg_temp.lookup_order_tracking_token('a1234567','buyer@example.invalid'))->>'cod_collected_at' IS NULL THEN RAISE EXCEPTION 'COD receipt omitted'; END IF;
END; $test$;
UPDATE pg_temp.orders SET status='cancelled' WHERE payment_type='partial_cod';
DO $test$
BEGIN
 IF pg_temp.lookup_order_tracking_token('a1234567','buyer@example.invalid') IS NOT NULL OR pg_temp.get_order_tracking_details((SELECT token FROM pg_temp.order_tracking_tokens WHERE order_id='a1234567-0000-0000-0000-000000000001')) IS NOT NULL THEN RAISE EXCEPTION 'Cancelled order exposed'; END IF;
END; $test$;
UPDATE pg_temp.orders SET is_deleted=true WHERE id='b1234567-0000-0000-0000-000000000001';
DO $test$
BEGIN
 IF pg_temp.lookup_order_tracking_token('b1234567','buyer@example.invalid') IS NOT NULL THEN RAISE EXCEPTION 'Deleted order exposed'; END IF;
END; $test$;
SET LOCAL ROLE authenticated;
DO $test$
DECLARE caught boolean := false;
BEGIN
 BEGIN PERFORM pg_temp.create_order_tracking_token('a1234567-0000-0000-0000-000000000001','test@example.invalid'); EXCEPTION WHEN insufficient_privilege THEN caught := true; END;
 IF NOT caught THEN RAISE EXCEPTION 'Non-admin minted token'; END IF;
END; $test$;
RESET ROLE;
INSERT INTO pg_temp.admin_users(user_id) VALUES ('20000000-0000-0000-0000-000000000001');
GRANT SELECT ON pg_temp.admin_users TO authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
 IF pg_temp.create_order_tracking_token('b1234567-0000-0000-0000-000000000001','buyer@example.invalid') IS NULL THEN RAISE EXCEPTION 'Admin confirmation link broken'; END IF;
END; $test$;
RESET ROLE;
SELECT 'Customer tracking: pending, receipt states, legacy prepaid, invalid credentials, hidden orders and admin access passed' AS result;
ROLLBACK;
""")
