-- Soft-delete support for product_listings.
-- Adds is_deleted flag and rebuilds all dependent views so deleted
-- listings are invisible to buyers and filtered from browse RPCs.

-- ── 1. Add column ─────────────────────────────────────────────────────────────
ALTER TABLE product_listings
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_product_listings_is_deleted
  ON product_listings(is_deleted)
  WHERE is_deleted = FALSE;

-- ── 2. RLS: sellers can soft-delete their own listings ────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_listings'
      AND policyname = 'Sellers can soft-delete their own listings'
  ) THEN
    CREATE POLICY "Sellers can soft-delete their own listings"
      ON product_listings FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

-- ── 3. Rebuild views to exclude soft-deleted listings ─────────────────────────
DROP VIEW IF EXISTS instant_shipping_with_images;
DROP VIEW IF EXISTS hot_deals_with_images;
DROP VIEW IF EXISTS listings_with_images;

CREATE VIEW listings_with_images AS
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
    (SELECT MIN(pls.price) FROM product_listing_sizes pls WHERE pls.listing_id = pl.id),
    pl.price
  ) AS min_price,
  CASE
    WHEN pl.retail_price IS NOT NULL
      AND pl.retail_price > 0
      AND pl.retail_price > pl.price
    THEN ((pl.retail_price - pl.price) / pl.retail_price) * 100
    ELSE 0
  END AS discount_pct,
  pl.slug,
  pl.is_new_drop
FROM product_listings pl
LEFT JOIN product_images pi
  ON  pl.id = pi.product_id
  AND (pi.is_poster_image = true OR pi.is_poster_image IS NULL)
WHERE pl.is_deleted = FALSE;

CREATE VIEW hot_deals_with_images AS
SELECT *
FROM listings_with_images
WHERE status = 'active'
  AND retail_price IS NOT NULL
  AND retail_price > price
  AND ((retail_price - price) / retail_price) * 100 >= 30;

CREATE VIEW instant_shipping_with_images AS
SELECT * FROM listings_with_images
WHERE status = 'active'
  AND delivery_days IS NOT NULL
  AND CAST(split_part(delivery_days, '-', 1) AS INTEGER) < 10;
