#!/usr/bin/env node
/**
 * enrich-images.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads a GOAT-exported CSV (with a "URL" column), visits each GOAT product
 * page in a real Chromium browser (bypassing Cloudflare), extracts image URLs
 * from __NEXT_DATA__, and outputs an enriched CSV with an added "image_urls"
 * column (pipe-separated list of up to 8 image URLs).
 *
 * Usage:
 *   node enrich-images.mjs <input.csv> [output.csv]
 *
 * If output.csv is omitted, the enriched file is saved as:
 *   <input_name>_enriched.csv
 *
 * Requirements (already installed in scraper/node_modules):
 *   - playwright  (chromium)
 *   - csv-writer
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { chromium } from "./node_modules/playwright/index.mjs";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_IMAGES        = 8;    // max images per product (1 main + up to 7 gallery)
const DELAY_BETWEEN_MS  = 1500; // ms to wait between page visits (be polite)
const PAGE_TIMEOUT_MS   = 20000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Parse a CSV string into an array of objects (handles quoted fields).
 * Returns { headers: string[], rows: Record<string,string>[] }
 */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) throw new Error("CSV has no data rows");

  function splitLine(line) {
    const cols = [];
    let inQuote = false, cell = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(cell); cell = ""; continue; }
      cell += ch;
    }
    cols.push(cell);
    return cols.map(c => c.trim());
  }

  const headers = splitLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] ?? ""; });
    rows.push(obj);
  }
  return { headers, rows };
}

/**
 * Serialise an array of row-objects back to CSV string.
 * Quotes any field that contains commas or quotes.
 */
function toCSV(headers, rows) {
  function escapeCell(v) {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCell(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

/**
 * Given a Playwright page that has loaded a GOAT product URL,
 * extract image URLs from __NEXT_DATA__.
 * Returns pipe-separated string of up to MAX_IMAGES image URLs, or "" on failure.
 */
async function extractImages(page) {
  try {
    const nextDataText = await page.evaluate(() => {
      const el = document.getElementById("__NEXT_DATA__");
      return el ? el.textContent : null;
    });

    if (!nextDataText) {
      console.warn("    ⚠️  __NEXT_DATA__ not found on page");
      return "";
    }

    const nextData = JSON.parse(nextDataText);
    const pt = nextData?.props?.pageProps?.productTemplate;
    if (!pt) {
      console.warn("    ⚠️  productTemplate not found in __NEXT_DATA__");
      return "";
    }

    const mainUrl = pt.pictureUrl ?? pt.mainPictureUrl ?? "";
    const galleryUrls = (pt.productTemplateExternalPictures ?? [])
      .map(p => p.mainPictureUrl ?? "")
      .filter(Boolean);

    const allUrls = [mainUrl, ...galleryUrls].filter(Boolean).slice(0, MAX_IMAGES);

    if (allUrls.length === 0) {
      console.warn("    ⚠️  No image URLs found in productTemplate");
      return "";
    }

    console.log(`    ✅ Found ${allUrls.length} image(s)`);
    return allUrls.join("|");

  } catch (err) {
    console.warn("    ⚠️  Error extracting images:", err.message);
    return "";
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node enrich-images.mjs <input.csv> [output.csv]");
    process.exit(1);
  }

  const inputPath  = path.resolve(args[0]);
  const outputPath = args[1]
    ? path.resolve(args[1])
    : inputPath.replace(/\.csv$/i, "_enriched.csv");

  console.log("📂 Input :", inputPath);
  console.log("📂 Output:", outputPath);

  // Read & parse CSV
  const rawText = await fs.readFile(inputPath, "utf-8");
  const { headers, rows } = parseCSV(rawText);

  // Find URL column (case-insensitive)
  const urlHeader = headers.find(h => h.toLowerCase() === "url");
  if (!urlHeader) {
    console.error('❌ CSV must have a "URL" column');
    process.exit(1);
  }

  // Prepare output headers — add image_urls if not already present
  const IMAGE_COL = "image_urls";
  const outHeaders = headers.includes(IMAGE_COL) ? headers : [...headers, IMAGE_COL];

  // Launch browser
  console.log("\n🚀 Launching Chromium...");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
  });

  // Stealth: remove automation indicators
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  // Unique GOAT URLs (same product can appear multiple times in CSV with different sizes)
  const uniqueUrls = [...new Set(rows.map(r => r[urlHeader]).filter(Boolean))];
  const imageCache = new Map(); // url → image_urls string

  console.log(`\n🔗 ${uniqueUrls.length} unique GOAT URLs to process (${rows.length} total rows)\n`);

  let done = 0;
  for (const goatUrl of uniqueUrls) {
    done++;
    console.log(`[${done}/${uniqueUrls.length}] ${goatUrl}`);

    try {
      await page.goto(goatUrl, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_TIMEOUT_MS,
      });

      // Small wait to let any lazy scripts run
      await delay(800);

      const imageUrls = await extractImages(page);
      imageCache.set(goatUrl, imageUrls);

      if (!imageUrls) {
        console.warn("    → No images cached for this URL");
      }

    } catch (err) {
      console.error(`    ❌ Failed to load page: ${err.message}`);
      imageCache.set(goatUrl, "");
    }

    // Polite delay between requests (skip after last one)
    if (done < uniqueUrls.length) {
      await delay(DELAY_BETWEEN_MS);
    }
  }

  await browser.close();
  console.log("\n✅ Browser closed");

  // Enrich rows
  const enrichedRows = rows.map(row => ({
    ...row,
    [IMAGE_COL]: imageCache.get(row[urlHeader]) ?? "",
  }));

  // Write output CSV
  const outText = toCSV(outHeaders, enrichedRows);
  await fs.writeFile(outputPath, outText, "utf-8");

  // Summary
  const withImages = enrichedRows.filter(r => r[IMAGE_COL]).length;
  const without    = enrichedRows.filter(r => !r[IMAGE_COL]).length;

  console.log("\n📊 Summary:");
  console.log(`   Rows with images   : ${withImages}`);
  console.log(`   Rows without images: ${without}`);
  console.log(`\n✅ Enriched CSV written to:\n   ${outputPath}`);
  console.log("\nNext step: Upload the enriched CSV in the Admin Import page.\n");
}

main().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
