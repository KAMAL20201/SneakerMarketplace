"""Generate rollback-only admin receipt tests using temporary tables and functions."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import re
import runpy
root = Path(__file__).resolve().parents[2]
with redirect_stdout(StringIO()):
    base = runpy.run_path(str(root / 'supabase/tests/build_partial_cod_test.py'))['setup']
base = base.rsplit('ROLLBACK;', 1)[0]
setup = """
CREATE TEMP TABLE admin_users AS SELECT * FROM public.admin_users WITH NO DATA;
CREATE TEMP TABLE coupon_usages AS SELECT * FROM public.coupon_usages WITH NO DATA;
CREATE SCHEMA cod_inventory_test;
GRANT USAGE ON SCHEMA cod_inventory_test TO authenticated;
DO $stock_clone$
DECLARE definition text;
BEGIN
  FOR definition IN SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
    WHERE (n.nspname='public' AND p.proname IN ('adjust_size_quantity','confirm_order_payment'))
      OR (n.nspname='inventory_private' AND p.proname IN ('sync_listing_stock','adjust_order_stock','apply_order_stock')) LOOP
    definition := replace(replace(definition,'public.','pg_temp.'),'inventory_private.','cod_inventory_test.');
    EXECUTE definition;
  END LOOP;
END; $stock_clone$;
UPDATE pg_temp.product_variant_sizes SET id=gen_random_uuid() WHERE id IS NULL;
UPDATE pg_temp.product_listing_sizes SET id=gen_random_uuid() WHERE id IS NULL;
CREATE TRIGGER apply_order_stock BEFORE INSERT OR UPDATE ON pg_temp.orders
  FOR EACH ROW EXECUTE FUNCTION cod_inventory_test.apply_order_stock();
