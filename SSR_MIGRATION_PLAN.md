# SSR Migration Plan — React Router v7 Framework Mode

**Created:** 5 April 2026  
**Goal:** Replace Prerender.io ($50/mo) with React Router v7 SSR — zero cost, better SEO  
**Status:** Pending Execution

---

## Why Migrate?

| Factor                        | Prerender.io (Current)              | React Router SSR (Target)                |
| ----------------------------- | ----------------------------------- | ---------------------------------------- |
| **Cost**                      | $50/mo+                             | $0 (Vercel serverless free tier)         |
| **What crawlers see**         | Cached snapshot (can be stale)      | Fresh server-rendered HTML every request |
| **Time-to-content for bots**  | ~2–5s (Prerender must render first) | ~200ms (HTML in first response)          |
| **Cache staleness**           | Pages can be hours/days old         | Always current prices/stock              |
| **New product discovery**     | Must wait for recache               | Instant — no cache delay                 |
| **Core Web Vitals (LCP)**     | Same as SPA (client renders)        | Better — HTML has content immediately    |
| **Rich snippets reliability** | ~90% (depends on Prerender timing)  | ~100% (data is in the HTML)              |

---

## Architecture Change

```
BEFORE:
  Vite → static index.html → Vercel CDN → SPA
  Bots → Prerender.io → cached HTML snapshot

AFTER:
  React Router v7 framework mode → Vercel Serverless Functions
  Every request (user + bot) → server renders real HTML with data
```

---

## Full Time Estimate

| Task                                                                                                              | Complexity | Est. Time       |
| ----------------------------------------------------------------------------------------------------------------- | ---------- | --------------- |
| Framework mode setup (vite config, routes.ts, root.tsx, entry.client.tsx)                                         | Medium     | 1 day           |
| Move all ~25 routes from Router.tsx → routes.ts                                                                   | Medium     | 1 day           |
| Migrate root.tsx — Layout, Providers, HelmetProvider, ScrollToTop, Analytics                                      | Hard       | 1 day           |
| Context compatibility — 6 contexts use browser APIs (localStorage, Supabase auth); guard against server execution | Hard       | 1–2 days        |
| Migrate ProductDetailPage — 4 Supabase queries to loader, remove useEffect                                        | Hard       | 1 day           |
| Migrate Browse + CategoryBrowse — pagination, filters, searchParams in loaders                                    | Hard       | 1–2 days        |
| Migrate Home — banner carousel, hot deals, new drops (component-level fetches)                                    | Medium     | 1 day           |
| Migrate all static public pages (About, Terms, Privacy, Shipping, Returns, Contact)                               | Easy       | 0.5 day         |
| Protected/Admin routes — keep as clientLoader only (no SSR needed)                                                | Easy       | 0.5 day         |
| Replace react-helmet-async with route meta exports across all pages                                               | Medium     | 1 day           |
| Update vercel.json — remove SPA rewrite, Vercel auto-detects RR7 SSR                                              | Easy       | 0.5 hour        |
| Testing & debugging — hydration mismatches, localStorage on server, edge cases                                    | Hard       | 2–3 days        |
| **Total**                                                                                                         |            | **~10–14 days** |

---

## Known Hard Problems

### 1. Hydration Mismatches

Contexts read `localStorage` on mount (Cart, Wishlist, Auth).  
On the server there is no `localStorage`. Every `useState(() => localStorage.getItem(...))` will mismatch.  
**Fix:** Wrap localStorage reads in `typeof window !== 'undefined'` guards, or use `clientLoader` for those pages.

### 2. Supabase Client on Server

The current `supabase` client in `src/lib/supabase.ts` uses `createClient` with the anon key.  
For SSR loaders, public product data (listings, images) is safe to fetch with the same anon key.  
Auth-dependent queries must stay client-side.

### 3. Component-Level Data Fetching

`HotDeals`, `BrandSpotlight`, `NewDropsSection`, `HomeBannerCarousel` all fetch data inside `useEffect`.  
These either move to the parent route's `loader` or stay as client-side fetches (acceptable for non-SEO-critical data).

