#!/usr/bin/env node
/**
 * generate-on-feet.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates "on feet" lifestyle images for sneaker listings.
 * Supports two backends:
 *   --model flux-dev        Flux Dev img2img via Replicate (~$0.03/image)
 *   --model nano-banana     Google Nano Banana Pro edit via fal.ai (~$0.13/image, best quality)
 *
 * Usage:
 *   node scraper/generate-on-feet.mjs [--limit 10] [--model flux-2-dev] [--dry-run]
 *
 * Models:
 *   flux-dev       Flux Dev img2img via Replicate (~$0.03/image)
 *   nano-banana    Google Nano Banana img2img via Replicate (~$0.039/image)
 *   flux-2-dev     Flux 2 Dev img2img via Replicate (~$0.02/image, fastest ~5s)
 *
 * Required env vars:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   REPLICATE_API_TOKEN
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

// ── Load .env files ───────────────────────────────────────────────────────────

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

await loadEnv(path.join(__dirname, ".env"));
await loadEnv(path.join(ROOT_DIR, ".env"));
await loadEnv(path.join(ROOT_DIR, ".env.local"));

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Parse CLI args
const args = process.argv.slice(2);
const LIMIT = parseInt(args[args.indexOf("--limit") + 1] || "10");
const MODEL = args.includes("--model")
  ? args[args.indexOf("--model") + 1]
  : "flux-dev";
const DRY_RUN = args.includes("--dry-run");
const IMAGES_PER_PRODUCT = 1;

// flux-2-dev ~5s/image, nano-banana ~10s/image, flux-dev needs 12s gap on free tier
const DELAY_MS =
  MODEL === "flux-2-dev" ? 2000 : MODEL === "nano-banana" ? 3000 : 12000;

// ── Validate ──────────────────────────────────────────────────────────────────

if (!SUPABASE_URL) {
  console.error("❌  Missing SUPABASE_URL / VITE_SUPABASE_URL");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("❌  Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!REPLICATE_API_TOKEN) {
  console.error("❌  Missing REPLICATE_API_TOKEN");
  process.exit(1);
}

if (!["flux-dev", "nano-banana", "flux-2-dev"].includes(MODEL)) {
  console.error(
    `❌  Unknown model "${MODEL}". Use: flux-dev | nano-banana | flux-2-dev`,
  );
  process.exit(1);
}

// ── Supabase client (service role — bypasses RLS) ─────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Build prompt for img2img — keep it focused on the transformation,
 * not describing the shoe (the input image already shows it).
 */
function buildPrompt(product) {
  const brand = product.brand || "sneaker";
  const model = product.model || product.title || "shoe";
  const color = product.color ? `, ${product.color}` : "";

  return (
    `ONE single person's lower legs and feet only, wearing ${brand} ${model}${color} sneakers. ` +
    `The REFERENCE IMAGE shows the RIGHT shoe — place that exact shoe on the right foot, closest to the camera. ` +
    `Mirror it accurately to generate the matching LEFT shoe on the left foot, slightly behind. ` +
    `Both shoes must be identical in colorway, material, and design to the reference. ` +
    `Camera angle: pure RIGHT SIDE PROFILE, camera positioned exactly 90 degrees to the right of the person, perfectly level at ankle height, ZERO tilt, ZERO Dutch angle, shoe soles parallel to the ground. ` +
    `Person's body is perpendicular to the camera — right foot in front closer to the lens, left foot behind, both feet pointing forward. ` +
    `Baggy cargo pants draping down and resting directly on top of the sneakers, fully covering the ankle, ` +
    `NO socks visible whatsoever, fabric touching the shoe collar. ` +
    `Clean light grey studio background and floor, soft natural light, photorealistic, sharp focus, 4K. ` +
    `NOT a flat lay. NOT floating shoes. NOT two people. ONLY ONE PERSON. Both shoes MUST be on that one person's feet.`
  );
}

/**
 * Call Replicate Flux Dev (img2img) with the product image as reference.
 * prompt_strength: 0 = identical to input, 1 = ignore input completely.
 * 0.65 keeps the shoe recognisable while adding feet/context.
 */