"""
migration = (root / 'supabase/migrations/20261026043953_partial_cod_admin_payments.sql').read_text()
migration = re.sub(r'^(BEGIN|COMMIT);\s*$', '', migration, flags=re.M)
setup += migration.replace('public.', 'pg_temp.').replace('checkout_private', 'cod_checkout_test')
setup += """
INSERT INTO pg_temp.admin_users(user_id) VALUES ('90000000-0000-0000-0000-000000000001');
DO $grant_temp$ BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated',pg_my_temp_schema()::regnamespace::text);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA %I TO authenticated',pg_my_temp_schema()::regnamespace::text);
END; $grant_temp$;
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $admin_tests$
DECLARE target uuid; anchor uuid; result jsonb; caught boolean; stock_before integer; failed_order uuid := gen_random_uuid();
BEGIN
  SELECT id INTO target FROM pg_temp.orders WHERE checkout_id='30000000-0000-0000-0000-000000000005' AND checkout_line=2;
  SELECT id INTO anchor FROM pg_temp.orders WHERE checkout_id='30000000-0000-0000-0000-000000000005' AND checkout_line=1;
  SELECT quantity INTO stock_before FROM pg_temp.product_listing_sizes WHERE size_value='9';
  result := pg_temp.record_partial_cod_payment(target,'advance');
  IF NOT (result->>'recorded')::boolean OR result->'order'->>'advance_received_at' IS NULL
    OR result->'order'->>'cod_collected_at' IS NOT NULL OR result->'order'->>'status' <> 'confirmed' THEN
    RAISE EXCEPTION 'Advance was not recorded separately';
  END IF;
  IF (SELECT quantity FROM pg_temp.product_listing_sizes WHERE size_value='9') <> stock_before-1 THEN RAISE EXCEPTION 'Stock not deducted'; END IF;
  IF (SELECT used_count FROM pg_temp.coupons WHERE code='CODTEST') <> 1 THEN RAISE EXCEPTION 'Group coupon not redeemed'; END IF;
  result := pg_temp.record_partial_cod_payment(target,'advance');
  IF (result->>'recorded')::boolean THEN RAISE EXCEPTION 'Repeated advance not idempotent'; END IF;
  IF (SELECT quantity FROM pg_temp.product_listing_sizes WHERE size_value='9') <> stock_before-1 THEN RAISE EXCEPTION 'Repeated deduction'; END IF;
  PERFORM pg_temp.record_partial_cod_payment(anchor,'advance');
  IF (SELECT used_count FROM pg_temp.coupons WHERE code='CODTEST') <> 1
    OR (SELECT count(*) FROM pg_temp.coupon_usages) <> 1 THEN RAISE EXCEPTION 'Group coupon redeemed twice'; END IF;
  IF (SELECT sum(payment_total) FROM pg_temp.orders WHERE checkout_id='30000000-0000-0000-0000-000000000005') <> 2750 THEN
    RAISE EXCEPTION 'Coupon changed saved total';
  END IF;
  caught := false;
  BEGIN PERFORM pg_temp.record_partial_cod_payment(target,'cod'); EXCEPTION WHEN raise_exception THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'COD collected before shipping'; END IF;
  UPDATE pg_temp.orders SET status='shipped' WHERE id=target;
  result := pg_temp.record_partial_cod_payment(target,'cod');
  IF NOT (result->>'recorded')::boolean OR result->'order'->>'cod_collected_at' IS NULL OR result->'order'->>'status' <> 'shipped' THEN
    RAISE EXCEPTION 'COD receipt missing or changed fulfillment status';
  END IF;
  result := pg_temp.record_partial_cod_payment(target,'cod');
  IF (result->>'recorded')::boolean THEN RAISE EXCEPTION 'Repeated COD not idempotent'; END IF;
  UPDATE pg_temp.orders SET status='delivered' WHERE id=anchor;
  IF (SELECT cod_collected_at FROM pg_temp.orders WHERE id=anchor) IS NOT NULL THEN RAISE EXCEPTION 'Delivery marked COD paid'; END IF;
  caught:=false;
  BEGIN UPDATE pg_temp.orders SET advance_received_at=NULL WHERE id=anchor; EXCEPTION WHEN raise_exception THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Receipt erased'; END IF;
  caught:=false;
  BEGIN UPDATE pg_temp.orders SET payment_total=payment_total+1, cod_amount=cod_amount+1 WHERE id=anchor; EXCEPTION WHEN raise_exception THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Saved quote modified'; END IF;

  INSERT INTO pg_temp.coupons(id,code,type,value,is_active,used_count,instant_ship_only)
    VALUES ('40000000-0000-0000-0000-000000000009','STOCKFAIL','flat',10,true,0,false);
  INSERT INTO pg_temp.orders(id,seller_id,product_id,amount,status,ordered_size,payment_type,payment_total,cod_fee,advance_amount,cod_amount,coupon_id,discount_amount)
    VALUES(failed_order,'20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',100,'pending_payment','9','partial_cod',200,100,140,60,'40000000-0000-0000-0000-000000000009',10);
  -- Plain confirmation cannot bypass advance recording.
  caught:=false;
  BEGIN PERFORM pg_temp.confirm_order_payment(failed_order); EXCEPTION WHEN raise_exception THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Plain confirmation bypassed advance'; END IF;
  UPDATE pg_temp.product_listing_sizes SET quantity=0 WHERE size_value='9';
  caught:=false;
  BEGIN PERFORM pg_temp.record_partial_cod_payment(failed_order,'advance'); EXCEPTION WHEN raise_exception THEN caught:=true; END;
  IF NOT caught OR (SELECT advance_received_at FROM pg_temp.orders WHERE id=failed_order) IS NOT NULL
    OR (SELECT used_count FROM pg_temp.coupons WHERE code='STOCKFAIL') <> 0
    OR EXISTS(SELECT 1 FROM pg_temp.coupon_usages WHERE order_id=failed_order) THEN RAISE EXCEPTION 'Stock failure did not roll back coupon and receipt'; END IF;
  UPDATE pg_temp.orders SET status='cancelled' WHERE id=failed_order;
  caught:=false;
  BEGIN PERFORM pg_temp.record_partial_cod_payment(failed_order,'advance'); EXCEPTION WHEN raise_exception THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Cancelled order accepted payment'; END IF;

  -- Prepaid confirmation keeps its existing stock behavior.
  INSERT INTO pg_temp.orders(id,seller_id,product_id,variant_id,ordered_size,amount,status)
    VALUES('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','9',2000,'pending_payment');
  IF NOT pg_temp.confirm_order_payment('60000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Prepaid confirmation failed'; END IF;
  IF (SELECT advance_received_at FROM pg_temp.orders WHERE id='60000000-0000-0000-0000-000000000001') IS NOT NULL THEN RAISE EXCEPTION 'Prepaid marked partial'; END IF;
END; $admin_tests$;
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000002',true);
DO $permissions$
DECLARE caught boolean:=false; target uuid;
BEGIN
  SELECT id INTO target FROM pg_temp.orders WHERE checkout_id='30000000-0000-0000-0000-000000000004' LIMIT 1;
  BEGIN PERFORM pg_temp.record_partial_cod_payment(target,'advance'); EXCEPTION WHEN raise_exception THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Non-admin recorded payment'; END IF;
  caught:=false;
  BEGIN UPDATE pg_temp.orders SET advance_received_at=now() WHERE id=target; EXCEPTION WHEN raise_exception THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Non-admin changed receipt directly'; END IF;
END; $permissions$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT count(*) AS guarded_guest_order FROM pg_temp.create_partial_cod_checkout(
  '30000000-0000-0000-0000-000000000099',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","variant_id":"50000000-0000-0000-0000-000000000001","size":"9","quantity":1}]',
  '{"full_name":"Test Buyer","phone":"9999999999","email":"test@example.invalid","address_line1":"Test address","city":"Test","state":"Test","pincode":"110001"}',2050);
DO $anon_permissions$
DECLARE caught boolean:=false;
BEGIN
  BEGIN PERFORM pg_temp.record_partial_cod_payment('60000000-0000-0000-0000-000000000001','advance');
    EXCEPTION WHEN insufficient_privilege THEN caught:=true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Anonymous payment access was not revoked'; END IF;
END; $anon_permissions$;
RESET ROLE;
SELECT 'partial COD admin database tests passed' AS result;
ROLLBACK;
"""
print(base + setup)
