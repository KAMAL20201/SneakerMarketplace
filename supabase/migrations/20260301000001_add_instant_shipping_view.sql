CREATE OR REPLACE VIEW instant_shipping_with_images AS
SELECT * FROM listings_with_images
WHERE status = 'active'
  AND delivery_days IS NOT NULL
  AND CAST(split_part(delivery_days, '-', 1) AS INTEGER) < 10;
