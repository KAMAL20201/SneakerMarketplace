-- Add 'discount-high' sort option to browse_category_listings RPC.
-- Sorts by (retail_price - effective_price) / retail_price DESC so the
-- biggest % discount off retail appears first.
--
-- effective_price = matched_size_price when a size filter is active
--                  (price for the selected size, e.g. UK8 or UK9),
--                  falling back to min_price when that is NULL.
--                  When no size filter is active matched_size_price is
--                  always NULL (see base CTE), so COALESCE always resolves
--                  to min_price automatically.
--
-- Edge cases:
--   retail_price IS NULL        → CASE returns NULL → NULLS LAST (bottom)
--   retail_price = 0            → condition false   → NULL → NULLS LAST
--   retail_price ≤ effective    → value ≤ 0         → below positive discounts
--   size filter + no match      → already excluded by WHERE clause

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
    -- Price sorts: when sizes are filtered use matched_size_price so the
    -- result reflects the actual cost for the chosen size.
    CASE WHEN p_sort = 'price-low'
      THEN COALESCE(c.matched_size_price, c.min_price) END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price-high'
      THEN COALESCE(c.matched_size_price, c.min_price) END DESC NULLS LAST,
    -- Discount sort: (retail_price - effective_price) / retail_price DESC
    -- effective_price = matched_size_price (size filter active) or min_price.
    -- NULL retail_price / zero retail_price / no discount → NULLS LAST.
    CASE WHEN p_sort = 'discount-high'
           AND c.retail_price IS NOT NULL
           AND c.retail_price > 0
      THEN (c.retail_price - COALESCE(c.matched_size_price, c.min_price)) / c.retail_price
    END DESC NULLS LAST,
    CASE WHEN p_sort NOT IN ('price-low', 'price-high', 'discount-high')
                                    THEN c.created_at END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
