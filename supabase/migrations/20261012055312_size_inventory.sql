-- Initialize every size to one unit as requested; admins can enter actual stock counts.
ALTER TABLE public.product_variant_sizes ADD COLUMN quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0);
ALTER TABLE public.product_listing_sizes ADD COLUMN quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0);
UPDATE public.product_variant_sizes SET is_sold = false;
UPDATE public.product_listing_sizes SET is_sold = false;
UPDATE public.product_listings pl SET status = 'active', sold_at = NULL
WHERE pl.status = 'sold' AND (
  EXISTS (SELECT 1 FROM public.product_variants v JOIN public.product_variant_sizes s ON s.variant_id = v.id WHERE v.listing_id = pl.id)
  OR EXISTS (SELECT 1 FROM public.product_listing_sizes s WHERE s.listing_id = pl.id)
);
ALTER TABLE public.orders ADD COLUMN stock_deducted boolean NOT NULL DEFAULT false;
UPDATE public.orders SET stock_deducted = true WHERE status IN ('confirmed', 'shipped', 'delivered');

CREATE POLICY "Admins can update variant inventory" ON public.product_variant_sizes
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Admins can view orders for inventory" ON public.orders
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Admins can update orders for inventory" ON public.orders
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = (SELECT auth.uid())));

CREATE SCHEMA IF NOT EXISTS inventory_private;
GRANT USAGE ON SCHEMA inventory_private TO authenticated;

CREATE FUNCTION inventory_private.sync_size_quantity() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.is_sold IS DISTINCT FROM OLD.is_sold)
     AND NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can change stock quantities';
  END IF;
  -- Seller-created sizes start at one unit; only admins can specify other counts.
  IF TG_OP = 'INSERT' AND NEW.quantity <> 1
     AND NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can set stock quantities';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.quantity = OLD.quantity AND NEW.is_sold IS DISTINCT FROM OLD.is_sold THEN
    NEW.quantity := CASE WHEN NEW.is_sold THEN 0 ELSE 1 END;
  END IF;
  NEW.is_sold := NEW.quantity = 0;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sync_variant_quantity BEFORE INSERT OR UPDATE ON public.product_variant_sizes
FOR EACH ROW EXECUTE FUNCTION inventory_private.sync_size_quantity();
CREATE TRIGGER sync_listing_quantity BEFORE INSERT OR UPDATE ON public.product_listing_sizes
FOR EACH ROW EXECUTE FUNCTION inventory_private.sync_size_quantity();

CREATE FUNCTION inventory_private.sync_listing_stock(p_listing_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE has_stock boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM public.product_variants WHERE listing_id = p_listing_id) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.product_variants v
      LEFT JOIN public.product_variant_sizes s ON s.variant_id = v.id
      WHERE v.listing_id = p_listing_id AND (s.id IS NULL OR s.quantity > 0)
    ) INTO has_stock;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.product_listing_sizes WHERE listing_id = p_listing_id AND quantity > 0) INTO has_stock;
  END IF;
  UPDATE public.product_listings SET status = CASE WHEN has_stock THEN 'active' ELSE 'sold' END,
    sold_at = CASE WHEN has_stock THEN NULL ELSE now() END
  WHERE id = p_listing_id AND status IN ('active', 'sold');
END;
$$;

