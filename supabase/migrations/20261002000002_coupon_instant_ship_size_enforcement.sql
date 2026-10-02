-- ============================================================
-- Enforce size-level instant shipping for coupons
--
-- 1. Adds `instant_ship_only` boolean to `coupons` table.
-- 2. Sets `instant_ship_only = true` on `INSTANTSHIP10`.
-- 3. Updates `validate_coupon` RPC to accept `p_sizes text[]`
--    and verify that each item's selected size has `is_instant_ship = true`
--    (in product_listing_sizes, product_variant_sizes, or delivery_days < 10).
-- ============================================================

-- 1. Add instant_ship_only column to coupons
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS instant_ship_only boolean NOT NULL DEFAULT false;

-- 2. Enable instant_ship_only for INSTANTSHIP10
UPDATE coupons SET instant_ship_only = true WHERE code = 'INSTANTSHIP10';

-- 3. Replace validate_coupon with size-aware version
DROP FUNCTION IF EXISTS public.validate_coupon(text, uuid[], numeric[], numeric);

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code         text,
  p_product_ids  uuid[],
  p_item_amounts numeric[],
  p_order_amount numeric,
  p_sizes        text[] DEFAULT NULL
)
RETURNS TABLE (
  coupon_id              uuid,
  discount_amount        numeric,
  coupon_type            text,
  coupon_value           numeric,
  remaining_uses         integer,
  applicable_product_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon          coupons%ROWTYPE;
  v_sizes           text[];
  v_eligible_amount NUMERIC := 0;
  v_discount        NUMERIC;
  v_remaining       INTEGER;
  v_eligible_count  INTEGER := 0;
  r                 RECORD;
  v_is_instant      BOOLEAN;
  v_is_applicable   BOOLEAN;
BEGIN
  -- 1. Fetch coupon (case-insensitive)
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(p_code);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUPON_NOT_FOUND: Coupon "%" does not exist', p_code;
  END IF;

  -- 2. Active check
  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION 'COUPON_INACTIVE: This coupon is no longer active';
  END IF;

  -- 3. Expiry check
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED: This coupon expired on %',
      TO_CHAR(v_coupon.expires_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY');
  END IF;

  -- 4. Max-uses check
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'COUPON_EXHAUSTED: This coupon has reached its usage limit';
  END IF;

  -- 5. Minimum order amount check (against the full cart total)
  IF v_coupon.min_order_amount IS NOT NULL AND p_order_amount < v_coupon.min_order_amount THEN
    RAISE EXCEPTION 'COUPON_MIN_ORDER: This coupon requires a minimum order of ₹%',
      v_coupon.min_order_amount::INT;
  END IF;

  -- 6. Build sizes array of same length as p_product_ids if NULL
  IF p_sizes IS NULL OR array_length(p_sizes, 1) IS NULL THEN
    v_sizes := array_fill(NULL::text, ARRAY[COALESCE(array_length(p_product_ids, 1), 0)]);
  ELSE
    v_sizes := p_sizes;
  END IF;

  -- 7. Check eligibility item by item
  FOR r IN (
    SELECT t.pid, t.amt, t.sz
    FROM UNNEST(p_product_ids, p_item_amounts, v_sizes) AS t(pid, amt, sz)
  ) LOOP
    -- Product-level check
    IF v_coupon.applicable_product_ids IS NOT NULL THEN
      v_is_applicable := (r.pid = ANY(v_coupon.applicable_product_ids));
    ELSE
      v_is_applicable := TRUE;
    END IF;

    -- Instant ship size check
    IF v_coupon.instant_ship_only THEN
      v_is_instant := (
        -- Check product_listing_sizes
        EXISTS (
          SELECT 1 FROM product_listing_sizes pls
          WHERE pls.listing_id = r.pid
            AND (r.sz IS NULL OR r.sz = '' OR lower(trim(pls.size_value)) = lower(trim(r.sz)))
            AND pls.is_instant_ship = true
            AND pls.is_sold = false
        )
        -- Check product_variant_sizes
        OR EXISTS (
          SELECT 1 FROM product_variant_sizes pvs
          JOIN product_variants pv ON pv.id = pvs.variant_id
          WHERE pv.listing_id = r.pid
            AND (r.sz IS NULL OR r.sz = '' OR lower(trim(pvs.size_value)) = lower(trim(r.sz)))
            AND pvs.is_instant_ship = true
            AND pvs.is_sold = false
        )
        -- Check listing delivery_days (< 10)
        OR EXISTS (
          SELECT 1 FROM product_listings pl
          WHERE pl.id = r.pid
            AND pl.delivery_days IS NOT NULL
            AND split_part(pl.delivery_days, '-', 1) ~ '^[0-9]+$'
            AND CAST(split_part(pl.delivery_days, '-', 1) AS INTEGER) < 10
        )
      );
    ELSE
      v_is_instant := TRUE;
    END IF;

    IF v_is_applicable AND v_is_instant THEN
      v_eligible_amount := v_eligible_amount + COALESCE(r.amt, 0);
      v_eligible_count := v_eligible_count + 1;
    END IF;
  END LOOP;

  -- If no items qualified
  IF v_eligible_count = 0 OR v_eligible_amount <= 0 THEN
    IF v_coupon.instant_ship_only THEN
      RAISE EXCEPTION 'COUPON_NOT_APPLICABLE: This coupon only applies to instant ship sizes';
    ELSE
      RAISE EXCEPTION 'COUPON_NOT_APPLICABLE: This coupon is not valid for the items in your cart';
    END IF;
  END IF;

  -- 8. Calculate discount on eligible subtotal
  IF v_coupon.type = 'percentage' THEN
    v_discount := ROUND((v_eligible_amount * v_coupon.value / 100.0), 2);
  ELSE
    v_discount := LEAST(v_coupon.value, v_eligible_amount);
  END IF;

  -- 9. Remaining uses
  IF v_coupon.max_uses IS NULL THEN
    v_remaining := NULL;
  ELSE
    v_remaining := v_coupon.max_uses - v_coupon.used_count;
  END IF;

  coupon_id              := v_coupon.id;
  discount_amount        := v_discount;
  coupon_type            := v_coupon.type;
  coupon_value           := v_coupon.value;
  remaining_uses         := v_remaining;
  applicable_product_ids := v_coupon.applicable_product_ids;
  RETURN NEXT;
END;
$function$;
