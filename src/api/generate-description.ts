import Anthropic from "@anthropic-ai/sdk";

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

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: {
    title?: string;
    brand?: string;
    model?: string;
    category?: string;
    condition?: string;
    color?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, brand, model, category, condition, color } = body;
  if (!title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const lines = [
    `Product: ${title}`,
    brand ? `Brand: ${brand}` : null,
    model ? `Model: ${model}` : null,
    category ? `Category: ${category}` : null,
    condition ? `Condition: ${condition}` : null,
    color ? `Color: ${color}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // Cache the system prompt — saves tokens across batch generation
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: `Write a product description for:\n${lines}` }],
    });

    const description =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    return Response.json({ description });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
