# 📋 Complete SEO Plan for ThePlugMarket.in

**Created:** 5 April 2026  
**Last Updated:** 9 April 2026  
**Status:** Phase 1 Complete — Phase 2 In Progress

---

## Current Audit Summary

### ✅ What's Been Done

- **Migrated from SPA to SSR + React Router** — eliminates the original #1 blocker (crawlers now get fully rendered HTML)
- `react-helmet-async` on all major pages (Home, Browse, Product Detail, Category, About, Contact, Privacy, Terms, Shipping)
- Structured Data (JSON-LD) for `WebSite`, `Organization`, and `Product` schemas
- Dynamic product sitemap via Supabase Edge Function
- Static sitemap for category/info pages
- Canonical URLs on all pages
- Open Graph + Twitter Card meta tags
- Google Analytics 4 + Microsoft Clarity
- `robots.txt` properly configured
- Image lazy loading via `OptimizedImage` component
- Font preconnect + `display=swap`
- **Google Search Console** set up, sitemaps submitted — products starting to get indexed ✅
- **Home page H1 & meta description** optimized with target keywords ✅
- **SEO-friendly slugs** added to product URLs ✅
- **Prerender.io middleware** — deployed but **no longer needed** since SSR migration (can be removed)
- **PageSpeed Insights SEO score: 100** ✅
- Slight progress on backlink building

### ❌ Remaining Gaps

- No blog or content strategy (planned but not started)
- No "Shop by Brand" page
- No `ItemList` schema on Browse/Category pages
- No `hreflang` tags for India targeting
- No dynamic OG image generation
- Product schema missing `sku`, `category`, `aggregateRating` fields
- `<lastmod>` not present in static sitemap
- Dynamic sitemap missing `<image:image>` tags
- Core Web Vitals (non-SEO metrics) need fixes
- Low domain authority — still early stage
- Footer could have more keyword-rich internal links

---

## ~~PHASE 1 — Immediate Wins~~ ✅ COMPLETE

### 1. ~~Fix the SPA Rendering Problem~~ ✅ RESOLVED

**Original problem:** Google visited pages → got blank `<div id="root"></div>` → refused to index.

**Original fix:** Prerender.io middleware for bot detection.

**Final fix:** Full migration to **SSR + React Router**. Crawlers now receive fully server-rendered HTML on every request. This is the gold standard solution.

> **🧹 Cleanup:** The `middleware.ts` Prerender.io edge middleware can be **removed** — SSR makes it unnecessary. The `PRERENDER_TOKEN` env var in Vercel can also be deleted.

### 2. ~~Optimize Target Keywords in Key Pages~~ ✅ DONE

Home H1, title, and meta descriptions updated with target keywords.

### 3. ~~Add Missing Helmet Tags to Pages~~ ✅ DONE

All public pages now have `<title>`, `<meta description>`, `<link rel="canonical">`, and OG tags.

### 4. ~~Set Up Google Search Console~~ ✅ DONE

Sitemaps submitted. Products starting to move from "Discovered" → "Indexed".

### 5. ~~Add SEO-Friendly Slugs~~ ✅ DONE

Product URLs now use slugs instead of UUIDs.

---

## PHASE 2 — Technical SEO (Current Phase) ⚙️

### 6. Add `<lastmod>` to Static Sitemap

The `sitemap.xml` still has no `<lastmod>` dates. Google uses these to prioritize re-crawling.

**Action:** Update `public/sitemap.xml` with `<lastmod>` dates matching when each page was last meaningfully changed.

### 7. Add `ItemList` Schema to Browse/Category Pages

When Google sees a list of products, `ItemList` schema helps it understand the page is a collection:

```json
{
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://theplugmarket.in/product/nike-air-jordan-1-retro"
    }
  ]
}
```

**Files:** `src/pages/Browse.tsx`, `src/pages/CategoryBrowse.tsx`

### 8. Improve Product Schema

Current Product schema is good but missing:

- `sku` — add if product SKUs exist
- `category` — e.g., `"Sneakers"` or `"Streetwear"`
- `aggregateRating` / `review` — add when reviews are implemented

### 9. Add `hreflang` for India Targeting

```html
<link rel="alternate" hreflang="en-in" href="https://theplugmarket.in/" />
<link rel="alternate" hreflang="en" href="https://theplugmarket.in/" />
```

Add to the root layout or `index.html`.

### 10. Optimize Image SEO

