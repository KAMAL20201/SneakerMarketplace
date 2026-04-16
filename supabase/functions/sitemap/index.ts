import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = "https://theplugmarket.in";

// Static routes that are always in the sitemap
const STATIC_URLS: Array<{
  loc: string;
  changefreq: string;
  priority: string;
}> = [
  { loc: `${SITE_URL}/`, changefreq: "daily", priority: "1.0" },
  { loc: `${SITE_URL}/sneakers`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/apparels`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/electronics`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/collectibles`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/browse`, changefreq: "daily", priority: "0.8" },
  { loc: `${SITE_URL}/new-arrivals`, changefreq: "daily", priority: "0.8" },
  { loc: `${SITE_URL}/blog`, changefreq: "weekly", priority: "0.8" },
  { loc: `${SITE_URL}/about`, changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE_URL}/contact-us`, changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE_URL}/privacy`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE_URL}/terms`, changefreq: "yearly", priority: "0.3" },
  {
    loc: `${SITE_URL}/shipping-policy`,
    changefreq: "monthly",
    priority: "0.4",
  },
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
  products: Array<{
    slug: string;
    title: string;
    image_url: string | null;
    updated_at: string | null;
  }>,
  blogs: Array<{
    slug: string;
    published_at: string | null;
    updated_at: string | null;
  }>,
): string {
  const staticEntries = STATIC_URLS.map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  ).join("\n");

  const blogEntries = blogs
    .map((row) => {
      const loc = escapeXml(`${SITE_URL}/blog/${row.slug}`);
      // Prefer published_at as the canonical date, fall back to updated_at
      const lastmod =
        (row.published_at ?? row.updated_at)
          ? new Date((row.published_at ?? row.updated_at)!)
              .toISOString()
              .split("T")[0]
          : new Date().toISOString().split("T")[0];
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join("\n");

  const productEntries = products
    .map((row) => {
      const loc = escapeXml(`${SITE_URL}/product/${row.slug}`);
      const lastmod = row.updated_at
        ? new Date(row.updated_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      // Include image block only when an image URL is present
      const imageBlock = row.image_url
        ? `
    <image:image>
      <image:loc>${escapeXml(row.image_url)}</image:loc>
      <image:title>${escapeXml(row.title)}</image:title>
    </image:image>`
        : "";
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imageBlock}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticEntries}
${blogEntries}
${productEntries}
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

    // Fetch products and published blog posts in parallel
    const [productsRes, blogsRes] = await Promise.all([
      supabase
        .from("listings_with_images")
        .select("slug, title, image_url, updated_at")
        .eq("status", "active")
        .not("slug", "is", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("blog_posts")
        .select("slug, published_at, updated_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false }),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (blogsRes.error) throw blogsRes.error;

    const xml = buildSitemap(productsRes.data ?? [], blogsRes.data ?? []);

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        // Cache for 1 hour on the CDN, revalidate in background
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("sitemap error:", message);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>${message}</error>`,
      {
        status: 500,
        headers: { "Content-Type": "application/xml" },
      },
    );
  }
});
