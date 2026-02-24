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
import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";

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
  return Math.round((usd + 10) * USD_TO_INR) + MARGIN_INR;
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
  return page.evaluate(async ({ query, limit }) => {
    try {
      const res = await fetch(
        `/web-api/consumer-search/get-product-search-results?salesChannelId=1&queryString=${encodeURIComponent(query)}&sortType=1&pageLimit=${limit}&pageNumber=1&includeAggregations=false`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      const products = data?.data?.productsList || [];
      return products.map(p => ({
        id:               p.id,
        title:            p.title || "",
        slug:             p.slug  || "",
        lowestPriceCents: p.variantsList?.[0]?.localizedLowestPriceCents?.amountCents ?? null,
        retailPriceCents: p.localizedRetailPriceCents?.amountCents ?? null,
      }));
    } catch { return []; }
  }, { query: title, limit: SEARCH_LIMIT });
}

/**
 * Fetch per-size prices for a productTemplateId.
 * Returns array of { size (US string), priceUsd }
 */
async function fetchSizePrices(page, templateId) {
  return page.evaluate(async (id) => {
    try {
      const res = await fetch(
        `/web-api/v1/product_variants/buy_bar_data?productTemplateId=${id}&countryCode=HK`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return [];
      const variants = await res.json();
      return variants
        .filter(v => v.shoeCondition === "new_no_defects" && v.stockStatus !== "not_in_stock")
        .map(v => ({
          size:     String(v.sizeOption.value),
          priceUsd: (v.lowestPriceCents.amount / 100),
        }));
    } catch { return []; }
  }, templateId);
}

// ─── Main update logic ─────────────────────────────────────────────────────

async function main() {
  console.log("🏃 SneakInMarket — DB-First Price Updater");
  console.log(`   ${new Date().toLocaleString()}`);
  console.log(`   USD → INR rate: ${USD_TO_INR}\n`);

  // 1. Fetch all active DB listings with their sizes
  console.log("📡 Fetching active listings from DB...");
  const { data: listings, error: fetchErr } = await supabase
    .from("product_listings")
    .select("id, title, price, retail_price, product_listing_sizes(id, size_value, price)")
    .eq("status", "active");

  if (fetchErr) { console.error("❌ DB fetch failed:", fetchErr.message); process.exit(1); }
  console.log(`   Found ${listings.length} active listings\n`);

  // 2. Launch stealth browser (single session for all API calls)
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
  const page = await context.newPage();

  // Load GOAT HK storefront to establish session/cookies with HK region
  console.log("   Loading GOAT session (HK region)...");
  await page.goto("https://www.goat.com", { waitUntil: "domcontentloaded", timeout: 60000 });
  await delay(3000);
  console.log("   ✅ Session ready\n");

  // 3. For each listing: search → match → fetch sizes → update DB
  let matched = 0, updated = 0, sizesUpdated = 0, notFound = 0, noChange = 0;
  const notFoundTitles = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    process.stdout.write(`[${i + 1}/${listings.length}] "${listing.title.slice(0, 50)}" → `);

    // Search GOAT for this title
    const results = await searchGoat(page, listing.title);
    await delay(DELAY_MS);

    if (!results.length) {
      process.stdout.write("❌ not found on GOAT\n");
      notFound++;
      notFoundTitles.push(listing.title);
      continue;
    }

    const match = pickBestMatch(listing.title, results);
    if (!match) {
      process.stdout.write("❌ no match\n");
      notFound++;
      notFoundTitles.push(listing.title);
      continue;
    }

    matched++;

    // Fetch per-size prices via buy_bar_data API
    const sizePrices = await fetchSizePrices(page, match.id);
    await delay(DELAY_MS);

    if (!sizePrices.length) {
      process.stdout.write(`⚠️  matched "${match.title.slice(0, 40)}" but no size data\n`);
      noChange++;
      continue;
    }

    // Min price across all sizes (for listing-level price)
    const minPriceUsd  = Math.min(...sizePrices.map(s => s.priceUsd));
    const newPriceInr  = usdToInr(minPriceUsd);
    const newRetailInr = match.retailPriceCents ? usdToInr(match.retailPriceCents / 100) : null;

    const priceChanged  = newPriceInr !== null && newPriceInr !== listing.price;
    const retailChanged = newRetailInr !== null && newRetailInr !== listing.retail_price;

    // Build size map: US size number → INR price
    const goatSizeMap = new Map();
    for (const sp of sizePrices) {
      goatSizeMap.set(parseFloat(sp.size), usdToInr(sp.priceUsd));
    }

    // Update product_listing_sizes
    const dbSizes = listing.product_listing_sizes || [];
    let sizeUpdateCount = 0;
    for (const dbSize of dbSizes) {
      // Match US size from DB size_value e.g. "uk 8 / us 8.5 / eu 42" or "uk 8.5"
      const usMatch = dbSize.size_value.match(/us\s*([0-9.]+)/i);
      const ukMatch = dbSize.size_value.match(/uk\s*([0-9.]+)/i);
      let usSize = null;
      if (usMatch)      usSize = parseFloat(usMatch[1]);
      else if (ukMatch) usSize = parseFloat(ukMatch[1]) + 0.5; // UK → US mens

      if (usSize == null) continue;
      const newSizeInr = goatSizeMap.get(usSize);
      if (!newSizeInr || newSizeInr === dbSize.price) continue;

      const { error: sizeErr } = await supabase
        .from("product_listing_sizes")
        .update({ price: newSizeInr })
        .eq("id", dbSize.id);
      if (!sizeErr) sizeUpdateCount++;
    }

    // Update listing-level price
    if (priceChanged || retailChanged) {
      const payload = { updated_at: new Date().toISOString() };
      if (priceChanged)  payload.price        = newPriceInr;
      if (retailChanged) payload.retail_price = newRetailInr;

      const { error: listingErr } = await supabase
        .from("product_listings")
        .update(payload)
        .eq("id", listing.id);

      if (listingErr) {
        process.stdout.write(`⚠️  DB error: ${listingErr.message}\n`);
        continue;
      }
      updated++;
    } else {
      noChange++;
    }

    sizesUpdated += sizeUpdateCount;

    const tag = (priceChanged || retailChanged) ? "✅" : "—";
    process.stdout.write(
      `${tag} ₹${listing.price}→₹${newPriceInr}` +
      (sizeUpdateCount > 0 ? ` | ${sizeUpdateCount} sizes` : "") +
      "\n"
    );
  }

  await browser.close();

  // 4. Summary
  console.log("\n" + "═".repeat(55));
  console.log("📊 PRICE UPDATE SUMMARY");
  console.log("═".repeat(55));
  console.log(`  Total listings checked : ${listings.length}`);
  console.log(`  Matched on GOAT        : ${matched}`);
  console.log(`  Listing prices updated : ${updated}`);
  console.log(`  Size prices updated    : ${sizesUpdated}`);
  console.log(`  No change              : ${noChange}`);
  console.log(`  Not found on GOAT      : ${notFound}`);
  console.log("═".repeat(55));

  if (notFoundTitles.length > 0 && notFoundTitles.length <= 15) {
    console.log("\n⚠️  Not found on GOAT:");
    notFoundTitles.forEach(t => console.log(`   - ${t}`));
  } else if (notFoundTitles.length > 15) {
    console.log(`\n⚠️  ${notFoundTitles.length} listings not found on GOAT`);
  }

  console.log(`\n🎉 Done! ${updated} listing price(s) + ${sizesUpdated} size price(s) updated.`);
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
