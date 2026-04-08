-- ── Adapt existing reviews table + add token-gated review system ──────────────

-- 1. Make reviewer_id and seller_id nullable (guest buyers have no account)
ALTER TABLE reviews ALTER COLUMN reviewer_id DROP NOT NULL;
ALTER TABLE reviews ALTER COLUMN seller_id   DROP NOT NULL;

-- 2. Add guest-buyer columns
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_email TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name  TEXT NOT NULL DEFAULT 'Verified Buyer';

-- 3. Add per-order uniqueness (one review per order per product)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_product_id_reviewer_id_key;
ALTER TABLE reviews ADD CONSTRAINT reviews_order_id_product_id_key UNIQUE (order_id, product_id);

-- ── review_tokens table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_tokens (
  token      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID        NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  UNIQUE(order_id, listing_id)
);

-- ── Aggregate rating view ─────────────────────────────────────────────────────

CREATE OR REPLACE VIEW listing_aggregate_ratings AS
SELECT
  product_id                             AS listing_id,
  ROUND(AVG(rating)::NUMERIC, 1)         AS average_rating,
  COUNT(*)::INTEGER                      AS review_count
FROM reviews
WHERE is_approved = TRUE
GROUP BY product_id;

-- ── RPC: create_review_token ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_review_token(
  p_order_id   UUID,
  p_listing_id UUID,
  p_email      TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID;
BEGIN
  INSERT INTO review_tokens (order_id, listing_id, email)
  VALUES (p_order_id, p_listing_id, p_email)
  ON CONFLICT (order_id, listing_id)
    DO UPDATE SET email = EXCLUDED.email
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

-- ── RPC: validate_review_token ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_review_token(p_token UUID)
RETURNS TABLE(
  listing_id    UUID,
  listing_title TEXT,
  listing_slug  TEXT,
  listing_image TEXT,
  is_valid      BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id                                          AS listing_id,
    pl.title                                       AS listing_title,
    pl.slug                                        AS listing_slug,
    (
      SELECT pi.image_url
      FROM   product_images pi
      WHERE  pi.product_id = pl.id
      ORDER  BY pi.is_poster_image DESC, pi.id ASC
      LIMIT  1
    )                                              AS listing_image,
    (rt.used_at IS NULL AND rt.expires_at > NOW()) AS is_valid
  FROM  review_tokens rt
  JOIN  product_listings pl ON pl.id = rt.listing_id
  WHERE rt.token = p_token
  LIMIT 1;
END;
$$;

-- ── RPC: submit_review ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION submit_review(
  p_token         UUID,
  p_rating        SMALLINT,
  p_body          TEXT,
  p_reviewer_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token review_tokens%ROWTYPE;
BEGIN
  SELECT * INTO v_token
  FROM   review_tokens
  WHERE  token      = p_token
    AND  used_at    IS NULL
    AND  expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO reviews (
    product_id, order_id, reviewer_email, reviewer_name,
    rating, comment, verified_purchase, is_approved
  )
  VALUES (
    v_token.listing_id,
    v_token.order_id,
    v_token.email,
    COALESCE(NULLIF(TRIM(p_reviewer_name), ''), 'Verified Buyer'),
    p_rating,
    NULLIF(TRIM(p_body), ''),
    TRUE,
    TRUE
  )
  ON CONFLICT (order_id, product_id) DO NOTHING;

  UPDATE review_tokens SET used_at = NOW() WHERE token = p_token;

  RETURN TRUE;
END;
$$;
