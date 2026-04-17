import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLoaderData, useParams, useSearchParams, data } from "react-router";
import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/CollectionPage";
import {
  Package,
  ArrowUp,
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  SortAsc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CardImage } from "@/components/ui/OptimizedImage";
import { ProductCardSkeletonGrid } from "@/components/ui/ProductCardSkeleton";
import ConditionBadge from "@/components/ui/ConditionBadge";
import {
  ROUTE_HELPERS,
  PRODUCT_CONDITIONS,
  SNEAKER_SIZES,
} from "@/constants/enums";
import {
  COLLECTIONS_CONFIG,
  ALL_COLLECTIONS,
  type CollectionConfig,
} from "@/constants/collectionsConfig";

interface Listing {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  min_price: number;
  retail_price: number | null;
  size_value: string;
  condition: string;
  image_url: string;
  created_at: string;
  category: string;
}

interface FilterState {
  condition: string[];
  size: string[];
  priceRange: [number, number];
  sortBy: string;
}

const PAGE_SIZE = 12;

const sortOptions = [
  { value: "newest", label: "Newest First", shortLabel: "Newest" },
  { value: "price-low", label: "Price: Low to High", shortLabel: "Low to High" },
  { value: "price-high", label: "Price: High to Low", shortLabel: "High to Low" },
  { value: "discount-high", label: "Discount: High to Low", shortLabel: "Best Deals" },
];

const conditions = [
  PRODUCT_CONDITIONS.NEW,
  PRODUCT_CONDITIONS.LIKE_NEW,
  PRODUCT_CONDITIONS.GOOD,
  PRODUCT_CONDITIONS.FAIR,
  PRODUCT_CONDITIONS.POOR,
];

const sneakerSizes = Object.values(SNEAKER_SIZES);

const serializeFiltersToURL = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.condition.length > 0)
    params.set("condition", filters.condition.join(","));
  if (filters.size.length > 0) params.set("size", filters.size.join(","));
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) {
    params.set("priceMin", filters.priceRange[0].toString());
    params.set("priceMax", filters.priceRange[1].toString());
  }
  if (filters.sortBy !== "newest") params.set("sortBy", filters.sortBy);
  return params;
};

const parseFiltersFromURL = (
  searchParams: URLSearchParams,
): Partial<FilterState> => {
  const partial: Partial<FilterState> = {};
  const condition = searchParams.get("condition");
  if (condition) partial.condition = condition.split(",").filter(Boolean);
  const size = searchParams.get("size");
  if (size) partial.size = size.split(",").filter(Boolean);
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  if (priceMin || priceMax) {
    partial.priceRange = [
      priceMin ? parseInt(priceMin) : 0,
      priceMax ? parseInt(priceMax) : 100000,
    ] as [number, number];
  }
  const sortBy = searchParams.get("sortBy");
  if (sortBy) partial.sortBy = sortBy;
  return partial;
};

// ── Meta ──────────────────────────────────────────────────────────────────────
export function meta({ params }: { params: { id?: string } }) {
  const collection = COLLECTIONS_CONFIG[params.id ?? ""];
  if (!collection) {
    return [
      { title: "Collection Not Found | The Plug Market" },
      { name: "robots", content: "noindex" },
    ];
  }

  const title = `Buy ${collection.name} in India | The Plug Market`;
  const url = `https://theplugmarket.in/collections/${collection.slug}`;
  return [
    { title },
    { name: "description", content: collection.description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: title },
    { property: "og:description", content: collection.description },
    { property: "og:url", content: url },
  ];
}

