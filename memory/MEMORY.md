# SneakInMarket — Project Memory

## Architecture
- Next.js (React + TypeScript) frontend in `src/`
- Supabase backend (Postgres + Storage + Auth)
- Pages in `src/pages/`, components in `src/components/`
- Contexts in `src/contexts/`, constants in `src/constants/`

## Key Files
- `src/pages/Sell.tsx` — 7-step multi-step sell form (~1700 lines)
- `src/contexts/SellerFormContext.tsx` — form state types and provider
- `src/constants/sellConstants.ts` — category config (brands, sizes, variantLabel, hasColorPicker)
- `src/constants/enums.ts` — CATEGORY_IDS, PRODUCT_CONDITIONS, DELIVERY_TIMELINES, etc.
- `src/pages/ProductDetailPage.tsx` — product detail with color swatches and size grid
- `supabase/migrations/` — all DB migrations (applied with `npx supabase db push`)

## DB Tables
- `product_listings` — main listing row (price = min across all variants)
- `product_variants` — one row per color/edition variant per listing (NEW — added 2026-02-28)
- `product_variant_sizes` — sizes with prices per variant (NEW — added 2026-02-28)
- `product_listing_sizes` — LEGACY multi-size (still exists for backward compat)
- `product_images` — images linked to listings
- `sellers` — seller profiles

## Views
- `listings_with_images` — listings + poster image + min_price (checks both product_variant_sizes and product_listing_sizes)
- `hot_deals_with_images` — active listings with ≥30% discount

## Variant System (implemented 2026-02-28)
- `product_variants`: color_name, color_hex (nullable), price (for no-size categories), display_order
- `product_variant_sizes`: variant_id, size_value, price, is_sold
- Categories:
  - Sneakers: variantLabel="Colorway", hasSize=true, hasColorPicker=true
  - Clothing: variantLabel="Color", hasSize=true, hasColorPicker=true
  - Electronics: variantLabel="Color", hasSize=false, hasColorPicker=true (price per variant)
  - Collectibles: variantLabel="Edition / Variant", hasSize=false, hasColorPicker=false (free-text)
- Sell page Step 4: variant cards (color name + hex picker + sizes or price depending on hasSize)
- Step 5: only Retail/MRP price (selling prices live in variants now)
- ProductDetailPage: color swatch row above size grid; clicking swatch updates available sizes + price

## Supabase Migration Notes
- Migration history sometimes needs repair: `npx supabase migration repair --status reverted <ids>`
- Then push: `npx supabase db push`
- MCP is read-only; always use CLI for actual pushes

## Category IDs
- sneakers, clothing, electronics, collectibles (from CATEGORY_IDS enum)