async function generateWithFluxDev(prompt, imageUrl) {
  // 1. Create prediction — retry on 429 with back-off
  let createRes;
  for (let attempt = 1; attempt <= 5; attempt++) {
    createRes = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt,
            image: imageUrl, // ← existing product photo as reference
            prompt_strength: 0.88, // ← higher = more transformation, lower = closer to input
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "jpg",
            output_quality: 90,
            num_inference_steps: 28,
          },
        }),
      },
    );

    if (createRes.status === 200 || createRes.status === 201) break;

    const body = await createRes.json().catch(() => ({}));

    if (createRes.status === 429) {
      const waitSec = (body.retry_after || 10) + 2;
      console.log(
        `    ⏱  Rate limited — waiting ${waitSec}s (attempt ${attempt}/5)...`,
      );
      await delay(waitSec * 1000);
    } else if (createRes.status === 401) {
      console.log(
        `    ⏱  Auth error (transient) — waiting 5s (attempt ${attempt}/5)...`,
      );
      await delay(5000);
    } else {
      break; // non-retryable error
    }
  }

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate API error ${createRes.status}: ${err}`);
  }

  let prediction = await createRes.json();

  // 2. Poll if not done yet (Prefer: wait sometimes times out on cold start)
  const maxWait = 120_000;
  const pollInterval = 2_000;
  const deadline = Date.now() + maxWait;

  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    if (Date.now() > deadline)
      throw new Error("Replicate prediction timed out");
    await delay(pollInterval);

    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } },
    );
    prediction = await pollRes.json();
  }

  if (prediction.status === "failed") {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  const outputUrl = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

  if (!outputUrl) throw new Error("Replicate returned empty output");
  return outputUrl;
}

/**
 * Call Replicate Nano Banana Pro with the product image as reference.
 * Returns the output image URL.
 */
async function generateWithNanoBanana(prompt, imageUrl) {
  let createRes;
  for (let attempt = 1; attempt <= 5; attempt++) {
    createRes = await fetch(
      "https://api.replicate.com/v1/models/google/nano-banana/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt,
            image_input: [imageUrl],
            aspect_ratio: "1:1",
            output_format: "jpg",
          },
        }),
      },
    );

    if (createRes.status === 200 || createRes.status === 201) break;

    const body = await createRes.json().catch(() => ({}));
    if (createRes.status === 429) {
      const waitSec = (body.retry_after || 10) + 2;
      console.log(
        `    ⏱  Rate limited — waiting ${waitSec}s (attempt ${attempt}/5)...`,
      );
      await delay(waitSec * 1000);
    } else if (createRes.status === 401) {
      console.log(`    ⏱  Auth error — waiting 5s (attempt ${attempt}/5)...`);
      await delay(5000);
    } else {
      break;
    }
  }

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate API error ${createRes.status}: ${err}`);
  }

  let prediction = await createRes.json();

  // Poll if not done yet
  const deadline = Date.now() + 120_000;
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    if (Date.now() > deadline)
      throw new Error("Replicate prediction timed out");
    await delay(2000);
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } },
    );
    prediction = await pollRes.json();
    console.log(`    status: ${prediction.status}...`);
  }

  if (prediction.status === "failed") {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  const outputUrl = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

  if (!outputUrl) throw new Error("Replicate returned empty output");
  return outputUrl;
}

/**
 * Call Replicate Flux 2 Dev (img2img) with the product image as reference.
 * Params confirmed from live schema: input_images (array), prompt, aspect_ratio,
 * go_fast, output_format, output_quality. No prompt_strength param.
 */
async function generateWithFlux2Dev(prompt, imageUrl) {
  let createRes;
  for (let attempt = 1; attempt <= 5; attempt++) {
    createRes = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-2-dev/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt,
            input_images: [imageUrl], // ← confirmed param name from schema
            aspect_ratio: "1:1",
            go_fast: true,
            output_format: "jpg",
            output_quality: 90,
          },
        }),
      },
    );

    if (createRes.status === 200 || createRes.status === 201) break;

    const body = await createRes.json().catch(() => ({}));
    if (createRes.status === 429) {
      const waitSec = (body.retry_after || 10) + 2;
      console.log(
        `    ⏱  Rate limited — waiting ${waitSec}s (attempt ${attempt}/5)...`,
      );
      await delay(waitSec * 1000);
    } else if (createRes.status === 401) {
      console.log(`    ⏱  Auth error — waiting 5s (attempt ${attempt}/5)...`);
      await delay(5000);
    } else {
      break;
    }
  }

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate API error ${createRes.status}: ${err}`);
  }

  let prediction = await createRes.json();

  const deadline = Date.now() + 120_000;
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    if (Date.now() > deadline)
      throw new Error("Replicate prediction timed out");
    await delay(2000);
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` } },
    );
    prediction = await pollRes.json();
    console.log(`    status: ${prediction.status}...`);
  }

  if (prediction.status === "failed") {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  const outputUrl = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

  if (!outputUrl) throw new Error("Replicate returned empty output");
  return outputUrl;
}

/**
 * Download an image from a URL and return its Buffer.
 */
async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload image buffer to Supabase storage and return the public URL.
 */
