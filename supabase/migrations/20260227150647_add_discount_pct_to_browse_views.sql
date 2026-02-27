-- Add discount_pct computed column to listings_with_images and hot_deals_with_images.
--
-- discount_pct = ((retail_price - price) / retail_price) * 100
-- Uses `price` (not min_price) to match the badge % shown in Browse.tsx UI.
--
-- listings_with_images: 0 when retail_price is NULL / 0 / not above price.
-- hot_deals_with_images: always > 0 (view's WHERE already guarantees
--   retail_price IS NOT NULL AND retail_price > price AND discount >= 30%).
--
-- This enables Browse.tsx to call:
--   .order("discount_pct", { ascending: false, nullsFirst: false })
-- instead of falling through to created_at DESC.

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
    (SELECT MIN(pls.price) FROM product_listing_sizes pls WHERE pls.listing_id = pl.id),
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

-- hot_deals_with_images selects from listings_with_images so it now gets
-- discount_pct too — just add it to the explicit SELECT list.
CREATE OR REPLACE VIEW hot_deals_with_images AS
SELECT
  id,
  user_id,
  title,
  description,
  category,
  brand,
  model,
  size_value,
  condition,
  color,
  material,
  price,
  retail_price,
  currency,
  status,
  is_featured,
  view_count,
  created_at,
  updated_at,
  published_at,
  sold_at,
  search_vector,
  reviewed_at,
  review_comment,
  reviewed_by,
  payment_method_id,
  delivery_days,
  shipping_charges,
  package_weight_kg,
  package_length_cm,
  package_breadth_cm,
  package_width_cm,
  image_url,
  storage_path,
  is_poster_image,
  file_size,
  min_price,
  discount_pct
FROM listings_with_images
WHERE status = 'active'
  AND retail_price IS NOT NULL
  AND retail_price > price
  AND ((retail_price - price) / retail_price) * 100 >= 30;