-- Atomic +/- adjustments. Expected count prevents overwriting a concurrent sale.
CREATE FUNCTION public.adjust_size_quantity(p_table text, p_size_id uuid, p_delta integer, p_expected_quantity integer DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE listing_id uuid; next_quantity integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can change stock quantities';
  END IF;
  IF p_delta IS NULL OR p_delta = 0 THEN RAISE EXCEPTION 'Enter a non-zero quantity adjustment'; END IF;
  IF p_table = 'product_variant_sizes' THEN
    SELECT v.listing_id INTO listing_id FROM public.product_variant_sizes s JOIN public.product_variants v ON v.id = s.variant_id WHERE s.id = p_size_id;
  ELSIF p_table = 'product_listing_sizes' THEN
    SELECT s.listing_id INTO listing_id FROM public.product_listing_sizes s WHERE s.id = p_size_id;
  ELSE RAISE EXCEPTION 'Invalid inventory table'; END IF;
  IF listing_id IS NULL THEN RAISE EXCEPTION 'Size not found'; END IF;
  PERFORM 1 FROM public.product_listings WHERE id = listing_id FOR UPDATE;
  EXECUTE format('UPDATE public.%I SET quantity = quantity + $1 WHERE id = $2 AND quantity + $1 >= 0 AND ($3 IS NULL OR quantity = $3) RETURNING quantity', p_table)
    INTO next_quantity USING p_delta, p_size_id, p_expected_quantity;
  IF next_quantity IS NULL THEN RAISE EXCEPTION 'Stock changed or adjustment exceeds available quantity. Refresh and try again.'; END IF;
  PERFORM inventory_private.sync_listing_stock(listing_id);
  RETURN next_quantity;
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_size_quantity(text, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_size_quantity(text, uuid, integer, integer) TO authenticated;

CREATE FUNCTION inventory_private.adjust_order_stock(p_product_id uuid, p_variant_id uuid, p_size text, p_delta integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE size_id uuid; target_table text; listing_status text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can confirm payments or change confirmed order stock';
  END IF;
  SELECT status INTO listing_status FROM public.product_listings WHERE id = p_product_id FOR UPDATE;
  IF listing_status IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p_variant_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.product_variants WHERE id = p_variant_id AND listing_id = p_product_id) THEN
      RAISE EXCEPTION 'Variant does not belong to this product';
    END IF;
    SELECT id INTO size_id FROM public.product_variant_sizes WHERE variant_id = p_variant_id AND size_value = p_size;
    target_table := 'product_variant_sizes';
    IF size_id IS NULL AND EXISTS (SELECT 1 FROM public.product_variant_sizes WHERE variant_id = p_variant_id) THEN
      RAISE EXCEPTION 'Ordered size not found';
    END IF;
  ELSE
    SELECT id INTO size_id FROM public.product_listing_sizes WHERE listing_id = p_product_id AND size_value = p_size;
    target_table := 'product_listing_sizes';
    IF size_id IS NULL AND (EXISTS (SELECT 1 FROM public.product_listing_sizes WHERE listing_id = p_product_id)
      OR EXISTS (SELECT 1 FROM public.product_variants WHERE listing_id = p_product_id)) THEN
      RAISE EXCEPTION 'Ordered size or variant not found';
    END IF;
  END IF;
  IF size_id IS NOT NULL THEN
    PERFORM public.adjust_size_quantity(target_table, size_id, p_delta);
  ELSE
    -- Preserve single-item behavior for products without size rows.
    IF p_delta < 0 AND listing_status <> 'active' THEN RAISE EXCEPTION 'Product is out of stock'; END IF;
    UPDATE public.product_listings SET status = CASE WHEN p_delta < 0 THEN 'sold' ELSE 'active' END,
      sold_at = CASE WHEN p_delta < 0 THEN now() ELSE NULL END WHERE id = p_product_id;
  END IF;
END;
$$;

CREATE FUNCTION inventory_private.apply_order_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.stock_deducted := false;
    RETURN NEW;
  END IF;
  NEW.stock_deducted := OLD.stock_deducted;
  IF NOT OLD.stock_deducted AND NEW.status = 'confirmed' THEN
    PERFORM inventory_private.adjust_order_stock(NEW.product_id, NEW.variant_id, NEW.ordered_size, -1);
    NEW.stock_deducted := true;
  ELSIF OLD.stock_deducted AND (NEW.product_id, NEW.variant_id, NEW.ordered_size) IS DISTINCT FROM (OLD.product_id, OLD.variant_id, OLD.ordered_size) THEN
    PERFORM 1 FROM public.product_listings WHERE id IN (OLD.product_id, NEW.product_id) ORDER BY id FOR UPDATE;
    PERFORM inventory_private.adjust_order_stock(OLD.product_id, OLD.variant_id, OLD.ordered_size, 1);
    PERFORM inventory_private.adjust_order_stock(NEW.product_id, NEW.variant_id, NEW.ordered_size, -1);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER apply_order_stock BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION inventory_private.apply_order_stock();

CREATE FUNCTION public.confirm_order_payment(p_order_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE confirmed_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can confirm payments';
  END IF;
  UPDATE public.orders SET status = 'confirmed', updated_at = now()
  WHERE id = p_order_id AND status = 'pending_payment' AND is_deleted = false RETURNING id INTO confirmed_id;
  IF confirmed_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND is_deleted = false) THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  RETURN confirmed_id IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid) TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA inventory_private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA inventory_private TO authenticated;
