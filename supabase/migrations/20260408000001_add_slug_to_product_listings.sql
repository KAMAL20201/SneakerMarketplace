-- Add SEO-friendly slug to product_listings.
-- Slug format: {title-slugified-max-50-chars}-{first-6-chars-of-uuid}
-- e.g. "Nike Air Max CLOT" with id "a1b2c3d4-..." → "nike-air-max-clot-a1b2c3"

-- 1. Add nullable column
ALTER TABLE product_listings
  ADD COLUMN IF NOT EXISTS slug text;

-- 2. Slugify helper: lowercase, strip non-alphanumeric, collapse hyphens, truncate at 50 chars on word boundary
CREATE OR REPLACE FUNCTION slugify(input text)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  result text;
BEGIN
  -- Lowercase, strip non-alphanumeric (except spaces/hyphens), collapse to single hyphens
  result := regexp_replace(
    regexp_replace(lower(trim(input)), '[^a-z0-9\s-]', '', 'g'),
    '[\s-]+', '-', 'g'
  );
  -- Trim trailing/leading hyphens
  result := trim(BOTH '-' FROM result);
  -- Truncate to 50 chars at last hyphen boundary to avoid cutting mid-word
  IF length(result) > 50 THEN
    result := left(result, 50);
    IF result ~ '-' THEN
      result := regexp_replace(result, '-[^-]*$', '');
    END IF;
  END IF;
  RETURN result;
END;
$$;

-- 3. Backfill all existing rows
UPDATE product_listings
SET slug = slugify(title) || '-' || left(id::text, 6)
WHERE slug IS NULL OR slug = '';

-- 4. Enforce NOT NULL + unique index
ALTER TABLE product_listings ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_listings_slug ON product_listings(slug);

-- 5. Trigger: auto-generate slug for new inserts (fires before insert, so id is already set)
CREATE OR REPLACE FUNCTION generate_listing_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := slugify(NEW.title) || '-' || left(NEW.id::text, 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_slug ON product_listings;
CREATE TRIGGER trg_listing_slug
  BEFORE INSERT ON product_listings
  FOR EACH ROW EXECUTE FUNCTION generate_listing_slug();
