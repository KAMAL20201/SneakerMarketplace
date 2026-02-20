import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface SizeEntry {
  size_value: string; // e.g. "uk 8.5"
  price: number;      // INR
}

interface ImportRow {
  title: string;
  brand: string;
  model: string;
  goat_url: string;
  /** Pre-fetched image URLs (from enriched CSV) */
  image_urls?: string[];

  // ── Single-size format (old CSV) ──
  size_value?: string;
  price?: number;

  // ── Multi-size format (all-sizes CSV) ──
  sizes?: SizeEntry[];

  // ── Retail price in INR (converted from Retail $ using admin-supplied rate) ──
  retail_price?: number | null;
}

// ── Structured logger ─────────────────────────────────────────────────────────
const log = {
  info:  (msg: string, data?: unknown) => console.log( JSON.stringify({ level: "INFO",  msg, ...(data ? { data } : {}) })),
  warn:  (msg: string, data?: unknown) => console.warn(JSON.stringify({ level: "WARN",  msg, ...(data ? { data } : {}) })),
  error: (msg: string, data?: unknown) => console.error(JSON.stringify({ level: "ERROR", msg, ...(data ? { data } : {}) })),
};

// ── Fetch images from GOAT __NEXT_DATA__ (fallback — often Cloudflare-blocked) ─
async function fetchGoatImages(goatUrl: string): Promise<string[] | null> {
  log.warn("Attempting live GOAT fetch (may be Cloudflare-blocked)", { url: goatUrl });

  const resp = await fetch(goatUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    log.warn("GOAT page fetch failed", { status: resp.status });
    return null;
  }

  const html = await resp.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) { log.warn("__NEXT_DATA__ not found"); return null; }

  const nextData = JSON.parse(match[1]);
  const pt = nextData?.props?.pageProps?.productTemplate;
  if (!pt) { log.warn("productTemplate missing"); return null; }

  const main: string = pt.pictureUrl ?? pt.mainPictureUrl ?? "";
  const gallery: string[] = (pt.productTemplateExternalPictures ?? [])
    .map((p: { mainPictureUrl?: string }) => p.mainPictureUrl ?? "")
    .filter(Boolean);

  const all = [main, ...gallery].filter(Boolean).slice(0, 8);
  log.info("GOAT images found", { count: all.length });
  return all.length > 0 ? all : null;
}

