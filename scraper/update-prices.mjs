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
const ROOT_DIR = path.resolve(__dirname, "..");

await loadEnv(path.join(__dirname, ".env"));
await loadEnv(path.join(ROOT_DIR, ".env"));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
let USD_TO_INR = parseFloat(process.env.USD_TO_INR || "91"); // overwritten at runtime with live rate
const DELAY_MS = 400;
const SEARCH_LIMIT = 3;
const CONCURRENCY = 5;

// ─── Validate ──────────────────────────────────────────────────────────────

if (!SUPABASE_URL) {
  console.error("❌ Missing SUPABASE_URL");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ─── Clients ───────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Telegram ──────────────────────────────────────────────────────────────

async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log(
      "⚠️  Telegram credentials not set — skipping notification:\n",
      message,
    );
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
    if (!response.ok) {
      console.error(`❌ Telegram send failed: ${response.statusText}`);
    }
  } catch (e) {
    console.error(`❌ Telegram error: ${e.message}`);
  }
}

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
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

function delay(ms) {
  return new Promise((r) =>
    setTimeout(r, ms + Math.floor(Math.random() * 100)),
  );
}

const MARGIN_INR = 2500;

/** Round price up to the nearest X99 (e.g. 8125 → 8199, 13200 → 13199) */
function roundToNearest99(price) {
  return Math.ceil(price / 100) * 100 - 1;
}

function usdToInr(usd) {
  if (usd == null || isNaN(usd)) return null;
  // Formula: ((usd + 10) × USD_TO_INR) + ₹2000 margin, rounded to nearest X99
  const raw = (usd + 10) * USD_TO_INR + MARGIN_INR;
  return roundToNearest99(raw);
}

/**
 * UK → US size offset per brand.
 *   US = UK + offset
 *   +1   → Nike, Jordan, ASICS, Onitsuka Tiger
 *   +0.5 → Adidas, New Balance, On Cloud, Yeezy
 *    0   → Converse (same)
 */
const BRAND_SIZE_OFFSET = {
  nike: 1,
  jordan: 1,
  asics: 1,
  "onitsuka tiger": 1,
  adidas: 0.5,
  "new balance": 0.5,
  "on cloud": 0.5,
  yeezy: 0.5,
  converse: 0,
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
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pick the best search result: exact normalised title match first, else first result */
function pickBestMatch(dbTitle, results) {
  const normDb = normalise(dbTitle);
  const exact = results.find((r) => normalise(r.title) === normDb);
  return exact || results[0] || null;
}

// ─── GOAT API calls ─────────────────────────────────────────────────────────

/**
 * Search GOAT for a sneaker by title.
 * @param {string} p - log prefix, e.g. "[db=123|goat=?]"
 */
async function searchGoat(page, title, p) {
  const raw = await page.evaluate(
    async ({ query, limit }) => {
      try {
        const res = await fetch(
          `/web-api/consumer-search/get-product-search-results?salesChannelId=1&queryString=${encodeURIComponent(query)}&sortType=1&pageLimit=${limit}&pageNumber=1&includeAggregations=false`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) return { ok: false, status: res.status };
        const data = await res.json();
        const products = data?.data?.productsList || [];
        return {
          ok: true,
          status: res.status,
          totalFound: products.length,
          products: products.map((prod) => ({
            id: prod.id,
            title: prod.title || "",
            slug: prod.slug || "",
            lowestPriceCents:
              prod.variantsList?.[0]?.localizedLowestPriceCents?.amountCents ??
              null,
            retailPriceCents:
              prod.localizedRetailPriceCents?.amountCents ?? null,
          })),
        };
      } catch (e) {
        return { ok: false, status: -1, error: String(e) };
      }
    },
    { query: title, limit: SEARCH_LIMIT },
  );

  if (!raw.ok) {
    console.log(
      `${p} 🔍 [SEARCH] ❌ HTTP ${raw.status} | error: ${raw.error ?? "non-OK response"}`,
    );
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
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) return { ok: false, status: res.status };
      const variants = await res.json();
      const mapped = variants
        .filter(
          (v) =>
            v.shoeCondition === "new_no_defects" &&
            v.boxCondition === "good_condition" &&
            v.stockStatus !== "not_in_stock",
        )
        .map((v) => ({
          size: String(v.sizeOption?.value ?? "?"),
          priceUsd:
            v.lowestPriceCents?.amount != null
              ? v.lowestPriceCents.amount / 100
              : null,
        }));
      return {
        ok: true,
        status: res.status,
        totalVariants: variants.length,
        mapped,
      };
    } catch (e) {
      return { ok: false, status: -1, error: String(e) };
    }
  }, templateId);

  if (!raw.ok) {
    console.log(
      `${p} 💰 [BUY_BAR] ❌ HTTP ${raw.status} | error: ${raw.error ?? "non-OK response"}`,
    );
    return [];
  }
  if (raw.mapped.length === 0) {
    console.log(
      `${p} 💰 [BUY_BAR] ⚠️  no new in-stock variants (totalVariants=${raw.totalVariants ?? 0})`,
    );
  }

  return raw.mapped;
}

