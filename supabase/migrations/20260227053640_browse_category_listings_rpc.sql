-- Single server-side RPC that handles size JOIN + filtering + pagination.
-- Only returns columns that CategoryBrowse.tsx actually uses in its render.

DROP FUNCTION IF EXISTS browse_category_listings(text, text[], text[], text[], numeric, numeric, text, text, integer, integer);
DROP FUNCTION IF EXISTS get_listing_ids_for_sizes(text[]);

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
  total_count        bigint
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
      END AS matched_size_price
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
    c.matched_size_price, c.total_count
  FROM counted c
  ORDER BY
    -- When sizes are filtered, sort by the matched size price so results
    -- reflect the actual cost for the chosen size, not the cheapest size overall.
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
