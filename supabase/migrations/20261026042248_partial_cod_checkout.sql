-- Apply after partial_cod_payment_foundation. No payment is marked received here.
BEGIN;
ALTER TABLE public.orders
  ADD COLUMN checkout_id uuid,
  ADD COLUMN checkout_line integer,
  ADD COLUMN checkout_fingerprint text;
CREATE UNIQUE INDEX orders_checkout_line_unique ON public.orders(checkout_id, checkout_line)
  WHERE checkout_id IS NOT NULL;

CREATE SCHEMA IF NOT EXISTS checkout_private;
GRANT USAGE ON SCHEMA checkout_private TO anon, authenticated;

-- Guest checkout deliberately permits anonymous callers. This narrowly scoped
-- definer can ONLY create pending orders from catalog prices, never confirm them
-- or read arbitrary orders. Authenticated buyer identity comes from auth.uid().
CREATE FUNCTION checkout_private.create_partial_cod_checkout(
  p_checkout_id uuid, p_items jsonb, p_shipping_address jsonb,
  p_expected_amount numeric, p_coupon_code text DEFAULT NULL
) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  item jsonb; line jsonb; listing public.product_listings%ROWTYPE;
  coupon public.coupons%ROWTYPE; variant public.product_variants%ROWTYPE;
  size_row record; created public.orders%ROWTYPE;
  lines jsonb := '[]'::jsonb; product_ids uuid[] := '{}';
  prices numeric[] := '{}'; sizes text[] := '{}';
  product_id uuid; variant_id uuid; selected_size text; quantity integer;
  unit_price numeric; shipping numeric; instant boolean; available integer;
  eligible boolean; eligible_total numeric := 0; discount numeric := 0;
  subtotal numeric := 0; shipping_total numeric := 0; total numeric;
  line_discount numeric; line_fee numeric; line_total numeric; line_advance numeric;
  cumulative_weight numeric := 0; cumulative_eligible numeric := 0;
  previous_fee numeric := 0; previous_discount numeric := 0;
  cumulative_total numeric := 0; previous_advance numeric := 0;
  cumulative_base numeric := 0; previous_base numeric := 0;
  line_index integer := 0; coupon_attached boolean := false;
  fingerprint text; unit_index integer; grouped record;
