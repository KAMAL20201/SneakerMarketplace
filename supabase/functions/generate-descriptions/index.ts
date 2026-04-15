import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SYSTEM_PROMPT = `You write product descriptions for The Plug Market, India's authentic sneakers and streetwear marketplace.

Your descriptions are:
- 60-100 words
- Compelling and specific to the product
- Highlighting authenticity, style appeal, and desirability
- Natural sounding, never templated or generic
- Targeted at Indian sneaker and streetwear culture
- Never start with "Introducing", "Experience", or "Elevate"
- Do NOT mention price or condition (shown separately on the page)
- Written in third person about the product

Output only the description text. No preamble, no quotes, no markdown.`;

interface Product {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: string | null;
  color: string | null;
}

async function generateDescription(
  product: Product,
  apiKey: string,
): Promise<string> {
  const lines = [
    `Product: ${product.title}`,
    product.brand ? `Brand: ${product.brand}` : null,
    product.model ? `Model: ${product.model}` : null,
    product.category ? `Category: ${product.category}` : null,
    product.condition ? `Condition: ${product.condition}` : null,
    product.color ? `Color: ${product.color}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Enable prompt caching — the system prompt is identical for every product,
      // so after the first request Anthropic caches it and charges ~10% of normal cost.
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Write a product description for:\n${lines}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text ?? "").trim();
}

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY secret is not set in Supabase" },
      { status: 500 },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Optional: limit how many to process in one run (defaults to all)
  let limit = 2000;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.limit && typeof body.limit === "number") limit = body.limit;
  } catch {
    // no body is fine
  }

  // Fetch all active products with null or empty descriptions
  const { data: products, error: fetchError } = await supabase
    .from("product_listings")
    .select("id, title, brand, model, category, condition, color")
    .eq("status", "active")
    .or("description.is.null,description.eq.")
    .limit(limit);

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (!products || products.length === 0) {
    return Response.json({ generated: 0, errors: 0, message: "Nothing to generate — all products already have descriptions." });
  }

  // Process in parallel batches of 20
  const BATCH_SIZE = 20;
  let generated = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (product) => {
        try {
          const description = await generateDescription(product, anthropicKey);
          if (description) {
            const { error: saveError } = await supabase
              .from("product_listings")
              .update({ description })
              .eq("id", product.id);

            if (saveError) {
              console.error(`Save error for ${product.id}:`, saveError.message);
              errors++;
            } else {
              generated++;
            }
          }
        } catch (err) {
          console.error(`Generation error for "${product.title}":`, err);
          errors++;
        }
      }),
    );
  }

  return Response.json({
    generated,
    errors,
    total: products.length,
    message: `Done. Generated ${generated} descriptions, ${errors} errors.`,
  });
});
