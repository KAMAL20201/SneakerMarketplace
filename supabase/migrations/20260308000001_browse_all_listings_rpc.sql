-- browse_all_listings: general-purpose browse RPC for the Browse page.
-- Mirrors browse_category_listings but supports:
--   • optional multi-category filter (p_categories)
--   • deals mode (p_deals — filters discount_pct >= 30, same as hot_deals_with_images)
-- Size filtering is done server-side via product_listing_sizes JOIN, avoiding
-- a massive client-side IN (...) clause.

CREATE OR REPLACE FUNCTION browse_all_listings(
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
  id           uuid,
  title        text,
  brand        text,
  price        numeric,
  min_price    numeric,
  retail_price numeric,
  size_value   text,
  condition    text,
  image_url    text,
  created_at   timestamptz,
  discount_pct numeric,
  total_count  bigint
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
      l.discount_pct
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
      -- deals mode: same threshold as hot_deals_with_images view
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
    c.discount_pct, c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN p_sort = 'price-low'     THEN c.min_price    END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price-high'    THEN c.min_price    END DESC NULLS LAST,
    CASE WHEN p_sort = 'discount-high' THEN c.discount_pct END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('price-low', 'price-high', 'discount-high')
                                       THEN c.created_at   END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
