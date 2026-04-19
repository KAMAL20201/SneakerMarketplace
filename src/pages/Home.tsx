import { Sparkles } from "lucide-react";
import { SearchDropdown } from "@/components/ui/SearchDropdown";
import { ROUTE_NAMES } from "@/constants/enums";
import CategorySection from "@/components/CategorySection";
import WishlistSection from "@/components/WishlistSection";
import BrandSpotlight from "@/components/BrandSpotlight";
import InstagramBanner from "@/components/InstagramBanner";
import WhyBuyFromUs from "@/components/WhyBuyFromUs";
import BlogTeaser from "@/components/BlogTeaser";
import HotDeals from "@/components/HotDeals";
import InstantShipping from "@/components/InstantShipping";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import HomeBannerCarousel from "@/components/HomeBannerCarousel";
import NewDropsSection from "@/components/NewDropsSection";
import CollectionsSection from "@/components/CollectionsSection";
import { useLoaderData, data } from "react-router";
import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/Home";

export function links(args?: { data?: { banners?: { image_url: string }[] } }) {
  const firstBanner = args?.data?.banners?.[0]?.image_url;
  if (!firstBanner) return [];
  return [
    {
      rel: "preload",
      as: "image",
      href: firstBanner,
      fetchpriority: "high",
    },
  ];
}

export function meta() {
  return [
    {
      title:
        "The Plug Market — Authentic Sneakers & Streetwear Marketplace India",
    },
    {
      name: "description",
      content:
        "The Plug Market — India's trusted sneakers marketplace. Shop 100% authentic sneakers, limited edition drops & premium streetwear. Every product quality verified.",
    },
    { tagName: "link", rel: "canonical", href: "https://theplugmarket.in/" },
    { property: "og:url", content: "https://theplugmarket.in/" },
    {
      property: "og:title",
      content:
        "The Plug Market — Authentic Sneakers & Streetwear Marketplace India",
    },
    {
      property: "og:description",
      content:
        "Buy 100% authentic sneakers & streetwear in India. Shop verified Nike, Adidas, Jordan & more on The Plug Market.",
    },
  ];
}

