import { useEffect, useState } from "react";
import {
  ShoppingCart,
  ZoomIn,
  X,
  Heart,
  Ruler,
  Truck,
  Zap,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { toast } from "sonner";
import {
  useParams,
  useSearchParams,
  useLoaderData,
  data,
  redirect,
  Link,
} from "react-router";
import { Button } from "@/components/ui/button";
import { supabase, toStorageUrl } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { ProductImage, ThumbnailImage } from "@/components/ui/OptimizedImage";
import ConditionBadge from "@/components/ui/ConditionBadge";
import { BuyNowModal } from "@/components/checkout/BuyNowModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ProductCard from "@/components/ui/ProductCard";
import BlogTeaser from "@/components/BlogTeaser";
import type { BlogPostSummary } from "@/components/BlogTeaser";
import { getSizeChart, getApparelSizeChart } from "@/constants/sizeCharts";
import { BRANDS_CONFIG } from "@/constants/brandsConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { EmblaCarouselType } from "embla-carousel";
import type { Route } from "./+types/ProductDetailPage";

declare global {
  interface Window {
    prerenderReady: boolean;
  }
}

// ─── Server Loader ────────────────────────────────────────────────────────────
// Runs on the server for every request — gives bots fully-rendered HTML with
// product data already in the page. No more blank <div id="root"></div>.

const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s);

