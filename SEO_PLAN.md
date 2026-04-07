# 📋 Complete SEO Plan for ThePlugMarket.in

**Created:** 5 April 2026  
**Status:** Pending Execution

---

## Current Audit Summary

### ✅ What's Already Done Right

- `react-helmet-async` on all major pages (Home, Browse, Product Detail, Category)
- Structured Data (JSON-LD) for `WebSite`, `Organization`, and `Product` schemas
- Dynamic product sitemap via Supabase Edge Function
- Static sitemap for category/info pages
- Canonical URLs on all pages
- Open Graph + Twitter Card meta tags
- Google Analytics 4 + Microsoft Clarity
- `robots.txt` properly configured
- Image lazy loading via `OptimizedImage` component
- Font preconnect + `display=swap`

### ❌ Critical Gaps

- Site is a client-side rendered SPA — crawlers may not see dynamic content
- Target keywords not placed in H1/title/meta optimally
- Several public pages (About, Contact, Privacy, Terms, Shipping) missing Helmet tags
- No `<lastmod>` in static sitemap
- No Google Search Console setup (assumed)
- No blog or content strategy
- Low domain authority (~300 users)
- Product URLs use UUIDs instead of SEO-friendly slugs

---

## PHASE 1 — Immediate Wins (Week 1–2) 🔥

### 1. Fix the SPA Rendering Problem (BIGGEST Issue) ✅ IMPLEMENTED

**Root cause of 993 "Discovered — not indexed" pages:**

- Google visits `/product/uuid` → Vercel serves blank `<div id="root"></div>` shell
- Google's JS rendering queue is slow/limited — it doesn't render every page
- Result: Google sees empty content → refuses to index

**Solution implemented:** `middleware.ts` — Vercel Edge Middleware that:

- Detects bot User-Agents (Googlebot, Bingbot, Facebook, Twitter, etc.)
- Routes them to Prerender.io which returns fully-rendered HTML
- Regular users are completely unaffected (zero performance impact)

**To activate (requires Prerender.io account):**

1. Sign up at https://prerender.io (free: 250 pages/month, paid: $15/mo for 50k pages)
2. Copy your token from the Prerender dashboard
3. Go to Vercel → Your Project → Settings → Environment Variables
4. Add: `PRERENDER_TOKEN` = `your_token_here`
5. Redeploy → bots immediately start getting rendered HTML
6. Within 2–4 weeks, the 993 "Discovered" pages will move to "Indexed"

**How to verify it's working:**

- Open DevTools → Network → visit a product URL
- Add `?_escaped_fragment_=` to the URL or use `curl -A "Googlebot" https://theplugmarket.in/product/your-id`
- You should see full HTML content, not just `<div id="root"></div>`

### 2. Optimize Target Keywords in Key Pages

Target keywords need better placement:

| Target Keyword                     | Where to Place                                     |
| ---------------------------------- | -------------------------------------------------- |
| **"Authentic Sneakers"**           | Home H1, Home meta description, About page, Footer |
| **"Sneakers Marketplace"**         | Home title, Home H1, Browse page title             |
| **"100% Authentic Sneakers"**      | Home hero text, Product pages, Trust badges        |
| **"Buy Authentic Sneakers India"** | Home meta description, Category page descriptions  |

**Current Home H1:** `"Discover the Hottest Drops & Collectibles"` — ❌ no target keywords  
**Recommended Home H1:** `"India's Trusted Marketplace for Authentic Sneakers & Streetwear"`

**Current meta description:** mentions "authentic sneakers" ✅ but not "100% authentic" or "sneakers marketplace"  
**Recommended:** `"The Plug Market — India's #1 sneakers marketplace. Shop 100% authentic sneakers, limited edition drops, and premium streetwear. Every product verified."`

### 3. Add Missing Helmet Tags to Pages

Pages missing `<Helmet>` entirely:

- `AboutUs.tsx`
- `ContactUs.tsx` (verify)
- `PrivacyPolicy.tsx` (verify)
- `TermsOfService.tsx` (verify)
- `ShippingPolicy.tsx` (verify)

**Every public page needs:**

- `<title>` with target keyword
- `<meta name="description">` (150–160 chars)
- `<link rel="canonical">`
- OG tags (og:title, og:description, og:url)

### 4. Add `<lastmod>` to Static Sitemap

The `sitemap.xml` has no `<lastmod>` dates. Google uses these to prioritize re-crawling. Add `<lastmod>` with the date the page content was last changed.

### 5. Set Up Google Search Console

