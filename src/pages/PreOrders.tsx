import { useState, useEffect } from "react";
import { Link, useLoaderData, data } from "react-router";
import type { Route } from "./+types/PreOrders";
import { PackageOpen, Clock, ShoppingBag, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/ui/OptimizedImage";
import { ROUTE_HELPERS, ROUTE_NAMES } from "@/constants/enums";
import ConditionBadge from "@/components/ui/ConditionBadge";
import { useWishlist } from "@/contexts/WishlistContext";
import { createClient } from "@supabase/supabase-js";

interface ActiveWindow {
  id: string;
  name: string;
  ends_at: string;
}

interface PreOrderListing {
  id: string;
  slug: string;
  title: string;
  price: number;
  brand: string;
  size_value: string;
  condition: string;
  image_url: string | null;
  created_at: string;
  window_name: string;
  window_ends_at: string;
}

// ─── SSR Loader ───────────────────────────────────────────────────────────────

export async function loader(_: Route.LoaderArgs) {
  const ssrSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  const now = new Date().toISOString();

  // Fetch all currently active pre-order windows
  const { data: activeWindows } = await ssrSupabase
    .from("pre_order_windows")
    .select("id, name, ends_at")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("ends_at", { ascending: true });

  const windows: ActiveWindow[] = activeWindows ?? [];

  if (windows.length === 0) {
    // Check if there is an upcoming/paused window scheduled for the future
    const { data: upcomingWindows } = await ssrSupabase
      .from("pre_order_windows")
      .select("id, name, starts_at, ends_at")
      .gt("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(1);

    const upcoming = upcomingWindows?.[0] ?? null;

    if (upcoming) {
      const { data: productRows } = await ssrSupabase
        .from("pre_order_products")
        .select("product_slug")
        .eq("window_id", upcoming.id);

      const slugs = (productRows ?? []).map((p) => p.product_slug);
      let listings: PreOrderListing[] = [];
      if (slugs.length > 0) {
        const { data: listingRows } = await ssrSupabase
          .from("listings_with_images")
          .select("id, slug, title, price, brand, size_value, condition, image_url, created_at")
          .in("slug", slugs)
          .eq("status", "active");

        listings = (listingRows ?? []).map((l) => ({
          ...l,
          window_name: upcoming.name,
          window_ends_at: upcoming.ends_at,
        }));
      }

      return data(
        {
          listings,
          windowsCount: 0,
          endsAt: null as string | null,
          isPaused: true,
          upcomingStartsAt: upcoming.starts_at as string | null,
          upcomingName: upcoming.name as string | null,
        },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
      );
    }

    return data(
      {
        listings: [] as PreOrderListing[],
        windowsCount: 0,
        endsAt: null as string | null,
        isPaused: true,
        upcomingStartsAt: null as string | null,
        upcomingName: null as string | null,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  }

  // Fetch all product slugs across active windows
  const windowIds = windows.map((w) => w.id);
  const { data: productRows } = await ssrSupabase
    .from("pre_order_products")
    .select("product_slug, window_id")
    .in("window_id", windowIds);

  const slugToWindow: Record<string, ActiveWindow> = {};
  for (const row of productRows ?? []) {
    const win = windows.find((w) => w.id === row.window_id);
    if (win) slugToWindow[row.product_slug] = win;
  }

  const slugs = Object.keys(slugToWindow);
  if (slugs.length === 0) {
    return data(
      {
        listings: [] as PreOrderListing[],
        windowsCount: windows.length,
        endsAt: windows[0]?.ends_at ?? null,
        isPaused: false,
        upcomingStartsAt: null as string | null,
        upcomingName: null as string | null,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  }

  // Fetch listing details for all slugs
  const { data: listingRows } = await ssrSupabase
    .from("listings_with_images")
    .select("id, slug, title, price, brand, size_value, condition, image_url, created_at")
    .in("slug", slugs)
    .eq("status", "active");

  const listings: PreOrderListing[] = (listingRows ?? []).map((l) => ({
    ...l,
    window_name: slugToWindow[l.slug]?.name ?? "",
    window_ends_at: slugToWindow[l.slug]?.ends_at ?? "",
  }));

  // The soonest-expiring window's ends_at drives the page countdown
  const endsAt = windows[0]?.ends_at ?? null;

  return data(
    {
      listings,
      windowsCount: windows.length,
      endsAt,
      isPaused: false,
      upcomingStartsAt: null as string | null,
      upcomingName: null as string | null,
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Pre-Orders | The Plug Market" },
    {
      name: "description",
      content:
        "Reserve limited sneakers and streetwear before they sell out. Pre-order now — estimated delivery 28–35 days from order placement.",
    },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://theplugmarket.in/pre-orders",
    },
    { property: "og:url", content: "https://theplugmarket.in/pre-orders" },
    { property: "og:title", content: "Pre-Orders | The Plug Market" },
    {
      property: "og:description",
      content:
        "Reserve limited sneakers and streetwear before they sell out. Pre-order now — estimated delivery 28–35 days from order placement.",
    },
  ];
}

// ─── Countdown hook — ticks every second ─────────────────────────────────────

function useCountdown(targetDate: string | null) {
  const calc = () => {
    if (!targetDate) return null;
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s };
  };

  const [tick, setTick] = useState(calc);

  useEffect(() => {
    if (!targetDate) return;
    setTick(calc());
    const id = setInterval(() => setTick(calc()), 1_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  return tick;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PreOrders() {
  const loaderData = useLoaderData<typeof loader>();
  const { listings, endsAt, isPaused, upcomingStartsAt } = loaderData;
  const { toggleWishlist, isInWishlist } = useWishlist();

  // Active window countdown or upcoming opening countdown
  const targetDate = isPaused ? upcomingStartsAt : endsAt;
  const countdown = useCountdown(targetDate);

  const hasListings = listings.length > 0;

  return (
    <div className="min-h-screen pb-12">
      {/* Hero header */}
      <div
        className={`relative overflow-hidden px-4 py-10 text-center text-white ${
          isPaused
            ? "bg-gradient-to-br from-amber-600 via-orange-600 to-purple-700"
            : "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700"
        }`}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-pink-400/20 blur-2xl" />

        <div className="relative mx-auto max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            <PackageOpen className="h-4 w-4" />
            {isPaused ? "Pre-Orders Currently Paused" : "Limited Pre-Order Window"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            {isPaused ? "Pre-Orders Resume Soon" : "Pre-Order Now"}
          </h1>
          <p className="text-violet-100 text-sm md:text-base leading-relaxed">
            {isPaused
              ? "Pre-orders are currently paused while we prepare the next drop batch. Estimated delivery 28–35 days once open."
              : "Reserve your pair before stocks close. Estimated delivery 28–35 days from order placement."}
          </p>

          {/* Live countdown */}
          {countdown && (
            <div className="mt-6 inline-flex items-center gap-3">
              <Clock className="h-4 w-4 text-violet-200 shrink-0" />
              <span className="text-xs text-violet-200 font-medium">
                {isPaused ? "Resumes in" : "Closes in"}
              </span>
              <div className="flex items-center gap-2">
                {[
                  { label: "h", val: countdown.h },
                  { label: "m", val: countdown.m },
                  { label: "s", val: countdown.s },
                ].map(({ label, val }) => (
                  <div key={label} className="flex flex-col items-center">
                    <span className="text-2xl font-bold font-mono w-12 text-center bg-white/20 rounded-xl py-1">
                      {String(val).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-violet-300 mt-0.5">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Window closed state without upcoming window */}
          {!countdown && !isPaused && endsAt && (
            <p className="mt-5 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm text-violet-200">
              This pre-order window has closed. Check back for future drops.
            </p>
          )}

          {/* Window paused without explicit timer */}
          {isPaused && !countdown && (
            <p className="mt-5 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm text-amber-100">
              Pre-orders are temporarily paused. Check back soon for the next drop window!
            </p>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto max-w-7xl px-4 pt-8">
        {!hasListings ? (
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-200">
                <ShoppingBag className="h-10 w-10 text-violet-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                No Pre-Orders Open Right Now
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Check back soon — we launch new pre-order windows regularly.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 rounded-2xl"
              >
                <Link to={ROUTE_NAMES.BROWSE}>Browse All Items</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500 font-medium">
                {listings.length} item{listings.length !== 1 ? "s" : ""} available for pre-order
              </p>
              <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 px-3 py-1 font-semibold">
                📦 28–35 days delivery
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {listings.map((listing) => (
                <div key={listing.id} className="relative">
                  <Link to={ROUTE_HELPERS.PRODUCT_DETAIL(listing.slug ?? listing.id)}>
                    <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="relative h-40 sm:h-48 overflow-hidden bg-gray-100">
                          <CardImage
                            src={listing.image_url || "/placeholder.svg"}
                            alt={listing.title}
                            aspectRatio="aspect-[4/3]"
                            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Pre-Order badge */}
                          <Badge
                            className={`absolute top-3 left-3 border-0 rounded-xl text-xs px-2 shadow-md text-white ${
                              isPaused
                                ? "bg-gradient-to-r from-amber-500 to-orange-600"
                                : "bg-gradient-to-r from-violet-500 to-purple-600"
                            }`}
                          >
                            {isPaused ? "Opening Soon" : "Pre-Order"}
                          </Badge>
                        </div>
                        <div className="p-3 md:p-4">
                          <p className="text-xs text-gray-600 font-semibold capitalize mb-1">
                            {listing.brand}
                          </p>
                          <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-2">
                            {listing.title}
                          </h3>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-800 text-base md:text-lg">
                              ₹{listing.price.toLocaleString("en-IN")}
                            </span>
                            <ConditionBadge condition={listing.condition} className="text-xs" />
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs uppercase">
                              {listing.size_value}
                            </Badge>
                            <span className="text-[10px] text-violet-600 font-semibold flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              28–35d
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  {/* Wishlist button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist({
                        id: listing.id,
                        title: listing.title,
                        brand: listing.brand,
                        price: listing.price,
                        image_url: listing.image_url ?? "",
                        condition: listing.condition,
                        size_value: listing.size_value,
                      });
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-pink-50 transition-colors shadow-sm z-10"
                    title={isInWishlist(listing.id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${
                        isInWishlist(listing.id)
                          ? "text-red-500 fill-red-500"
                          : "text-gray-500"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