// ─── Process a single listing ──────────────────────────────────────────────

async function processListing(page, listing, idx, total) {
  const p = `[${idx + 1}/${total}][db=${listing.id}]`;

  let matchId = listing.goat_template_id;
  let matchRetailPriceCents = null;

  if (matchId) {
    console.log(`${p} 🔗 Using stored GOAT ID: ${matchId}`);
  } else {
    // Search GOAT fallback by title
    const results = await searchGoat(page, listing.title, p);
    await delay(DELAY_MS);

    if (!results.length) {
      console.log(
        `${p} ❌ not found on GOAT — "${listing.title.slice(0, 60)}"`,
      );
      return { status: "notFound", title: listing.title };
    }

    const match = pickBestMatch(listing.title, results);
    if (!match) {
      console.log(
        `${p} ❌ no match after pickBestMatch — "${listing.title.slice(0, 60)}"`,
      );
      return { status: "notFound", title: listing.title };
    }

    console.log(
      `${p} 🔗 Searched & Matched GOAT: "${match.title}" (ID: ${match.id})`,
    );
    matchId = match.id;
    matchRetailPriceCents = match.retailPriceCents;
  }

  const pg = `[${idx + 1}/${total}][db=${listing.id}|goat=${matchId}]`;

  // Fetch per-size prices
  const sizePrices = await fetchSizePrices(page, matchId, pg);
  await delay(DELAY_MS);

  if (!sizePrices.length) {
    console.log(
      `${pg} ⚠️  no size data — skipping "${listing.title.slice(0, 60)}"`,
    );
    return { status: "noChange" };
  }

  // Build GOAT size map (US size → INR price)
  const goatSizeMap = new Map();
  for (const sp of sizePrices) {
    goatSizeMap.set(parseFloat(sp.size), usdToInr(sp.priceUsd));
  }

  // Match DB sizes → GOAT sizes (brand-aware UK→US conversion)
  // Collect matched INR prices so the listing-level min reflects only sizes we actually stock
  const offset = brandSizeOffset(listing.brand);
  const dbSizes = listing.product_listing_sizes || [];
  const sizeUpdatePromises = [];
  const matchedPricesInr = [];
  const notifications = [];

  for (const dbSize of dbSizes) {
    const usMatch = dbSize.size_value.match(/us\s*([0-9.]+)/i);
    const ukMatch = dbSize.size_value.match(/uk\s*([0-9.]+)/i);
    let usSize = null;
    if (usMatch) usSize = parseFloat(usMatch[1]);
    else if (ukMatch) usSize = parseFloat(ukMatch[1]) + offset;

    if (usSize == null) {
      console.log(
        `${pg} ⚠️  size="${dbSize.size_value}" — could not parse US size, skipping`,
      );
      continue;
    }
    const newSizeInr = goatSizeMap.get(usSize);
    if (!newSizeInr) continue;

    matchedPricesInr.push(newSizeInr);

    if (newSizeInr === dbSize.price) continue;

    if (dbSize.price && newSizeInr < dbSize.price) {
      const dropPercent = ((dbSize.price - newSizeInr) / dbSize.price) * 100;
      console.log("kamaldropped", {
        dropPercent,
        dbSizePrice: dbSize.price,
        newSizeInr,
        pg,
      });
      if (dropPercent > 5) {
        console.log("kamaldroppedInNotification Array", pg);
        notifications.push(
          `📉 <b>Price Drop (${dropPercent.toFixed(1)}%)</b>\n` +
            `👟 ${listing.title}\n` +
            `📏 Size: ${dbSize.size_value}\n` +
            `💰 ₹${dbSize.price} ➡️ ₹${newSizeInr}`,
        );
      }
    }

    sizeUpdatePromises.push(
      supabase
        .from("product_listing_sizes")
        .update({ price: newSizeInr })
        .eq("id", dbSize.id),
    );
  }

  if (notifications.length > 0) {
    console.log("kamalfinalNotificationsArray", notifications.length);

    for (const msg of notifications) {
      await sendTelegramMessage(msg);
    }
  }

  const sizeResults = await Promise.all(sizeUpdatePromises);
  const sizeUpdateCount = sizeResults.filter((r) => !r.error).length;
  sizeResults
    .filter((r) => r.error)
    .forEach((r) => {
      console.log(`${pg} ⚠️  size DB update error: ${r.error.message}`);
    });

  // Min price derived only from DB sizes that matched GOAT — not all GOAT sizes
  const newPriceInr =
    matchedPricesInr.length > 0 ? Math.min(...matchedPricesInr) : null;
  const newRetailInr = matchRetailPriceCents
    ? usdToInr(matchRetailPriceCents / 100)
    : null;

  const priceChanged = newPriceInr !== null && newPriceInr !== listing.price;
  const retailChanged =
    newRetailInr !== null && newRetailInr !== listing.retail_price;

  // Update listing-level price
  let listingUpdated = false;
  if (priceChanged || retailChanged) {
    const payload = { updated_at: new Date().toISOString() };
    if (priceChanged) payload.price = newPriceInr;
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

  // if (listingUpdated || sizeUpdateCount > 0) {
  //   console.log(
  //     `${pg} ✅ ₹${listing.price} → ₹${newPriceInr}${sizeUpdateCount > 0 ? ` | ${sizeUpdateCount} sizes updated` : ""}`,
  //   );
  // }

  return { status: listingUpdated ? "updated" : "noChange", sizeUpdateCount };
}

// ─── Live exchange rate ────────────────────────────────────────────────────

/**
 * Fetch live USD→INR rate from frankfurter.app (free, no API key).
 * Falls back to the env/default value if the request fails.
 */
async function fetchLiveUsdToInr() {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=INR",
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.INR;
    if (!rate || isNaN(rate)) throw new Error("INR rate missing in response");
    return parseFloat(rate);
  } catch (e) {
    console.warn(
      `⚠️  Could not fetch live USD→INR rate (${e.message}) — using fallback: ₹${USD_TO_INR}`,
    );
    return null;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🏃 SneakInMarket — DB-First Price Updater");

  const liveRate = await fetchLiveUsdToInr();
  if (liveRate) {
    console.log(`💱 Live USD→INR: ₹${liveRate} (was fallback ₹${USD_TO_INR})`);
    USD_TO_INR = liveRate;
  }

  console.log(
    `   ${new Date().toLocaleString()} | USD→INR: ${USD_TO_INR} | Margin: ₹${MARGIN_INR} | Workers: ${CONCURRENCY}`,
  );

  const { data: listings, error: fetchErr } = await supabase
    .from("product_listings")
    .select(
      "id, title, brand, price, retail_price, goat_template_id, product_listing_sizes(id, size_value, price)",
    )
    .eq("status", "active")
    .eq("category", "sneakers")
    .is("reviewed_at", null); // only scraped catalog listings; seller listings have reviewed_at set

  if (fetchErr) {
    console.error("❌ DB fetch failed:", fetchErr.message);
    process.exit(1);
  }
  console.log(
    `📡 ${listings.length} active sneaker catalog listings fetched\n`,
  );

  const browser = await stealthChromium.launch({
    headless: true,
    executablePath: playwrightChromium.executablePath(),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const pages = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => context.newPage()),
  );
  await Promise.all(
    pages.map((pg) =>
      pg.goto("https://www.goat.com", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      }),
    ),
  );
  await delay(3000);
  console.log(`🚀 ${CONCURRENCY} workers ready\n`);

  let cursor = 0;
  const stats = {
    matched: 0,
    updated: 0,
    sizesUpdated: 0,
    notFound: 0,
    noChange: 0,
    notFoundTitles: [],
  };

  async function runWorker(page) {
    while (cursor < listings.length) {
      const idx = cursor++;
      const result = await processListing(
        page,
        listings[idx],
        idx,
        listings.length,
      );
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

  await Promise.all(pages.map((page) => runWorker(page)));
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
    stats.notFoundTitles.forEach((t) => console.log(`   - ${t}`));
  } else if (stats.notFoundTitles.length > 15) {
    console.log(
      `\n⚠️  ${stats.notFoundTitles.length} listings not found on GOAT`,
    );
  }

  console.log(
    `\n🎉 Done! ${stats.updated} listing price(s) + ${stats.sizesUpdated} size price(s) updated.`,
  );
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
