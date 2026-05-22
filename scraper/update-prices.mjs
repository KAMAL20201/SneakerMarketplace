/**
 * update-prices.mjs
 *
 * DB-first daily price updater for SneakInMarket.
 *
 * Flow:
 *   1. Fetch ALL active listings from Supabase DB
 *   2. For each listing, search GOAT by title → get productTemplateId
 *   3. Call GOAT buy_bar_data API → get per-size prices in USD
 *   4. Convert USD → INR using formula: ((usd + 10) * USD_TO_INR) + tiered margin
 *      Update product_listings.price (min across sizes) + all product_listing_sizes
 *   5. At the end, send one CSV of all price drops to Telegram
 *      (or a "no drops today" message if none)
 *
 * Usage:
 *   node scraper/update-prices.mjs
 *
 * Grep tips (every line is prefixed with IDs):
 *   grep "db=<listing_id>"    → all logs for a specific DB listing
 *   grep "goat=<template_id>" → all logs for a specific GOAT product
 */

import { existsSync, createWriteStream } from "fs";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium as playwrightChromium } from "playwright";
import { chromium as stealthChromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { createClient } from "@supabase/supabase-js";
import { FormData, Blob } from "formdata-node"; // npm i formdata-node

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
let USD_TO_INR = parseFloat(process.env.USD_TO_INR || "91");
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

// ─── Collected alerts (populated during run, sent once at the end) ─────────

/**
 * @type {Array<{
 *   title: string,
 *   size: string,
 *   prevPrice: number,
 *   newPrice: number,
 *   dropPercent: string
 * }>}
 */
const priceDropAlerts = [];

// ─── Telegram ──────────────────────────────────────────────────────────────

/** Send a plain text message to Telegram. */
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );
    if (!res.ok)
      console.error(`❌ Telegram sendMessage failed: ${res.statusText}`);
  } catch (e) {
    console.error(`❌ Telegram sendMessage error: ${e.message}`);
  }
}

/**
 * Send a file (CSV) to Telegram via sendDocument.
 * @param {Buffer} buffer   - file contents
 * @param {string} filename - e.g. "price-drops-2025-06-01.csv"
 * @param {string} caption  - short caption shown under the file
 */
async function sendTelegramDocument(buffer, filename, caption) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const form = new FormData();
    form.set("chat_id", TELEGRAM_CHAT_ID);
    form.set("caption", caption);
    form.set("document", new Blob([buffer], { type: "text/csv" }), filename);

    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
      { method: "POST", body: form },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(
        `❌ Telegram sendDocument failed: ${res.statusText} — ${body}`,
      );
    } else {
      console.log(
        `✅ Telegram: sent CSV "${filename}" with ${priceDropAlerts.length} drop(s)`,
      );
    }
  } catch (e) {
    console.error(`❌ Telegram sendDocument error: ${e.message}`);
  }
}

/**
 * Build a CSV buffer from priceDropAlerts and send it to Telegram.
 * Falls back to a plain text "no drops" message if the array is empty.
 */
async function sendDropsReport() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("ℹ️  Telegram not configured — skipping report.");
    return;
  }

  if (priceDropAlerts.length === 0) {
    await sendTelegramMessage(
      "📊 Price update complete — no significant drops today.",
    );
    return;
  }

  // Build CSV in-memory (no temp file needed)
  const header = "Title,Size,Prev Price (₹),New Price (₹),Drop %";
  const rows = priceDropAlerts.map((a) =>
    [
      `"${a.title.replace(/"/g, '""')}"`, // escape double-quotes in title
      a.size,
      a.prevPrice,
      a.newPrice,
      a.dropPercent,
    ].join(","),
  );
  const csvContent = [header, ...rows].join("\n");
  const csvBuffer = Buffer.from(csvContent, "utf-8");

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `price-drops-${date}.csv`;
  const caption =
    `📉 <b>Price Drops — ${date}</b>\n` +
    `${priceDropAlerts.length} drop(s) found across ${new Set(priceDropAlerts.map((a) => a.title)).size} product(s)`;

  await sendTelegramDocument(csvBuffer, filename, caption);
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

/** Round price up to the nearest X99 (e.g. 8125 → 8199, 13200 → 13199) */
function roundToNearest99(price) {
  return Math.ceil(price / 100) * 100 - 1;
}

function usdToInr(usd) {
  if (usd == null || isNaN(usd)) return null;
  const baseInr = (usd + 10) * USD_TO_INR;
  const margin = baseInr >= 45000 ? 5000 : baseInr >= 25000 ? 4000 : 3000;
  const raw = baseInr + margin;
  return roundToNearest99(raw);
}