// ── Server Loader ─────────────────────────────────────────────────────────────
// Fetches banners, hot deals, and new drops in parallel so the
// homepage arrives with real data in the HTML — visible to bots immediately.
export async function loader(_: Route.LoaderArgs) {
  const ssrSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  const today = new Date().toISOString().split("T")[0];

  const [bannersResult, hotDealsResult, newDropsResult, blogResult] =
    await Promise.all([
      ssrSupabase
        .from("banners")
        .select("id, image_url, cta_url")
        .eq("is_active", true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order("sort_order", { ascending: true }),
      ssrSupabase
        .from("hot_deals_with_images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      ssrSupabase
        .from("listings_with_images")
        .select(
          "id, title, brand, price, retail_price, condition, size_value, image_url",
        )
        .eq("status", "active")
        .eq("is_new_drop", true)
        .order("created_at", { ascending: false })
        .limit(30),
      ssrSupabase
        .from("blog_posts")
        .select(
          "id, title, slug, excerpt, cover_image_url, tags, published_at, read_time_minutes",
        )
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3),
    ]);

  return data(
    {
      banners: bannersResult.data ?? [],
      hotDeals: hotDealsResult.data ?? [],
      newDrops: newDropsResult.data ?? [],
      blogPosts: blogResult.data ?? [],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

// Don't re-fetch home data on every client-side navigation —
// the loader result is cached for the lifetime of the SPA session.
export function shouldRevalidate() {
  return false;
}

const Home = () => {
  const { banners, hotDeals, newDrops, blogPosts } =
    useLoaderData<typeof loader>();
  useEffect(() => {
    // Only run the auth callback flow when opened as a popup (e.g. Google OAuth redirect).
    // window.opener is null for regular page navigation, so skip entirely in that case.
    if (!window.opener) return;

    const handleAuthCallback = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          window.opener.postMessage(
            {
              type: "GOOGLE_AUTH_ERROR",
              error: error.message,
            },
            window.location.origin,
          );
        } else if (session?.user) {
          window.opener.postMessage(
            {
              type: "GOOGLE_AUTH_SUCCESS",
              user: session.user,
              session: session,
            },
            window.location.origin,
          );
        } else {
          window.opener.postMessage(
            {
              type: "GOOGLE_AUTH_ERROR",
              error: "No session found",
            },
            window.location.origin,
          );
        }
      } catch (err: unknown) {
        window.opener.postMessage(
          {
            type: "GOOGLE_AUTH_ERROR",
            error: err instanceof Error ? err.message : "Unknown error",
          },
          window.location.origin,
        );
      }

      // Close popup
      window.close();
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen">
      {/* <Helmet>
        <title>
          The Plug Market - Authentic Sneakers & Streetwear Marketplace
        </title>
        <meta
          name="description"
          content="The Plug Market — India's trusted sneakers marketplace. Shop 100% authentic sneakers, limited edition drops & premium streetwear. Every product quality verified."
        />
        <link rel="canonical" href="https://theplugmarket.in/" />
        <meta property="og:url" content="https://theplugmarket.in/" />
        <meta
          property="og:title"
          content="The Plug Market — Authentic Sneakers & Streetwear Marketplace India"
        />
        <meta
          property="og:description"
          content="Buy 100% authentic sneakers & streetwear in India. Shop verified Nike, Adidas, Jordan & more on The Plug Market."
        />

        <meta
          property="og:image"
          content="https://theplugmarket.in/og-image.jpg"
        />
        <meta property="og:type" content="website" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://theplugmarket.in/" />
        <meta
          property="twitter:title"
          content="The Plug Market — Authentic Sneakers & Streetwear Marketplace India"
        />
        <meta
          property="twitter:description"
          content="Buy 100% authentic sneakers & streetwear in India. Shop verified Nike, Adidas, Jordan & more on The Plug Market."
        />
        <meta
          property="twitter:image"
          content="https://theplugmarket.in/og-image.jpg"
        />
      </Helmet> */}
      {/* Hero Section */}
      <section className="px-4 py-6">
        <div className="text-center mb-8 float-animation">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-orange-500" />
          </div>
          <h1 className="text-4xl font-bold mb-3">
            India's Trusted Marketplace for
            <span className="gradient-text block mt-2">
              Authentic Sneakers & Streetwear
            </span>
          </h1>
          <p className="text-gray-700 text-lg mb-2">
            Shop 100% authentic sneakers, streetwear, collectibles & more —
            every product quality verified
          </p>

          {/* Trust badges - ecommerce focused */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 text-sm font-medium">
                Quality Verified
              </span>
            </div>
            {/* [MARKETPLACE REMOVED] Buyer Protection and Secure Payments badges
               These were marketplace trust signals for multi-seller model.
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-full border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-700 text-sm font-medium">
                Buyer Protection
              </span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-full border border-orange-200">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-orange-700 text-sm font-medium">
                Secure Payments
              </span>
            </div>
            */}
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-full border border-purple-200">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-purple-700 text-sm font-medium">
                100% Authentic
              </span>
            </div>
          </div>
        </div>

        <div className="mb-2">
          <SearchDropdown />
        </div>

        {/* [MARKETPLACE REMOVED] "Sell Now" CTA - only admin can sell in ecommerce model
        <div className="flex gap-4">
          <Button
            asChild
            className="flex-1 h-12 bg-white text-gray-800 font-semibold border-2 border-gray-800 rounded-2xl hover:bg-gray-800 hover:text-white transition-all duration-300"
          >
            <Link to={ROUTE_NAMES.SELL}>
              <Plus className="h-5 w-5 mr-2" />
              Sell Now
            </Link>
          </Button>
        </div>
        */}
      </section>

      {/* Homepage Banners */}
      <HomeBannerCarousel initialBanners={banners} />

      {/* Brand Spotlight */}
      <BrandSpotlight />

      {/* Collections Section */}
      <CollectionsSection />

      {/* New Drops Section */}
      <NewDropsSection initialListings={newDrops} />

      {/* Categories - temporarily hidden */}
      {/*
      <section className="px-4 py-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Explore Categories
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <Card
              key={category.name}
              onClick={() => handleCategoryClick(category.id)}
              className="glass-card border-0 hover:scale-105 transition-all duration-300 cursor-pointer group rounded-3xl overflow-hidden"
            >
              <CardContent className="p-0">
                <div
                  className={`h-40 bg-gradient-to-br relative overflow-hidden`}
                >
                  <CardImage
                    src={`${supabaseUrl}${category.image}`}
                    alt={category.name}
                    aspectRatio="aspect-[4/3]"
                    className="w-full h-full"
                    priority={true}
                  />
                  <div className="px-4 py-2 absolute opacity-50 bottom-0 bg-white w-full">
                    <h3 className="font-bold text-black">{category.name}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      */}

      {/* Wishlist Section - only rendered when user has saved items */}
      <WishlistSection />
      {/* Hot Deals Section */}
      <HotDeals initialDeals={hotDeals} />

      {/* Instant Shipping Section */}
      <InstantShipping />

      {/* Sneakers Section */}
      <CategorySection
        categoryId="sneakers"
        title="Sneakers"
        viewAllUrl={ROUTE_NAMES.SNEAKERS}
      />

      {/* Apparels Section */}
      <CategorySection
        categoryId="clothing"
        title="Apparels & Bags"
        viewAllUrl={ROUTE_NAMES.APPARELS}
      />

      {/* Trending Section */}
      {/* <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl border-0 bg-gradient-to-br from-purple-500 to-pink-500">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Trending Now</h2>
          </div>
          <Link
                              to={ROUTE_NAMES.BROWSE}
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {featuredSneakers.slice(0, 2).map((sneaker) => (
            <Link to={ROUTE_HELPERS.PRODUCT_DETAIL("dunk-low-panda")} key={sneaker.id}>
              <Card className="glass-card border-0 hover:scale-105 transition-all duration-300 group cursor-pointer rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={sneaker.image || "/placeholder.svg"}
                      alt={sneaker.name}
                      width={200}
                      height={200}
                      className="w-full h-44 object-cover"
                    />
                    {sneaker.trending && (
                      <Badge className="absolute top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-xl px-3">
                        🔥 Trending
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-3 right-3 h-10 w-10 p-0 glass-button border-0 rounded-2xl"
                    >
                      <Heart className="h-5 w-5 text-gray-600" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-purple-600 font-semibold mb-1">
                      {sneaker.brand}
                    </p>
                    <h3 className="font-bold text-sm text-gray-800 mb-3 line-clamp-2">
                      {sneaker.name}
                    </h3>
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-700 font-medium">
                        {sneaker.rating}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-800 text-lg">
                          ${sneaker.price}
                        </span>
                        {sneaker.originalPrice > sneaker.price && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            ${sneaker.originalPrice}
                          </span>
                        )}
                      </div>
                      <Badge className="glass-button border-0 text-gray-700 rounded-xl">
                        {sneaker.size}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section> */}

      {/* Featured Listings Section */}
      {/* <FeaturedListings /> */}

      {/* Instagram Banner */}
      <InstagramBanner />

      {/* Why Buy From Us */}
      <WhyBuyFromUs />

      {/* Blog Teaser */}
      <BlogTeaser posts={blogPosts} />

      {/* [MARKETPLACE REMOVED] How It Works Section - escrow system not used in ecommerce model */}
      {/* <HowItWorks /> */}

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
};

export default Home;