### 4. react-helmet-async → meta exports

Every page currently uses `<Helmet>`. In framework mode you export a `meta()` function per route.  
This touches every single page file but is a mechanical change.

---

## Phase 1 — Framework Mode + Product Pages SSR

**Priority: Highest SEO value. Do this first.**  
**Target: Week 1**

### Step 1.1 — Install dependencies

```bash
npm install -D @react-router/dev
npm install @react-router/node
```

### Step 1.2 — Update vite.config.ts

```ts
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [
    reactRouter(), // replaces @vitejs/plugin-react
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### Step 1.3 — Create react-router.config.ts (root of project)

```ts
import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src",
  ssr: true,
} satisfies Config;
```

### Step 1.4 — Create src/routes.ts

Map every route from Router.tsx using the route() helper:

```ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("./pages/Home.tsx"),
  route("product/:id", "./pages/ProductDetailPage.tsx"),
  route("browse", "./pages/Browse.tsx"),
  route("sneakers", "./pages/CategoryBrowse.tsx"),
  route("apparels", "./pages/CategoryBrowse.tsx"),
  route("electronics", "./pages/CategoryBrowse.tsx"),
  route("collectibles", "./pages/CategoryBrowse.tsx"),
  route("new-arrivals", "./pages/NewArrivals.tsx"),
  route("new-drops", "./pages/NewDrops.tsx"),
  route("wishlist", "./pages/Wishlist.tsx"),
  route("about", "./pages/AboutUs.tsx"),
  route("contact-us", "./pages/ContactUs.tsx"),
  route("privacy", "./pages/PrivacyPolicy.tsx"),
  route("terms", "./pages/TermsOfService.tsx"),
  route("shipping-policy", "./pages/ShippingPolicy.tsx"),
  route("returns", "./pages/Returns.tsx"),
  route("login", "./pages/SignIn.tsx"),
  route("sell", "./pages/Sell.tsx"),
  route("my-listings", "./pages/MyListings.tsx"),
  route("my-orders", "./pages/MyOrders.tsx"),
  route("my-addresses", "./pages/MyAddresses.tsx"),
  route("edit-listing/:id", "./pages/EditListing.tsx"),
  route("admin/review", "./pages/AdminReview.tsx"),
  route("admin/import", "./pages/AdminImport.tsx"),
  route("admin/banners", "./pages/AdminBanners.tsx"),
  route("*", "./pages/NotFound.tsx"),
] satisfies RouteConfig;
```

### Step 1.5 — Create src/root.tsx (replaces main.tsx + layout.tsx as entry shell)

```tsx
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import Provider from "./Provider";
import Layout from "./layout";
import Analytics from "./components/Analytics";
import "./index.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Provider>
          <Analytics />
          <Layout>
            <Outlet />
          </Layout>
        </Provider>
      </AuthProvider>
    </HelmetProvider>
  );
}
```

### Step 1.6 — Create src/entry.client.tsx (replaces src/main.tsx)

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

ReactDOM.hydrateRoot(
  document,
  <React.StrictMode>
    <HydratedRouter />
  </React.StrictMode>,
);
```

### Step 1.7 — Migrate ProductDetailPage.tsx

Add a server `loader` above the component. Remove the `fetchProductDetails` useEffect.