/**
 * UK → US size offset per brand.
 *   +1   → Nike, Jordan, ASICS, Onitsuka Tiger
 *   +0.5 → Adidas, New Balance, On Cloud, Yeezy
 *    0   → Converse
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

function brandSizeOffset(brand) {
  if (!brand) return 1;
  const b = brand.toLowerCase().trim();
  for (const [key, offset] of Object.entries(BRAND_SIZE_OFFSET)) {
    if (b === key || b.includes(key)) return offset;
  }
  return 1;
}

function normalise(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBestMatch(dbTitle, results) {
  const normDb = normalise(dbTitle);
  const exact = results.find((r) => normalise(r.title) === normDb);
  return exact || results[0] || null;
}

// ─── GOAT API calls ─────────────────────────────────────────────────────────

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
    console.error(
      `${p} 🔍 [SEARCH] ❌ HTTP ${raw.status} | error: ${raw.error ?? "non-OK response"}`,
    );
    return [];
  }
  return raw.products;
}

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
    console.error(
      `${p} 💰 [BUY_BAR] ❌ HTTP ${raw.status} | error: ${raw.error ?? "non-OK response"}`,
    );
    return [];
  }

  return raw.mapped;
}

// ─── Process a single listing ──────────────────────────────────────────────

async function processListing(page, listing, idx, total) {
  const p = `[${idx + 1}/${total}][db=${listing.id}]`;

  let matchId = listing.goat_template_id;
  let matchRetailPriceCents = null;

  if (!matchId) {
    const results = await searchGoat(page, listing.title, p);
    await delay(DELAY_MS);

    if (!results.length) {
      console.error(
        `${p} ❌ not found on GOAT — "${listing.title.slice(0, 60)}"`,
      );
      return { status: "notFound", title: listing.title };
    }

    const match = pickBestMatch(listing.title, results);
    if (!match) {
      console.error(
        `${p} ❌ no match after pickBestMatch — "${listing.title.slice(0, 60)}"`,
      );
      return { status: "notFound", title: listing.title };
    }

    matchId = match.id;
    matchRetailPriceCents = match.retailPriceCents;
  }

  const pg = `[${idx + 1}/${total}][db=${listing.id}|goat=${matchId}]`;

  const sizePrices = await fetchSizePrices(page, matchId, pg);
  await delay(DELAY_MS);

  if (!sizePrices.length) {
    return { status: "noChange" };
  }

  console.log(`${pg} GOAT size prices (USD → INR):`);
  sizePrices.forEach((sp) =>
    console.log(
      `  US ${sp.size} → $${sp.priceUsd} → ₹${usdToInr(sp.priceUsd)}`,
    ),
  );

  const goatSizeMap = new Map();
  for (const sp of sizePrices) {
    goatSizeMap.set(parseFloat(sp.size), usdToInr(sp.priceUsd));
  }

  const offset = brandSizeOffset(listing.brand);
  const dbSizes = listing.product_listing_sizes || [];
  const sizeUpdatePromises = [];
  const matchedPricesInr = [];

  for (const dbSize of dbSizes) {
    if (dbSize.is_instant_ship) continue; // skip instant-ship sizes (in-hand inventory)
    const usMatch = dbSize.size_value.match(/us\s*([0-9.]+)/i);
    const ukMatch = dbSize.size_value.match(/uk\s*([0-9.]+)/i);
    let usSize = null;
    if (usMatch) usSize = parseFloat(usMatch[1]);
    else if (ukMatch) usSize = parseFloat(ukMatch[1]) + offset;

    const newSizeInr = goatSizeMap.get(usSize);

    console.log(
      `${pg} size="${dbSize.size_value}" → US ${usSize} | GOAT INR=₹${newSizeInr ?? "not found"} | DB INR=₹${dbSize.price}`,
    );

    if (!newSizeInr) continue;

    matchedPricesInr.push(newSizeInr);

    if (newSizeInr === dbSize.price) continue;

    // ── Collect price-drop alerts instead of sending immediately ──────────
    if (dbSize.price && newSizeInr < dbSize.price) {
      const dropPercent = ((dbSize.price - newSizeInr) / dbSize.price) * 100;
      if (dropPercent > 5) {
        priceDropAlerts.push({
          title: listing.title,
          size: dbSize.size_value,
          prevPrice: dbSize.price,
          newPrice: newSizeInr,
          dropPercent: dropPercent.toFixed(1),
        });
      }
    }

    sizeUpdatePromises.push(
      supabase
        .from("product_listing_sizes")
        .update({ price: newSizeInr })
        .eq("id", dbSize.id),
    );
  }

  const sizeResults = await Promise.all(sizeUpdatePromises);
  const sizeUpdateCount = sizeResults.filter((r) => !r.error).length;
  sizeResults
    .filter((r) => r.error)
    .forEach((r) =>
      console.error(`${pg} ⚠️  size DB update error: ${r.error.message}`),
    );

  const newPriceInr =
    matchedPricesInr.length > 0 ? Math.min(...matchedPricesInr) : null;
  const newRetailInr = matchRetailPriceCents
    ? usdToInr(matchRetailPriceCents / 100)
    : null;

  const priceChanged = newPriceInr !== null && newPriceInr !== listing.price;
  const retailChanged =
    newRetailInr !== null && newRetailInr !== listing.retail_price;

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
      console.error(`${pg} ❌ listing DB update error: ${listingErr.message}`);
      return { status: "error" };
    }
    listingUpdated = true;
  }

  return { status: listingUpdated ? "updated" : "noChange", sizeUpdateCount };
}

// ─── Live exchange rate ────────────────────────────────────────────────────

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
    console.error(
      `❌ Could not fetch live USD→INR rate (${e.message}) — using fallback: ₹${USD_TO_INR}`,
    );
    return null;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const liveRate = await fetchLiveUsdToInr();
  if (liveRate) USD_TO_INR = liveRate;

  // Paginated fetch of all active sneaker listings
  const listings = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data, error: fetchErr } = await supabase
      .from("product_listings")
      .select(
        "id, title, brand, price, retail_price, goat_template_id, product_listing_sizes(id, size_value, price, is_instant_ship)",
      )
      .eq("status", "active")
      .eq("category", "sneakers")
      .is("reviewed_at", null)
      .range(from, from + PAGE_SIZE - 1);

    if (fetchErr) {
      console.error("❌ DB fetch failed:", fetchErr.message);
      process.exit(1);
    }
    listings.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

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

  // ── Send the collected drops report once, at the very end ────────────────
  console.log(
    `\n📊 Run complete. Collected ${priceDropAlerts.length} price-drop alert(s). Sending Telegram report…`,
  );
  await sendDropsReport();

  console.log(`\n✅ Done.`);
  console.log(
    `   Updated: ${stats.updated} | No change: ${stats.noChange} | Not found: ${stats.notFound}`,
  );
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
