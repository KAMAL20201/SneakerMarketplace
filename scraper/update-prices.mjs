/**
 * update-prices.mjs
 *
 * DB-first daily price updater for SneakInMarket.
 *
 * Flow:
 *   1. Fetch ALL active listings from Supabase DB
 *   2. For each listing, search GOAT by title → get productTemplateId
 *   3. Call GOAT buy_bar_data API → get per-size prices in USD
 *   4. Convert USD → INR using formula: ((usd + 10) * USD_TO_INR) + ₹2000 margin
 *      Update product_listings.price (min across sizes) + all product_listing_sizes
 *   5. Print summary
 *
 * Usage:
 *   node scraper/update-prices.mjs
 *
 * Grep tips (every line is prefixed with IDs):
 *   grep "db=<listing_id>"   → all logs for a specific DB listing
 *   grep "goat=<template_id>" → all logs for a specific GOAT product
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
const DELAY_MS          = 400;
const SEARCH_LIMIT      = 3;
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

const MARGIN_INR = 2000;

function usdToInr(usd) {
  if (usd == null || isNaN(usd)) return null;
  // Formula: ((usd + 10) × USD_TO_INR) + ₹2000 margin
  return ((usd + 10) * USD_TO_INR) + MARGIN_INR;
}

/**
 * UK → US size offset per brand.
 *   US = UK + offset
 *   +1   → Nike, Jordan, ASICS, Onitsuka Tiger
 *   +0.5 → Adidas, New Balance, On Cloud, Yeezy
 *    0   → Converse (same)
 */
const BRAND_SIZE_OFFSET = {
  nike:              1,
  jordan:            1,
  asics:             1,
  "onitsuka tiger":  1,
  adidas:            0.5,
  "new balance":     0.5,
  "on cloud":        0.5,
  yeezy:             0.5,
  converse:          0,
};

