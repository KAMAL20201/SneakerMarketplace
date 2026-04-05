// Vercel Edge Middleware — intercepts bot/crawler requests and serves
// pre-rendered HTML from Prerender.io instead of the blank SPA shell.
// This is the fix for "Discovered - currently not indexed" in Google Search Console.
//
// Setup:
//  1. Sign up at https://prerender.io (free: 250 pages/month)
//  2. Get your token from the Prerender dashboard
//  3. Add PRERENDER_TOKEN=your_token to Vercel Environment Variables
//  4. Deploy — bots will now receive fully rendered HTML

// Bot user-agents that need pre-rendered HTML
// Covers all major crawlers: Google, Bing, Facebook, Twitter, LinkedIn, WhatsApp, Slack, etc.
const BOT_AGENTS = [
  "googlebot",
  "google-inspectiontool",
  "google-extended",
  "bingbot",
  "slurp", // Yahoo
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "sogou",
  "exabot",
  "facebot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "slackbot",
  "telegrambot",
  "discordbot",
  "applebot",
  "petalbot",
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "rogerbot",
  "screaming frog",
  "sitebulb",
  "prerender",
];

// Static file extensions — never prerender these
const STATIC_EXT =
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|json|xml|txt|pdf|zip|map)$/i;

// Private paths that should never be prerendered
const SKIP_PATHS = [
  "/admin",
  "/my-listings",
  "/my-orders",
  "/sell",
  "/edit-listing",
  "/my-addresses",
];

// URL query parameters that should be IGNORED when building the prerender cache key.
// This prevents the same product page being cached separately for every ?size= or ?color= variant.
// Must match what you configure in Prerender dashboard → Caching Rules → URL Parameters.
const STRIP_PARAMS = ["size", "color", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "fbclid", "gclid"];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some((bot) => ua.includes(bot));
}

export default async function middleware(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;
  const userAgent = req.headers.get("user-agent") ?? "";

  // Skip static file extensions
  if (STATIC_EXT.test(pathname)) {
    return fetch(req);
  }

  // Skip private/admin paths
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) {
    return fetch(req);
  }

  // Only intercept for bots — regular users get normal SPA
  if (!isBot(userAgent)) {
    return fetch(req);
  }

  const prerenderToken = process.env.PRERENDER_TOKEN;

  // If token not configured, fall through gracefully (don't break anything)
  if (!prerenderToken) {
    console.warn(
      "[prerender] PRERENDER_TOKEN env var not set — serving SPA shell to bot",
    );
    return fetch(req);
  }

  // Build a canonical URL for Prerender by stripping noise params (UTM, size, color, etc.)
  // so Prerender caches one copy per page, not one per query string combination.
  const canonicalUrl = new URL(req.url);
  STRIP_PARAMS.forEach((p) => canonicalUrl.searchParams.delete(p));
  const prerenderUrl = `https://service.prerender.io/${canonicalUrl.toString()}`;

  try {
    const prerendered = await fetch(prerenderUrl, {
      headers: {
        "X-Prerender-Token": prerenderToken,
        "User-Agent": userAgent,
      },
    });

    const html = await prerendered.text();

    return new Response(html, {
      status: prerendered.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Vary by UA so CDN doesn't serve bot HTML to real users
        Vary: "User-Agent",
        // Cache pre-rendered HTML at the edge for 1 hour
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "X-Prerendered": "1",
      },
    });
  } catch (err) {
    // Never break the live site — fall through to normal SPA on any error
    console.error("[prerender] fetch failed:", err);
    return fetch(req);
  }
}

export const config = {
  matcher: "/((?!_vercel|_next|favicon\\.ico).*)",
};
