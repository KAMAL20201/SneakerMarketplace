-- Switch token search from exact-word (\m token \M) to prefix (\m token).
-- Problem: typing a partial word like "dun" built the pattern \mdun\M which
-- requires "dun" to be a complete word, so "Dunk" never matched.
-- Fix: drop the \M suffix so "dun" matches "Dunk", "Dunks", etc. (prefix match).

DROP FUNCTION IF EXISTS browse_all_listings(text[],text[],text[],text[],numeric,numeric,text,text,integer,integer,boolean);
DROP FUNCTION IF EXISTS browse_all_listings(text[],text[],text[],text[],numeric,numeric,text,text,integer,integer,boolean,boolean);

CREATE FUNCTION browse_all_listings(
  p_categories       text[]  DEFAULT NULL,
  p_sizes            text[]  DEFAULT NULL,
  p_brands           text[]  DEFAULT NULL,
  p_conditions       text[]  DEFAULT NULL,
  p_price_min        numeric DEFAULT 0,
  p_price_max        numeric DEFAULT 100000,
  p_search           text    DEFAULT NULL,
  p_sort             text    DEFAULT 'newest',
  p_limit            integer DEFAULT 12,
  p_offset           integer DEFAULT 0,
  p_deals            boolean DEFAULT false,
  p_instant_shipping boolean DEFAULT false
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
DECLARE
  v_phrase text;
BEGIN
  v_phrase := trim(p_search);

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
      -- Prefix token search: every token must appear at a word boundary
      -- (case-insensitive) in title, brand, or description.
      -- Using \m prefix anchor only (no \M suffix) so partial words match
      -- e.g. "dun" matches "Dunk", "sb" matches "SB".
      AND (
        v_phrase IS NULL OR v_phrase = ''
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(regexp_split_to_array(v_phrase, '\s+')) AS raw_word,
               LATERAL (
                 SELECT '\m'
                   || regexp_replace(raw_word, '([.?*+^$\[\]\\(){}|])', '\\\1', 'g')
                   AS pattern
               ) AS t
          WHERE raw_word <> ''
            AND NOT (
              l.title                        ~* t.pattern
              OR l.brand                     ~* t.pattern
              OR COALESCE(l.description, '') ~* t.pattern
            )
        )
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
      -- instant shipping: same logic as instant_shipping_with_images view
      AND (NOT p_instant_shipping
           OR (l.delivery_days IS NOT NULL
               AND CAST(split_part(l.delivery_days, '-', 1) AS INTEGER) < 10))
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