async function uploadToSupabase(buffer, listingId, index) {
  const storagePath = `listings/${listingId}/ai-on-feet-${MODEL}-${index}.jpg`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(storagePath, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(storagePath);

  return { publicUrl: data.publicUrl, storagePath };
}

/**
 * Insert a new row into product_images.
 */
async function saveImageRecord(listingId, imageUrl, storagePath) {
  const { error } = await supabase.from("product_images").insert({
    product_id: listingId,
    image_url: imageUrl,
    storage_path: storagePath,
    is_poster_image: false,
  });

  if (error) throw new Error(`DB insert failed: ${error.message}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 generate-on-feet.mjs`);
  console.log(
    `   Limit: ${LIMIT} products | Images/product: ${IMAGES_PER_PRODUCT}`,
  );
  console.log(`   Dry run: ${DRY_RUN}\n`);

  // 1. Fetch products that don't already have an AI on-feet image
  console.log("📦 Fetching products from Supabase...");

  const { data: listings, error: fetchError } = await supabase
    .from("product_listings")
    .select(
      `
      id,
      title,
      brand,
      model,
      color,
      status,
      product_images (
        image_url,
        is_poster_image
      )
    `,
    )
    .eq("status", "active")
    .not("product_images", "is", null)
    // Prioritise 9060 listings first
    .ilike("title", "%9060%")
    // NOTE: do NOT filter product_images.image_url here — PostgREST would strip the
    // matching rows from the joined result instead of excluding the parent listing,
    // making the client-side alreadyHasAI check always return false.
    // Client-side filtering below handles the "already generated" check correctly.
    .limit(LIMIT * 10)
    // Process oldest first so repeated runs won't repeatedly fetch recently-processed items
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("❌  Supabase fetch failed:", fetchError.message);
    process.exit(1);
  }

  // Filter: only products that have at least one image and no AI image yet
  const eligible = listings
    .filter((l) => {
      const imgs = l.product_images || [];
      const hasImage = imgs.length > 0;
      const alreadyHasAI = imgs.some((img) =>
        img.image_url?.includes("ai-on-feet"),
      );
      return hasImage && !alreadyHasAI;
    })
    .slice(0, LIMIT);

  console.log(`✅  Found ${eligible.length} eligible products\n`);

  if (eligible.length === 0) {
    console.log("Nothing to do — all fetched products already have AI images.");
    return;
  }

  // 2. Generate images
  const results = { success: 0, failed: 0 };

  for (let i = 0; i < eligible.length; i++) {
    const product = eligible[i];
    const label =
      `[${i + 1}/${eligible.length}] ${product.brand || ""} ${product.model || product.title}`.trim();

    console.log(`\n🔄  ${label}`);
    console.log(`    id: ${product.id}`);

    // Pick the poster image (or first image) as the reference
    const imgs = product.product_images || [];
    const referenceImage =
      imgs.find((img) => img.is_poster_image)?.image_url || imgs[0]?.image_url;

    if (!referenceImage) {
      console.log("    ⚠️  No reference image found, skipping");
      continue;
    }
    console.log(`    ref: ${referenceImage}`);

    for (let imgIdx = 0; imgIdx < IMAGES_PER_PRODUCT; imgIdx++) {
      const prompt = buildPrompt(product);
      console.log(`    prompt: "${prompt}"`);

      if (DRY_RUN) {
        console.log("    [dry-run] skipping Replicate call");
        continue;
      }

      try {
        // Generate using the existing product image as reference
        const modelLabel =
          MODEL === "nano-banana"
            ? "Nano Banana"
            : MODEL === "flux-2-dev"
              ? "Flux 2 Dev"
              : "Flux Dev";
        console.log(`    ⏳ Calling ${modelLabel} (img2img)...`);
        const outputUrl =
          MODEL === "nano-banana"
            ? await generateWithNanoBanana(prompt, referenceImage)
            : MODEL === "flux-2-dev"
              ? await generateWithFlux2Dev(prompt, referenceImage)
              : await generateWithFluxDev(prompt, referenceImage);
        console.log(`    🖼  Generated: ${outputUrl}`);

        // Download
        const imageBuffer = await downloadImage(outputUrl);

        // Upload to Supabase
        const { publicUrl, storagePath } = await uploadToSupabase(
          imageBuffer,
          product.id,
          imgIdx + 1,
        );
        console.log(`    ☁️  Uploaded: ${publicUrl}`);

        // Save DB record
        await saveImageRecord(product.id, publicUrl, storagePath);
        console.log(`    ✅  Saved to product_images`);

        results.success++;
      } catch (err) {
        console.error(`    ❌  Failed: ${err.message}`);
        results.failed++;
      }

      // Be polite between calls
      if (i < eligible.length - 1 || imgIdx < IMAGES_PER_PRODUCT - 1) {
        await delay(DELAY_MS);
      }
    }
  }

  // 3. Summary
  console.log("\n─────────────────────────────────────────────");
  console.log(`✅  Success: ${results.success}`);
  console.log(`❌  Failed:  ${results.failed}`);
  const pricePerImage =
    MODEL === "nano-banana" ? 0.039 : MODEL === "flux-2-dev" ? 0.02 : 0.03;
  const estimatedCost = (results.success * pricePerImage).toFixed(3);
  console.log(`💰  Est. cost: ~$${estimatedCost} (${MODEL})`);
  console.log("─────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
