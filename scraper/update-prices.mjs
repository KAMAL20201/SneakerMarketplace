/**
 * update-prices.mjs
 *
 * DB-first daily price updater for SneakInMarket.
 *
 * Flow:
 *   1. Fetch ALL active listings from Supabase DB
 *   2. For each listing, search GOAT by title → get productTemplateId
 *   3. Call GOAT buy_bar_data API → get per-size prices in USD
 *   4. Convert USD → INR using formula: (usd * USD_TO_INR) + ₹2000 margin
 *      Update product_listings.price (min across sizes) + all product_listing_sizes
 *   5. Print summary
 *
 * Usage:
 *   node scraper/update-prices.mjs
 */

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium as playwrightChromium } from "playwright";
import { chromium as stealthChromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { createClient } from "@supabase/supabase-js";

stealthChromium.use(StealthPlugin());

// ─── Config ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR  = path.resolve(__dirname, "..");

await loadEnv(path.join(__dirname, ".env"));
await loadEnv(path.join(ROOT_DIR, ".env"));

const SUPABASE_URL      = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USD_TO_INR        = parseFloat(process.env.USD_TO_INR || "91");
// Delay between GOAT API calls (ms) — keeps us respectful
const DELAY_MS          = 400;
// How many results to consider from GOAT search before picking best match
const SEARCH_LIMIT      = 3;
// Number of parallel browser pages (workers)
const CONCURRENCY       = 5;

// ─── Validate ──────────────────────────────────────────────────────────────

if (!SUPABASE_URL)     { console.error("❌ Missing SUPABASE_URL");            process.exit(1); }
if (!SERVICE_ROLE_KEY) { console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

// ─── Clients ───────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Helpers ───────────────────────────────────────────────────────────────

async function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  const content = await readFile(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms + Math.floor(Math.random() * 100)));
}

const MARGIN_INR = 2000; // fixed margin added on top of every price

function usdToInr(usd) {
  if (usd == null || isNaN(usd)) return null;
  // Formula: USD price × exchange rate + fixed margin
  return Math.round(usd * USD_TO_INR) + MARGIN_INR;
}

