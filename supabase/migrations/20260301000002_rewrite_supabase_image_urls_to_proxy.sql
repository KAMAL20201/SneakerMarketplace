-- Rewrite stored supabase.co image URLs to use the Cloudflare proxy domain.
-- This is a one-time migration for existing rows that were inserted before
-- the VITE_SUPABASE_URL env var was updated to api.theplugmarket.in.

UPDATE product_images
SET image_url = replace(
  image_url,
  'https://vojwfupyoathhvujwaqh.supabase.co',
  'https://api.theplugmarket.in'
)
WHERE image_url LIKE '%vojwfupyoathhvujwaqh.supabase.co%';

UPDATE product_variants
SET image_url = replace(
  image_url,
  'https://vojwfupyoathhvujwaqh.supabase.co',
  'https://api.theplugmarket.in'
)
WHERE image_url LIKE '%vojwfupyoathhvujwaqh.supabase.co%';

UPDATE sellers
SET profile_image_url = replace(
  profile_image_url,
  'https://vojwfupyoathhvujwaqh.supabase.co',
  'https://api.theplugmarket.in'
)
WHERE profile_image_url LIKE '%vojwfupyoathhvujwaqh.supabase.co%';
