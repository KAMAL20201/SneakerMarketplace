-- Fix NULL description causing wrong matches in multi-word token search.
-- When l.description IS NULL, `NULL ILIKE '%word%'` evaluates to NULL (not FALSE),
-- which causes NULL propagation that makes NOT EXISTS return TRUE incorrectly,
-- letting listings without matching words pass the filter.
-- Fix: COALESCE(l.description, '') so NULL description acts as empty string.

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
      -- Multi-word search: every token must match somewhere in title/brand/description.
      -- COALESCE on description prevents NULL propagation that would bypass the filter.
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