// ── Download + upload one image to Supabase Storage ───────────────────────────
async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  imageUrl: string,
  listingId: string,
  index: number,
): Promise<string | null> {
  const resp = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Referer: "https://www.goat.com/",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!resp.ok) {
    log.warn("Image download failed", { index, status: resp.status });
    return null;
  }

  const contentType = resp.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const storagePath = `listings/${listingId}/${listingId}_${index}.${ext}`;
  const buffer = await resp.arrayBuffer();

  const { error } = await supabase.storage
    .from("product-images")
    .upload(storagePath, buffer, { contentType, upsert: true });

  if (error) { log.error("Upload failed", { index, error: error.message }); return null; }

  const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
  log.info("Image uploaded", { index, publicUrl: data.publicUrl });
  return data.publicUrl;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    log.info("Request received");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log.info("Auth OK", { userId: user.id });

    // ── Admin check ────────────────────────────────────────────────────────
    const { data: adminRecord } = await supabase
      .from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adminRecord) {
      return new Response(JSON.stringify({ error: "Forbidden: admins only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    const body = await req.json();
    const row: ImportRow = body.row;

    if (!row?.title || !row?.goat_url) {
      return new Response(JSON.stringify({ error: "Missing required fields: row.title, row.goat_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isMultiSize = Array.isArray(row.sizes) && row.sizes.length > 0;
    log.info("Processing row", {
      title: row.title,
      format: isMultiSize ? "multi-size" : "single-size",
      sizes: isMultiSize ? row.sizes!.length : 1,
    });

    // ── Duplicate check ────────────────────────────────────────────────────
    // Multi-size: one listing per title — check title only
    // Single-size: one listing per title+size — check both
    let dupQuery = supabase
      .from("product_listings")
      .select("id")
      .eq("title", row.title)
      .neq("status", "sold");

    if (!isMultiSize && row.size_value) {
      dupQuery = dupQuery.eq("size_value", row.size_value);
    }

    const { data: existing } = await dupQuery.maybeSingle();
    if (existing) {
      log.info("Duplicate found, skipping", { title: row.title });
      return new Response(
        JSON.stringify({ status: "skipped", reason: "Duplicate listing already exists", title: row.title, size_value: row.size_value ?? null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Determine price for the listing row ────────────────────────────────
    // Multi-size: use min price across all sizes
    // Single-size: use the given price
    const listingPrice = isMultiSize
      ? Math.min(...row.sizes!.map(s => s.price))
      : (row.price ?? 0);

    // ── Insert product_listings ────────────────────────────────────────────
    log.info("Inserting listing", { price: listingPrice, isMultiSize });
    const { data: listing, error: listingError } = await supabase
      .from("product_listings")
      .insert({
        user_id:          user.id,
        title:            row.title,
        category:         "sneakers",
        brand:            row.brand,
        model:            row.model,
        // For multi-size: size_value is null (sizes live in product_listing_sizes)
        // For single-size: set the single size
        size_value:       isMultiSize ? null : (row.size_value ?? null),
        condition:        "new",
        price:            listingPrice,
        retail_price:     row.retail_price ?? null,
        description:      null,
        status:           "active",
        shipping_charges: 0,
        delivery_days:    "7-10",
      })
      .select("id")
      .single();

    if (listingError || !listing) {
      log.error("Failed to insert listing", { error: listingError?.message });
      return new Response(
        JSON.stringify({ status: "error", reason: listingError?.message ?? "Insert failed", title: row.title }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    log.info("Listing inserted", { listingId: listing.id });

    // ── Insert sizes into product_listing_sizes (multi-size only) ──────────
    if (isMultiSize) {
      const sizeRows = row.sizes!.map(s => ({
        listing_id: listing.id,
        size_value: s.size_value,
        price:      s.price,
      }));

      const { error: sizesError } = await supabase
        .from("product_listing_sizes")
        .insert(sizeRows);

      if (sizesError) {
        log.error("Failed to insert sizes", { error: sizesError.message });
        // Don't fail the whole import — listing is already created
      } else {
        log.info("Sizes inserted", { count: sizeRows.length });
      }
    }

    // ── Resolve image URLs ─────────────────────────────────────────────────
    const hasPreFetched = Array.isArray(row.image_urls) && row.image_urls.length > 0;
    let allImageUrls: string[] = hasPreFetched
      ? row.image_urls!.slice(0, 8)
      : (await fetchGoatImages(row.goat_url) ?? []);

    log.info("Images to upload", { count: allImageUrls.length, source: hasPreFetched ? "pre-fetched" : "live-fetch" });

    // ── Upload images ──────────────────────────────────────────────────────
    const imageInserts = [];
    for (let i = 0; i < allImageUrls.length; i++) {
      const publicUrl = await uploadImage(supabase, allImageUrls[i], listing.id, i);
      if (publicUrl) {
        imageInserts.push({
          product_id:      listing.id,
          image_url:       publicUrl,
          storage_path:    `listings/${listing.id}/${listing.id}_${i}.${publicUrl.endsWith(".png") ? "png" : "jpg"}`,
          is_poster_image: i === 0,
        });
      }
    }

    if (imageInserts.length > 0) {
      const { error: imgErr } = await supabase.from("product_images").insert(imageInserts);
      if (imgErr) log.error("product_images insert failed", { error: imgErr.message });
      else log.info("Images inserted", { count: imageInserts.length });
    }

    log.info("Row complete", { status: "imported", listingId: listing.id });

    return new Response(
      JSON.stringify({
        status:          "imported",
        listing_id:      listing.id,
        title:           row.title,
        size_value:      row.size_value ?? null,
        sizes_imported:  isMultiSize ? row.sizes!.length : undefined,
        images_uploaded: imageInserts.length,
        ...(!hasPreFetched && allImageUrls.length === 0
          ? { warning: "No images — run enrich-images.mjs first to pre-fetch from GOAT" }
          : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("Unhandled exception", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