/** Return UK→US offset for a brand string. Falls back to 1 (most common). */
function brandSizeOffset(brand) {
  if (!brand) return 1;
  const b = brand.toLowerCase().trim();
  for (const [key, offset] of Object.entries(BRAND_SIZE_OFFSET)) {
    if (b === key || b.includes(key)) return offset;
  }
  return 1; // default: +1 (Nike-style, most sneakers)
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

// ─── GOAT API calls ─────────────────────────────────────────────────────────

/**
 * Search GOAT for a sneaker by title.
 * @param {string} p - log prefix, e.g. "[db=123|goat=?]"
 */
async function searchGoat(page, title, p) {
  const raw = await page.evaluate(async ({ query, limit }) => {
    try {
      const res = await fetch(
        `/web-api/consumer-search/get-product-search-results?salesChannelId=1&queryString=${encodeURIComponent(query)}&sortType=1&pageLimit=${limit}&pageNumber=1&includeAggregations=false`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return { ok: false, status: res.status };
      const data = await res.json();
      const products = data?.data?.productsList || [];
      return {
        ok: true,
        status: res.status,
        totalFound: products.length,
        products: products.map(prod => ({
          id:               prod.id,
          title:            prod.title || "",
          slug:             prod.slug  || "",
          lowestPriceCents: prod.variantsList?.[0]?.localizedLowestPriceCents?.amountCents ?? null,
          retailPriceCents: prod.localizedRetailPriceCents?.amountCents ?? null,
        })),
      };
    } catch (e) {
      return { ok: false, status: -1, error: String(e) };
    }
  }, { query: title, limit: SEARCH_LIMIT });

  if (!raw.ok) {
    console.log(`${p} 🔍 [SEARCH] ❌ HTTP ${raw.status} | error: ${raw.error ?? "non-OK response"}`);
    return [];
  }
  return raw.products;
}

/**
 * Fetch per-size prices for a productTemplateId.
 * @param {string} p - log prefix, e.g. "[db=123|goat=1072277]"
 */
async function fetchSizePrices(page, templateId, p) {
  const raw = await page.evaluate(async (id) => {
    try {
      const res = await fetch(
        `/web-api/v1/product_variants/buy_bar_data?productTemplateId=${id}&countryCode=HK`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return { ok: false, status: res.status };
      const variants = await res.json();
      const mapped = variants
        .filter(v => v.shoeCondition === "new_no_defects" && v.boxCondition === "good_condition" && v.stockStatus !== "not_in_stock")
        .map(v => ({
          size:     String(v.sizeOption?.value ?? "?"),
          priceUsd: v.lowestPriceCents?.amount != null ? v.lowestPriceCents.amount / 100 : null,
        }));
      return { ok: true, status: res.status, totalVariants: variants.length, mapped };
    } catch (e) {
      return { ok: false, status: -1, error: String(e) };
    }
  }, templateId);

  if (!raw.ok) {
    console.log(`${p} 💰 [BUY_BAR] ❌ HTTP ${raw.status} | error: ${raw.error ?? "non-OK response"}`);
    return [];
  }
  if (raw.mapped.length === 0) {
    console.log(`${p} 💰 [BUY_BAR] ⚠️  no new in-stock variants (totalVariants=${raw.totalVariants ?? 0})`);
  }

  return raw.mapped;
}

// ─── Process a single listing ──────────────────────────────────────────────

async function processListing(page, listing, idx, total) {
  const p = `[${idx + 1}/${total}][db=${listing.id}]`;

  // Search GOAT
  const results = await searchGoat(page, listing.title, p);
  await delay(DELAY_MS);

  if (!results.length) {
    console.log(`${p} ❌ not found on GOAT — "${listing.title.slice(0, 60)}"`);
    return { status: "notFound", title: listing.title };
  }

  const match = pickBestMatch(listing.title, results);
  if (!match) {
    console.log(`${p} ❌ no match after pickBestMatch — "${listing.title.slice(0, 60)}"`);
    return { status: "notFound", title: listing.title };
  }

  const pg = `[${idx + 1}/${total}][db=${listing.id}|goat=${match.id}]`;

  // Fetch per-size prices
  const sizePrices = await fetchSizePrices(page, match.id, pg);
  await delay(DELAY_MS);

  if (!sizePrices.length) {
    console.log(`${pg} ⚠️  no size data — skipping "${listing.title.slice(0, 60)}"`);
    return { status: "noChange" };
  }

  // Min price across all sizes
  const minPriceUsd  = Math.min(...sizePrices.map(s => s.priceUsd));
  const newPriceInr  = usdToInr(minPriceUsd);
  const newRetailInr = match.retailPriceCents ? usdToInr(match.retailPriceCents / 100) : null;

  const priceChanged  = newPriceInr  !== null && newPriceInr  !== listing.price;
  const retailChanged = newRetailInr !== null && newRetailInr !== listing.retail_price;

  // Build size map
  const goatSizeMap = new Map();
  for (const sp of sizePrices) {
    goatSizeMap.set(parseFloat(sp.size), usdToInr(sp.priceUsd));
  }

  // Match DB sizes → GOAT sizes (brand-aware UK→US conversion)
  const offset  = brandSizeOffset(listing.brand);
  const dbSizes = listing.product_listing_sizes || [];
  const sizeUpdatePromises = [];
  for (const dbSize of dbSizes) {
    const usMatch = dbSize.size_value.match(/us\s*([0-9.]+)/i);
    const ukMatch = dbSize.size_value.match(/uk\s*([0-9.]+)/i);
    let usSize = null;
    if (usMatch)      usSize = parseFloat(usMatch[1]);
    else if (ukMatch) usSize = parseFloat(ukMatch[1]) + offset;

    if (usSize == null) {
      console.log(`${pg} ⚠️  size="${dbSize.size_value}" — could not parse US size, skipping`);
      continue;
    }
    const newSizeInr = goatSizeMap.get(usSize);
    if (!newSizeInr || newSizeInr === dbSize.price) continue;

    sizeUpdatePromises.push(
      supabase
        .from("product_listing_sizes")
        .update({ price: newSizeInr })
        .eq("id", dbSize.id)
    );
  }

  const sizeResults     = await Promise.all(sizeUpdatePromises);
  const sizeUpdateCount = sizeResults.filter(r => !r.error).length;
  sizeResults.filter(r => r.error).forEach(r => {
    console.log(`${pg} ⚠️  size DB update error: ${r.error.message}`);
  });

  // Update listing-level price
  let listingUpdated = false;
  if (priceChanged || retailChanged) {
    const payload = { updated_at: new Date().toISOString() };
    if (priceChanged)  payload.price        = newPriceInr;
    if (retailChanged) payload.retail_price = newRetailInr;

    const { error: listingErr } = await supabase
      .from("product_listings")
      .update(payload)
      .eq("id", listing.id);

    if (listingErr) {
      console.log(`${pg} ❌ listing DB update error: ${listingErr.message}`);
      return { status: "error" };
    }
    listingUpdated = true;
  }

  if (listingUpdated || sizeUpdateCount > 0) {
    console.log(`${pg} ✅ ₹${listing.price} → ₹${newPriceInr}${sizeUpdateCount > 0 ? ` | ${sizeUpdateCount} sizes updated` : ""}`);
  }

  return { status: listingUpdated ? "updated" : "noChange", sizeUpdateCount };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🏃 SneakInMarket — DB-First Price Updater");
  console.log(`   ${new Date().toLocaleString()} | USD→INR: ${USD_TO_INR} | Margin: ₹${MARGIN_INR} | Workers: ${CONCURRENCY}`);

  const { data: listings, error: fetchErr } = await supabase
    .from("product_listings")
    .select("id, title, brand, price, retail_price, product_listing_sizes(id, size_value, price)")
    .eq("status", "active");

  if (fetchErr) { console.error("❌ DB fetch failed:", fetchErr.message); process.exit(1); }
  console.log(`📡 ${listings.length} active listings fetched\n`);

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

  const pages = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => context.newPage())
  );
  await Promise.all(
    pages.map(pg => pg.goto("https://www.goat.com", { waitUntil: "domcontentloaded", timeout: 60000 }))
  );
  await delay(3000);
  console.log(`🚀 ${CONCURRENCY} workers ready\n`);

  let cursor = 0;
  const stats = { matched: 0, updated: 0, sizesUpdated: 0, notFound: 0, noChange: 0, notFoundTitles: [] };

  async function runWorker(page) {
    while (cursor < listings.length) {
      const idx    = cursor++;
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
