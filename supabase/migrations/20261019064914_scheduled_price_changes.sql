-- Admin-only schedules; the Edge Function worker applies each product atomically.
CREATE SCHEMA IF NOT EXISTS pricing_private;
GRANT USAGE ON SCHEMA pricing_private TO authenticated, service_role;

CREATE TABLE public.scheduled_price_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.product_listings(id) ON DELETE RESTRICT,
  product_title text NOT NULL,
  previous_price numeric NOT NULL,
  new_price numeric NOT NULL CHECK (new_price > 0 AND new_price < 100000000 AND new_price = round(new_price, 2)),
  effective_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled', 'failed')),
  expected_prices jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text
);
CREATE UNIQUE INDEX scheduled_price_changes_one_pending
  ON public.scheduled_price_changes(listing_id) WHERE status = 'pending';
CREATE INDEX scheduled_price_changes_due
  ON public.scheduled_price_changes(effective_at, id) WHERE status = 'pending';
CREATE INDEX scheduled_price_changes_history
  ON public.scheduled_price_changes(created_at DESC, id DESC);
ALTER TABLE public.scheduled_price_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scheduled_price_changes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.scheduled_price_changes TO authenticated;
GRANT ALL ON public.scheduled_price_changes TO service_role;
CREATE POLICY "Admins read price schedules" ON public.scheduled_price_changes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Admins create price schedules" ON public.scheduled_price_changes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Admins cancel price schedules" ON public.scheduled_price_changes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

CREATE FUNCTION pricing_private.price_snapshot(p_listing_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'price', l.price, 'preorder_price', l.preorder_price,
    'variants', COALESCE((SELECT jsonb_agg(jsonb_build_array(v.id, v.price) ORDER BY v.id)
      FROM public.product_variants v WHERE v.listing_id = l.id), '[]'::jsonb),
    'sizes', COALESCE((SELECT jsonb_agg(jsonb_build_array(s.id, s.price) ORDER BY s.id)
      FROM public.product_listing_sizes s WHERE s.listing_id = l.id), '[]'::jsonb),
    'variant_sizes', COALESCE((SELECT jsonb_agg(jsonb_build_array(s.id, s.price) ORDER BY s.id)
      FROM public.product_variant_sizes s JOIN public.product_variants v ON v.id = s.variant_id
      WHERE v.listing_id = l.id), '[]'::jsonb)
  ) FROM public.product_listings l WHERE l.id = p_listing_id;
$$;

CREATE FUNCTION pricing_private.guard_schedule() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE product public.product_listings%ROWTYPE;
BEGIN
  -- Only the service worker (or database owner during maintenance) sets outcomes.
  IF current_user IN ('postgres', 'service_role') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can manage price schedules';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'pending' OR NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Only pending schedules can be cancelled';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['status', 'completed_at']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['status', 'completed_at']) THEN
      RAISE EXCEPTION 'Cancel this schedule and create a new one to change it';
    END IF;
    NEW.completed_at := now();
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
CREATE TRIGGER guard_price_schedule BEFORE INSERT OR UPDATE ON public.scheduled_price_changes
  FOR EACH ROW EXECUTE FUNCTION pricing_private.guard_schedule();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pricing_private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pricing_private.price_snapshot(uuid) TO authenticated, service_role;

-- Called only with the service-role key by the Edge Function. The extra Vault
-- token authenticates Cron requests without placing a service key in Cron jobs.
CREATE FUNCTION public.process_due_price_changes(p_scheduler_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  scheduled public.scheduled_price_changes%ROWTYPE;
  product public.product_listings%ROWTYPE;
  applied integer := 0;
  failed integer := 0;
BEGIN
  IF p_scheduler_token IS NULL OR length(p_scheduler_token) < 32 OR NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'price_scheduler_token' AND decrypted_secret = p_scheduler_token
  ) THEN
    RAISE EXCEPTION 'Invalid scheduler token' USING ERRCODE = '28000';
  END IF;
  FOR scheduled IN SELECT * FROM public.scheduled_price_changes
    WHERE status = 'pending' AND effective_at <= now()
    ORDER BY effective_at, id LIMIT 25 FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      SELECT * INTO product FROM public.product_listings WHERE id = scheduled.listing_id FOR UPDATE;
      IF NOT FOUND OR product.is_deleted OR product.status NOT IN ('active', 'sold') THEN
        RAISE EXCEPTION 'Product is no longer available. Review it before rescheduling.';
      END IF;
      PERFORM 1 FROM public.product_variants WHERE listing_id = scheduled.listing_id ORDER BY id FOR UPDATE;
      PERFORM 1 FROM public.product_listing_sizes WHERE listing_id = scheduled.listing_id ORDER BY id FOR UPDATE;
      PERFORM 1 FROM public.product_variant_sizes s JOIN public.product_variants v ON v.id = s.variant_id
        WHERE v.listing_id = scheduled.listing_id ORDER BY s.id FOR UPDATE OF s;
      IF pricing_private.price_snapshot(scheduled.listing_id) IS DISTINCT FROM scheduled.expected_prices THEN
        RAISE EXCEPTION 'Prices or sizes changed after scheduling. Review the product and create a new schedule.';
      END IF;
      UPDATE public.product_listings SET price = scheduled.new_price,
        preorder_price = CASE WHEN preorder_price IS NOT NULL THEN scheduled.new_price ELSE NULL END,
        updated_at = now() WHERE id = scheduled.listing_id;
      UPDATE public.product_variants SET price = scheduled.new_price
        WHERE listing_id = scheduled.listing_id AND price IS NOT NULL;
      UPDATE public.product_listing_sizes SET price = scheduled.new_price WHERE listing_id = scheduled.listing_id;
      UPDATE public.product_variant_sizes s SET price = scheduled.new_price FROM public.product_variants v
        WHERE s.variant_id = v.id AND v.listing_id = scheduled.listing_id;
      UPDATE public.scheduled_price_changes SET status = 'applied', completed_at = now(), error_message = NULL
        WHERE id = scheduled.id;
      applied := applied + 1;
    EXCEPTION WHEN OTHERS THEN
      -- The subtransaction rolls back every price write before recording failure.
      UPDATE public.scheduled_price_changes SET status = 'failed', completed_at = now(), error_message = SQLERRM
        WHERE id = scheduled.id;
      failed := failed + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('applied', applied, 'failed', failed);
END;
$$;
REVOKE ALL ON FUNCTION public.process_due_price_changes(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_price_changes(text) TO service_role;
