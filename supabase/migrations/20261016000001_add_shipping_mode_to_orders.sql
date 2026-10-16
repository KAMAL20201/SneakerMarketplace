-- Surface (Delhivery, prepaid) vs Air (BlueDart, partial COD) delivery.
-- shipping_fee and cod_amount are per order row (one row per item).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_mode TEXT NOT NULL DEFAULT 'surface'
    CHECK (shipping_mode IN ('surface', 'air')),
  ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC NOT NULL DEFAULT 0
    CHECK (shipping_fee >= 0),
  ADD COLUMN IF NOT EXISTS cod_amount NUMERIC NOT NULL DEFAULT 0
    CHECK (cod_amount >= 0);

-- Recreate create_guest_order with the shipping params. The old signature is
-- dropped first so PostgREST never sees two overloads with overlapping defaults.
DROP FUNCTION IF EXISTS public.create_guest_order(
  UUID, UUID, NUMERIC, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT
);

CREATE OR REPLACE FUNCTION public.create_guest_order(
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
  p_variant_name     TEXT     DEFAULT NULL,
  p_shipping_mode    TEXT     DEFAULT 'surface',
  p_shipping_fee     NUMERIC  DEFAULT 0,
  p_cod_amount       NUMERIC  DEFAULT 0
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
    variant_name,
    shipping_mode,
    shipping_fee,
    cod_amount
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
    p_variant_name,
    COALESCE(p_shipping_mode, 'surface'),
    COALESCE(p_shipping_fee, 0),
    COALESCE(p_cod_amount, 0)
  )
  RETURNING * INTO v_order;

  RETURN NEXT v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guest_order(
  UUID, UUID, NUMERIC, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, NUMERIC, NUMERIC
) TO anon, authenticated;