- Go to [search.google.com/search-console](https://search.google.com/search-console)
- Verify ownership (DNS TXT record or HTML meta tag)
- Submit both sitemaps (`sitemap.xml` and `sitemap-products.xml`)
- Request indexing for top 10 pages
- This is also how to **check if pages are indexed**

---

## PHASE 2 — Technical SEO (Week 2–4) ⚙️

### 6. Add Breadcrumb Structured Data to All Pages

Currently only Product pages have breadcrumb JSON-LD. Add to Browse, Category, and info pages too.

### 7. Add `ItemList` Schema to Browse/Category Pages

When Google sees a list of products, an `ItemList` schema helps it understand the page is a collection:

```json
{
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://theplugmarket.in/product/abc"
    }
  ]
}
```

### 8. Improve Product Schema

Current Product schema is good but missing:

- `sku` — add if product SKUs exist
- `gtin` / `mpn` — add if model numbers exist
- `aggregateRating` — add when reviews are implemented
- `review` — add when reviews are implemented
- `category` — e.g., "Sneakers" or "Streetwear"

### 9. Add `hreflang` for India Targeting

```html
<link rel="alternate" hreflang="en-in" href="https://theplugmarket.in/" />
<link rel="alternate" hreflang="en" href="https://theplugmarket.in/" />
```

### 10. Optimize Image SEO

- Ensure all product images have **descriptive alt text** (e.g., `"Nike Air Jordan 1 Retro High OG - Size 10 - Authentic"` not just `"product image"`)
- Add `<image:image>` tags to sitemap entries for product pages
- Use WebP format where possible (Supabase Storage can transform)

### 11. Internal Linking Strategy

- Product pages → related products (already have `similarProducts` ✅)
- Category pages → sub-categories/brands
- Add a **"Shop by Brand"** page (e.g., `/brands/nike`, `/brands/adidas`) — high-value search terms
- Footer → links to all categories, brands, and key pages

---

## PHASE 3 — Content & Authority (Week 4–8) 📝

### 12. Create SEO Landing Pages

| Page                     | URL                               | Target Keyword                                       |
| ------------------------ | --------------------------------- | ---------------------------------------------------- |
| Authentic Sneakers India | `/authentic-sneakers`             | "authentic sneakers", "buy authentic sneakers india" |
| Brand pages              | `/brand/nike`, `/brand/adidas`    | "buy nike sneakers india", "authentic adidas india"  |
| Blog/Guides              | `/blog/how-to-spot-fake-sneakers` | "how to spot fake sneakers"                          |
| Authentication Guide     | `/authentication-process`         | "sneaker authentication india"                       |

### 13. Start a Blog

Blog posts are the #1 way to drive organic traffic. Topics:

- "How to Spot Fake vs Authentic Sneakers" — huge search volume
- "Best Sneakers Under ₹10,000 in India"
- "Nike Dunk vs Air Jordan 1: Which to Buy?"
- "Top 10 Sneaker Releases in 2026"
- "Why Buy from The Plug Market? Our Authentication Process"

**Frequency:** Even 2 posts/month makes a significant difference.

### 14. Build Backlinks

With ~300 users, domain authority is low. Ways to build:

- **Google Business Profile** — create one with business details
- **Social Profiles** — ensure consistent NAP (Name, Address, Phone) across Instagram, Facebook, etc.
- **Sneaker forums/Reddit** — participate genuinely, link when relevant
- **Guest posts** — write for Indian fashion/lifestyle blogs
- **PR/Media** — get covered in sneaker blogs, local news

---

## PHASE 4 — Supabase Optimizations 🗃️

### 15. Add SEO Fields to Product Listings Table

```sql
ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE product_listings ADD COLUMN IF NOT EXISTS meta_keywords text[];
```

**Why?** Instead of `/product/uuid-here`, URLs become `/product/nike-air-jordan-1-retro-high-og` — much better for SEO.

### 16. Enhance Dynamic Sitemap Edge Function

Current sitemap only includes `id` and `updated_at`. Enhance to include:

- Product images via `<image:image>` tags
- Product title (useful for sitemap validation tools)
- Brand-specific pages
- Blog pages (when added)

### 17. Add a Supabase Edge Function for Dynamic OG Images

Generate unique OG images per product (product name + image + price overlaid). This massively improves click-through from social shares and can help with rich snippets.

---

## PHASE 5 — Performance (Ongoing) ⚡

### 18. Core Web Vitals

Google uses these as ranking signals:

- **LCP (Largest Contentful Paint)** — optimize hero images, use `fetchpriority="high"` on above-the-fold images
- **CLS (Cumulative Layout Shift)** — ensure all images have explicit width/height
- **INP (Interaction to Next Paint)** — keep JS bundles small, lazy loading is good

**Test at:** [PageSpeed Insights](https://pagespeed.web.dev/) and [web.dev/measure](https://web.dev/measure/)

### 19. Add Cache Headers for Static Assets

`vercel.json` has security headers ✅ but no explicit cache-control for static assets. Add immutable caching for images/fonts.

---

## 🔍 How to Check if Pages Are on Google

### Method 1: Google Search Console (Best)

1. Go to [Search Console](https://search.google.com/search-console)
2. **URL Inspection tool** — paste any URL → shows if it's indexed, when it was last crawled, and any issues
3. **Coverage report** → shows all indexed vs excluded pages
4. **Performance report** → shows which queries bring users and average position

### Method 2: Manual Search Operators

- `site:theplugmarket.in` — shows all indexed pages
- `site:theplugmarket.in nike jordan` — shows if specific product pages are indexed
- `site:theplugmarket.in "Air Jordan 1"` — exact match search
- `"theplugmarket.in"` — shows mentions/backlinks

### Method 3: Search for Specific Products

- Search `"Nike Air Jordan 1" theplugmarket.in` on Google
- If nothing shows, that product page isn't indexed
- If it shows on page 10+, more authority/optimization needed

---

## 📊 How to Get Into Top 10 Results

| Factor                | Weight | Current Status      | Action                               |
| --------------------- | ------ | ------------------- | ------------------------------------ |
| **Content relevance** | 30%    | ⚠️ Medium           | Optimize keywords in H1, title, meta |
| **Domain authority**  | 25%    | ❌ Low (~300 users) | Build backlinks, create content      |
| **Technical SEO**     | 20%    | ⚠️ SPA problem      | Pre-rendering, structured data       |
| **User experience**   | 15%    | ✅ Good             | Keep improving Core Web Vitals       |
| **Content freshness** | 10%    | ✅ Good             | Blog posts, new products regularly   |

### Realistic Timeline

- **Month 1–2:** Fix technical issues (pre-rendering, sitemaps, meta tags) → pages get indexed
- **Month 2–4:** Create content (blog, brand pages) → start ranking for long-tail keywords
- **Month 4–6:** Build authority (backlinks, social proof) → climb from page 5+ to page 2–3
- **Month 6–12:** Consistent effort → top 10 for long-tail terms like "buy authentic Nike Jordan India"
- **Month 12+:** Top 10 for competitive terms like "authentic sneakers India"

> ⚠️ For highly competitive terms like "sneakers marketplace", expect 6–12 months of consistent work. For long-tail terms like "buy authentic Air Jordan 1 India" you can rank in 2–3 months.

---

## 🎯 Priority Action Items (Do These First)

1. [x] **Set up Google Search Console** — ✅ Done
2. [x] **Add pre-rendering** (Prerender.io) — ✅ middleware.ts deployed, sitemaps submitted to Prerender
3. [x] **Fix Home page H1 and meta description** — ✅ Done (target keywords in H1, title, meta)
4. [x] **Add Helmet to ALL public pages** — ✅ Done (About, Contact, Privacy, Terms, Shipping)
5. [ ] **Add `slug` field to products** — URL-friendly product names
6. [ ] **Create a "Shop by Brand" section/page**
7. [ ] **Start a blog** — even 2 posts/month makes a difference
8. [ ] **Enhance product schema** with `sku`, `category`, `review` fields
9. [ ] **Monitor with Search Console weekly** — track impressions, clicks, average position
10. [ ] **Add `ItemList` schema to Browse/Category pages**

---

## Code Changes Checklist

Files to modify:

- [x] `middleware.ts` — ✅ Vercel Edge Middleware for Prerender.io bot detection
- [x] `index.html` — ✅ updated meta description, keywords, OG tags with target keywords
- [x] `src/pages/Home.tsx` — ✅ H1, meta description, title updated with target keywords
- [x] `src/pages/AboutUs.tsx` — ✅ Helmet added
- [x] `src/pages/ContactUs.tsx` — ✅ Helmet added
- [x] `src/pages/PrivacyPolicy.tsx` — ✅ Helmet added
- [x] `src/pages/TermsOfService.tsx` — ✅ Helmet added
- [x] `src/pages/ShippingPolicy.tsx` — ✅ Helmet added
- [ ] `src/pages/Browse.tsx` — add `ItemList` JSON-LD schema
- [ ] `src/pages/CategoryBrowse.tsx` — add `ItemList` JSON-LD schema, optimize descriptions
- [ ] `public/sitemap.xml` — add `<lastmod>` dates
- [ ] `supabase/functions/sitemap/index.ts` — add image tags, enhance data
- [ ] `src/components/Footer.tsx` — add keyword-rich links
- [ ] Supabase migration — add `slug`, `seo_title`, `seo_description` columns

---

_This plan should be reviewed and executed in phases. Track progress using the checkboxes above._
