-- ============================================================
-- Fix: validate_coupon — also return applicable_product_ids
--
-- Adds applicable_product_ids UUID[] to the return type so the
-- client knows which cart items are eligible for the discount.
-- NULL means the coupon applies to all products.
-- Must DROP first because the return type changes.
-- ============================================================
DROP FUNCTION IF EXISTS validate_coupon(text, uuid[], numeric[], numeric);

CREATE OR REPLACE FUNCTION validate_coupon(
  p_code         TEXT,
  p_product_ids  UUID[],
  p_item_amounts NUMERIC[],
  p_order_amount NUMERIC
)
RETURNS TABLE (
  coupon_id              UUID,
  discount_amount        NUMERIC,
  coupon_type            TEXT,
  coupon_value           NUMERIC,
  remaining_uses         INTEGER,
  applicable_product_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon          coupons%ROWTYPE;
  v_eligible_amount NUMERIC;
  v_discount        NUMERIC;
  v_remaining       INTEGER;
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

  -- 6. Product applicability check + eligible-subtotal calculation
  IF v_coupon.applicable_product_ids IS NOT NULL THEN
    IF NOT (
      SELECT bool_or(pid = ANY(v_coupon.applicable_product_ids))
      FROM UNNEST(p_product_ids) AS pid
    ) THEN
      RAISE EXCEPTION 'COUPON_NOT_APPLICABLE: This coupon is not valid for the items in your cart';
    END IF;

    SELECT COALESCE(SUM(amt), 0) INTO v_eligible_amount
    FROM UNNEST(p_product_ids, p_item_amounts) AS t(pid, amt)
    WHERE pid = ANY(v_coupon.applicable_product_ids);
  ELSE
    v_eligible_amount := p_order_amount;
  END IF;

  -- 7. Calculate discount on eligible subtotal
  IF v_coupon.type = 'percentage' THEN
    v_discount := ROUND((v_eligible_amount * v_coupon.value / 100.0), 2);
  ELSE
    v_discount := LEAST(v_coupon.value, v_eligible_amount);
  END IF;

  -- 8. Remaining uses
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
$$;
