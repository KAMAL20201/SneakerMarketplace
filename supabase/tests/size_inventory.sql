-- Run against temporary fixture tables using build_inventory_test.py.
-- All schema and data changes are rolled back; no live product/order rows are used.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
DO $$
DECLARE units integer; was_confirmed boolean;
BEGIN
  IF (SELECT quantity FROM pg_temp.product_variant_sizes WHERE size_value = 'SOLD') <> 1 THEN RAISE EXCEPTION 'Every size must initialize to one'; END IF;
  PERFORM pg_temp.adjust_size_quantity('product_variant_sizes', '30000000-0000-0000-0000-000000000003', -1);
  IF (SELECT quantity FROM pg_temp.product_variant_sizes WHERE size_value = 'UK 8') <> 1 THEN RAISE EXCEPTION 'Available sizes must backfill to one'; END IF;
  units := pg_temp.adjust_size_quantity('product_variant_sizes', '30000000-0000-0000-0000-000000000001', 3);
  IF units <> 4 THEN RAISE EXCEPTION 'Restock must add units'; END IF;
  was_confirmed := pg_temp.confirm_order_payment('40000000-0000-0000-0000-000000000001');
  IF NOT was_confirmed THEN RAISE EXCEPTION 'Pending order must confirm'; END IF;
  IF (SELECT quantity FROM pg_temp.product_variant_sizes WHERE size_value = 'UK 8') <> 3 THEN RAISE EXCEPTION 'Confirmation must deduct one unit'; END IF;
  IF (SELECT is_sold FROM pg_temp.product_variant_sizes WHERE size_value = 'UK 8') THEN RAISE EXCEPTION 'Remaining units must stay available'; END IF;
  IF pg_temp.confirm_order_payment('40000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Repeated confirmation must be a no-op'; END IF;
  IF (SELECT quantity FROM pg_temp.product_variant_sizes WHERE size_value = 'UK 8') <> 3 THEN RAISE EXCEPTION 'Repeated confirmation must not deduct'; END IF;
  BEGIN
    PERFORM pg_temp.adjust_size_quantity('product_variant_sizes', '30000000-0000-0000-0000-000000000001', -4);
    RAISE EXCEPTION 'Negative stock was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Negative stock was accepted' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM pg_temp.adjust_size_quantity('product_variant_sizes', '30000000-0000-0000-0000-000000000001', 2, 4);
    RAISE EXCEPTION 'Stale quantity overwrite was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Stale quantity overwrite was accepted' THEN RAISE; END IF;
  END;
  -- Switching a confirmed order transfers exactly one unit.
  UPDATE pg_temp.orders SET ordered_size = 'UK 9' WHERE id = '40000000-0000-0000-0000-000000000001';
  IF (SELECT quantity FROM pg_temp.product_variant_sizes WHERE size_value = 'UK 8') <> 4 OR
     (SELECT quantity FROM pg_temp.product_variant_sizes WHERE size_value = 'UK 9') <> 0 THEN RAISE EXCEPTION 'Size transfer failed'; END IF;
  -- A failed transfer must leave both the old order and stock untouched.
  BEGIN
    UPDATE pg_temp.orders SET ordered_size = 'SOLD' WHERE id = '40000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'Out-of-stock transfer was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Out-of-stock transfer was accepted' THEN RAISE; END IF;
  END;
  IF (SELECT ordered_size FROM pg_temp.orders WHERE id = '40000000-0000-0000-0000-000000000001') <> 'UK 9' OR
     (SELECT quantity FROM pg_temp.product_variant_sizes WHERE size_value = 'UK 9') <> 0 THEN RAISE EXCEPTION 'Failed transfer did not roll back'; END IF;
  PERFORM pg_temp.adjust_size_quantity('product_variant_sizes', '30000000-0000-0000-0000-000000000001', -4);
  IF (SELECT status FROM pg_temp.product_listings WHERE id = '20000000-0000-0000-0000-000000000001') <> 'sold' THEN RAISE EXCEPTION 'Exhausted listing must be sold'; END IF;
  BEGIN
    PERFORM pg_temp.confirm_order_payment('40000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Out-of-stock confirmation was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Out-of-stock confirmation was accepted' THEN RAISE; END IF;
  END;
  IF (SELECT status FROM pg_temp.orders WHERE id = '40000000-0000-0000-0000-000000000002') <> 'pending_payment' THEN RAISE EXCEPTION 'Failed confirmation changed order'; END IF;
  PERFORM pg_temp.adjust_size_quantity('product_variant_sizes', '30000000-0000-0000-0000-000000000001', 2);
  IF (SELECT status FROM pg_temp.product_listings WHERE id = '20000000-0000-0000-0000-000000000001') <> 'active' THEN RAISE EXCEPTION 'Restocked listing must be active'; END IF;
  PERFORM pg_temp.confirm_order_payment('40000000-0000-0000-0000-000000000003');
  IF (SELECT quantity FROM pg_temp.product_listing_sizes LIMIT 1) <> 0 THEN RAISE EXCEPTION 'Legacy size deduction failed'; END IF;
  -- Direct attempts to reset deduction tracking cannot permit a second deduction.
  UPDATE pg_temp.orders SET stock_deducted = false WHERE id = '40000000-0000-0000-0000-000000000001';
  IF NOT (SELECT stock_deducted FROM pg_temp.orders WHERE id = '40000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Deduction marker reset was accepted'; END IF;
END;
$$;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
DO $$
BEGIN
  BEGIN
    PERFORM pg_temp.adjust_size_quantity('product_variant_sizes', '30000000-0000-0000-0000-000000000001', 1);
    RAISE EXCEPTION 'Non-admin stock adjustment was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Non-admin stock adjustment was accepted' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM pg_temp.confirm_order_payment('40000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Non-admin confirmation was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Non-admin confirmation was accepted' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE pg_temp.product_variant_sizes SET quantity = 9 WHERE size_value = 'UK 8';
    RAISE EXCEPTION 'Non-admin direct stock update was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'Non-admin direct stock update was accepted' THEN RAISE; END IF;
  END;
END;
$$;
RESET ROLE;
ROLLBACK;
SELECT 'Inventory tests passed: quantities, confirmation, retries, insufficient stock, size transfers, restocking, legacy sizes, admin authorization' AS result;
