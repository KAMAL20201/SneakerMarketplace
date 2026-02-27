-- RPC to get distinct listing IDs (with their minimum matching price) for
-- a given set of size values from product_listing_sizes.
--
-- Using GROUP BY server-side avoids the 1000-row PostgREST default cap that
-- previously truncated results when querying the table directly.

CREATE OR REPLACE FUNCTION get_listing_ids_for_sizes(p_sizes text[])
RETURNS TABLE (listing_id text, min_price numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    listing_id::text,
    MIN(price) AS min_price
  FROM product_listing_sizes
  WHERE size_value = ANY(p_sizes)
    AND is_sold = false
  GROUP BY listing_id;
$$;