- Ensure all product images have **descriptive alt text** (e.g., `"Nike Air Jordan 1 Retro High OG - Size 10 - Authentic"` not just `"product image"`)
- Add `<image:image>` tags to dynamic sitemap entries
- Use WebP format where possible

### 11. Enhance Dynamic Sitemap Edge Function

Current sitemap only includes basic fields. Enhance to include:

- `<image:image>` tags for product images
- Brand-specific page URLs (when created)
- Blog page URLs (when blog launches)

### 12. Internal Linking Strategy

- Product pages → related products (already have `similarProducts` ✅)
- Category pages → sub-categories/brands
- Add a **"Shop by Brand"** page (e.g., `/brands/nike`, `/brands/adidas`) — high-value search terms
- Footer → links to all categories, brands, and key pages

### 13. Fix Core Web Vitals (Non-SEO Metrics)

SEO score is 100 ✅ but other PageSpeed metrics need improvement:

- **LCP (Largest Contentful Paint)** — optimize hero images, use `fetchpriority="high"` on above-the-fold images
- **CLS (Cumulative Layout Shift)** — ensure all images have explicit width/height
- **INP (Interaction to Next Paint)** — keep JS bundles small

**Test at:** [PageSpeed Insights](https://pagespeed.web.dev/)

### 14. Remove Prerender.io Middleware 🧹

Now that the site uses SSR, the Prerender.io middleware is redundant overhead.

**Actions:**
- Remove or disable `middleware.ts`
- Remove `PRERENDER_TOKEN` from Vercel environment variables

---

## PHASE 3 — Content & Authority (Next) 📝

### 15. Start a Blog (Planned)

Blog posts are the #1 way to drive organic traffic. Topics:

- "How to Spot Fake vs Authentic Sneakers" — huge search volume
- "Best Sneakers Under ₹10,000 in India"
- "Nike Dunk vs Air Jordan 1: Which to Buy?"
- "Top 10 Sneaker Releases in 2026"
- "Why Buy from The Plug Market? Our Authentication Process"

**Frequency:** Even 2 posts/month makes a significant difference.

### 16. Create SEO Landing Pages

| Page                     | URL                               | Target Keyword                                       |
| ------------------------ | --------------------------------- | ---------------------------------------------------- |
| Authentic Sneakers India | `/authentic-sneakers`             | "authentic sneakers", "buy authentic sneakers india" |
| Brand pages              | `/brand/nike`, `/brand/adidas`    | "buy nike sneakers india", "authentic adidas india"  |
| Blog/Guides              | `/blog/how-to-spot-fake-sneakers` | "how to spot fake sneakers"                          |
| Authentication Guide     | `/authentication-process`         | "sneaker authentication india"                       |

### 17. Create "Shop by Brand" Page

High-value SEO pages — brand names are some of the highest-traffic keywords:

- `/brands` — index page listing all brands
- `/brands/nike`, `/brands/adidas`, `/brands/jordan`, etc.
- Each brand page should have a brief description + filtered product listings

### 18. Build Backlinks

Domain authority is still low. Ways to build:

- **Google Business Profile** — create one with business details
- **Social Profiles** — ensure consistent NAP (Name, Address, Phone) across Instagram, Facebook, etc.
- **Sneaker forums/Reddit** — participate genuinely, link when relevant
- **Guest posts** — write for Indian fashion/lifestyle blogs
- **PR/Media** — get covered in sneaker blogs, local news

---

## PHASE 4 — Advanced Optimizations 🚀

### 19. Add a Supabase Edge Function for Dynamic OG Images

Generate unique OG images per product (product name + image + price overlaid). Improves CTR from social shares and can help with rich snippets.

### 20. Add Cache Headers for Static Assets

`vercel.json` has security headers ✅ but no explicit cache-control for static assets. Add immutable caching for images/fonts.

---

## 📊 Progress Tracker

### What's Working
- Google Search Console active — products being indexed
- SSR serving fully rendered HTML to all crawlers
- SEO score: 100 on PageSpeed Insights
- SEO-friendly slug URLs live
- All pages have proper meta tags and structured data

### Key Metrics to Watch (Weekly)
- **Search Console → Coverage:** Track "Indexed" count trending up
- **Search Console → Performance:** Impressions, clicks, average position
- **PageSpeed Insights:** Monitor LCP, CLS, INP improvements
- `site:theplugmarket.in` on Google — count of indexed pages

---

## 📊 How to Get Into Top 10 Results

| Factor                | Weight | Current Status                    | Action                               |
| --------------------- | ------ | --------------------------------- | ------------------------------------ |
| **Content relevance** | 30%    | ✅ Good (keywords optimized)      | Blog, brand pages for more coverage  |
| **Domain authority**  | 25%    | ❌ Low (slight progress)          | Build backlinks, create content      |
| **Technical SEO**     | 20%    | ✅ Strong (SSR, schemas, sitemaps)| Add ItemList schema, hreflang        |
| **User experience**   | 15%    | ⚠️ SEO 100, other vitals need work| Fix LCP, CLS, INP                   |
| **Content freshness** | 10%    | ✅ Good (new products regularly)  | Blog posts when launched             |

### Realistic Timeline

- **Month 1–2:** ✅ Technical issues fixed (SSR, sitemaps, meta tags) → pages getting indexed
- **Month 2–4:** Create content (blog, brand pages) → start ranking for long-tail keywords
- **Month 4–6:** Build authority (backlinks, social proof) → climb from page 5+ to page 2–3
- **Month 6–12:** Consistent effort → top 10 for long-tail terms like "buy authentic Nike Jordan India"
- **Month 12+:** Top 10 for competitive terms like "authentic sneakers India"

> ⚠️ For highly competitive terms like "sneakers marketplace", expect 6–12 months of consistent work. For long-tail terms like "buy authentic Air Jordan 1 India" you can rank in 2–3 months.

---

## 🎯 Priority Action Items

### ✅ Completed
1. [x] **Set up Google Search Console** — active, products indexing
2. [x] **Fix SPA rendering** — migrated to SSR + React Router
3. [x] **Fix Home page H1 and meta description** — target keywords placed
4. [x] **Add Helmet to ALL public pages** — About, Contact, Privacy, Terms, Shipping
5. [x] **Add `slug` field to products** — SEO-friendly URLs live

### 🔜 Up Next
6. [ ] **Remove Prerender.io middleware** — no longer needed with SSR
7. [ ] **Add `ItemList` schema to Browse/Category pages**
8. [ ] **Add `<lastmod>` to static sitemap**
9. [ ] **Add `hreflang` tags** for India targeting
10. [ ] **Enhance product schema** with `sku`, `category` fields
11. [ ] **Fix Core Web Vitals** (LCP, CLS, INP) — SEO score is 100 but other metrics need work
12. [ ] **Enhance dynamic sitemap** with `<image:image>` tags
13. [ ] **Create "Shop by Brand" section/page**
14. [ ] **Start blog** — even 2 posts/month
15. [ ] **Build backlinks** — Google Business Profile, social, forums, guest posts
16. [ ] **Dynamic OG image generation** Edge Function

---

## Code Changes Checklist

### ✅ Completed
- [x] `middleware.ts` — Prerender.io bot detection (now redundant — remove)
- [x] `index.html` — meta description, keywords, OG tags with target keywords
- [x] `src/pages/Home.tsx` — H1, meta description, title with target keywords
- [x] `src/pages/AboutUs.tsx` — Helmet added
- [x] `src/pages/ContactUs.tsx` — Helmet added
- [x] `src/pages/PrivacyPolicy.tsx` — Helmet added
- [x] `src/pages/TermsOfService.tsx` — Helmet added
- [x] `src/pages/ShippingPolicy.tsx` — Helmet added
- [x] SSR migration — full server-side rendering with React Router
- [x] Product slug field — SEO-friendly URLs

### 🔜 Remaining
- [ ] `middleware.ts` — remove Prerender.io middleware (cleanup)
- [ ] `src/pages/Browse.tsx` — add `ItemList` JSON-LD schema
- [ ] `src/pages/CategoryBrowse.tsx` — add `ItemList` JSON-LD schema
- [ ] `public/sitemap.xml` — add `<lastmod>` dates
- [ ] `supabase/functions/sitemap/index.ts` — add `<image:image>` tags
- [ ] `src/components/Footer.tsx` — add keyword-rich internal links
- [ ] Root layout / `index.html` — add `hreflang` tags
- [ ] New: `/brands` page and `/brands/:brand` routes
- [ ] New: `/blog` section (when ready)
- [ ] New: OG image generation Edge Function

---

_This plan is reviewed and updated regularly. Track progress using the checkboxes above._