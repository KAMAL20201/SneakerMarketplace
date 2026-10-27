BEGIN;

-- Guest tracking is deliberately token-gated, not auth-gated. Keep elevated
-- reads in the private schema and expose only the customer-facing projection.
CREATE OR REPLACE FUNCTION checkout_private.get_order_tracking_details(p_token uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'order_id', o.id, 'order_status', o.status,
    'product_title', pl.title, 'product_brand', pl.brand,
    'product_image', COALESCE(
      (SELECT pv.image_url FROM public.product_variants pv WHERE pv.id = o.variant_id),
      (SELECT pi.image_url FROM public.product_images pi WHERE pi.product_id = pl.id ORDER BY pi.is_poster_image DESC, pi.id LIMIT 1)),
    'amount', o.amount, 'variant_name', o.variant_name, 'ordered_size', o.ordered_size,
    'tracking_number', o.tracking_number, 'courier_name', NULL::text,
    'shipping_address', o.shipping_address, 'buyer_name', o.buyer_name,
    'order_created_at', o.created_at, 'checkout_id', o.checkout_id,
    'payment_type', o.payment_type, 'payment_total', o.payment_total,
    'cod_fee', o.cod_fee, 'advance_amount', o.advance_amount, 'cod_amount', o.cod_amount,
    'advance_received_at', o.advance_received_at, 'cod_collected_at', o.cod_collected_at
  )
  FROM public.order_tracking_tokens ott
  JOIN public.orders o ON o.id = ott.order_id
  JOIN public.product_listings pl ON pl.id = o.product_id
  WHERE ott.token = p_token AND NOT COALESCE(o.is_deleted, false)
    AND (o.status IN ('confirmed', 'shipped', 'delivered')
      OR (o.status = 'pending_payment' AND o.payment_type = 'partial_cod'))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION checkout_private.get_order_tracking_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION checkout_private.get_order_tracking_details(uuid) TO anon, authenticated;

-- New endpoint preserves the original table-returning RPC for old clients.
CREATE OR REPLACE FUNCTION public.get_order_tracking_details(p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT checkout_private.get_order_tracking_details(p_token); $$;
REVOKE ALL ON FUNCTION public.get_order_tracking_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_tracking_details(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION checkout_private.lookup_order_tracking_token(p_order_id text, p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  matched_ids uuid[];
  matched_id uuid;
  result_token uuid;
BEGIN
  p_order_id := lower(ltrim(btrim(p_order_id), '#'));
  p_email := lower(btrim(p_email));
  -- Require the displayed eight-character ID or a longer UUID prefix. Reject
  -- SQL wildcard characters and ambiguous matches rather than picking one.
  IF p_order_id IS NULL OR p_order_id !~ '^[0-9a-f]{8}(-[0-9a-f-]{0,27})?$'
    OR p_email IS NULL OR p_email = '' THEN RETURN NULL; END IF;
  SELECT array_agg(candidate.id) INTO matched_ids FROM (
    SELECT o.id FROM public.orders o
    WHERE left(o.id::text, length(p_order_id)) = p_order_id
      AND (lower(o.buyer_email) = p_email OR lower(o.shipping_address->>'email') = p_email)
      AND NOT COALESCE(o.is_deleted, false)
      AND (o.status IN ('confirmed', 'shipped', 'delivered')
        OR (o.status = 'pending_payment' AND o.payment_type = 'partial_cod'))
    LIMIT 2
  ) candidate;
  IF cardinality(matched_ids) IS DISTINCT FROM 1 THEN RETURN NULL; END IF;
  matched_id := matched_ids[1];
  INSERT INTO public.order_tracking_tokens(order_id, email) VALUES (matched_id, p_email)
    ON CONFLICT (order_id) DO UPDATE SET order_id = EXCLUDED.order_id
    RETURNING token INTO result_token;
  RETURN result_token;
END;
$$;
REVOKE ALL ON FUNCTION checkout_private.lookup_order_tracking_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION checkout_private.lookup_order_tracking_token(text, text) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.lookup_order_tracking_token(p_order_id text, p_email text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT checkout_private.lookup_order_tracking_token(p_order_id, p_email); $$;
REVOKE ALL ON FUNCTION public.lookup_order_tracking_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order_tracking_token(text, text) TO anon, authenticated;

-- The old minting endpoint must not bypass the guest ID/email check.
-- Admin confirmation still calls it to create email tracking links.
CREATE OR REPLACE FUNCTION public.create_order_tracking_token(p_order_id uuid, p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  RETURN checkout_private.create_order_tracking_token(p_order_id, p_email);
END;
$$;
CREATE OR REPLACE FUNCTION checkout_private.create_order_tracking_token(p_order_id uuid, p_email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result_token uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.order_tracking_tokens(order_id, email) VALUES (p_order_id, p_email)
    ON CONFLICT (order_id) DO UPDATE SET email = EXCLUDED.email RETURNING token INTO result_token;
  RETURN result_token;
END;
$$;
REVOKE ALL ON FUNCTION public.create_order_tracking_token(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION checkout_private.create_order_tracking_token(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_tracking_token(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION checkout_private.create_order_tracking_token(uuid, text) TO authenticated;
COMMIT;