BEGIN
  IF p_checkout_id IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Enter between 1 and 50 checkout items';
  END IF;
  IF jsonb_typeof(p_shipping_address) IS DISTINCT FROM 'object'
    OR coalesce(trim(p_shipping_address->>'full_name'), '') = ''
    OR coalesce(trim(p_shipping_address->>'phone'), '') = ''
    OR coalesce(trim(p_shipping_address->>'email'), '') = ''
    OR coalesce(trim(p_shipping_address->>'address_line1'), '') = ''
    OR coalesce(trim(p_shipping_address->>'city'), '') = ''
    OR coalesce(trim(p_shipping_address->>'state'), '') = ''
    OR coalesce(p_shipping_address->>'pincode', '') !~ '^[1-9][0-9]{5}$' THEN
    RAISE EXCEPTION 'Shipping name, phone and email are required';
  END IF;
  IF p_expected_amount IS NULL OR p_expected_amount < 0 OR p_expected_amount >= 1000000000 THEN
    RAISE EXCEPTION 'Invalid checkout amount';
  END IF;
  fingerprint := md5(jsonb_build_array(p_items, p_shipping_address, p_expected_amount, p_coupon_code, auth.uid())::text);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_checkout_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.orders WHERE checkout_id = p_checkout_id) THEN
    IF EXISTS (SELECT 1 FROM public.orders WHERE checkout_id = p_checkout_id AND checkout_fingerprint IS DISTINCT FROM fingerprint) THEN
      RAISE EXCEPTION 'Checkout details changed. Please start a new checkout';
    END IF;
    RETURN QUERY SELECT * FROM public.orders WHERE checkout_id = p_checkout_id ORDER BY checkout_line;
    RETURN;
  END IF;
  IF nullif(trim(p_coupon_code), '') IS NOT NULL THEN
    SELECT * INTO coupon FROM public.coupons WHERE upper(code) = upper(trim(p_coupon_code));
    IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    product_id := (item->>'product_id')::uuid;
    variant_id := nullif(item->>'variant_id', '')::uuid;
    selected_size := item->>'size';
    IF coalesce(item->>'quantity', '') !~ '^[1-9][0-9]?$' THEN RAISE EXCEPTION 'Invalid item quantity'; END IF;
    quantity := (item->>'quantity')::integer;
    IF jsonb_array_length(lines) + quantity > 50 THEN RAISE EXCEPTION 'Checkout supports at most 50 units'; END IF;
    SELECT * INTO listing FROM public.product_listings WHERE id = product_id;
    IF NOT FOUND OR listing.status <> 'active' THEN RAISE EXCEPTION 'An item is no longer available. Refresh your cart'; END IF;
    unit_price := listing.price;
    shipping := coalesce(listing.shipping_charges, 0);
    instant := false;
    available := 1;
    IF variant_id IS NOT NULL THEN
      SELECT * INTO variant FROM public.product_variants WHERE id = variant_id AND listing_id = product_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Invalid product variant'; END IF;
      unit_price := coalesce(variant.price, listing.price);
      SELECT s.price, s.quantity, s.is_instant_ship INTO size_row FROM public.product_variant_sizes s
        WHERE s.variant_id = variant.id AND s.size_value = selected_size;
      IF FOUND THEN
        unit_price := size_row.price; available := size_row.quantity; instant := size_row.is_instant_ship;
      ELSIF EXISTS (SELECT 1 FROM public.product_variant_sizes WHERE product_variant_sizes.variant_id = variant.id) THEN
        RAISE EXCEPTION 'Selected size is unavailable';
      END IF;
    ELSE
      IF EXISTS (SELECT 1 FROM public.product_variants WHERE listing_id = product_id) THEN RAISE EXCEPTION 'Select a product variant'; END IF;
      SELECT s.price, s.quantity, s.is_instant_ship INTO size_row FROM public.product_listing_sizes s
        WHERE s.listing_id = product_id AND s.size_value = selected_size;
      IF FOUND THEN
        unit_price := size_row.price; available := size_row.quantity; instant := size_row.is_instant_ship;
      ELSIF EXISTS (SELECT 1 FROM public.product_listing_sizes WHERE listing_id = product_id) THEN
        RAISE EXCEPTION 'Selected size is unavailable';
      ELSIF listing.size_value IS NOT NULL AND listing.size_value IS DISTINCT FROM selected_size THEN
        RAISE EXCEPTION 'Selected size is unavailable';
      END IF;
    END IF;
    IF unit_price IS NULL OR unit_price < 0 OR unit_price >= 1000000000 OR shipping < 0 OR shipping >= 1000000000 THEN
      RAISE EXCEPTION 'Invalid catalog price';
    END IF;
    IF NOT coalesce(instant, false) AND EXISTS (SELECT 1 FROM public.pre_order_products WHERE product_slug = listing.slug)
      AND NOT EXISTS (SELECT 1 FROM public.pre_order_products p JOIN public.pre_order_windows w ON w.id = p.window_id
        WHERE p.product_slug = listing.slug AND w.starts_at <= now() AND w.ends_at >= now()) THEN
      RAISE EXCEPTION 'Pre-order window is closed';
    END IF;
    eligible := coupon.id IS NOT NULL
      AND (coupon.applicable_product_ids IS NULL OR product_id = ANY(coupon.applicable_product_ids))
      AND (NOT coupon.instant_ship_only OR coalesce(instant, false)
        OR (split_part(listing.delivery_days, '-', 1) ~ '^[0-9]+$'
          AND CASE WHEN split_part(listing.delivery_days, '-', 1) ~ '^[0-9]+$' THEN split_part(listing.delivery_days, '-', 1)::integer < 10 ELSE false END));
    FOR unit_index IN 1..quantity LOOP
      lines := lines || jsonb_build_array(jsonb_build_object('product_id', product_id, 'variant_id', variant_id,
        'size', selected_size, 'price', round(unit_price, 2), 'shipping', round(shipping, 2),
        'seller_id', listing.user_id, 'variant_name', CASE WHEN variant_id IS NULL THEN NULL ELSE variant.color_name END,
        'available', available, 'eligible', coalesce(eligible, false)));
      product_ids := array_append(product_ids, product_id);
      prices := array_append(prices, round(unit_price, 2)); sizes := array_append(sizes, selected_size);
      subtotal := subtotal + round(unit_price, 2); shipping_total := shipping_total + round(shipping, 2);
      IF eligible THEN eligible_total := eligible_total + round(unit_price, 2); END IF;
    END LOOP;
  END LOOP;
  -- Repeated cart lines cannot bypass quantity checks. Pending orders reserve no stock;
  -- the existing confirmation trigger performs the atomic stock deduction later.
  FOR grouped IN SELECT value->>'product_id' AS product, value->>'variant_id' AS variant_key,
    value->>'size' AS size_key, count(*) AS requested, min((value->>'available')::integer) AS available
    FROM jsonb_array_elements(lines) GROUP BY 1,2,3 LOOP
    IF grouped.requested > grouped.available THEN RAISE EXCEPTION 'Requested quantity is no longer available'; END IF;
  END LOOP;
  IF coupon.id IS NOT NULL THEN
    -- Validate restrictions using verified prices; never accept a client discount.
    PERFORM 1 FROM public.validate_coupon(coupon.code, product_ids, prices, subtotal, sizes);
    IF eligible_total <= 0 THEN RAISE EXCEPTION 'Coupon is not valid for these variants and sizes'; END IF;
    discount := CASE WHEN coupon.type = 'percentage' THEN round(eligible_total * coupon.value / 100, 2)
      ELSE least(coupon.value, eligible_total) END;
    discount := least(discount, eligible_total);
  END IF;
  total := subtotal - discount + shipping_total;
  IF total <> round(p_expected_amount, 2) THEN
    RAISE EXCEPTION 'Price, shipping or coupon changed. Refresh your cart and review the updated total';
  END IF;

  FOR line IN SELECT value FROM jsonb_array_elements(lines) LOOP
    line_index := line_index + 1;
    -- Cumulative rounding guarantees allocations sum to the checkout totals.
    cumulative_weight := cumulative_weight + (line->>'price')::numeric + (line->>'shipping')::numeric;
    line_fee := round(100 * cumulative_weight / nullif(subtotal + shipping_total, 0)) - previous_fee;
    IF subtotal + shipping_total = 0 THEN line_fee := CASE WHEN line_index = 1 THEN 100 ELSE 0 END; END IF;
    previous_fee := previous_fee + line_fee;
    line_discount := 0;
    IF (line->>'eligible')::boolean THEN
      cumulative_eligible := cumulative_eligible + (line->>'price')::numeric;
      line_discount := round(discount * cumulative_eligible / eligible_total, 2) - previous_discount;
      previous_discount := previous_discount + line_discount;
    END IF;
    cumulative_base := cumulative_base + (line->>'price')::numeric - line_discount + (line->>'shipping')::numeric;
    line_total := round(cumulative_base) - previous_base + line_fee;
    previous_base := round(cumulative_base);
    cumulative_total := cumulative_total + line_total;
    line_advance := round(cumulative_total * 0.7) - previous_advance;
    previous_advance := previous_advance + line_advance;
    INSERT INTO public.orders (buyer_id, seller_id, product_id, amount, status, shipping_address,
      buyer_email, buyer_name, buyer_phone, ordered_size, variant_id, variant_name,
      payment_type, payment_total, cod_fee, advance_amount, cod_amount,
      coupon_id, coupon_code, discount_amount, checkout_id, checkout_line, checkout_fingerprint)
    VALUES (auth.uid(), (line->>'seller_id')::uuid, (line->>'product_id')::uuid, (line->>'price')::numeric,
      'pending_payment', p_shipping_address, p_shipping_address->>'email', p_shipping_address->>'full_name',
      p_shipping_address->>'phone', line->>'size', (line->>'variant_id')::uuid, line->>'variant_name',
      'partial_cod', line_total, line_fee, line_advance, line_total - line_advance,
      CASE WHEN NOT coupon_attached AND (line->>'eligible')::boolean THEN coupon.id ELSE NULL END,
      CASE WHEN NOT coupon_attached AND (line->>'eligible')::boolean THEN coupon.code ELSE NULL END,
      CASE WHEN NOT coupon_attached AND (line->>'eligible')::boolean THEN discount ELSE 0 END,
      p_checkout_id, line_index, fingerprint) RETURNING * INTO created;
    IF (line->>'eligible')::boolean THEN coupon_attached := true; END IF;
    RETURN NEXT created;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION checkout_private.create_partial_cod_checkout(uuid, jsonb, jsonb, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION checkout_private.create_partial_cod_checkout(uuid, jsonb, jsonb, numeric, text) TO anon, authenticated;

CREATE FUNCTION public.create_partial_cod_checkout(
  p_checkout_id uuid, p_items jsonb, p_shipping_address jsonb,
  p_expected_amount numeric, p_coupon_code text DEFAULT NULL
) RETURNS SETOF public.orders
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT * FROM checkout_private.create_partial_cod_checkout(p_checkout_id, p_items, p_shipping_address, p_expected_amount, p_coupon_code);
$$;
REVOKE ALL ON FUNCTION public.create_partial_cod_checkout(uuid, jsonb, jsonb, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partial_cod_checkout(uuid, jsonb, jsonb, numeric, text) TO anon, authenticated;
COMMIT;