export async function loader({ params }: Route.LoaderArgs) {
  const ssrSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  const param = params.id!;

  // If the URL still uses a raw UUID (e.g. old Google-indexed links), look up
  // the slug and issue a permanent redirect so search engines update their index.
  if (isUUID(param)) {
    const { data: slugRow } = await ssrSupabase
      .from("product_listings")
      .select("slug")
      .eq("id", param)
      .eq("status", "active")
      .eq("is_deleted", false)
      .single();
    if (!slugRow?.slug) {
      throw new Response("Not Found", { status: 404 });
    }
    throw redirect(`/product/${slugRow.slug}`, 301);
  }

  // Single round-trip: fetch listing + all related data in one PostgREST query.
  // Previously this was 2 sequential Supabase calls (~650ms each = ~1.3s).
  // PostgREST compiles the nested select into a single SQL query with JOINs.
  const { data: listingData } = await ssrSupabase
    .from("product_listings")
    .select(
      `*, sellers (
        id, display_name, phone, bio, profile_image_url,
        rating, total_reviews, location, is_verified, created_at, email
      ),
      product_images (id, image_url, is_poster_image, display_order),
      product_variants (
        id, color_name, color_hex, price, display_order, image_url,
        product_variant_sizes (variant_id, size_value, price, is_sold)
      ),
      product_listing_sizes (size_value, price, is_sold),
      reviews (id, rating, comment, reviewer_name, verified_purchase, created_at, is_approved)`,
    )
    .eq("slug", param)
    .eq("status", "active")
    .eq("is_deleted", false)
    .single();

  if (!listingData) {
    throw new Response("Not Found", { status: 404 });
  }

  // Sort/filter nested collections in JS (small sets, negligible cost).
  const imagesData = (listingData.product_images ?? []).sort((a, b) => {
    // Primary: poster image first; secondary: explicit display_order
    if (b.is_poster_image !== a.is_poster_image)
      return b.is_poster_image ? 1 : -1;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  const rawVariants = (listingData.product_variants ?? []).sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const variants = rawVariants.map(({ product_variant_sizes, ...v }) => v);
  const variantSizesData = rawVariants.flatMap((v) =>
    (v.product_variant_sizes ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      variant_id: v.id,
    })),
  );

  const allLegacySizesData = (listingData.product_listing_sizes ?? []).sort(
    (a, b) => (a.price ?? 0) - (b.price ?? 0),
  );
  const legacySizes = rawVariants.length === 0 ? allLegacySizesData : [];

  // Filter approved reviews, sort by recency, cap at 20.
  const allReviews = (listingData.reviews ?? []) as Array<{
    id: string;
    rating: number;
    comment: string | null;
    reviewer_name: string | null;
    verified_purchase: boolean;
    created_at: string;
    is_approved: boolean;
  }>;
  const reviewsData = allReviews
    .filter((r) => r.is_approved)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 20)
    .map(({ is_approved: _, ...r }) => r);

  // Compute aggregate rating from approved reviews (replaces listing_aggregate_ratings view query).
  const approvedRatings = allReviews
    .filter((r) => r.is_approved)
    .map((r) => r.rating);
  const ratingData =
    approvedRatings.length > 0
      ? {
          average_rating:
            approvedRatings.reduce((s, r) => s + r, 0) / approvedRatings.length,
          review_count: approvedRatings.length,
        }
      : null;

  // Flatten sellers join into seller_details
  const listing = {
    ...listingData,
    seller_details: listingData.sellers ?? null,
    sellers: undefined,
    product_images: undefined,
    product_variants: undefined,
    product_listing_sizes: undefined,
    reviews: undefined,
  };

  // Resolve brand config + matching model for SSR internal links.
  const brandConfig = Object.values(BRANDS_CONFIG).find(
    (b) => b.dbValue.toLowerCase() === (listing.brand ?? "").toLowerCase(),
  ) ?? null;
  const titleLower = (listing.title ?? "").toLowerCase();
  const matchedModel = brandConfig?.models.find((m) =>
    titleLower.includes(m.searchTerm.toLowerCase()),
  ) ?? null;

  // Fetch similar products server-side so Google sees the links in initial HTML.
  const { data: similarProductsData } = await ssrSupabase
    .from("listings_with_images")
    .select("id, slug, title, brand, price, retail_price, condition, size_value, image_url")
    .eq("status", "active")
    .eq("brand", listing.brand)
    .neq("id", listing.id)
    .order("created_at", { ascending: false })
    .limit(6);

  return data(
    {
      listing,
      images: imagesData,
      variants,
      variantSizesData,
      legacySizes,
      reviews: reviewsData,
      aggregateRating: ratingData,
      similarProducts: similarProductsData ?? [],
      brandSlug: brandConfig?.slug ?? null,
      matchedModel: matchedModel ? { name: matchedModel.name, slug: matchedModel.slug } : null,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}

// ─── Headers export ───────────────────────────────────────────────────────────
// React Router merges these into the final HTTP response for BOTH the full-page
// HTML and the prefetch .data request.
// `Vercel-CDN-Cache-Control` is the key: without it, @vercel/react-router
// overrides our Cache-Control with `max-age=0, must-revalidate`, meaning the
// Mumbai/Singapore edge nodes never cache and every request cold-hits the US
// serverless function. With it, the edge caches the product page for 5 minutes
// and serves repeat visitors / prefetches in <20ms instead of 1-2s.
export function headers() {
  const cacheValue = "public, s-maxage=300, stale-while-revalidate=600";
  return {
    "Cache-Control": cacheValue,
    // Vercel-specific: overrides the adapter's default no-cache for SSR routes
    "Vercel-CDN-Cache-Control": cacheValue,
    // Cloudflare / other CDN layers
    "CDN-Cache-Control": cacheValue,
  };
}

// ─── Meta export ──────────────────────────────────────────────────────────────
// Replaces react-helmet-async <Helmet> for SSR — Google sees these in the
// initial HTML response, no JS execution needed.
export function meta({ data }: Route.MetaArgs) {
  if (!data?.listing) {
    return [{ title: "Product Not Found | The Plug Market" }];
  }
  const { listing, images } = data;
  const pageTitle = `${listing.title} | The Plug Market`;
  const pageDescription = `Buy ${listing.title}${listing.brand ? " by " + listing.brand : ""} for ₹${listing.price?.toLocaleString("en-IN")}. Condition: ${listing.condition}. Shop authentic sneakers and streetwear on The Plug Market.`;
  const posterImage =
    images?.[0]?.image_url ?? "https://theplugmarket.in/og-image.jpg";
  const canonicalUrl = `https://theplugmarket.in/product/${listing.slug}`;

  return [
    { title: pageTitle },
    { name: "description", content: pageDescription },
    { tagName: "link", rel: "canonical", href: canonicalUrl },
    { property: "og:type", content: "product" },
    { property: "og:url", content: canonicalUrl },
    { property: "og:title", content: pageTitle },
    { property: "og:description", content: pageDescription },
    { property: "og:image", content: posterImage },
    { property: "twitter:card", content: "summary_large_image" },
    { property: "twitter:title", content: pageTitle },
    { property: "twitter:description", content: pageDescription },
    { property: "twitter:image", content: posterImage },
  ];
}
// Don't re-fetch product data on client-side navigation back to the same
// product — the loader result is cached for the lifetime of the SPA session.
export function shouldRevalidate({
  currentParams,
  nextParams,
}: {
  currentParams: Record<string, string>;
  nextParams: Record<string, string>;
}) {
  // Only skip revalidation when navigating back to the same product
  return currentParams.id !== nextParams.id;
}

function parseMinDeliveryDays(deliveryDays: string | null | undefined): number {
  if (!deliveryDays) return Infinity;
  const min = parseInt(deliveryDays.split("-")[0]);
  return isNaN(min) ? Infinity : min;
}

export default function ProductDetailPage() {
  // ── Server data (from loader) ─────────────────────────────────────────────
  const {
    listing: initialListing,
    images: initialImages,
    variants: initialVariants,
    variantSizesData,
    legacySizes,
    reviews,
    aggregateRating,
    similarProducts: initialSimilarProducts,
    brandSlug,
    matchedModel,
  } = useLoaderData<typeof loader>();

  // ── URL params ────────────────────────────────────────────────────────────
  const { id: productId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const preSelectedSize = searchParams.get("size");

  // ── Derived initial state from loader data ────────────────────────────────
  const buildVariantSizesMap = () => {
    const map: Record<
      string,
      { size_value: string; price: number; is_sold: boolean }[]
    > = {};
    for (const vs of variantSizesData) {
      if (!map[vs.variant_id]) map[vs.variant_id] = [];
      map[vs.variant_id].push({
        size_value: vs.size_value,
        price: vs.price,
        is_sold: vs.is_sold,
      });
    }
    return map;
  };

  const getInitialSizeAndPrice = () => {
    if (initialVariants.length > 0) {
      const map = buildVariantSizesMap();
      const firstVariant = initialVariants[0];
      const sizes = map[firstVariant.id] ?? [];
      if (sizes.length > 0) {
        const target = preSelectedSize
          ? sizes.find((s) => s.size_value === preSelectedSize && !s.is_sold)
          : null;
        const pick = target ?? sizes.find((s) => !s.is_sold) ?? sizes[0];
        return { size: pick.size_value, price: pick.price };
      }
      return {
        size: null,
        price: firstVariant.price ?? initialListing?.price ?? null,
      };
    }
    if (legacySizes.length > 0) {
      const target = preSelectedSize
        ? legacySizes.find(
            (s) => s.size_value === preSelectedSize && !s.is_sold,
          )
        : null;
      const pick =
        target ?? legacySizes.find((s) => !s.is_sold) ?? legacySizes[0];
      return { size: pick.size_value, price: pick.price };
    }
    if (initialListing?.size_value) {
      return {
        size: initialListing.size_value,
        price: initialListing.price ?? null,
      };
    }
    return { size: null, price: initialListing?.price ?? null };
  };

  const { size: initSize, price: initPrice } = getInitialSizeAndPrice();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedSize, setSelectedSize] = useState<string | null>(initSize);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(initPrice);
  // ── State initialised from loader — no useEffect fetch needed ───────────
  const [listing, setListing] = useState(initialListing);
  const [images, setImages] = useState(initialImages);
  const [variants, setVariants] = useState(initialVariants);
  const [variantSizesMap, setVariantSizesMap] = useState(() =>
    buildVariantSizesMap(),
  );
  const [availableSizes, setAvailableSizes] = useState<
    { size_value: string; price: number; is_sold: boolean }[]
  >(() => {
    if (initialVariants.length > 0) {
      const map = buildVariantSizesMap();
      return map[initialVariants[0]?.id] ?? [];
    }
    return legacySizes;
  });
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    initialVariants.length > 0 ? initialVariants[0].id : null,
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // ── Reset all loader-derived state when product ID changes ───────────────
  // useState ignores updated initialValues after first mount, so we must
  // manually sync whenever the loader provides fresh data for a new product.
  useEffect(() => {
    const newMap = buildVariantSizesMap();
    const { size, price } = getInitialSizeAndPrice();
    setListing(initialListing);
    setImages(initialImages);
    setVariants(initialVariants);
    setVariantSizesMap(newMap);
    setAvailableSizes(
      initialVariants.length > 0
        ? (newMap[initialVariants[0]?.id] ?? [])
        : legacySizes,
    );
    setSelectedVariantId(
      initialVariants.length > 0 ? initialVariants[0].id : null,
    );
    setSelectedSize(size);
    setSelectedPrice(price);
    setSelectedImageIndex(0);
    setSimilarProducts(initialSimilarProducts);
    setDescExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);
  const { addToCart, items } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const [similarProducts, setSimilarProducts] = useState(initialSimilarProducts);
  const [blogPosts, setBlogPosts] = useState<BlogPostSummary[]>([]);
  const [descExpanded, setDescExpanded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [emblaApi, setEmblaApi] = useState<EmblaCarouselType | null>(null);
  const [zoomEmblaApi, setZoomEmblaApi] = useState<EmblaCarouselType | null>(
    null,
  );

  // Sync selected index with carousel
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setSelectedImageIndex(emblaApi.selectedScrollSnap());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  // Scroll to slide when thumbnail changes selectedImageIndex
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.scrollTo(selectedImageIndex);
  }, [selectedImageIndex, emblaApi]);

  // Keep zoom carousel synced to selected index
  useEffect(() => {
    if (!zoomEmblaApi) return;
    zoomEmblaApi.scrollTo(selectedImageIndex);
  }, [selectedImageIndex, zoomEmblaApi, zoomOpen]);

  // When swiping inside zoom modal, update selected index
  useEffect(() => {
    if (!zoomEmblaApi) return;
    const onSelect = () =>
      setSelectedImageIndex(zoomEmblaApi.selectedScrollSnap());
    zoomEmblaApi.on("select", onSelect);
    zoomEmblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      zoomEmblaApi.off("select", onSelect);
      zoomEmblaApi.off("reInit", onSelect);
    };
  }, [zoomEmblaApi]);

  // Load latest blog posts client-side for content richness
  useEffect(() => {
    supabase
      .from("blog_posts")
      .select(
        "id, title, slug, excerpt, cover_image_url, tags, published_at, read_time_minutes",
      )
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setBlogPosts(data ?? []));
  }, []);

  const handleAddToCart = (
    seller: { id: number | string; display_name: string; email: string } | null,
  ) => {
    const selectedVariant = variants.find((v) => v.id === selectedVariantId);
    const cartItem = {
      id: `${listing?.id}-${selectedVariantId ?? "no-variant"}-${selectedSize}`,
      productId: listing?.id,
      productName: listing?.title,
      brand: listing?.brand,
      size: selectedSize,
      condition: listing?.condition,
      price: selectedPrice ?? listing?.price,
      image: selectedVariant?.image_url ?? images?.[0]?.image_url,
      sellerId: seller?.id?.toString(),
      sellerName: seller?.display_name,
      sellerEmail: seller?.email,
      quantity: 1,
      variantId: selectedVariantId ?? null,
      variantName: selectedVariant?.color_name ?? null,
    };

    const success = addToCart(cartItem);
    if (success) {
      toast.success(`Added to cart!`);
    } else {
      toast.error("This item is already in your cart!");
    }
  };

  // Check if item is already in cart (for the currently selected variant + size)
  const isItemInCart = () => {
    if (!listing || !listing.seller_details) return false;

    return items.some(
      (cartItem) =>
        cartItem.productId === listing.id &&
        cartItem.sellerId === listing.seller_details.id?.toString() &&
        cartItem.size === selectedSize &&
        (cartItem.variantId ?? null) === (selectedVariantId ?? null),
    );
  };

  const handleVariantSelect = (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    setSelectedVariantId(variantId);
    setSelectedSize(null);
    setSelectedPrice(null);
    const sizes = variantSizesMap[variantId] ?? [];
    setAvailableSizes(sizes);
    if (sizes.length > 0) {
      const pick = sizes.find((s) => !s.is_sold) ?? sizes[0];
      setSelectedSize(pick.size_value);
      setSelectedPrice(pick.price);
    } else {
      setSelectedPrice(variant.price ?? listing?.price ?? null);
    }
    // Jump carousel to this variant's image if it has one
    if (variant.image_url) {
      const normalised = toStorageUrl(variant.image_url);
      const imgIdx = images.findIndex(
        (img) => toStorageUrl(img.image_url) === normalised,
      );
      if (imgIdx !== -1) setSelectedImageIndex(imgIdx);
    }
  };

  // Data is always present — provided by the server loader
  const currentPrice = selectedPrice ?? listing?.price ?? 0;
  const retailInr: number | null = listing?.retail_price ?? null;
  const pctOff =
    retailInr && retailInr > currentPrice
      ? Math.round(((retailInr - currentPrice) / retailInr) * 100)
      : null;
  // pageDescription is used in the JSON-LD structured data below
  const pageDescription = listing
    ? `Buy ${listing.title}${listing.brand ? " by " + listing.brand : ""} for ₹${listing.price?.toLocaleString("en-IN")}. Condition: ${listing.condition}. Shop 100% authentic sneakers and streetwear on The Plug Market.`
    : "Shop 100% authentic sneakers and streetwear on The Plug Market.";
  const canonicalUrl = `https://theplugmarket.in/product/${productId}`;

  return (
    <div className="min-h-screen">
      {/* JSON-LD Product structured data — title/og/twitter handled by meta() export */}
      {listing && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: listing.title,
              description: listing.description ?? pageDescription,
              brand: listing.brand
                ? { "@type": "Brand", name: listing.brand }
                : undefined,
              image: images[0]?.image_url
                ? [images[0].image_url]
                : undefined,
              offers: {
                "@type": "Offer",
                url: canonicalUrl,
                priceCurrency: "INR",
                price: listing.price,
                availability: "https://schema.org/InStock",
                itemCondition:
                  listing.condition === "new"
                    ? "https://schema.org/NewCondition"
                    : "https://schema.org/UsedCondition",
                seller: {
                  "@type": "Organization",
                  name: "The Plug Market",
                },
              },
              ...(aggregateRating && aggregateRating.review_count > 0
                ? {
                    aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: aggregateRating.average_rating,
                      reviewCount: aggregateRating.review_count,
                      bestRating: 5,
                      worstRating: 1,
                    },
                  }
                : {}),
              breadcrumb: {
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: "https://theplugmarket.in/",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: listing.category_id ?? "Products",
                    item: `https://theplugmarket.in/${listing.category_id ?? "browse"}`,
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: listing.title,
                    item: canonicalUrl,
                  },
                ],
              },
            }),
          }}
        />
      )}
      <div className="lg:flex lg:gap-8 lg:p-8">
        {/* Image Gallery - Left side on desktop, full width on mobile */}
        <div
          className={`lg:w-[60%] lg:max-w-2xl px-4 lg:p-0 lg:flex lg:flex-row-reverse lg:gap-5 ${images.length <= 1 ? "pt-6 pb-2" : "py-6"}`}
        >
          <div className="mb-4 lg:w-[80%]">
            <Carousel
              className="lg:max-w-lg lg:mx-auto bg-gray-200 rounded-3xl"
              opts={{ loop: (images?.length || 0) > 1 }}
              setApi={setEmblaApi}
            >
              <CarouselContent className="-ml-0 relative aspect-square rounded-none shadow-2xl">
                {images?.length ? (
                  images.map((image, index) => (
                    <CarouselItem key={image.id} className="relative pl-0">
                      {/* Zoom Button */}
                      <button
                        type="button"
                        aria-label="Zoom in"
                        onClick={() => setZoomOpen(true)}
                        className="absolute top-3 right-3 z-10 rounded-xl p-2 bg-white/80 hover:bg-white transition-colors shadow-md"
                      >
                        <ZoomIn className="h-5 w-5 text-gray-700" />
                      </button>
                      <ProductImage
                        src={
                          toStorageUrl(image?.image_url) || "/placeholder.svg"
                        }
                        alt={`${listing?.title} - Image ${index + 1}`}
                        priority={index === 0}
                        className="w-full object-contain rounded-none"
                        onClick={() => {
                          setZoomOpen(true);
                        }}
                      />
                    </CarouselItem>
                  ))
                ) : (
                  <CarouselItem className="relative">
                    <ProductImage
                      src={"/placeholder.svg"}
                      alt={`${listing?.title} - Image`}
                      priority={true}
                      className="w-full object-contain"
                    />
                  </CarouselItem>
                )}
              </CarouselContent>
              {/* Desktop arrows */}
              {/* <div className="hidden sm:block">
                <CarouselPrevious />
                <CarouselNext />
              </div> */}
            </Carousel>
          </div>

          {/* Image Thumbnails - always visible on desktop, only when >1 image on mobile */}
          <div
            className={`gap-3 overflow-x-auto p-2 lg:justify-start lg:max-w-lg lg:flex-col ${images && images.length > 1 ? "flex" : "hidden lg:flex"}`}
          >
            {images?.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setSelectedImageIndex(index)}
                className={`relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 ${
                  selectedImageIndex === index
                    ? "ring-3 ring-purple-500 scale-105"
                    : "glass-button border-0 hover:scale-105"
                }`}
              >
                <ThumbnailImage
                  src={toStorageUrl(image.image_url) || "/placeholder.svg"}
                  alt={`${listing?.title} thumbnail ${index + 1}`}
                  className="w-full h-full"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Details - Right side on desktop, below images on mobile */}
        <div className="lg:w-[40%] lg:pt-6">
          <div className="px-4 pt-3 flex items-center justify-between lg:px-0 lg:py-0 lg:mb-1">
            {/* Price block with optional % off badge + strikethrough retail */}
            {(() => {
              return (
                <div className="flex flex-col lg:px-0 px-4">
                  <div className="flex items-baseline gap-2 relative">
                    <h2 className="text-2xl font-bold text-gray-800">
                      ₹{currentPrice.toLocaleString("en-IN")}
                    </h2>{" "}
                    {retailInr && retailInr > currentPrice && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        <span className="line-through">
                          ₹{retailInr.toLocaleString("en-IN")}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <ConditionBadge
                  condition={listing?.condition}
                  className="uppercase"
                />
              </div>
              {listing && (
                <button
                  type="button"
                  aria-label={
                    isInWishlist(listing.id)
                      ? "Remove from wishlist"
                      : "Add to wishlist"
                  }
                  onClick={() =>
                    toggleWishlist({
                      id: listing.id,
                      title: listing.title,
                      brand: listing.brand,
                      price: selectedPrice ?? listing.price,
                      image_url: images?.[0]?.image_url ?? "",
                      condition: listing.condition,
                      size_value: selectedSize ?? listing.size_value ?? "",
                    })
                  }
                  className="rounded-full p-2 bg-white/80 hover:bg-white shadow transition-colors"
                >
                  <Heart
                    className={`h-5 w-5 transition-colors ${
                      isInWishlist(listing.id)
                        ? "fill-red-500 text-red-500"
                        : "text-gray-400"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
          {pctOff && (
            <span className="mb-[20px] mx-[30px] lg:mx-0 text-sm font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-0.5 rounded-lg">
              {pctOff}% off
            </span>
          )}

          <div className="mt-3 px-8 pb-5 lg:px-0 lg:pb-6">
            {brandSlug ? (
              <Link
                to={`/brands/${brandSlug}`}
                prefetch="intent"
                className="text-2xl font-bold text-gray-600 capitalize hover:text-purple-600 transition-colors"
              >
                {listing?.brand}
              </Link>
            ) : (
              <h1 className="text-2xl font-bold text-gray-600 capitalize">
                {listing?.brand}
              </h1>
            )}
            <h2 className="text-md text-gray-800 capitalize">
              {listing?.title}
            </h2>
            {brandSlug && matchedModel && (
              <Link
                to={`/brands/${brandSlug}/${matchedModel.slug}`}
                prefetch="intent"
                className="mt-2 inline-block text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-3 py-0.5 hover:bg-purple-100 transition-colors"
              >
                Browse all {matchedModel.name} →
              </Link>
            )}
            {listing?.description && (
              <div className="mt-2">
                <p
                  className={`text-sm text-gray-500 leading-relaxed whitespace-pre-line ${
                    descExpanded ? "" : "line-clamp-2"
                  }`}
                >
                  {listing.description}
                </p>
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-purple-600 text-xs font-medium mt-1 hover:underline"
                >
                  {descExpanded ? "View less" : "View more"}
                </button>
              </div>
            )}

            {/* Delivery Timeline */}
            {listing?.delivery_days &&
              parseMinDeliveryDays(listing.delivery_days) < 10 && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-3 py-1 text-xs font-semibold">
                  <Zap className="h-3 w-3" />
                  Instant Ship
                </div>
              )}
            {listing?.delivery_days && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <Truck className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <span>
                  Estimated delivery:{" "}
                  <span className="font-semibold text-gray-700">
                    {listing.delivery_days} days
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Sellers List */}
          {/* <div className="px-4 pb-8 lg:px-0 lg:pb-6">
            <Card className="glass-card border-0 rounded-3xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-6 text-gray-800">
                  Sold by
                </h3>

                <div className="flex flex-col items-start gap-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-14 w-14">
                      <AvatarImage
                        src={
                          listing?.seller_details?.profile_image_url ||
                          "/placeholder.svg"
                        }
                        alt={listing?.seller_details?.display_name}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl text-lg">
                        {listing?.seller_details?.display_name?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-800 text-lg">
                          {listing?.seller_details?.display_name}
                        </h4>
                        {listing?.seller_details?.is_verified && (
                          <Badge className="glass-button border-0 text-green-700 rounded-xl px-3">
                            <Shield className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">
                            {listing?.seller_details?.rating || 0}
                          </span>
                        </div>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">
                          {listing?.seller_details?.total_reviews || 0} reviews
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-3 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      <span>Free shipping</span>
                      {listing?.delivery_days && (
                        <>
                          <span>•</span>
                          <span>Delivery in {listing?.delivery_days} days</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}

          {/* Color / Edition variant swatches */}
          {variants.length > 0 && (
            <div className="px-4 pb-4 lg:px-0">
              <p className="text-xs text-gray-500 mb-2 font-medium">
                {variants.find((v) => v.id === selectedVariantId)?.color_name ||
                  "Select variant"}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {variants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id;
                  // Show image thumbnail if variant has a bound image, otherwise color circle
                  if (variant.image_url) {
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        title={variant.color_name}
                        onClick={() => handleVariantSelect(variant.id)}
                        className={`relative w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? "border-purple-500 scale-105 shadow-md"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <img
                          src={toStorageUrl(variant.image_url) ?? undefined}
                          alt={variant.color_name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <span className="absolute inset-0 rounded-2xl ring-2 ring-purple-500 ring-offset-1 pointer-events-none" />
                        )}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      title={variant.color_name}
                      onClick={() => handleVariantSelect(variant.id)}
                      className={`relative h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center ${
                        isSelected
                          ? "border-purple-500 scale-110 shadow-md"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      style={
                        variant.color_hex
                          ? { backgroundColor: variant.color_hex }
                          : { backgroundColor: "#e5e7eb" }
                      }
                    >
                      {!variant.color_hex && (
                        <span className="text-[9px] font-bold text-gray-600 leading-tight text-center px-0.5">
                          {variant.color_name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {isSelected && (
                        <span className="absolute inset-0 rounded-full ring-2 ring-purple-500 ring-offset-1 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {(availableSizes.length > 0 || listing?.size_value) && (
            <div className="px-4 pb-6 lg:px-0">
              <Card className="glass-card border-0 rounded-3xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      Available Sizes
                    </h3>
                    <button
                      onClick={() => setSizeGuideOpen(true)}
                      className="text-purple-600 text-xs font-medium hover:underline flex items-center gap-1"
                    >
                      <Ruler className="h-3 w-3" />
                      Size Guide
                    </button>
                  </div>

                  {availableSizes.length > 0 ? (
                    // ── Multi-size listing: grid of UK sizes with per-size price ──
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSizes.map((s) => {
                        const isSelected = selectedSize === s.size_value;
                        return (
                          <Button
                            key={s.size_value}
                            variant={isSelected ? "default" : "outline"}
                            disabled={s.is_sold}
                            onClick={() => {
                              if (!s.is_sold) {
                                setSelectedSize(s.size_value);
                                setSelectedPrice(s.price);
                              }
                            }}
                            className={`flex flex-col h-auto py-3 rounded-2xl border-0 font-semibold uppercase gap-0.5 ${
                              s.is_sold
                                ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 line-through"
                                : isSelected
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                                  : "glass-button text-gray-700 hover:bg-white/30"
                            }`}
                          >
                            <span className="text-sm">
                              {s.size_value.toUpperCase()}
                            </span>
                            <span
                              className={`text-xs font-normal ${s.is_sold ? "text-gray-400" : isSelected ? "text-white/80" : "text-gray-500"}`}
                            >
                              {s.is_sold
                                ? "Sold Out"
                                : `₹${s.price.toLocaleString("en-IN")}`}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  ) : (
                    // ── Single-size listing: one button, no price (shown at top) ──
                    <div className="grid grid-cols-4 gap-3">
                      <Button
                        variant={
                          selectedSize === listing?.size_value
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setSelectedSize(listing?.size_value)}
                        className={`w-max h-14 rounded-2xl border-0 font-semibold uppercase ${
                          selectedSize === listing?.size_value
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                            : "glass-button text-gray-700 hover:bg-white/30"
                        }`}
                      >
                        {listing?.size_value}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="px-4 pb-6 grid grid-cols-2 gap-4 lg:px-0">
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleAddToCart(listing?.seller_details)}
              disabled={isItemInCart()}
              className={`border-0 rounded-2xl shadow-lg h-12 ${
                isItemInCart()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isItemInCart() ? "In Cart" : "Add to Cart"}
            </Button>

            <Button
              size="lg"
              onClick={() => {
                /* [GUEST CHECKOUT] Login check removed - guests can buy directly
                if (!user) {
                  setOperationAfterLogin(() => () => setBuyNowOpen(true));
                  toast.error("Please login to continue");
                  navigate(ROUTE_NAMES.LOGIN);
                  return;
                }
                */
                setBuyNowOpen(true);
              }}
              disabled={
                // Only require a size selection if this listing actually has sizes
                (availableSizes.length > 0 || listing?.size_value) &&
                !selectedSize
              }
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg h-12"
            >
              Buy Now
            </Button>
          </div>
          {/* Buy Now Modal requiring shipping address */}
          {listing && (
            <BuyNowModal
              open={buyNowOpen}
              onOpenChange={setBuyNowOpen}
              amount={selectedPrice ?? listing?.price ?? 0}
              item={(() => {
                const selectedVariant = variants.find(
                  (v) => v.id === selectedVariantId,
                );
                return {
                  id: `${listing?.id}-${selectedVariantId ?? "no-variant"}-${selectedSize}`,
                  productId: listing?.id,
                  productName: listing?.title,
                  brand: listing?.brand,
                  size: selectedSize || "",
                  condition: listing?.condition,
                  price: selectedPrice ?? listing?.price,
                  image: selectedVariant?.image_url ?? images?.[0]?.image_url,
                  sellerId: listing?.seller_details?.id?.toString(),
                  sellerName: listing?.seller_details?.display_name,
                  sellerEmail: listing?.seller_details?.email,
                  quantity: 1,
                  variantId: selectedVariantId ?? null,
                  variantName: selectedVariant?.color_name ?? null,
                };
              })()}
            />
          )}

          {/* Size Guide Modal */}
          <Dialog open={sizeGuideOpen} onOpenChange={setSizeGuideOpen}>
            <DialogContent className="max-w-sm rounded-3xl flex flex-col max-h-[80dvh]">
              {(() => {
                const isApparel = listing?.category === "clothing";

                if (isApparel) {
                  // Check if the listing is "one size" (e.g. bags)
                  const isOneSize =
                    listing?.size_value?.toLowerCase() === "one size" ||
                    (availableSizes.length === 1 &&
                      availableSizes[0]?.size_value?.toLowerCase() ===
                        "one size");

                  if (isOneSize) {
                    return (
                      <>
                        <h3 className="text-lg font-bold text-gray-800 flex-shrink-0 capitalize">
                          {listing?.brand} Size Guide
                        </h3>
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-gray-600 text-sm">
                            This item is{" "}
                            <span className="font-semibold text-purple-600">
                              One Size
                            </span>{" "}
                            — no size chart available.
                          </p>
                        </div>
                      </>
                    );
                  }

                  // ── Apparel size guide: measurement table ──────────────────
                  const apparelChart = getApparelSizeChart(
                    listing?.brand ?? "",
                  );

                  return (
                    <>
                      <h3 className="text-lg font-bold text-gray-800 flex-shrink-0 capitalize">
                        {listing?.brand} Size Guide
                      </h3>
                      <p className="text-xs text-gray-400 flex-shrink-0 -mt-1">
                        All measurements in cm
                      </p>
                      <div className="overflow-y-auto overflow-x-auto flex-1 min-h-0 mt-3">
                        <table className="w-full text-sm text-center">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-gray-500 font-semibold border-b border-gray-200">
                              <th className="py-2 px-2 text-left">Size</th>
                              <th className="py-2 px-2">Length</th>
                              <th className="py-2 px-2">Shoulder</th>
                              <th className="py-2 px-2">Chest</th>
                              <th className="py-2 px-2">Sleeve</th>
                              <th className="py-2 px-2">Hem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apparelChart.rows.map((row) => {
                              const isSelected =
                                selectedSize?.toUpperCase() ===
                                row.size.toUpperCase();
                              return (
                                <tr
                                  key={row.size}
                                  className={`border-b border-gray-100 transition-colors ${
                                    isSelected
                                      ? "bg-purple-50 font-semibold text-purple-700"
                                      : "text-gray-700"
                                  }`}
                                >
                                  <td className="py-2 px-2 text-left font-semibold">
                                    {row.size}
                                  </td>
                                  <td className="py-2 px-2">{row.length}</td>
                                  <td className="py-2 px-2">{row.shoulder}</td>
                                  <td className="py-2 px-2">{row.chest}</td>
                                  <td className="py-2 px-2">{row.sleeve}</td>
                                  <td className="py-2 px-2">{row.hem}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                }

                // ── Sneaker size guide: UK / US / EU / CM ─────────────────
                const chart = getSizeChart(listing?.brand ?? "");
                const hasWomen = !!chart.women?.length;
                const hasKids = !!chart.kids?.length;

                const SneakerTable = ({ rows }: { rows: typeof chart.men }) => (
                  <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0">
                    <table className="w-full text-sm text-center">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="text-gray-500 font-semibold border-b border-gray-200">
                          <th className="py-2 px-3 text-left">UK</th>
                          <th className="py-2 px-3">US</th>
                          <th className="py-2 px-3">EU</th>
                          <th className="py-2 px-3">CM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const isSelected =
                            selectedSize
                              ?.toLowerCase()
                              .includes(`uk ${row.uk}`) ||
                            selectedSize?.toLowerCase().includes(row.uk);
                          return (
                            <tr
                              key={`${row.uk}-${row.us}`}
                              className={`border-b border-gray-100 transition-colors ${
                                isSelected
                                  ? "bg-purple-50 font-semibold text-purple-700"
                                  : "text-gray-700"
                              }`}
                            >
                              <td className="py-2 px-3 text-left">{row.uk}</td>
                              <td className="py-2 px-3">{row.us}</td>
                              <td className="py-2 px-3">{row.eu}</td>
                              <td className="py-2 px-3">{row.cm}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );

                return (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 flex-shrink-0 capitalize">
                      {listing?.brand} Size Guide
                    </h3>
                    {hasWomen || hasKids ? (
                      <Tabs
                        defaultValue="men"
                        className="flex flex-col min-h-0 flex-1 mt-3 gap-0"
                      >
                        <TabsList className="bg-white/60 rounded-xl flex-shrink-0 w-full mb-3">
                          <TabsTrigger
                            value="men"
                            className="flex-1 rounded-lg text-xs font-semibold"
                          >
                            Men
                          </TabsTrigger>
                          {hasWomen && (
                            <TabsTrigger
                              value="women"
                              className="flex-1 rounded-lg text-xs font-semibold"
                            >
                              Women
                            </TabsTrigger>
                          )}
                          {hasKids && (
                            <TabsTrigger
                              value="kids"
                              className="flex-1 rounded-lg text-xs font-semibold"
                            >
                              Kids
                            </TabsTrigger>
                          )}
                        </TabsList>
                        <TabsContent
                          value="men"
                          className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden"
                        >
                          <SneakerTable rows={chart.men} />
                        </TabsContent>
                        {hasWomen && (
                          <TabsContent
                            value="women"
                            className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden"
                          >
                            <SneakerTable rows={chart.women!} />
                          </TabsContent>
                        )}
                        {hasKids && (
                          <TabsContent
                            value="kids"
                            className="flex flex-col flex-1 min-h-0 mt-0 data-[state=inactive]:hidden"
                          >
                            <SneakerTable rows={chart.kids!} />
                          </TabsContent>
                        )}
                      </Tabs>
                    ) : (
                      <div className="flex flex-col flex-1 min-h-0 mt-3">
                        <SneakerTable rows={chart.men} />
                      </div>
                    )}
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Buyer Reviews */}
      <section className="px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Buyer Reviews</h2>
          {aggregateRating && aggregateRating.review_count > 0 && (
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-gray-900">
                {aggregateRating.average_rating}
              </span>
              <span className="text-gray-400 text-sm">
                ({aggregateRating.review_count})
              </span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="bg-gray-50 rounded-3xl p-8 text-center">
            <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              No reviews yet — be the first verified buyer to review this item.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${n <= review.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  {review.reviewer_name}
                  {review.verified_purchase && (
                    <span className="ml-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      Verified Buyer
                    </span>
                  )}
                </p>
                {review.comment && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* You May Also Like */}
      {similarProducts.length > 0 && (
        <section className="px-4 py-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            You May Also Like
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {similarProducts.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-48 sm:w-64">
                <ProductCard product={item} variant="vertical" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Blog Teaser — internal linking for SEO */}
      <BlogTeaser posts={blogPosts} heading="Read From The Plug Journal" />

      {/* Bottom spacing */}
      <div className="h-8"></div>

      {/* Zoom Modal */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          showCloseButton={false}
          className=" border-0 p-0 bg-black/90 text-white w-[96dvw] max-w-[96dvw] h-[90dvh] sm:max-w-[90vw]"
        >
          {/* Custom close button for better visibility */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setZoomOpen(false)}
            className="absolute top-3 right-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Zoom carousel with swipe */}
          <Carousel
            opts={{ loop: (images?.length || 0) > 1 }}
            setApi={setZoomEmblaApi}
            className="max-h-[90dvh] productZoom"
          >
            <CarouselContent className="h-full">
              {images?.length ? (
                images.map((image, index) => (
                  <CarouselItem key={image.id} className=" h-full">
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={
                          toStorageUrl(image?.image_url) || "/placeholder.svg"
                        }
                        alt={`${listing?.title} - Zoomed ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem className="relative h-full">
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={"/placeholder.svg"}
                      alt={`${listing?.title} - Zoomed`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious className="bg-white/80 text-gray-800" />
            <CarouselNext className="bg-white/80 text-gray-800" />
          </Carousel>
        </DialogContent>
      </Dialog>
    </div>
  );
}
