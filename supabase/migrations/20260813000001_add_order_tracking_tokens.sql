-- ── Order tracking tokens: public, token-gated order status page ─────────────

CREATE TABLE IF NOT EXISTS order_tracking_tokens (
  token      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(order_id)  -- one token per order
);

-- Allow anon / authenticated to read via RPC (SECURITY DEFINER handles access)
-- No direct RLS policies needed — access is exclusively through RPCs below.

-- ── RPC: create_order_tracking_token ─────────────────────────────────────────
-- Called server-side (from admin confirm-payment flow) to generate a token.

CREATE OR REPLACE FUNCTION create_order_tracking_token(
  p_order_id UUID,
  p_email    TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
BEGIN
  INSERT INTO order_tracking_tokens (order_id, email)
  VALUES (p_order_id, p_email)
  ON CONFLICT (order_id)
    DO UPDATE SET email = EXCLUDED.email
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- ── RPC: get_order_by_tracking_token ─────────────────────────────────────────
-- Public RPC — returns order details ONLY for confirmed / shipped / delivered.

CREATE OR REPLACE FUNCTION get_order_by_tracking_token(p_token UUID)
RETURNS TABLE(
  order_id          UUID,
  order_status      TEXT,
  product_title     TEXT,
  product_brand     TEXT,
  product_image     TEXT,
  amount            NUMERIC,
  variant_name      TEXT,
  ordered_size      TEXT,
  tracking_number   TEXT,
  courier_name      TEXT,
  shipping_address  JSONB,
  buyer_name        TEXT,
  order_created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id                                              AS order_id,
    o.status::TEXT                                    AS order_status,
    pl.title                                          AS product_title,
    pl.brand                                          AS product_brand,
    COALESCE(
      (SELECT pv.image_url FROM product_variants pv WHERE pv.id = o.variant_id),
      (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = pl.id ORDER BY pi.is_poster_image DESC, pi.id ASC LIMIT 1)
    )                                                 AS product_image,
    o.amount                                          AS amount,
    o.variant_name                                    AS variant_name,
    o.ordered_size                                    AS ordered_size,
    o.tracking_number                                 AS tracking_number,
    NULL::TEXT                                        AS courier_name,
    o.shipping_address                                AS shipping_address,
    o.buyer_name                                      AS buyer_name,
    o.created_at                                      AS order_created_at
  FROM  order_tracking_tokens ott
  JOIN  orders o   ON o.id  = ott.order_id
  JOIN  product_listings pl ON pl.id = o.product_id
  WHERE ott.token = p_token
    AND o.status IN ('confirmed', 'shipped', 'delivered')
    AND COALESCE(o.is_deleted, FALSE) = FALSE
  LIMIT 1;
END;
$$;

-- ── RPC: lookup_order_tracking_token ─────────────────────────────────────────
-- Lookup tracking token by Order ID (or prefix) + Email

CREATE OR REPLACE FUNCTION lookup_order_tracking_token(
  p_order_id TEXT,
  p_email    TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_email    TEXT;
  v_token    UUID;
BEGIN
  p_order_id := TRIM(p_order_id);
  p_email    := LOWER(TRIM(p_email));

  IF p_order_id LIKE '#%' THEN
    p_order_id := SUBSTRING(p_order_id FROM 2);
  END IF;

  SELECT id, buyer_email INTO v_order_id, v_email
  FROM orders
  WHERE (id::TEXT ILIKE p_order_id || '%' OR id::TEXT = p_order_id)
    AND (
      LOWER(buyer_email) = p_email OR
      LOWER(shipping_address->>'email') = p_email
    )
    AND status IN ('confirmed', 'shipped', 'delivered')
    AND COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN create_order_tracking_token(v_order_id, COALESCE(v_email, p_email));
END;
$$;