/** Normalise title for fuzzy matching: lowercase, strip punctuation */
function normalise(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Pick the best search result: exact normalised title match first, else first result */
function pickBestMatch(dbTitle, results) {
  const normDb = normalise(dbTitle);
  const exact = results.find(r => normalise(r.title) === normDb);
  return exact || results[0] || null;
}

// ─── GOAT API calls (run inside Playwright page context) ───────────────────

/**
 * Search GOAT for a sneaker by title.
 * Returns array of { id, title, slug, lowestPriceCents, retailPriceCents }
 */
async function searchGoat(page, title) {
  const url = `/web-api/consumer-search/get-product-search-results?salesChannelId=1&queryString=${encodeURIComponent(title)}&sortType=1&pageLimit=${SEARCH_LIMIT}&pageNumber=1&includeAggregations=false`;
  console.log(`     🔍 [SEARCH] URL: ${url}`);

  const raw = await page.evaluate(async ({ query, limit }) => {
    try {
      const res = await fetch(
        `/web-api/consumer-search/get-product-search-results?salesChannelId=1&queryString=${encodeURIComponent(query)}&sortType=1&pageLimit=${limit}&pageNumber=1&includeAggregations=false`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return { ok: false, status: res.status, body: null };
      const data = await res.json();
      const products = data?.data?.productsList || [];
      return {
        ok: true,
        status: res.status,
        totalFound: products.length,
        // Return full first product for deep inspection
        firstProductRaw: products[0] ?? null,
        products: products.map(p => ({
          id:               p.id,
          title:            p.title || "",
          slug:             p.slug  || "",
          lowestPriceCents: p.variantsList?.[0]?.localizedLowestPriceCents?.amountCents ?? null,
          retailPriceCents: p.localizedRetailPriceCents?.amountCents ?? null,
        })),
      };
    } catch (e) {
      return { ok: false, status: -1, error: String(e), body: null };
    }
  }, { query: title, limit: SEARCH_LIMIT });

  console.log(`     🔍 [SEARCH] HTTP status: ${raw.status} | ok: ${raw.ok} | results: ${raw.totalFound ?? 0}`);
  if (!raw.ok) {
    console.log(`     🔍 [SEARCH] Error: ${raw.error ?? "non-OK response"}`);
    return [];
  }
  if (raw.firstProductRaw) {
    console.log(`     🔍 [SEARCH] First product raw keys: ${Object.keys(raw.firstProductRaw).join(", ")}`);
    console.log(`     🔍 [SEARCH] First product id=${raw.firstProductRaw.id} title="${raw.firstProductRaw.title}"`);
    const lp = raw.firstProductRaw.localizedRetailPriceCents;
    console.log(`     🔍 [SEARCH] First product localizedRetailPriceCents: ${JSON.stringify(lp)}`);
    const vl = raw.firstProductRaw.variantsList?.[0];
    if (vl) {
      console.log(`     🔍 [SEARCH] First variant localizedLowestPriceCents: ${JSON.stringify(vl.localizedLowestPriceCents)}`);
    }
  }
  if (raw.products.length > 0) {
    console.log(`     🔍 [SEARCH] Mapped results:`);
    raw.products.forEach((p, i) => {
      console.log(`       [${i}] id=${p.id} | title="${p.title}" | lowestPriceCents=${p.lowestPriceCents} | retailPriceCents=${p.retailPriceCents}`);
    });
  }
  return raw.products;
}

/**
 * Fetch per-size prices for a productTemplateId.
 * Returns array of { size (US string), priceUsd } + debug info
 */
async function fetchSizePrices(page, templateId) {
  const apiUrl = `/web-api/v1/product_variants/buy_bar_data?productTemplateId=${templateId}&countryCode=HK`;
  console.log(`     💰 [BUY_BAR] URL: ${apiUrl}`);

  const raw = await page.evaluate(async (id) => {
    try {
      const res = await fetch(
        `/web-api/v1/product_variants/buy_bar_data?productTemplateId=${id}&countryCode=HK`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return { ok: false, status: res.status, variants: [] };
      const variants = await res.json();

      // Capture raw first variant for full inspection
      const firstRaw = variants[0] ?? null;
      const firstNewRaw = variants.find(v => v.shoeCondition === "new_no_defects") ?? null;

      const mapped = variants
        .filter(v => v.shoeCondition === "new_no_defects" && v.stockStatus !== "not_in_stock")
        .map(v => ({
          size:              String(v.sizeOption?.value ?? "?"),
          condition:         v.shoeCondition,
          stockStatus:       v.stockStatus,
          rawLowestPriceCents: v.lowestPriceCents,          // full object: { amount, currency, ... }
          priceUsd:          v.lowestPriceCents?.amount != null
                               ? v.lowestPriceCents.amount / 100
                               : null,
        }));

      return {
        ok: true,
        status: res.status,
        totalVariants: variants.length,
        firstRaw,
        firstNewRaw,
        mapped,
      };
    } catch (e) {
      return { ok: false, status: -1, error: String(e), variants: [] };
    }
  }, templateId);

  console.log(`     💰 [BUY_BAR] HTTP status: ${raw.status} | ok: ${raw.ok} | total variants: ${raw.totalVariants ?? 0}`);
  if (!raw.ok) {
    console.log(`     💰 [BUY_BAR] Error: ${raw.error ?? "non-OK response"}`);
    return [];
  }

  // Log first raw variant (any condition) for field inspection
  if (raw.firstRaw) {
    console.log(`     💰 [BUY_BAR] First variant (any condition) raw keys: ${Object.keys(raw.firstRaw).join(", ")}`);
    console.log(`     💰 [BUY_BAR] First variant shoeCondition="${raw.firstRaw.shoeCondition}" stockStatus="${raw.firstRaw.stockStatus}"`);
    console.log(`     💰 [BUY_BAR] First variant lowestPriceCents (full): ${JSON.stringify(raw.firstRaw.lowestPriceCents)}`);
    console.log(`     💰 [BUY_BAR] First variant sizeOption: ${JSON.stringify(raw.firstRaw.sizeOption)}`);
  }

  // Log first NEW variant for field inspection
  if (raw.firstNewRaw) {
    console.log(`     💰 [BUY_BAR] First NEW variant lowestPriceCents (full): ${JSON.stringify(raw.firstNewRaw.lowestPriceCents)}`);
    console.log(`     💰 [BUY_BAR] First NEW variant size=${raw.firstNewRaw.sizeOption?.value} price.amount=${raw.firstNewRaw.lowestPriceCents?.amount} currency=${raw.firstNewRaw.lowestPriceCents?.currency ?? "FIELD MISSING"}`);
  }

  // Log all mapped sizes
  if (raw.mapped.length > 0) {
    console.log(`     💰 [BUY_BAR] Mapped ${raw.mapped.length} new in-stock variants:`);
    raw.mapped.slice(0, 5).forEach(v => {
      console.log(`       size=${v.size} | rawAmount=${v.rawLowestPriceCents?.amount} | currency=${v.rawLowestPriceCents?.currency ?? "?"} | /100=${v.priceUsd}`);
    });
    if (raw.mapped.length > 5) console.log(`       ... and ${raw.mapped.length - 5} more`);
  } else {
    console.log(`     💰 [BUY_BAR] ⚠️  No new in-stock variants found`);
  }

  return raw.mapped.map(v => ({ size: v.size, priceUsd: v.priceUsd }));
}

// ─── Process a single listing ──────────────────────────────────────────────

async function processListing(page, listing, idx, total) {
  const label = `[${idx + 1}/${total}] "${listing.title.slice(0, 50)}"`;
  console.log(`\n${"─".repeat(65)}`);
  console.log(`📦 ${label}`);
  console.log(`   DB price: ₹${listing.price} | DB retail: ₹${listing.retail_price} | sizes in DB: ${listing.product_listing_sizes?.length ?? 0}`);

  // Search GOAT for this title
  const results = await searchGoat(page, listing.title);
  await delay(DELAY_MS);

  if (!results.length) {
    console.log(`   → ❌ not found on GOAT`);
    return { status: "notFound", title: listing.title };
  }

  const match = pickBestMatch(listing.title, results);
  if (!match) {
    console.log(`   → ❌ no match after pickBestMatch`);
    return { status: "notFound", title: listing.title };
  }

  console.log(`   → ✔️  GOAT match: id=${match.id} | title="${match.title}"`);
  console.log(`   → GOAT match lowestPriceCents=${match.lowestPriceCents} | retailPriceCents=${match.retailPriceCents}`);

  // Fetch per-size prices via buy_bar_data API
  const sizePrices = await fetchSizePrices(page, match.id);
  await delay(DELAY_MS);

  if (!sizePrices.length) {
    console.log(`   → ⚠️  matched "${match.title.slice(0, 40)}" but no size data`);
    return { status: "noChange" };
  }

  // Min price across all sizes (for listing-level price)
  const minPriceUsd  = Math.min(...sizePrices.map(s => s.priceUsd));
  const newPriceInr  = usdToInr(minPriceUsd);
  const newRetailInr = match.retailPriceCents ? usdToInr(match.retailPriceCents / 100) : null;

  console.log(`   → 💱 min USD across sizes: $${minPriceUsd}`);
  console.log(`   → 💱 formula: round($${minPriceUsd} × ${USD_TO_INR}) + ₹${MARGIN_INR} = ₹${newPriceInr}`);
  if (match.retailPriceCents) {
    const retailUsd = match.retailPriceCents / 100;
    console.log(`   → 💱 retail: retailPriceCents=${match.retailPriceCents} → $${retailUsd} → ₹${newRetailInr}`);
  }

  const priceChanged  = newPriceInr !== null && newPriceInr !== listing.price;
  const retailChanged = newRetailInr !== null && newRetailInr !== listing.retail_price;
  console.log(`   → priceChanged: ${priceChanged} (DB=₹${listing.price} vs new=₹${newPriceInr})`);
  console.log(`   → retailChanged: ${retailChanged} (DB=₹${listing.retail_price} vs new=₹${newRetailInr})`);

  // Build size map: US size number → INR price
  const goatSizeMap = new Map();
  for (const sp of sizePrices) {
    const inr = usdToInr(sp.priceUsd);
    goatSizeMap.set(parseFloat(sp.size), inr);
    console.log(`   → 📐 size=${sp.size} | $${sp.priceUsd} → ₹${inr}`);
  }

  // Batch size updates — collect all changed sizes, fire in parallel
  const dbSizes = listing.product_listing_sizes || [];
  const sizeUpdatePromises = [];
  for (const dbSize of dbSizes) {
    const usMatch = dbSize.size_value.match(/us\s*([0-9.]+)/i);
    const ukMatch = dbSize.size_value.match(/uk\s*([0-9.]+)/i);
    let usSize = null;
    if (usMatch)      usSize = parseFloat(usMatch[1]);
    else if (ukMatch) usSize = parseFloat(ukMatch[1]) + 0.5; // UK → US mens

    if (usSize == null) {
      console.log(`   → 📐 DB size "${dbSize.size_value}" — could not parse US size, skipping`);
      continue;
    }
    const newSizeInr = goatSizeMap.get(usSize);
    console.log(`   → 📐 DB size "${dbSize.size_value}" → US${usSize} | GOAT ₹${newSizeInr ?? "not found"} | DB ₹${dbSize.price} | willUpdate=${!!newSizeInr && newSizeInr !== dbSize.price}`);
    if (!newSizeInr || newSizeInr === dbSize.price) continue;

    sizeUpdatePromises.push(
      supabase
        .from("product_listing_sizes")
        .update({ price: newSizeInr })
        .eq("id", dbSize.id)
    );
  }

  const sizeResults = await Promise.all(sizeUpdatePromises);
  const sizeUpdateCount = sizeResults.filter(r => !r.error).length;
  const sizeErrors = sizeResults.filter(r => r.error);
  if (sizeErrors.length > 0) {
    sizeErrors.forEach(r => console.log(`   → ⚠️  Size DB update error: ${r.error.message}`));
  }

  // Update listing-level price
  let listingUpdated = false;
  if (priceChanged || retailChanged) {
    const payload = { updated_at: new Date().toISOString() };
    if (priceChanged)  payload.price        = newPriceInr;
    if (retailChanged) payload.retail_price = newRetailInr;

    console.log(`   → 💾 Updating listing in DB with payload: ${JSON.stringify(payload)}`);
    const { error: listingErr } = await supabase
      .from("product_listings")
      .update(payload)
      .eq("id", listing.id);

    if (listingErr) {
      console.log(`   → ⚠️  DB listing update error: ${listingErr.message}`);
      return { status: "error" };
    }
    listingUpdated = true;
  } else {
    console.log(`   → — No listing-level change needed`);
  }

  const tag = listingUpdated ? "✅" : "—";
  console.log(
    `   → ${tag} ₹${listing.price}→₹${newPriceInr}` +
    (sizeUpdateCount > 0 ? ` | ${sizeUpdateCount} sizes updated` : "")
  );

  return {
    status: listingUpdated ? "updated" : "noChange",
    sizeUpdateCount,
  };
}

// ─── Main update logic ─────────────────────────────────────────────────────

async function main() {
  console.log("🏃 SneakInMarket — DB-First Price Updater");
  console.log(`   ${new Date().toLocaleString()}`);
  console.log(`   USD → INR rate : ${USD_TO_INR}`);
  console.log(`   Margin (INR)   : ₹${MARGIN_INR}`);
  console.log(`   Formula        : round(usd × ${USD_TO_INR}) + ${MARGIN_INR}`);
  console.log(`   Country code   : HK (shipping region)`);
  console.log(`   Concurrency    : ${CONCURRENCY} parallel workers\n`);

  // 1. Fetch all active DB listings with their sizes
  console.log("📡 Fetching active listings from DB...");
  const { data: listings, error: fetchErr } = await supabase
    .from("product_listings")
    .select("id, title, price, retail_price, product_listing_sizes(id, size_value, price)")
    .eq("status", "active");

  if (fetchErr) { console.error("❌ DB fetch failed:", fetchErr.message); process.exit(1); }
  console.log(`   Found ${listings.length} active listings\n`);

  // 2. Launch stealth browser
  console.log("🚀 Launching browser for GOAT API access...");
  const browser = await stealthChromium.launch({
    headless: true,
    executablePath: playwrightChromium.executablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
           "--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  // Create N pages and warm them all up in parallel
  console.log(`   Warming up ${CONCURRENCY} pages with GOAT session (HK region)...`);
  const pages = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => context.newPage())
  );
  await Promise.all(
    pages.map(p => p.goto("https://www.goat.com", { waitUntil: "domcontentloaded", timeout: 60000 }))
  );
  await delay(3000);
  console.log(`   ✅ All ${CONCURRENCY} pages ready\n`);

  // 3. Worker pool — each page pulls the next listing from a shared cursor
  let cursor = 0;
  const stats = { matched: 0, updated: 0, sizesUpdated: 0, notFound: 0, noChange: 0, notFoundTitles: [] };

  async function runWorker(page) {
    while (cursor < listings.length) {
      const idx = cursor++;
      const result = await processListing(page, listings[idx], idx, listings.length);

      if (result.status === "notFound") {
        stats.notFound++;
        stats.notFoundTitles.push(result.title);
      } else if (result.status === "updated") {
        stats.matched++;
        stats.updated++;
        stats.sizesUpdated += result.sizeUpdateCount || 0;
      } else if (result.status === "noChange") {
        stats.matched++;
        stats.noChange++;
      }
    }
  }

  await Promise.all(pages.map(page => runWorker(page)));

  await browser.close();

  // 4. Summary
  console.log("\n" + "═".repeat(65));
  console.log("📊 PRICE UPDATE SUMMARY");
  console.log("═".repeat(65));
  console.log(`  Total listings checked : ${listings.length}`);
  console.log(`  Matched on GOAT        : ${stats.matched}`);
  console.log(`  Listing prices updated : ${stats.updated}`);
  console.log(`  Size prices updated    : ${stats.sizesUpdated}`);
  console.log(`  No change              : ${stats.noChange}`);
  console.log(`  Not found on GOAT      : ${stats.notFound}`);
  console.log("═".repeat(65));

  if (stats.notFoundTitles.length > 0 && stats.notFoundTitles.length <= 15) {
    console.log("\n⚠️  Not found on GOAT:");
    stats.notFoundTitles.forEach(t => console.log(`   - ${t}`));
  } else if (stats.notFoundTitles.length > 15) {
    console.log(`\n⚠️  ${stats.notFoundTitles.length} listings not found on GOAT`);
  }

  console.log(`\n🎉 Done! ${stats.updated} listing price(s) + ${stats.sizesUpdated} size price(s) updated.`);
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
