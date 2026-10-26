"""Build an isolated transaction test. All tables and changes are rolled back."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[2]
setup = """
BEGIN;
SET LOCAL statement_timeout = '20s';
CREATE TEMP TABLE orders (LIKE public.orders INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
"""
for table in ['product_listings', 'product_variants', 'product_variant_sizes', 'product_listing_sizes', 'pre_order_products', 'pre_order_windows', 'coupons']:
    setup += f'CREATE TEMP TABLE {table} AS SELECT * FROM public.{table} WITH NO DATA;\n'
setup += """
DO $clone$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace AND proname = 'validate_coupon'
    AND pronargs = 5;
  IF definition IS NULL THEN RAISE EXCEPTION 'Size-aware coupon validator not found'; END IF;
  definition := replace(definition, 'public.', 'pg_temp.');
  definition := replace(definition, 'SET search_path TO ''public''', 'SET search_path TO ''pg_temp''');
  EXECUTE definition;
END;
$clone$;
"""
for name in ['20261026041759_partial_cod_payment_foundation.sql', '20261026042248_partial_cod_checkout.sql']:
    migration = (root / 'supabase/migrations' / name).read_text()
    migration = re.sub(r'^(BEGIN|COMMIT);\s*$', '', migration, flags=re.M)
    setup += migration.replace('public.', 'pg_temp.').replace('checkout_private', 'cod_checkout_test')
setup += """
INSERT INTO pg_temp.product_listings (id, user_id, price, shipping_charges, status, size_value, slug, delivery_days)
VALUES ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 10000, 0, 'active', '9', 'cod-test', '5-7');
DO $tests$
DECLARE
  address jsonb := '{"full_name":"Test Buyer","phone":"9999999999","email":"test@example.invalid","address_line1":"Test address","city":"Test","state":"Test","pincode":"110001"}';
  items jsonb := '[{"product_id":"10000000-0000-0000-0000-000000000001","size":"9","quantity":1}]';
  count_before integer; caught boolean; result record;
BEGIN
  PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000001', items, address, 10000);
  SELECT sum(payment_total) AS total, sum(advance_amount) AS advance, sum(cod_amount) AS cod, sum(cod_fee) AS fee INTO result FROM pg_temp.orders;
  IF (result.total, result.advance, result.cod, result.fee) IS DISTINCT FROM (10100::numeric,7070::numeric,3030::numeric,100::numeric) THEN
    RAISE EXCEPTION 'Incorrect split: %', result;
  END IF;
  PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000001', items, address, 10000);
  IF (SELECT count(*) FROM pg_temp.orders) <> 1 THEN RAISE EXCEPTION 'Retry duplicated orders'; END IF;
  caught := false;
  BEGIN
    PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000002', items, address, 9999);
  EXCEPTION WHEN raise_exception THEN caught := true; END;
  IF NOT caught OR (SELECT count(*) FROM pg_temp.orders) <> 1 THEN RAISE EXCEPTION 'Price mismatch did not roll back'; END IF;
  caught := false;
  BEGIN
    PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000003', items || items, address, 20000);
  EXCEPTION WHEN raise_exception THEN caught := true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Duplicate lines bypassed inventory'; END IF;

  INSERT INTO pg_temp.product_listing_sizes(listing_id, size_value, price, quantity, is_instant_ship, is_sold)
    VALUES ('10000000-0000-0000-0000-000000000001', '9', 999.99, 10, true, false);
  UPDATE pg_temp.product_listings SET shipping_charges = 50;
  items := jsonb_set(items, '{0,quantity}', '3');
  PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000004', items, address, 3149.97);
  SELECT count(*) AS units, sum(payment_total) AS total, sum(advance_amount) AS advance, sum(cod_amount) AS cod, sum(cod_fee) AS fee
    INTO result FROM pg_temp.orders WHERE checkout_id = '30000000-0000-0000-0000-000000000004';
  IF (result.units,result.total,result.advance,result.cod,result.fee) IS DISTINCT FROM (3::bigint,3250::numeric,2275::numeric,975::numeric,100::numeric) THEN
    RAISE EXCEPTION 'Multi-unit rounding or fee wrong: %', result;
  END IF;
  INSERT INTO pg_temp.coupons(id,code,type,value,is_active,used_count,instant_ship_only)
    VALUES ('40000000-0000-0000-0000-000000000001','CODTEST','flat',500,true,0,false);
  PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000005', items, address, 2649.97, 'CODTEST');
  SELECT sum(payment_total) AS total, sum(advance_amount) AS advance, sum(cod_amount) AS cod, sum(cod_fee) AS fee
    INTO result FROM pg_temp.orders WHERE checkout_id = '30000000-0000-0000-0000-000000000005';
  IF (result.total,result.advance,result.cod,result.fee) IS DISTINCT FROM (2750::numeric,1925::numeric,825::numeric,100::numeric) THEN
    RAISE EXCEPTION 'Coupon allocation wrong: %', result;
  END IF;
  IF (SELECT count(*) FROM pg_temp.orders WHERE checkout_id='30000000-0000-0000-0000-000000000005' AND coupon_id IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'Coupon must be attached once per checkout';
  END IF;
  INSERT INTO pg_temp.product_variants(id,listing_id,color_name,price)
    VALUES ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Test color',2500);
  INSERT INTO pg_temp.product_variant_sizes(variant_id,size_value,price,quantity,is_instant_ship,is_sold)
    VALUES ('50000000-0000-0000-0000-000000000001','9',2000,2,true,false);
  items := '[{"product_id":"10000000-0000-0000-0000-000000000001","variant_id":"50000000-0000-0000-0000-000000000001","size":"9","quantity":1}]';
  PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000006',items,address,2050);
  IF (SELECT payment_total FROM pg_temp.orders WHERE checkout_id='30000000-0000-0000-0000-000000000006') <> 2150 THEN
    RAISE EXCEPTION 'Variant size price was not used';
  END IF;
  caught := false;
  BEGIN
    PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000007',jsonb_set(items,'{0,size}','"10"'),address,2050);
  EXCEPTION WHEN raise_exception THEN caught := true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Missing variant size was accepted'; END IF;
  caught := false;
  BEGIN
    PERFORM * FROM pg_temp.create_partial_cod_checkout('30000000-0000-0000-0000-000000000001',items,address,2050);
  EXCEPTION WHEN raise_exception THEN caught := true; END;
  IF NOT caught THEN RAISE EXCEPTION 'Request ID accepted different checkout details'; END IF;
END;
$tests$;
DO $grant_temp$ BEGIN
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon', pg_my_temp_schema()::regnamespace::text);
END; $grant_temp$;
SET LOCAL ROLE anon;
SELECT count(*) AS guest_order_count FROM pg_temp.create_partial_cod_checkout(
  '30000000-0000-0000-0000-000000000008',
  '[{"product_id":"10000000-0000-0000-0000-000000000001","variant_id":"50000000-0000-0000-0000-000000000001","size":"9","quantity":1}]',
  '{"full_name":"Test Buyer","phone":"9999999999","email":"test@example.invalid","address_line1":"Test address","city":"Test","state":"Test","pincode":"110001"}',2050);
RESET ROLE;
SELECT 'partial COD database tests passed' AS result;
ROLLBACK;
"""
print(setup)
