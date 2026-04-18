-- ============================================================
-- Fix 1: validate_coupon — calculate discount on eligible items only
--
-- Adds p_item_amounts NUMERIC[] (parallel to p_product_ids).
-- When applicable_product_ids is set, the discount is calculated
-- on the eligible items' subtotal, not the full order amount.
-- The min_order_amount guard still checks the full order amount.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code         TEXT,
  p_product_ids  UUID[],
  p_item_amounts NUMERIC[],
  p_order_amount NUMERIC
)
RETURNS TABLE (
  coupon_id       UUID,
  discount_amount NUMERIC,
  coupon_type     TEXT,
  coupon_value    NUMERIC,
  remaining_uses  INTEGER
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
    -- Ensure at least one cart item is eligible
    IF NOT (
      SELECT bool_or(pid = ANY(v_coupon.applicable_product_ids))
      FROM UNNEST(p_product_ids) AS pid
    ) THEN
      RAISE EXCEPTION 'COUPON_NOT_APPLICABLE: This coupon is not valid for the items in your cart';
    END IF;

    -- Sum prices of eligible items only
    SELECT COALESCE(SUM(amt), 0) INTO v_eligible_amount
    FROM UNNEST(p_product_ids, p_item_amounts) AS t(pid, amt)
    WHERE pid = ANY(v_coupon.applicable_product_ids);
  ELSE
    -- No restriction — discount applies to the full order
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

  coupon_id       := v_coupon.id;
  discount_amount := v_discount;
  coupon_type     := v_coupon.type;
  coupon_value    := v_coupon.value;
  remaining_uses  := v_remaining;
  RETURN NEXT;
END;
$$;

-- ============================================================
-- Fix 2a: save_pending_coupon
--
-- Stores the coupon reference (+ pre-calculated discount) on an
-- order at checkout time WITHOUT incrementing used_count.
-- Redemption is deferred until the admin confirms payment.
-- SECURITY DEFINER so guest users can call it.
-- ============================================================
CREATE OR REPLACE FUNCTION save_pending_coupon(
  p_order_id        UUID,
  p_coupon_id       UUID,
  p_coupon_code     TEXT,
  p_discount_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sanity-check: coupon must exist and be active
  IF NOT EXISTS (
    SELECT 1 FROM coupons WHERE id = p_coupon_id AND is_active = true
  ) THEN
    RETURN; -- Silently skip; order is already placed
  END IF;

  UPDATE orders
  SET coupon_id       = p_coupon_id,
      coupon_code     = p_coupon_code,
      discount_amount = p_discount_amount
      -- original_amount stays NULL until finalize_coupon_redemption runs
  WHERE id = p_order_id;
END;
$$;

-- ============================================================
-- Fix 2b: finalize_coupon_redemption
--
-- Called when the admin confirms payment for a pending_payment order.
-- Re-validates the coupon, atomically increments used_count, records
-- usage, and patches the order amount with the stored discount.
-- Returns the discount amount applied (0 if no coupon or already done).
-- SECURITY DEFINER so the admin page can call it.
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_coupon_redemption(
  p_order_id   UUID,
  p_user_email TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order   orders%ROWTYPE;
  v_coupon  coupons%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- No coupon on this order
  IF v_order.coupon_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Already redeemed (original_amount is set after redemption)
  IF v_order.original_amount IS NOT NULL THEN
    RETURN v_order.discount_amount;
  END IF;

  -- Lock coupon row to prevent concurrent over-redemption
  SELECT * INTO v_coupon
  FROM coupons
  WHERE id = v_order.coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0; -- Coupon deleted — skip silently
  END IF;

  -- Re-validate at redemption time
  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION 'COUPON_INACTIVE: Coupon is no longer active';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED: Coupon has expired';
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'COUPON_EXHAUSTED: Coupon has reached its usage limit';
  END IF;

  -- Atomically increment used_count
  UPDATE coupons
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = v_coupon.id;

  -- Record the usage
  INSERT INTO coupon_usages (coupon_id, order_id, user_email, discount_amount)
  VALUES (v_order.coupon_id, p_order_id, p_user_email, v_order.discount_amount);

  -- Patch order: store original amount and apply discount
  UPDATE orders
  SET original_amount = amount,
      amount          = GREATEST(amount - v_order.discount_amount, 0)
  WHERE id = p_order_id;

  RETURN v_order.discount_amount;
END;
$$;
