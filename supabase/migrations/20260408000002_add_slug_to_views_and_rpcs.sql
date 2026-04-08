-- Add slug field to listings_with_images, hot_deals_with_images,
-- browse_category_listings, and browse_all_listings so frontend
-- can generate SEO-friendly product URLs from listing data.

-- ─── listings_with_images ──────────────────────────────────────────────────────
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
  END AS discount_pct,
  pl.slug
FROM product_listings pl
LEFT JOIN product_images pi
  ON  pl.id = pi.product_id
  AND (pi.is_poster_image = true OR pi.is_poster_image IS NULL);

-- ─── hot_deals_with_images ─────────────────────────────────────────────────────
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
  discount_pct,
  slug
FROM listings_with_images
WHERE status = 'active'
  AND retail_price IS NOT NULL
  AND retail_price > price
  AND ((retail_price - price) / retail_price) * 100 >= 30;

-- ─── browse_category_listings ──────────────────────────────────────────────────
DROP FUNCTION IF EXISTS browse_category_listings(text, text[], text[], text[], numeric, numeric, text, text, integer, integer);

CREATE OR REPLACE FUNCTION browse_category_listings(
  p_category    text,
  p_sizes       text[]  DEFAULT NULL,
  p_brands      text[]  DEFAULT NULL,
  p_conditions  text[]  DEFAULT NULL,
  p_price_min   numeric DEFAULT 0,
  p_price_max   numeric DEFAULT 100000,
  p_search      text    DEFAULT NULL,
  p_sort        text    DEFAULT 'newest',
  p_limit       integer DEFAULT 12,
  p_offset      integer DEFAULT 0
)
RETURNS TABLE (
  id                 uuid,
  title              text,
  brand              text,
  price              numeric,
  min_price          numeric,
  retail_price       numeric,
  size_value         text,
  condition          text,
  image_url          text,
  created_at         timestamptz,
  matched_size_price numeric,
  total_count        bigint,
  slug               text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      l.id,
      l.title,
      l.brand,
      l.price,
      l.min_price,
      l.retail_price,
      l.size_value,
      l.condition,
      l.image_url,
      l.created_at,
      CASE
        WHEN p_sizes IS NOT NULL AND array_length(p_sizes, 1) > 0 THEN
          COALESCE(
            sm.min_match_price,
            CASE WHEN l.size_value = ANY(p_sizes) THEN l.price ELSE NULL END
          )
        ELSE NULL::numeric
      END AS matched_size_price,
      l.slug
    FROM listings_with_images l
    LEFT JOIN LATERAL (
      SELECT MIN(pls.price) AS min_match_price
      FROM product_listing_sizes pls
      WHERE p_sizes IS NOT NULL
        AND array_length(p_sizes, 1) > 0
        AND pls.listing_id = l.id
        AND pls.size_value = ANY(p_sizes)
        AND pls.is_sold = false
    ) sm ON true
    WHERE l.status = 'active'
      AND l.category = p_category
      AND l.price >= p_price_min
      AND l.price <= p_price_max
      AND (p_brands IS NULL     OR array_length(p_brands, 1) = 0     OR l.brand     = ANY(p_brands))
      AND (p_conditions IS NULL OR array_length(p_conditions, 1) = 0 OR l.condition = ANY(p_conditions))
      AND (
        p_search IS NULL OR p_search = ''
        OR l.title       ILIKE '%' || p_search || '%'
        OR l.brand       ILIKE '%' || p_search || '%'
        OR l.description ILIKE '%' || p_search || '%'
      )
      AND (
        p_sizes IS NULL
        OR array_length(p_sizes, 1) = 0
        OR l.size_value = ANY(p_sizes)
        OR sm.min_match_price IS NOT NULL
      )
  ),
  counted AS (
    SELECT *, COUNT(*) OVER() AS total_count FROM base
  )
  SELECT
    c.id, c.title, c.brand, c.price, c.min_price, c.retail_price,
    c.size_value, c.condition, c.image_url, c.created_at,
    c.matched_size_price, c.total_count, c.slug
  FROM counted c
  ORDER BY
    CASE WHEN p_sort = 'price-low'
      THEN COALESCE(c.matched_size_price, c.min_price) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price-high'
      THEN COALESCE(c.matched_size_price, c.min_price) END DESC NULLS LAST,
    CASE WHEN p_sort = 'oldest'     THEN c.created_at END ASC  NULLS LAST,
    CASE WHEN p_sort NOT IN ('price-low', 'price-high', 'oldest')
                                    THEN c.created_at END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ─── browse_all_listings ───────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS browse_all_listings(text[],text[],text[],text[],numeric,numeric,text,text,integer,integer,boolean);

