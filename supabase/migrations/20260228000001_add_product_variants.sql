-- Add product_variants and product_variant_sizes tables.
--
-- product_variants: one row per color/edition option for a listing.
-- product_variant_sizes: one row per (variant, size) pair with individual prices.
--
-- Backward compat: existing product_listing_sizes rows are untouched.
-- The listings_with_images view and get_listing_ids_for_sizes RPC now check
-- BOTH product_variant_sizes (new) and product_listing_sizes (legacy).

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_variants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES product_listings(id) ON DELETE CASCADE,
  color_name    TEXT NOT NULL,        -- e.g. "University Blue", "Chase Edition"
  color_hex     TEXT,                 -- e.g. "#4169E1" for swatch UI (optional)
  price         NUMERIC,              -- price for no-size categories (electronics/collectibles)
  display_order INTEGER DEFAULT 0,    -- order shown in UI
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variant_sizes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  size_value  TEXT NOT NULL,
  price       NUMERIC NOT NULL,
  is_sold     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_sizes ENABLE ROW LEVEL SECURITY;

-- product_variants policies
CREATE POLICY "Anyone can view product variants"
  ON product_variants FOR SELECT USING (true);

CREATE POLICY "Sellers can insert variants for their own listings"
  ON product_variants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_listings pl
      WHERE pl.id = product_variants.listing_id
        AND pl.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update their own variants"
  ON product_variants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM product_listings pl
      WHERE pl.id = product_variants.listing_id
        AND pl.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete their own variants"
  ON product_variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM product_listings pl
      WHERE pl.id = product_variants.listing_id
        AND pl.user_id = auth.uid()
    )
  );

-- product_variant_sizes policies
CREATE POLICY "Anyone can view product variant sizes"
  ON product_variant_sizes FOR SELECT USING (true);

CREATE POLICY "Sellers can insert variant sizes"
  ON product_variant_sizes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM product_variants pv
      JOIN product_listings pl ON pl.id = pv.listing_id
      WHERE pv.id = product_variant_sizes.variant_id
        AND pl.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can update their own variant sizes"
  ON product_variant_sizes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM product_variants pv
      JOIN product_listings pl ON pl.id = pv.listing_id
      WHERE pv.id = product_variant_sizes.variant_id
        AND pl.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can delete their own variant sizes"
  ON product_variant_sizes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM product_variants pv
      JOIN product_listings pl ON pl.id = pv.listing_id
      WHERE pv.id = product_variant_sizes.variant_id
        AND pl.user_id = auth.uid()
    )
  );

-- ── listings_with_images view (updated min_price to cover both tables) ────────

CREATE OR REPLACE VIEW listings_with_images AS
SELECT
  pl.id,
  pl.user_id,
  pl.title,
  pl.description,
  pl.category,
  pl.brand,
  pl.model,
  pl.size_value,
  pl.condition,
  pl.color,
  pl.material,
  pl.price,
  pl.retail_price,
  pl.currency,
  pl.status,
  pl.is_featured,
  pl.view_count,
  pl.created_at,
  pl.updated_at,
  pl.published_at,
  pl.sold_at,
  pl.search_vector,
  pl.reviewed_at,
  pl.review_comment,
  pl.reviewed_by,
  pl.payment_method_id,
  pl.delivery_days,
  pl.shipping_charges,
  pl.package_weight_kg,
  pl.package_length_cm,
  pl.package_breadth_cm,
  pl.package_width_cm,
  pi.image_url,
  pi.storage_path,
  pi.is_poster_image,
  pi.file_size,
  COALESCE(
    -- New variant-based listings
    (SELECT MIN(pvs.price)
     FROM product_variant_sizes pvs
     JOIN product_variants pv ON pv.id = pvs.variant_id
     WHERE pv.listing_id = pl.id AND pvs.is_sold = false),
    -- Legacy multi-size listings
    (SELECT MIN(pls.price) FROM product_listing_sizes pls WHERE pls.listing_id = pl.id),
    -- Single-price fallback
    pl.price
  ) AS min_price,
  CASE
    WHEN pl.retail_price IS NOT NULL
      AND pl.retail_price > 0
      AND pl.retail_price > pl.price
    THEN ((pl.retail_price - pl.price) / pl.retail_price) * 100
    ELSE 0
  END AS discount_pct
FROM product_listings pl
LEFT JOIN product_images pi
  ON  pl.id = pi.product_id
  AND (pi.is_poster_image = true OR pi.is_poster_image IS NULL);

-- hot_deals_with_images inherits from listings_with_images (no change needed,
-- but re-create to pick up the new min_price computation)
CREATE OR REPLACE VIEW hot_deals_with_images AS
SELECT
  id, user_id, title, description, category, brand, model, size_value,
  condition, color, material, price, retail_price, currency, status,
  is_featured, view_count, created_at, updated_at, published_at, sold_at,
  search_vector, reviewed_at, review_comment, reviewed_by, payment_method_id,
  delivery_days, shipping_charges, package_weight_kg, package_length_cm,
  package_breadth_cm, package_width_cm, image_url, storage_path,
  is_poster_image, file_size, min_price, discount_pct
FROM listings_with_images
WHERE status = 'active'
  AND retail_price IS NOT NULL
  AND retail_price > price
  AND ((retail_price - price) / retail_price) * 100 >= 30;

-- ── get_listing_ids_for_sizes RPC (updated to check both tables) ──────────────

CREATE OR REPLACE FUNCTION get_listing_ids_for_sizes(p_sizes text[])
RETURNS TABLE (listing_id text, min_price numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Legacy: product_listing_sizes
  SELECT
    pls.listing_id::text,
    MIN(pls.price) AS min_price
  FROM product_listing_sizes pls
  WHERE pls.size_value = ANY(p_sizes)
    AND pls.is_sold = false
  GROUP BY pls.listing_id

  UNION

  -- New: product_variant_sizes
  SELECT
    pv.listing_id::text,
    MIN(pvs.price) AS min_price
  FROM product_variant_sizes pvs
  JOIN product_variants pv ON pv.id = pvs.variant_id
  WHERE pvs.size_value = ANY(p_sizes)
    AND pvs.is_sold = false
  GROUP BY pv.listing_id;
$$;