```ts
// At the top of ProductDetailPage.tsx — ADD THIS:
import type { Route } from "./+types/ProductDetailPage";
import { createClient } from "@supabase/supabase-js";

export async function loader({ params }: Route.LoaderArgs) {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  const [{ data: listing }, { data: images }, { data: variants }] =
    await Promise.all([
      supabase
        .from("product_listings")
        .select(
          `*, sellers(id, display_name, phone, bio, profile_image_url, rating, total_reviews, location, is_verified, created_at, email)`,
        )
        .eq("id", params.id)
        .eq("status", "active")
        .single(),
      supabase
        .from("product_images")
        .select("id, image_url, is_poster_image")
        .eq("product_id", params.id)
        .order("is_poster_image", { ascending: false })
        .order("id", { ascending: true }),
      supabase
        .from("product_variants")
        .select("id, color_name, color_hex, price, display_order, image_url")
        .eq("listing_id", params.id)
        .order("display_order", { ascending: true }),
    ]);

  if (!listing) throw new Response("Not Found", { status: 404 });

  const transformedListing = {
    ...listing,
    seller_details: listing.sellers ?? null,
  };
  delete transformedListing.sellers;

  return {
    listing: transformedListing,
    images: images ?? [],
    variants: variants ?? [],
  };
}

// In the component — CHANGE THIS:
export default function ProductDetailPage() {
  const {
    listing,
    images,
    variants: initialVariants,
  } = useLoaderData<typeof loader>();
  // Remove: const [listing, setListing] = useState(null);
  // Remove: const [images, setImages] = useState([]);
  // Remove: const [loading, setLoading] = useState(false);
  // Remove: const fetchProductDetails useEffect entirely
  // Keep: all UI state (selectedSize, selectedVariantId, emblaApi, etc.)
  // Keep: all UI rendering code unchanged
}
```

### Step 1.8 — Add meta export to ProductDetailPage.tsx

Replace `<Helmet>` with a meta export:

```ts
export function meta({ data }: Route.MetaArgs) {
  if (!data?.listing) return [{ title: "Product Not Found | The Plug Market" }];
  const { listing } = data;
  return [
    { title: `${listing.title} | The Plug Market` },
    {
      name: "description",
      content: `Buy ${listing.title} — 100% authentic. ₹${listing.price} on The Plug Market.`,
    },
    { property: "og:title", content: listing.title },
    { property: "og:image", content: data.images?.[0]?.image_url ?? "" },
    {
      tagName: "link",
      rel: "canonical",
      href: `https://theplugmarket.in/product/${listing.id}`,
    },
  ];
}
```

### Step 1.9 — Update vercel.json

Remove the SPA catch-all rewrite. Vercel auto-detects React Router v7 SSR:

```json
{
  "rewrites": [
    {
      "source": "/sitemap-products.xml",
      "destination": "https://vojwfupyoathhvujwaqh.supabase.co/functions/v1/sitemap"
    }
  ]
}
```

> ⚠️ Remove the `"source": "/(.*)", "destination": "/index.html"` line — SSR handles all routes now.

---

## Phase 2 — Home + Browse + Category Pages SSR

**Target: Week 2**

### Pages to migrate with server loaders:

- `Browse.tsx` — move Supabase listing queries to `loader`, keep filter/search as `clientLoader` or URL searchParams
- `CategoryBrowse.tsx` — same pattern as Browse
- `Home.tsx` — move banner/hot deals/new drops to `loader`; component-level fetchers in `HomeBannerCarousel`, `HotDeals`, `NewDropsSection` can either stay as `useEffect` (acceptable) or be lifted to the loader

### Replace react-helmet-async with meta exports on all pages:

Every page that has `<Helmet>` gets a `meta()` export instead. Pattern:

```ts
// REMOVE: import { Helmet } from "react-helmet-async";
// REMOVE: <Helmet><title>...</title></Helmet> from JSX

// ADD: above the component
import type { Route } from "./+types/PageName";
export function meta(_: Route.MetaArgs) {
  return [
    { title: "Page Title | The Plug Market" },
    { name: "description", content: "..." },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://theplugmarket.in/path",
    },
  ];
}
```

### Pages to update (mechanical, low risk):

- [ ] `Home.tsx`
- [ ] `Browse.tsx`
- [ ] `CategoryBrowse.tsx`
- [ ] `NewArrivals.tsx`
- [ ] `NewDrops.tsx`
- [ ] `Wishlist.tsx`
- [ ] `AboutUs.tsx`
- [ ] `ContactUs.tsx`
- [ ] `PrivacyPolicy.tsx`
- [ ] `TermsOfService.tsx`
- [ ] `ShippingPolicy.tsx`
- [ ] `Returns.tsx`

---

## Phase 3 — Cleanup & Cancel Prerender.io

**Target: Week 3**

- [ ] Verify product pages in Google Search Console URL Inspection tool — should show server-rendered HTML
- [ ] Run `curl -A "Googlebot" https://theplugmarket.in/product/<id>` — should return full HTML with product title/price in `<head>`
- [ ] Check Vercel function logs for any SSR errors
- [ ] Monitor Core Web Vitals in PageSpeed Insights — LCP should improve
- [ ] Cancel Prerender.io subscription (save $50/mo)
- [ ] Remove `middleware.ts` (Prerender bot-routing middleware) if it exists
- [ ] Remove `PRERENDER_TOKEN` from Vercel environment variables
- [ ] Clean up any remaining `useEffect` data fetches that can move to loaders