CREATE FUNCTION browse_all_listings(
  p_categories  text[]  DEFAULT NULL,
  p_sizes       text[]  DEFAULT NULL,
  p_brands      text[]  DEFAULT NULL,
  p_conditions  text[]  DEFAULT NULL,
  p_price_min   numeric DEFAULT 0,
  p_price_max   numeric DEFAULT 100000,
  p_search      text    DEFAULT NULL,
  p_sort        text    DEFAULT 'newest',
  p_limit       integer DEFAULT 12,
  p_offset      integer DEFAULT 0,
  p_deals       boolean DEFAULT false
)
RETURNS TABLE (
  id                 uuid,
  title              text,
  brand              text,
  price              numeric,
  min_price          numeric,
  retail_price       numeric,
  size_value         text,
  condition          text,
  image_url          text,
  created_at         timestamptz,
  discount_pct       numeric,
  matched_size_price numeric,
  total_count        bigint,
  slug               text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      l.id,
      l.title,
      l.brand,
      l.price,
      l.min_price,
      l.retail_price,
      l.size_value,
      l.condition,
      l.image_url,
      l.created_at,
      l.discount_pct,
      CASE
        WHEN p_sizes IS NOT NULL AND array_length(p_sizes, 1) > 0 THEN
          COALESCE(
            sm.min_match_price,
            CASE WHEN l.size_value = ANY(p_sizes) THEN l.price ELSE NULL END
          )
        ELSE NULL::numeric
      END AS matched_size_price,
      l.slug
    FROM listings_with_images l
    LEFT JOIN LATERAL (
      SELECT MIN(pls.price) AS min_match_price
      FROM product_listing_sizes pls
      WHERE p_sizes IS NOT NULL
        AND array_length(p_sizes, 1) > 0
        AND pls.listing_id = l.id
        AND pls.size_value = ANY(p_sizes)
        AND pls.is_sold = false
    ) sm ON true
    WHERE l.status = 'active'
      AND l.price >= p_price_min
      AND l.price <= p_price_max
      AND (p_categories IS NULL OR array_length(p_categories, 1) = 0 OR l.category = ANY(p_categories))
      AND (p_brands     IS NULL OR array_length(p_brands,     1) = 0 OR l.brand     = ANY(p_brands))
      AND (p_conditions IS NULL OR array_length(p_conditions, 1) = 0 OR l.condition = ANY(p_conditions))
      -- Multi-word search: every token must match somewhere in title/brand/description.
      AND (
        p_search IS NULL OR trim(p_search) = ''
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(regexp_split_to_array(trim(p_search), '\s+')) AS word
          WHERE word <> ''
            AND NOT (
              l.title                        ILIKE '%' || word || '%'
              OR l.brand                     ILIKE '%' || word || '%'
              OR COALESCE(l.description, '') ILIKE '%' || word || '%'
            )
        )
      )
      AND (
        p_sizes IS NULL
        OR array_length(p_sizes, 1) = 0
        OR l.size_value = ANY(p_sizes)
        OR sm.min_match_price IS NOT NULL
      )
      AND (NOT p_deals
           OR (l.retail_price IS NOT NULL
               AND l.retail_price > l.price
               AND ((l.retail_price - l.price) / l.retail_price) * 100 >= 30))
  ),
  counted AS (
    SELECT *, COUNT(*) OVER() AS total_count FROM base
  )
  SELECT
    c.id, c.title, c.brand, c.price, c.min_price, c.retail_price,
    c.size_value, c.condition, c.image_url, c.created_at,
    c.discount_pct, c.matched_size_price, c.total_count, c.slug
  FROM counted c
  ORDER BY
    CASE WHEN p_sort = 'price-low'
      THEN COALESCE(c.matched_size_price, c.min_price) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price-high'
      THEN COALESCE(c.matched_size_price, c.min_price) END DESC NULLS LAST,
    CASE WHEN p_sort = 'discount-high' THEN c.discount_pct END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('price-low', 'price-high', 'discount-high')
                                       THEN c.created_at   END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
