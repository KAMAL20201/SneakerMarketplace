-- ============================================================
-- COUPON SYSTEM MIGRATION
-- ============================================================

-- ============================================================
-- TABLE: coupons
-- ============================================================
CREATE TABLE coupons (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   TEXT NOT NULL UNIQUE,
  type                   TEXT NOT NULL CHECK (type IN ('percentage', 'flat')),
  value                  NUMERIC NOT NULL CHECK (value > 0),
  max_uses               INTEGER DEFAULT NULL,          -- NULL = unlimited
  used_count             INTEGER NOT NULL DEFAULT 0,
  applicable_product_ids UUID[] DEFAULT NULL,           -- NULL = all products
  min_order_amount       NUMERIC DEFAULT NULL,          -- NULL = no minimum
  expires_at             TIMESTAMPTZ DEFAULT NULL,      -- NULL = never expires
  is_active              BOOLEAN NOT NULL DEFAULT true,
  description            TEXT DEFAULT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: only admins can read/write directly; all public access goes through SECURITY DEFINER RPCs
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_coupons" ON coupons
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- TABLE: coupon_usages
-- ============================================================
CREATE TABLE coupon_usages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_email      TEXT NOT NULL,
  discount_amount NUMERIC NOT NULL,
  used_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_coupon_usages" ON coupon_usages
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- ============================================================
-- ALTER: orders — add coupon tracking columns
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_id       UUID REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC DEFAULT NULL;

-- ============================================================
-- RPC: validate_coupon
-- Preview the discount without redeeming.
-- SECURITY DEFINER so anonymous (guest) users can call it.
-- Returns a single row or raises a prefixed exception.
-- ============================================================
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code         TEXT,
  p_product_ids  UUID[],
  p_order_amount NUMERIC
)
RETURNS TABLE (
  coupon_id       UUID,
  discount_amount NUMERIC,
  coupon_type     TEXT,
  coupon_value    NUMERIC,
  remaining_uses  INTEGER   -- NULL means unlimited
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon  coupons%ROWTYPE;
  v_discount NUMERIC;
  v_remaining INTEGER;
BEGIN
  -- 1. Fetch coupon (case-insensitive lookup)
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

  -- 5. Minimum order amount check
  IF v_coupon.min_order_amount IS NOT NULL AND p_order_amount < v_coupon.min_order_amount THEN
    RAISE EXCEPTION 'COUPON_MIN_ORDER: This coupon requires a minimum order of ₹%',
      v_coupon.min_order_amount::INT;
  END IF;

  -- 6. Product applicability check
  --    If applicable_product_ids is set, at least one product in the cart must match
  IF v_coupon.applicable_product_ids IS NOT NULL THEN
    IF NOT (
      SELECT bool_or(pid = ANY(v_coupon.applicable_product_ids))
      FROM UNNEST(p_product_ids) AS pid
    ) THEN
      RAISE EXCEPTION 'COUPON_NOT_APPLICABLE: This coupon is not valid for the items in your cart';
    END IF;
  END IF;

  -- 7. Calculate discount
  IF v_coupon.type = 'percentage' THEN
    v_discount := ROUND((p_order_amount * v_coupon.value / 100.0), 2);
  ELSE
    -- Flat discount capped at order amount
    v_discount := LEAST(v_coupon.value, p_order_amount);
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
-- RPC: redeem_coupon
-- Atomic redemption — called after orders are created.
-- Uses SELECT FOR UPDATE to serialize concurrent redemptions
-- and prevent race conditions on "first N users" coupons.
-- SECURITY DEFINER so both guest and authenticated users can call it.
-- ============================================================
CREATE OR REPLACE FUNCTION redeem_coupon(
  p_coupon_id    UUID,
  p_order_id     UUID,
  p_user_email   TEXT,
  p_order_amount NUMERIC   -- server-verified total used to recalculate discount
)
RETURNS NUMERIC   -- returns the confirmed discount amount applied
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon   coupons%ROWTYPE;
  v_discount NUMERIC;
BEGIN
  -- Lock the coupon row to prevent concurrent over-redemption
  SELECT * INTO v_coupon
  FROM coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COUPON_NOT_FOUND: Coupon not found';
  END IF;

  -- Re-validate all conditions at redemption time (defence in depth)
  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION 'COUPON_INACTIVE: Coupon is no longer active';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RAISE EXCEPTION 'COUPON_EXPIRED: Coupon has expired';
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'COUPON_EXHAUSTED: Coupon has reached its usage limit';
  END IF;

  -- Recalculate discount against the verified order amount (never trusts client value)
  IF v_coupon.type = 'percentage' THEN
    v_discount := ROUND((p_order_amount * v_coupon.value / 100.0), 2);
  ELSE
    v_discount := LEAST(v_coupon.value, p_order_amount);
  END IF;

  -- Atomically increment used_count
  UPDATE coupons
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_coupon_id;

  -- Record the usage
  INSERT INTO coupon_usages (coupon_id, order_id, user_email, discount_amount)
  VALUES (p_coupon_id, p_order_id, p_user_email, v_discount);

  -- Patch the order: store original amount, apply discount, record coupon reference
  UPDATE orders
  SET coupon_id       = p_coupon_id,
      coupon_code     = v_coupon.code,
      discount_amount = v_discount,
      original_amount = amount,
      amount          = GREATEST(amount - v_discount, 0)
  WHERE id = p_order_id;

  RETURN v_discount;
END;
$$;