---

## Progress Tracker

### Phase 1 — Framework Mode + Product Pages

- [ ] Install `@react-router/dev` and `@react-router/node`
- [ ] Update `vite.config.ts`
- [ ] Create `react-router.config.ts`
- [ ] Create `src/routes.ts`
- [ ] Create `src/root.tsx`
- [ ] Create `src/entry.client.tsx`
- [ ] Migrate `ProductDetailPage.tsx` — add loader, remove useEffect, add meta export
- [ ] Update `vercel.json`
- [ ] Test locally with `npm run dev`
- [ ] Deploy to Vercel and verify bot crawl

### Phase 2 — Home + Browse + Public Pages

- [ ] Migrate `Browse.tsx`
- [ ] Migrate `CategoryBrowse.tsx`
- [ ] Migrate `Home.tsx`
- [ ] Replace `<Helmet>` with `meta()` exports on all 12 public pages
- [ ] Test all pages for hydration errors

### Phase 3 — Cleanup

- [ ] Verify GSC indexing
- [ ] Cancel Prerender.io
- [ ] Remove middleware.ts and PRERENDER_TOKEN
- [ ] Final audit — all product pages return full HTML to bots

---

## Files to Create / Modify

| File                              | Action     | Notes                                               |
| --------------------------------- | ---------- | --------------------------------------------------- |
| `vite.config.ts`                  | **Modify** | Replace `@vitejs/plugin-react` with `reactRouter()` |
| `react-router.config.ts`          | **Create** | `ssr: true`, `appDirectory: "src"`                  |
| `src/routes.ts`                   | **Create** | All route definitions                               |
| `src/root.tsx`                    | **Create** | App shell — replaces main.tsx structure             |
| `src/entry.client.tsx`            | **Create** | Client hydration entry — replaces main.tsx          |
| `src/main.tsx`                    | **Delete** | No longer needed                                    |
| `src/Router.tsx`                  | **Delete** | Replaced by routes.ts                               |
| `src/pages/ProductDetailPage.tsx` | **Modify** | Add `loader`, `meta`, remove `useEffect` fetch      |
| `src/pages/Browse.tsx`            | **Modify** | Add `loader`, add `meta`, remove `useEffect` fetch  |
| `src/pages/CategoryBrowse.tsx`    | **Modify** | Add `loader`, add `meta`, remove `useEffect` fetch  |
| `src/pages/Home.tsx`              | **Modify** | Add `loader` for critical data, add `meta`          |
| All other public pages            | **Modify** | Replace `<Helmet>` with `meta()` export             |
| `vercel.json`                     | **Modify** | Remove SPA catch-all rewrite                        |
| `package.json`                    | **Modify** | Update `dev` and `build` scripts                    |

### package.json scripts after migration:

```json
{
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "preview": "react-router-serve ./build/server/index.js",
    "lint": "eslint ."
  }
}
```

---

## Rollback Plan

If SSR causes major issues in production:

1. Revert `vite.config.ts` to use `@vitejs/plugin-react`
2. Revert `vercel.json` to add back the SPA catch-all rewrite
3. Restore `src/main.tsx` and `src/Router.tsx`
4. Re-enable Prerender.io middleware
5. Deploy — back to working SPA in < 30 minutes

> Keep a `git tag ssr-migration-start` before starting so rollback is a single `git revert`.

---

_Execute phases in order. Don't skip Phase 1 testing before moving to Phase 2._
