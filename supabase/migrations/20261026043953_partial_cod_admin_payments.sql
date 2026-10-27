-- Apply after the partial COD foundation and checkout migrations.
BEGIN;

CREATE FUNCTION public.record_partial_cod_payment(p_order_id uuid, p_stage text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  target public.orders%ROWTYPE;
  coupon_order public.orders%ROWTYPE;
  coupon public.coupons%ROWTYPE;
  checkout uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can record payments';
  END IF;
  IF p_stage IS NULL OR p_stage NOT IN ('advance', 'cod') THEN RAISE EXCEPTION 'Invalid payment stage'; END IF;
  SELECT checkout_id INTO checkout FROM public.orders WHERE id = p_order_id AND NOT is_deleted;
  -- All rows from one checkout share a lock: the coupon is redeemed exactly once,
  -- even when two admins confirm different item rows at the same time.
  PERFORM pg_advisory_xact_lock(hashtextextended(coalesce(checkout, p_order_id)::text, 0));
  SELECT * INTO target FROM public.orders WHERE id = p_order_id AND NOT is_deleted FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF target.payment_type <> 'partial_cod' THEN RAISE EXCEPTION 'This order is not partial COD'; END IF;
  IF target.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot record payment for a cancelled order'; END IF;

  IF p_stage = 'advance' THEN
    IF target.advance_received_at IS NOT NULL THEN
      RETURN jsonb_build_object('order', to_jsonb(target), 'recorded', false);
    END IF;
    IF target.status <> 'pending_payment' THEN RAISE EXCEPTION 'Only pending orders can receive an advance'; END IF;
    -- Locate the single coupon reference, which may be on another item row.
    SELECT * INTO coupon_order FROM public.orders
      WHERE coupon_id IS NOT NULL AND
        ((checkout IS NOT NULL AND checkout_id = checkout) OR (checkout IS NULL AND id = p_order_id))
      ORDER BY id LIMIT 1 FOR UPDATE;
    IF FOUND AND NOT EXISTS (SELECT 1 FROM public.coupon_usages WHERE order_id = coupon_order.id AND coupon_id = coupon_order.coupon_id) THEN
      SELECT * INTO coupon FROM public.coupons WHERE id = coupon_order.coupon_id FOR UPDATE;
      IF NOT FOUND OR NOT coupon.is_active OR (coupon.expires_at IS NOT NULL AND coupon.expires_at < now())
        OR (coupon.max_uses IS NOT NULL AND coupon.used_count >= coupon.max_uses) THEN
        RAISE EXCEPTION 'Coupon cannot be redeemed. Resolve the coupon before confirming the advance';
      END IF;
      UPDATE public.coupons SET used_count = used_count + 1, updated_at = now() WHERE id = coupon.id;
      INSERT INTO public.coupon_usages(coupon_id, order_id, user_email, discount_amount)
        VALUES (coupon.id, coupon_order.id, coalesce(coupon_order.buyer_email, ''), coupon_order.discount_amount);
      -- Sentinel for legacy redemption callers; do not subtract the discount a
      -- second time: the immutable payment snapshot already includes it.
      UPDATE public.orders SET original_amount = coalesce(original_amount, amount) WHERE id = coupon_order.id;
    END IF;
    -- The existing stock trigger runs in THIS transaction. Stock failure rolls
    -- back both the receipt and coupon usage. COD remains outstanding.
    UPDATE public.orders SET advance_received_at = now(), status = 'confirmed',
      original_amount = coalesce(original_amount, amount), amount = payment_total, updated_at = now()
      WHERE id = p_order_id RETURNING * INTO target;
  ELSE
    IF target.advance_received_at IS NULL THEN RAISE EXCEPTION 'Confirm the advance before recording COD collection'; END IF;
    IF target.cod_collected_at IS NOT NULL THEN
      RETURN jsonb_build_object('order', to_jsonb(target), 'recorded', false);
    END IF;
    IF target.status NOT IN ('shipped', 'delivered') THEN RAISE EXCEPTION 'COD can only be collected for shipped or delivered orders'; END IF;
    IF target.cod_amount <= 0 THEN RAISE EXCEPTION 'No COD amount is due'; END IF;
    UPDATE public.orders SET cod_collected_at = now(), updated_at = now()
      WHERE id = p_order_id RETURNING * INTO target;
  END IF;
  RETURN jsonb_build_object('order', to_jsonb(target), 'recorded', true);
END;
$$;
REVOKE ALL ON FUNCTION public.record_partial_cod_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_partial_cod_payment(uuid, text) TO authenticated;

-- Protect receipt transitions and the saved quote, including direct table updates.
CREATE FUNCTION checkout_private.guard_partial_cod_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.payment_type = 'partial_cod' OR NEW.payment_type = 'partial_cod') THEN
    IF (NEW.payment_type, NEW.payment_total, NEW.cod_fee, NEW.advance_amount, NEW.cod_amount, NEW.checkout_id, NEW.checkout_line, NEW.checkout_fingerprint)
      IS DISTINCT FROM (OLD.payment_type, OLD.payment_total, OLD.cod_fee, OLD.advance_amount, OLD.cod_amount, OLD.checkout_id, OLD.checkout_line, OLD.checkout_fingerprint) THEN
      RAISE EXCEPTION 'The saved partial COD payment breakdown cannot be changed';
    END IF;
    IF (NEW.advance_received_at, NEW.cod_collected_at) IS DISTINCT FROM (OLD.advance_received_at, OLD.cod_collected_at) THEN
      IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can record payments';
      END IF;
      IF (OLD.advance_received_at IS NOT NULL AND NEW.advance_received_at IS DISTINCT FROM OLD.advance_received_at)
        OR (OLD.cod_collected_at IS NOT NULL AND NEW.cod_collected_at IS DISTINCT FROM OLD.cod_collected_at) THEN
        RAISE EXCEPTION 'Recorded payment receipts cannot be overwritten';
      END IF;
      IF NEW.cod_collected_at IS DISTINCT FROM OLD.cod_collected_at AND NEW.status NOT IN ('shipped', 'delivered') THEN
        RAISE EXCEPTION 'COD can only be collected for shipped or delivered orders';
      END IF;
      IF NEW.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot record payment for a cancelled order'; END IF;
    END IF;
  END IF;
  IF NEW.payment_type = 'partial_cod' THEN
    IF TG_OP = 'INSERT' AND (NEW.status <> 'pending_payment' OR NEW.advance_received_at IS NOT NULL OR NEW.cod_collected_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Partial COD orders must start awaiting an advance';
    END IF;
    IF NEW.status IN ('confirmed', 'shipped', 'delivered') AND NEW.advance_received_at IS NULL THEN
      RAISE EXCEPTION 'Confirm the advance before processing a partial COD order';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION checkout_private.guard_partial_cod_payment() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION checkout_private.guard_partial_cod_payment() TO authenticated;
CREATE TRIGGER guard_partial_cod_payment BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION checkout_private.guard_partial_cod_payment();
COMMIT;
