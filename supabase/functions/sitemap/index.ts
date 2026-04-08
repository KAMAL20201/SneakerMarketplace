import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = "https://theplugmarket.in";

// Static routes that are always in the sitemap
const STATIC_URLS: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: `${SITE_URL}/`,               changefreq: "daily",   priority: "1.0" },
  { loc: `${SITE_URL}/sneakers`,       changefreq: "daily",   priority: "0.9" },
  { loc: `${SITE_URL}/apparels`,       changefreq: "daily",   priority: "0.9" },
  { loc: `${SITE_URL}/electronics`,    changefreq: "daily",   priority: "0.9" },
  { loc: `${SITE_URL}/collectibles`,   changefreq: "daily",   priority: "0.9" },
  { loc: `${SITE_URL}/browse`,         changefreq: "daily",   priority: "0.8" },
  { loc: `${SITE_URL}/new-arrivals`,   changefreq: "daily",   priority: "0.8" },
  { loc: `${SITE_URL}/about`,          changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE_URL}/contact-us`,     changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE_URL}/privacy`,        changefreq: "yearly",  priority: "0.3" },
  { loc: `${SITE_URL}/terms`,          changefreq: "yearly",  priority: "0.3" },
  { loc: `${SITE_URL}/shipping-policy`,changefreq: "monthly", priority: "0.4" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(
  dynamicUrls: Array<{ slug: string; updated_at: string | null }>
): string {
  const staticEntries = STATIC_URLS.map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  ).join("\n");

  const dynamicEntries = dynamicUrls
    .map((row) => {
      const loc = escapeXml(`${SITE_URL}/product/${row.slug}`);
      const lastmod = row.updated_at
        ? new Date(row.updated_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${dynamicEntries}
</urlset>`;
}

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase env vars");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active listings — only id and updated_at needed
    const { data, error } = await supabase
      .from("product_listings")
      .select("slug, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const xml = buildSitemap(data ?? []);

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Cache for 1 hour on the CDN, revalidate in background
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("sitemap error:", message);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>${message}</error>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
