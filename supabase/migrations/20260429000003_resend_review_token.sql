-- Allow resending review emails by resetting token expiry and used_at on conflict

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
  INSERT INTO review_tokens (order_id, listing_id, email, expires_at, used_at)
  VALUES (p_order_id, p_listing_id, p_email, NOW() + INTERVAL '30 days', NULL)
  ON CONFLICT (order_id, listing_id)
    DO UPDATE SET
      email      = EXCLUDED.email,
      expires_at = NOW() + INTERVAL '30 days',
      used_at    = NULL
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;
