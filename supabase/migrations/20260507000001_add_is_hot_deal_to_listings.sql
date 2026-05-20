-- Add is_hot_deal flag to product_listings so admin can curate Hot Deals section.
-- The hot_deals_with_images view is updated to only show admin-selected deals
-- (still must satisfy the 30%+ discount threshold).

ALTER TABLE product_listings
  ADD COLUMN IF NOT EXISTS is_hot_deal BOOLEAN NOT NULL DEFAULT FALSE;

-- Rebuild hot_deals_with_images to respect the is_hot_deal flag.
DROP VIEW IF EXISTS hot_deals_with_images;

CREATE VIEW hot_deals_with_images AS
SELECT *
FROM listings_with_images
WHERE status = 'active'
  AND is_hot_deal = TRUE
  AND retail_price IS NOT NULL
  AND retail_price > price
  AND ((retail_price - price) / retail_price) * 100 >= 30;
