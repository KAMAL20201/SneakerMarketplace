-- Pending schedules can change price/time; history and captured prices stay immutable.
CREATE OR REPLACE FUNCTION pricing_private.guard_schedule() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE product public.product_listings%ROWTYPE;
BEGIN
  IF current_user IN ('postgres', 'service_role') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can manage price schedules';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending schedules can be edited or cancelled';
    END IF;
    IF NEW.status = 'cancelled' THEN
      IF (to_jsonb(NEW) - ARRAY['status', 'completed_at']) IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['status', 'completed_at']) THEN
        RAISE EXCEPTION 'Only the cancellation status can change when cancelling';
      END IF;
      NEW.completed_at := now();
    ELSIF NEW.status = 'pending' THEN
      IF (to_jsonb(NEW) - ARRAY['new_price', 'effective_at']) IS DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['new_price', 'effective_at']) THEN
        RAISE EXCEPTION 'Only the new price and effective time can be edited';
      END IF;
      IF NEW.effective_at IS NULL OR NEW.effective_at <= now() THEN
        RAISE EXCEPTION 'Choose a future date and time';
      END IF;
    ELSE
      RAISE EXCEPTION 'Only pending schedules can be edited or cancelled';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.effective_at IS NULL OR NEW.effective_at <= now() THEN
    RAISE EXCEPTION 'Choose a future date and time';
  END IF;
  IF NEW.status <> 'pending' THEN RAISE EXCEPTION 'New schedules must be pending'; END IF;
  IF EXISTS (SELECT 1 FROM public.scheduled_price_changes WHERE listing_id = NEW.listing_id AND status = 'pending') THEN
    RAISE EXCEPTION 'This product already has a pending price change';
  END IF;
  SELECT * INTO product FROM public.product_listings WHERE id = NEW.listing_id FOR UPDATE;
  IF NOT FOUND OR product.is_deleted OR product.status NOT IN ('active', 'sold') THEN
    RAISE EXCEPTION 'Choose an active or sold-out product';
  END IF;
  NEW.product_title := product.title;
  NEW.previous_price := product.price;
  NEW.expected_prices := pricing_private.price_snapshot(NEW.listing_id);
  NEW.created_by := auth.uid();
  NEW.created_at := now();
  NEW.completed_at := NULL;
  NEW.error_message := NULL;
  RETURN NEW;
END;
$$;

-- Expose only the public announcement, via the existing product fetch. The
-- schedules table, expected-price snapshots and audit fields remain admin-only.
ALTER TABLE public.product_listings ADD COLUMN scheduled_price_notice jsonb;
CREATE FUNCTION pricing_private.sync_price_notice() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.product_listings SET scheduled_price_notice = CASE
    WHEN NEW.status IN ('pending', 'applied') THEN jsonb_build_object(
      'previous_price', NEW.previous_price, 'new_price', NEW.new_price, 'effective_at', NEW.effective_at
    ) ELSE NULL END
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION pricing_private.sync_price_notice() FROM PUBLIC, anon;
CREATE TRIGGER sync_scheduled_price_notice AFTER INSERT OR UPDATE ON public.scheduled_price_changes
  FOR EACH ROW EXECUTE FUNCTION pricing_private.sync_price_notice();

UPDATE public.product_listings l SET scheduled_price_notice = jsonb_build_object(
  'previous_price', s.previous_price, 'new_price', s.new_price, 'effective_at', s.effective_at
)
FROM (SELECT DISTINCT ON (listing_id) listing_id, previous_price, new_price, effective_at, status
  FROM public.scheduled_price_changes ORDER BY listing_id, created_at DESC, id DESC) s
WHERE s.listing_id = l.id AND s.status IN ('pending', 'applied');
