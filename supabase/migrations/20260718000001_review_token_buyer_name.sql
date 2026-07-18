-- ── Add buyer_name to validate_review_token RPC ──────────────────────────────
-- Extends the function to also return the buyer's name from the orders table,
-- so the ReviewPage can pre-fill the reviewer name field without asking again.
-- Must DROP first because Postgres cannot change return type via CREATE OR REPLACE.

DROP FUNCTION IF EXISTS validate_review_token(UUID);

CREATE OR REPLACE FUNCTION validate_review_token(p_token UUID)
RETURNS TABLE(
  listing_id    UUID,
  listing_title TEXT,
  listing_slug  TEXT,
  listing_image TEXT,
  buyer_name    TEXT,
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
    COALESCE(o.buyer_name, '')                     AS buyer_name,
    (rt.used_at IS NULL AND rt.expires_at > NOW()) AS is_valid
  FROM  review_tokens rt
  JOIN  product_listings pl ON pl.id = rt.listing_id
  JOIN  orders           o  ON o.id  = rt.order_id
  WHERE rt.token = p_token
  LIMIT 1;
END;
$$;
