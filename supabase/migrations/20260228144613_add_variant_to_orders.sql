-- Add variant columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_id   UUID REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Recreate create_guest_order to accept and store variant info.
-- Uses CREATE OR REPLACE so existing authenticated-user order flows are unaffected.
-- All new params default to NULL for backward compatibility.
CREATE OR REPLACE FUNCTION create_guest_order(
  p_seller_id        UUID,
  p_product_id       UUID,
  p_amount           NUMERIC,
  p_shipping_address JSONB    DEFAULT '{}',
  p_status           TEXT     DEFAULT 'pending_payment',
  p_buyer_email      TEXT     DEFAULT NULL,
  p_buyer_name       TEXT     DEFAULT NULL,
  p_buyer_phone      TEXT     DEFAULT NULL,
  p_payment_id       TEXT     DEFAULT NULL,
  p_ordered_size     TEXT     DEFAULT NULL,
  p_variant_id       UUID     DEFAULT NULL,
  p_variant_name     TEXT     DEFAULT NULL
)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders;
BEGIN
  INSERT INTO orders (
    seller_id,
    product_id,
    amount,
    shipping_address,
    status,
    buyer_email,
    buyer_name,
    buyer_phone,
    payment_id,
    ordered_size,
    variant_id,
    variant_name
  ) VALUES (
    p_seller_id,
    p_product_id,
    p_amount,
    p_shipping_address,
    p_status,
    p_buyer_email,
    p_buyer_name,
    p_buyer_phone,
    p_payment_id,
    p_ordered_size,
    p_variant_id,
    p_variant_name
  )
  RETURNING * INTO v_order;

  RETURN NEXT v_order;
END;
$$;
