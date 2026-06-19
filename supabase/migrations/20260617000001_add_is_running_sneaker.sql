-- Add is_running_sneaker flag to product_listings so admin can curate the Running Sneakers section.
ALTER TABLE product_listings
  ADD COLUMN IF NOT EXISTS is_running_sneaker BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_product_listings_is_running_sneaker
  ON product_listings(is_running_sneaker)
  WHERE is_running_sneaker = TRUE;

-- RLS: allow admins to update is_running_sneaker
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'product_listings'
      AND policyname = 'Admins can update is_running_sneaker'
  ) THEN
    CREATE POLICY "Admins can update is_running_sneaker"
      ON product_listings FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
      );
  END IF;
END
$$;

-- Rebuild views to expose is_running_sneaker
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
  pl.is_new_drop,
  pl.is_hot_deal,
  pl.is_running_sneaker,
  COALESCE(
    (SELECT TRUE FROM product_listing_sizes pls
     WHERE pls.listing_id = pl.id AND pls.is_instant_ship = TRUE LIMIT 1),
    (SELECT TRUE FROM product_variant_sizes pvs
     JOIN product_variants pv ON pv.id = pvs.variant_id
     WHERE pv.listing_id = pl.id AND pvs.is_instant_ship = TRUE LIMIT 1),
    FALSE
  ) AS has_instant_ship
FROM product_listings pl
LEFT JOIN product_images pi
  ON  pl.id = pi.product_id
  AND (pi.is_poster_image = true OR pi.is_poster_image IS NULL)
WHERE pl.is_deleted = FALSE;

-- hot_deals_with_images: curated by admin
CREATE VIEW hot_deals_with_images AS
SELECT *
FROM listings_with_images
WHERE status = 'active'
  AND is_hot_deal = TRUE
  AND retail_price IS NOT NULL
  AND retail_price > price
  AND ((retail_price - price) / retail_price) * 100 >= 30;

-- instant_shipping_with_images
CREATE VIEW instant_shipping_with_images AS
SELECT * FROM listings_with_images
WHERE status = 'active'
  AND (
    has_instant_ship = TRUE
    OR (delivery_days IS NOT NULL
        AND CAST(split_part(delivery_days, '-', 1) AS INTEGER) < 10)
  );

-- Rebuild browse_all_listings to support p_running_sneakers filter
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
  p_instant_shipping boolean DEFAULT false,
  p_running_sneakers boolean DEFAULT false
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
      -- Word-boundary token search: every token must appear as a whole word
      AND (
        v_phrase IS NULL OR v_phrase = ''
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(regexp_split_to_array(v_phrase, '\s+')) AS raw_word,
               LATERAL (
                 SELECT '\m'
                   || regexp_replace(raw_word, '([.?*+^$\[\]\\(){}|])', '\\\1', 'g')
                   || '\M' AS pattern
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
      -- instant shipping: size-level flag OR legacy delivery_days < 10
      AND (NOT p_instant_shipping
           OR l.has_instant_ship = TRUE
           OR (l.delivery_days IS NOT NULL
               AND CAST(split_part(l.delivery_days, '-', 1) AS INTEGER) < 10))
      -- running sneakers curated collection
      AND (NOT p_running_sneakers
           OR l.is_running_sneaker = TRUE)
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