// ── Server Loader ─────────────────────────────────────────────────────────────
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const pathParts = url.pathname.replace(/^\//, "").split("/");
  const collectionId = pathParts[1] ?? "";

  const collection = COLLECTIONS_CONFIG[collectionId];
  if (!collection) {
    return data({ listings: [], totalCount: 0 }, { status: 404 });
  }

  const ssrSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  const { data: rpcData } = await ssrSupabase.rpc("browse_all_listings", {
    p_categories: null,
    p_sizes: null,
    p_brands: [collection.brand],
    p_conditions: null,
    p_price_min: 0,
    p_price_max: 100000,
    p_search: collection.searchTerm,
    p_sort: "newest",
    p_limit: PAGE_SIZE,
    p_offset: 0,
    p_deals: false,
    p_exact_phrase: collection.exactPhrase,
  });

  type RpcRow = Listing & {
    matched_size_price: number | null;
    total_count: number;
  };
  const rows = (rpcData ?? []) as RpcRow[];
  const listings: Listing[] = rows.map(
    ({ matched_size_price: _m, total_count: _t, ...rest }) => rest as Listing,
  );
  const totalCount = rows.length > 0 ? rows[0].total_count : 0;

  return data(
    { listings, totalCount },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
const CollectionPage = () => {
  const loaderData = useLoaderData<typeof loader>();
  const params = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const collection: CollectionConfig | undefined =
    COLLECTIONS_CONFIG[params.id ?? ""];

  const defaultFilters: FilterState = {
    condition: [],
    size: [],
    priceRange: [0, 100000],
    sortBy: "newest",
  };

  const urlFilters = parseFiltersFromURL(searchParams);
  const initialFilters: FilterState = { ...defaultFilters, ...urlFilters };

  const ssrListings = loaderData?.listings ?? [];
  const ssrTotal = loaderData?.totalCount ?? 0;

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [tempFilters, setTempFilters] = useState<FilterState>(initialFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    priceRange: false,
    condition: false,
    size: false,
  });

  const [listings, setListings] = useState<Listing[]>(ssrListings);
  const [offset, setOffset] = useState(ssrListings.length);
  const [hasMore, setHasMore] = useState(ssrListings.length === PAGE_SIZE);
  const [loadingInitial, setLoadingInitial] = useState(
    ssrListings.length === 0,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(ssrTotal);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<FilterState>(filters);
  filtersRef.current = filters;
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (
      fromOffset: number,
      currentFilters: FilterState,
      replace: boolean,
    ) => {
      if (!collection) return;
      if (replace) setLoadingInitial(true);
      else setLoadingMore(true);

      try {
        const { data: rpcData, error } = await supabase.rpc(
          "browse_all_listings",
          {
            p_categories: null,
            p_sizes:
              currentFilters.size.length > 0 ? currentFilters.size : null,
            p_brands: [collection.brand],
            p_conditions:
              currentFilters.condition.length > 0
                ? currentFilters.condition
                : null,
            p_price_min: currentFilters.priceRange[0],
            p_price_max: currentFilters.priceRange[1],
            p_search: collection.searchTerm,
            p_sort: currentFilters.sortBy,
            p_limit: PAGE_SIZE,
            p_offset: fromOffset,
            p_deals: false,
            p_exact_phrase: collection.exactPhrase,
          },
        );

        if (error) throw error;

        type RpcRow = Listing & {
          matched_size_price: number | null;
          total_count: number;
        };
        const rows = (rpcData ?? []) as RpcRow[];
        const newListings: Listing[] = rows.map(
          ({ matched_size_price: _m, total_count: _t, ...rest }) =>
            rest as Listing,
        );
        const newTotal = rows.length > 0 ? rows[0].total_count : 0;

        if (replace) setTotalCount(newTotal);
        setListings((prev) =>
          replace ? newListings : [...prev, ...newListings],
        );
        setOffset(fromOffset + newListings.length);
        setHasMore(newListings.length === PAGE_SIZE);
      } catch (err) {
        console.error("Error fetching collection listings:", err);
        toast.error("Failed to load listings");
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
      }
    },
    [collection],
  );

  // Sync state when loaderData changes (client-side navigation to a new collection)
  useEffect(() => {
    const newListings = loaderData?.listings ?? [];
    const newTotal = loaderData?.totalCount ?? 0;
    const currentUrlFilters = parseFiltersFromURL(searchParams);
    const filtersToUse: FilterState = { ...defaultFilters, ...currentUrlFilters };
    setListings(newListings);
    setOffset(newListings.length);
    setHasMore(newListings.length === PAGE_SIZE);
    setTotalCount(newTotal);
    setLoadingInitial(newListings.length === 0);
    setFilters(filtersToUse);
    setTempFilters(filtersToUse);
    if (newListings.length === 0 || filtersToUse.sortBy !== "newest") {
      fetchPage(0, filtersToUse, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaderData]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          !loadingInitial
        ) {
          fetchPage(offsetRef.current, filtersRef.current, false);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingInitial, fetchPage]);

  // ── Scroll-to-top ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Filter helpers ────────────────────────────────────────────────────────
  const handleImmediateFilterChange = (
    key: keyof FilterState,
    value: unknown,
  ) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    setSearchParams(serializeFiltersToURL(updated), { replace: true });
    fetchPage(0, updated, true);
  };

  const handleTempFilterChange = (key: keyof FilterState, value: unknown) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setFilterSheetOpen(false);
    setSearchParams(serializeFiltersToURL(tempFilters), { replace: true });
    fetchPage(0, tempFilters, true);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setTempFilters(defaultFilters);
    setFilterSheetOpen(false);
    setSearchParams(serializeFiltersToURL(defaultFilters), { replace: true });
    fetchPage(0, defaultFilters, true);
  };

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getActiveFiltersCount = () => {
    let n = 0;
    if (filters.condition.length > 0) n++;
    if (filters.size.length > 0) n++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) n++;
    return n;
  };

  const getTempFiltersCount = () => {
    let n = 0;
    if (tempFilters.condition.length > 0) n++;
    if (tempFilters.size.length > 0) n++;
    if (tempFilters.priceRange[0] > 0 || tempFilters.priceRange[1] < 100000)
      n++;
    return n;
  };

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Package className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Collection not found.</p>
        <Link
          to="/collections"
          className="text-purple-600 text-sm hover:underline"
        >
          View all collections
        </Link>
      </div>
    );
  }

  const pageUrl = `https://theplugmarket.in/collections/${collection.slug}`;

  return (
    <div className="min-h-screen">
      {/* ItemList structured data */}
      {listings.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `${collection.name} | The Plug Market`,
              url: pageUrl,
              itemListElement: listings.map((listing, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `https://theplugmarket.in${ROUTE_HELPERS.PRODUCT_DETAIL(listing.slug)}`,
                name: listing.title,
              })),
            }),
          }}
        />
      )}

      {/* BreadcrumbList structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Collections",
                item: "https://theplugmarket.in/collections",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: collection.name,
                item: pageUrl,
              },
            ],
          }),
        }}
      />

      {/* Hero banner */}
      {collection.imageUrl ? (
        <div className="relative w-full h-52 sm:h-72 md:h-80 overflow-hidden">
          <img
            src={collection.imageUrl}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
            {/* {collection.badge && (
              <span className="inline-block mb-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm border border-white/30">
                {collection.badge}
              </span>
            )} */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow">
              {collection.name}
            </h1>
            <p className="text-white/80 text-sm mt-1">{collection.tagline}</p>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-40 sm:h-56 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 flex items-end">
          <div className="px-6 pb-6">
            {collection.badge && (
              <span className="inline-block mb-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/30">
                {collection.badge}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
              {collection.name}
            </h1>
            <p className="text-white/80 text-sm mt-1">{collection.tagline}</p>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Breadcrumb nav
        <nav
          className="flex items-center gap-1 text-sm text-gray-500 mb-6"
          aria-label="Breadcrumb"
        >
          <Link
            to="/collections"
            className="hover:text-gray-900 transition-colors"
          >
            Collections
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-gray-900 font-medium">{collection.name}</span>
        </nav> */}

        {/* Controls bar */}
        <div className="flex justify-end gap-3 mb-2">
          <div className="flex items-center gap-2">
            {/* Sort */}
            <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={`border-0 rounded-xl ${
                    filters.sortBy !== "newest"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                      : "glass-button text-gray-700 hover:bg-white/30"
                  }`}
                >
                  <SortAsc className="h-4 w-4 mr-2" />
                  {sortOptions.find((o) => o.value === filters.sortBy)?.shortLabel ?? "Sort"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-56 border-0 rounded-2xl p-4"
                align="end"
              >
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800 mb-3">Sort By</h4>
                  {sortOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={
                        filters.sortBy === option.value ? "default" : "ghost"
                      }
                      onClick={() => {
                        handleImmediateFilterChange("sortBy", option.value);
                        setSortPopoverOpen(false);
                      }}
                      className={`w-full justify-start rounded-xl ${
                        filters.sortBy === option.value
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0"
                          : "glass-button border-0 text-gray-700 hover:bg-white/30"
                      }`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Filter Sheet */}
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 relative"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {getActiveFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:w-96 md:w-[400px] p-0"
              >
                <SheetHeader className="px-6 py-4 border-b border-gray-200">
                  <SheetTitle className="text-lg font-semibold text-gray-800">
                    Filter {collection.name}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  {/* Price Range */}
                  <div>
                    <button
                      onClick={() => toggleSection("priceRange")}
                      className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Price Range
                        {(tempFilters.priceRange[0] > 0 ||
                          tempFilters.priceRange[1] < 100000) && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </Label>
                      {collapsedSections.priceRange ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    {!collapsedSections.priceRange && (
                      <div className="px-3 pb-3">
                        <div className="flex gap-3">
                          <Input
                            type="number"
                            placeholder="Min Price"
                            value={tempFilters.priceRange[0]}
                            onChange={(e) =>
                              handleTempFilterChange("priceRange", [
                                parseInt(e.target.value) || 0,
                                tempFilters.priceRange[1],
                              ])
                            }
                            className="glass-input border-0 rounded-xl text-sm h-11"
                          />
                          <div className="flex items-center px-2 text-gray-400">
                            to
                          </div>
                          <Input
                            type="number"
                            placeholder="Max Price"
                            value={tempFilters.priceRange[1]}
                            onChange={(e) =>
                              handleTempFilterChange("priceRange", [
                                tempFilters.priceRange[0],
                                parseInt(e.target.value) || 100000,
                              ])
                            }
                            className="glass-input border-0 rounded-xl text-sm h-11"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Condition */}
                  <div>
                    <button
                      onClick={() => toggleSection("condition")}
                      className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Condition
                        {tempFilters.condition.length > 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 rounded-full">
                            {tempFilters.condition.length}
                          </span>
                        )}
                      </Label>
                      {collapsedSections.condition ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    {!collapsedSections.condition && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-1 gap-3">
                          {conditions.map((condition) => (
                            <div
                              key={condition}
                              className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              <Checkbox
                                id={`condition-${condition}`}
                                checked={tempFilters.condition.includes(
                                  condition,
                                )}
                                onCheckedChange={(checked) =>
                                  handleTempFilterChange(
                                    "condition",
                                    checked
                                      ? [...tempFilters.condition, condition]
                                      : tempFilters.condition.filter(
                                          (c) => c !== condition,
                                        ),
                                  )
                                }
                                className="rounded-md"
                              />
                              <ConditionBadge
                                condition={condition}
                                className="text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Size */}
                  <div>
                    <button
                      onClick={() => toggleSection("size")}
                      className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Size
                        {tempFilters.size.length > 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 rounded-full">
                            {tempFilters.size.length}
                          </span>
                        )}
                      </Label>
                      {collapsedSections.size ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    {!collapsedSections.size && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                          {sneakerSizes.map((size) => (
                            <div
                              key={size}
                              className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              <Checkbox
                                id={`size-${size}`}
                                checked={tempFilters.size.includes(size)}
                                onCheckedChange={(checked) =>
                                  handleTempFilterChange(
                                    "size",
                                    checked
                                      ? [...tempFilters.size, size]
                                      : tempFilters.size.filter(
                                          (s) => s !== size,
                                        ),
                                  )
                                }
                                className="rounded-md"
                              />
                              <Label
                                htmlFor={`size-${size}`}
                                className="text-sm font-medium text-gray-700 cursor-pointer uppercase"
                              >
                                {size}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <SheetFooter className="px-6 py-4 border-t border-gray-200">
                  <div className="flex gap-3 w-full">
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="flex-1 glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 h-11"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={applyFilters}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 rounded-xl h-11"
                    >
                      Apply Filters ({getTempFiltersCount()})
                    </Button>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active filter chips */}
        {(filters.condition.length > 0 ||
          filters.size.length > 0 ||
          filters.priceRange[0] > 0 ||
          filters.priceRange[1] < 100000) && (
          <div className="flex flex-wrap items-center gap-2 mb-4 py-4 bg-gray-50/50">
            {filters.condition.map((condition) => (
              <ConditionBadge
                key={condition}
                condition={condition}
                variant="glass"
                className="text-xs font-medium flex items-center gap-1 pr-1"
              >
                <button
                  onClick={() => {
                    const u = {
                      ...filters,
                      condition: filters.condition.filter(
                        (c) => c !== condition,
                      ),
                    };
                    setFilters(u);
                    setTempFilters(u);
                    fetchPage(0, u, true);
                  }}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </ConditionBadge>
            ))}
            {filters.size.map((size) => (
              <Badge
                key={size}
                className="bg-purple-100 text-purple-700 border-0 rounded-xl text-xs font-medium flex items-center gap-1 pr-1 uppercase"
              >
                {size}
                <button
                  onClick={() => {
                    const u = {
                      ...filters,
                      size: filters.size.filter((s) => s !== size),
                    };
                    setFilters(u);
                    setTempFilters(u);
                    fetchPage(0, u, true);
                  }}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {(filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) && (
              <Badge className="bg-green-100 text-green-700 border-0 rounded-xl text-xs font-medium flex items-center gap-1 pr-1">
                ₹{filters.priceRange[0].toLocaleString()} – ₹
                {filters.priceRange[1].toLocaleString()}
                <button
                  onClick={() => {
                    const u = {
                      ...filters,
                      priceRange: [0, 100000] as [number, number],
                    };
                    setFilters(u);
                    setTempFilters(u);
                    fetchPage(0, u, true);
                  }}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Results count */}
        {!loadingInitial && (
          <div className="mb-4">
            <p className="text-gray-600 text-sm">
              Showing{" "}
              <span className="font-medium text-gray-900">
                {listings.length}
              </span>
              {totalCount > 0 && (
                <>
                  {" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {totalCount}
                  </span>
                </>
              )}{" "}
              {collection.name} listings
            </p>
          </div>
        )}

        {/* Product grid */}
        {loadingInitial ? (
          <ProductCardSkeletonGrid count={12} />
        ) : listings.length === 0 ? (
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                No listings found
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Try adjusting your filters or check back soon!
              </p>
              <button
                onClick={clearFilters}
                className="text-purple-600 text-sm font-medium hover:underline"
              >
                Clear filters
              </button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  to={ROUTE_HELPERS.PRODUCT_DETAIL(listing.slug ?? listing.id)}
                >
                  <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden group">
                    <CardContent className="p-0">
                      <div className="relative h-40 sm:h-48 overflow-hidden">
                        <CardImage
                          src={listing.image_url || "/placeholder.svg"}
                          alt={listing.title}
                          aspectRatio="aspect-[4/3]"
                          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
                        {listing.retail_price &&
                          (() => {
                            const displayPrice =
                              listing.min_price ?? listing.price;
                            if (listing.retail_price <= displayPrice)
                              return null;
                            const pct = Math.round(
                              ((listing.retail_price - displayPrice) /
                                listing.retail_price) *
                                100,
                            );
                            return pct >= 10 ? (
                              <span className="absolute top-2 left-2 text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-0.5 rounded-lg z-10">
                                {pct}% off
                              </span>
                            ) : null;
                          })()}
                      </div>
                      <div className="p-3 md:p-4">
                        <div className="flex items-start justify-between mb-2 md:mb-3">
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 font-semibold capitalize mb-1">
                              {listing.brand}
                            </p>
                            <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-2">
                              {listing.title}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                          <span className="font-bold text-gray-800 text-base md:text-lg">
                            ₹
                            {(
                              listing.min_price ?? listing.price
                            ).toLocaleString()}
                          </span>
                          <ConditionBadge
                            condition={listing.condition}
                            className="text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs uppercase">
                            {listing.size_value || "Multiple sizes"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div ref={sentinelRef} className="flex justify-center py-8">
              {loadingMore && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more...
                </div>
              )}
            </div>
          </>
        )}

        {/* Scroll-to-top */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 p-3 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
