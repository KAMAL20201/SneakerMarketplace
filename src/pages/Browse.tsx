import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router";
import {
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  SortAsc,
  ArrowUp,
  Loader2,
  // Heart,
} from "lucide-react";
// import { useWishlist } from "@/contexts/WishlistContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router";
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
import { ROUTE_HELPERS, PRODUCT_CONDITIONS } from "@/constants/enums";
import { categories } from "@/constants/sellConstants";
import ConditionBadge from "@/components/ui/ConditionBadge";

interface Listing {
  id: string;
  product_id: string;
  title: string;
  description: string;
  min_price: number;
  price: number;
  retail_price: number | null;
  brand: string;
  size_value: string;
  condition: string;
  image_url: string;
  created_at: string;
  views: number;
  user_id: string;
  category: string;
}

interface FilterState {
  search: string;
  condition: string[];
  brand: string[];
  category: string[];
  priceRange: [number, number];
  sortBy: string;
  deals: boolean;
}

const PAGE_SIZE = 12;
const BROWSE_STATE_KEY = "browse_page_state";

function buildMultiWordSearchFilter(rawQuery: string, columns: string[]): string | null {
  const trimmed = rawQuery.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/\s+/).filter(Boolean).map((t) => t.replace(/[%_]/g, ""));
  if (tokens.length === 0) return null;
  if (tokens.length === 1) {
    const pat = `%${tokens[0]}%`;
    return columns.map((col) => `${col}.ilike.${pat}`).join(",");
  }
  return columns.map((col) => {
    const andParts = tokens.map((t) => `${col}.ilike.%${t}%`).join(",");
    return `and(${andParts})`;
  }).join(",");
}

// ── URL helpers ───────────────────────────────────────────────────────────────

const serializeFiltersToURL = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.condition.length > 0) params.set("condition", filters.condition.join(","));
  if (filters.brand.length > 0) params.set("brand", filters.brand.join(","));
  if (filters.category.length > 0) params.set("category", filters.category.join(","));
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) {
    params.set("priceMin", filters.priceRange[0].toString());
    params.set("priceMax", filters.priceRange[1].toString());
  }
  if (filters.sortBy !== "newest") params.set("sortBy", filters.sortBy);
  if (filters.deals) params.set("deals", "true");
  return params;
};

const parseFiltersFromURL = (searchParams: URLSearchParams): Partial<FilterState> => {
  const filters: Partial<FilterState> = {};
  const search = searchParams.get("search");
  if (search) filters.search = search;
  const condition = searchParams.get("condition");
  if (condition) filters.condition = condition.split(",").filter(Boolean);
  const brand = searchParams.get("brand");
  if (brand) filters.brand = brand.split(",").filter(Boolean);
  const category = searchParams.get("category");
  if (category) filters.category = category.split(",").filter(Boolean);
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  if (priceMin || priceMax) {
    filters.priceRange = [
      priceMin ? parseInt(priceMin) : 0,
      priceMax ? parseInt(priceMax) : 100000,
    ] as [number, number];
  }
  const sortBy = searchParams.get("sortBy");
  if (sortBy) filters.sortBy = sortBy;
  if (searchParams.get("deals") === "true") filters.deals = true;
  return filters;
};

// ── Component ─────────────────────────────────────────────────────────────────

const Browse = () => {
  // const { toggleWishlist, isInWishlist } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultFilters: FilterState = {
    search: "",
    condition: [],
    brand: [],
    category: [],
    priceRange: [0, 100000],
    sortBy: "newest",
    deals: false,
  };

  const urlFilters = parseFiltersFromURL(searchParams);
  const initialFilters: FilterState = { ...defaultFilters, ...urlFilters };

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [tempFilters, setTempFilters] = useState<FilterState>(initialFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    priceRange: false,
    condition: false,
    brand: false,
    category: false,
  });

  // ── Infinite scroll state ─────────────────────────────────────────────────
  const [listings, setListings] = useState<Listing[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ── Scroll-to-top visibility ──────────────────────────────────────────────
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Sentinel div at bottom of list — IntersectionObserver watches this
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Stable ref to always-current filters so observer callback never goes stale
  const filtersRef = useRef<FilterState>(filters);
  filtersRef.current = filters;

  // ── Scroll restoration refs ────────────────────────────────────────────────
  const location = useLocation();
  const skipInitialFetchRef = useRef(false);
  const listingsRef = useRef<Listing[]>([]);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const totalCountRef = useRef(0);
  const scrollYRef = useRef(0);

  // ── Filter options ────────────────────────────────────────────────────────
  const conditions = [
    PRODUCT_CONDITIONS.NEW,
    PRODUCT_CONDITIONS.LIKE_NEW,
    PRODUCT_CONDITIONS.GOOD,
    PRODUCT_CONDITIONS.FAIR,
    PRODUCT_CONDITIONS.POOR,
  ];
  const brands = [
    "Nike", "Adidas", "Jordan", "Yeezy", "Converse",
    "Vans", "Puma", "Reebok", "New Balance", "Asics",
  ];
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "discount-high", label: "Discount: High to Low" },
  ];

  // ── Core fetch function ───────────────────────────────────────────────────
  // `fromOffset` = where to start; `replace` = reset list (new filter/search)
  const fetchPage = useCallback(async (fromOffset: number, currentFilters: FilterState, replace: boolean) => {
    if (replace) setLoadingInitial(true);
    else setLoadingMore(true);

    try {
      let query = supabase
        .from(currentFilters.deals ? "hot_deals_with_images" : "listings_with_images")
        .select("*", { count: replace ? "exact" : undefined });

      // Non-deals mode needs active filter (hot_deals_with_images view already filters it)
      if (!currentFilters.deals) {
        query = query.eq("status", "active");
      }

      // Search
      if (currentFilters.search?.trim()) {
        const filterStr = buildMultiWordSearchFilter(
          currentFilters.search,
          ["title", "brand", "description"]
        );
        if (filterStr) query = query.or(filterStr);
      }
      // Brand
      if (currentFilters.brand.length > 0) {
        query = query.in("brand", currentFilters.brand.map((b) => b.toLowerCase()));
      }
      // Category
      if (currentFilters.category.length > 0) {
        query = query.in("category", currentFilters.category);
      }
      // Condition
      if (currentFilters.condition.length > 0) {
        query = query.in("condition", currentFilters.condition);
      }
      // Price
      query = query
        .gte("price", currentFilters.priceRange[0])
        .lte("price", currentFilters.priceRange[1]);
      // Sort
      switch (currentFilters.sortBy) {
        case "price-low": query = query.order("min_price", { ascending: true, nullsFirst: false }); break;
        case "price-high": query = query.order("min_price", { ascending: false, nullsFirst: false }); break;
        // discount-high requires a computed discount_pct view column (follow-up migration);
        // fall through to newest until that's available.
        case "discount-high":
        default: query = query.order("created_at", { ascending: false });
      }

      // Pagination slice
      const { data, error, count } = await query
        .range(fromOffset, fromOffset + PAGE_SIZE - 1);

      if (error) throw error;

      const rows = data ?? [];

      if (replace && count !== null && count !== undefined) setTotalCount(count);

      setListings((prev) => replace ? rows : [...prev, ...rows]);
      setOffset(fromOffset + rows.length);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error fetching listings:", err);
      toast.error("Failed to load listings");
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Restore scroll position when navigating back from a product page ───────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(BROWSE_STATE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.locationKey === location.key && state.listings?.length > 0) {
          skipInitialFetchRef.current = true;
          setListings(state.listings);
          setOffset(state.offset);
          setHasMore(state.hasMore);
          setTotalCount(state.totalCount);
          setLoadingInitial(false);
          // Wait for the restored listings to render before scrolling
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: state.scrollY, behavior: "instant" });
            });
          });
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset + refetch whenever filters/URL change ───────────────────────────
  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }
    const urlParsed = parseFiltersFromURL(searchParams);
    const merged: FilterState = { ...defaultFilters, ...urlParsed };
    setFilters(merged);
    setTempFilters(merged);
    setOffset(0);
    setHasMore(true);
    setListings([]);
    fetchPage(0, merged, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── IntersectionObserver — loads next page when sentinel enters view ───────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingInitial) {
          fetchPage(offset, filtersRef.current, false);
        }
      },
      { rootMargin: "200px" } // trigger 200px before the bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingInitial, offset, fetchPage]);

  // ── Show/hide scroll-to-top button + track scroll position ───────────────
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Keep refs in sync so the unmount snapshot has latest values ───────────
  useEffect(() => { listingsRef.current = listings; }, [listings]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { totalCountRef.current = totalCount; }, [totalCount]);

  // ── Save state to sessionStorage when leaving the browse page ─────────────
  useEffect(() => {
    return () => {
      sessionStorage.setItem(
        BROWSE_STATE_KEY,
        JSON.stringify({
          listings: listingsRef.current,
          offset: offsetRef.current,
          hasMore: hasMoreRef.current,
          totalCount: totalCountRef.current,
          scrollY: scrollYRef.current,
          locationKey: location.key,
        })
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ── Filter helpers ────────────────────────────────────────────────────────
  const applyFilters = () => {
    setFilters(tempFilters);
    setFilterSheetOpen(false);
    const newParams = serializeFiltersToURL(tempFilters);
    setSearchParams(newParams, { replace: true });
  };

  const clearFilters = () => {
    const cleared: FilterState = { ...defaultFilters };
    setFilters(cleared);
    setTempFilters(cleared);
    setSearchParams(serializeFiltersToURL(cleared), { replace: true });
  };

  const handleImmediateFilterChange = (key: keyof FilterState, value: unknown) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    setSearchParams(serializeFiltersToURL(updated), { replace: true });
  };

  const handleSearchInputChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleSearchExecute = () => {
    setSearchParams(serializeFiltersToURL(filters), { replace: true });
  };

  const handleTempFilterChange = (key: keyof FilterState, value: unknown) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name ?? categoryId;
  };

  const getActiveFiltersCount = () => {
    let n = 0;
    if (filters.condition.length > 0) n++;
    if (filters.brand.length > 0) n++;
    if (filters.category.length > 0) n++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) n++;
    return n;
  };

  const getTempFiltersCount = () => {
    let n = 0;
    if (tempFilters.condition.length > 0) n++;
    if (tempFilters.brand.length > 0) n++;
    if (tempFilters.category.length > 0) n++;
    if (tempFilters.priceRange[0] > 0 || tempFilters.priceRange[1] < 100000) n++;
    return n;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 py-6">
      <div className="container mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
            {filters.deals ? "🔥 Hot Deals" : "Browse Items"}
          </h1>
          <p className="text-gray-600 text-sm md:text-base mb-3">
            {filters.deals
              ? "Listings with 50% off or more on retail price"
              : "Discover amazing items from our collector community - all listings are manually reviewed and approved"}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-green-700 text-xs font-medium">Quality Verified</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-blue-700 text-xs font-medium">Verified Sellers</span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              <span className="text-orange-700 text-xs font-medium">Quality Approved</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center justify-center border rounded-2xl pl-2 mb-4">
          <Search className="h-5 w-5 text-gray-600" />
          <Input
            value={filters.search}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearchExecute(); }}
            placeholder="Search items, brands, categories..."
            className="h-12 text-gray-700 placeholder:text-gray-500 !border-none !outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {filters.search && (
            <button
              onClick={() => {
                handleSearchInputChange("");
                setSearchParams(serializeFiltersToURL({ ...filters, search: "" }), { replace: true });
              }}
              className="absolute right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Search result caption */}
        {searchParams.get("search") && (
          <div className="mb-6 text-center">
            <p className="text-gray-600">
              <span className="font-medium text-gray-900">{totalCount}</span> results for{" "}
              <span className="font-medium text-blue-600">"{searchParams.get("search")}"</span>
            </p>
          </div>
        )}

        {/* Controls Bar */}
        <div className="flex justify-end gap-3 mb-2">
          <div className="flex items-center gap-2">
            {/* Sort */}
            <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 border-0 rounded-2xl p-4" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800 mb-3">Sort By</h4>
                  {sortOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={filters.sortBy === option.value ? "default" : "ghost"}
                      onClick={() => { handleImmediateFilterChange("sortBy", option.value); setSortPopoverOpen(false); }}
                      className={`w-full justify-start rounded-xl ${filters.sortBy === option.value
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
                <Button variant="ghost" className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 relative">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {getActiveFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 md:w-[400px] p-0">
                <SheetHeader className="px-6 py-4 border-b border-gray-200">
                  <SheetTitle className="text-lg font-semibold text-gray-800">Filter Products</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

                  {/* Category */}
                  <div>
                    <button onClick={() => toggleSection("category")} className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Category
                        {tempFilters.category.length > 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 rounded-full">{tempFilters.category.length}</span>}
                      </Label>
                      {collapsedSections.category ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronUp className="h-4 w-4 text-gray-500" />}
                    </button>
                    {!collapsedSections.category && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                          {categories.map((category) => (
                            <div key={category.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                              <Checkbox
                                id={category.id}
                                checked={tempFilters.category.includes(category.id)}
                                onCheckedChange={(checked) => handleTempFilterChange("category",
                                  checked ? [...tempFilters.category, category.id] : tempFilters.category.filter((c) => c !== category.id)
                                )}
                                className="rounded-md"
                              />
                              <Label htmlFor={category.id} className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                                <category.icon className="h-4 w-4" />
                                {category.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price Range */}
                  <div>
                    <button onClick={() => toggleSection("priceRange")} className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Price Range
                        {(tempFilters.priceRange[0] > 0 || tempFilters.priceRange[1] < 100000) && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Active</span>}
                      </Label>
                      {collapsedSections.priceRange ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronUp className="h-4 w-4 text-gray-500" />}
                    </button>
                    {!collapsedSections.priceRange && (
                      <div className="px-3 pb-3">
                        <div className="flex gap-3">
                          <Input type="number" placeholder="Min Price" value={tempFilters.priceRange[0]}
                            onChange={(e) => handleTempFilterChange("priceRange", [parseInt(e.target.value) || 0, tempFilters.priceRange[1]])}
                            className="glass-input border-0 rounded-xl text-sm h-11" />
                          <div className="flex items-center px-2 text-gray-400">to</div>
                          <Input type="number" placeholder="Max Price" value={tempFilters.priceRange[1]}
                            onChange={(e) => handleTempFilterChange("priceRange", [tempFilters.priceRange[0], parseInt(e.target.value) || 100000])}
                            className="glass-input border-0 rounded-xl text-sm h-11" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Condition */}
                  <div>
                    <button onClick={() => toggleSection("condition")} className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Condition
                        {tempFilters.condition.length > 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 rounded-full">{tempFilters.condition.length}</span>}
                      </Label>
                      {collapsedSections.condition ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronUp className="h-4 w-4 text-gray-500" />}
                    </button>
                    {!collapsedSections.condition && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-1 gap-3">
                          {conditions.map((condition) => (
                            <div key={condition} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                              <Checkbox
                                id={condition}
                                checked={tempFilters.condition.includes(condition)}
                                onCheckedChange={(checked) => handleTempFilterChange("condition",
                                  checked ? [...tempFilters.condition, condition] : tempFilters.condition.filter((c) => c !== condition)
                                )}
                                className="rounded-md"
                              />
                              <ConditionBadge condition={condition} className="text-xs" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Brand */}
                  <div>
                    <button onClick={() => toggleSection("brand")} className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Brand
                        {tempFilters.brand.length > 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 rounded-full">{tempFilters.brand.length}</span>}
                      </Label>
                      {collapsedSections.brand ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronUp className="h-4 w-4 text-gray-500" />}
                    </button>
                    {!collapsedSections.brand && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                          {brands.map((brand) => (
                            <div key={brand} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                              <Checkbox
                                id={brand}
                                checked={tempFilters.brand.includes(brand)}
                                onCheckedChange={(checked) => handleTempFilterChange("brand",
                                  checked ? [...tempFilters.brand, brand] : tempFilters.brand.filter((b) => b !== brand)
                                )}
                                className="rounded-md"
                              />
                              <Label htmlFor={brand} className="text-sm font-medium text-gray-700 cursor-pointer">{brand}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <SheetFooter className="px-6 py-4 border-t border-gray-200">
                  <div className="flex gap-3 w-full">
                    <Button variant="ghost" onClick={clearFilters} className="flex-1 glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 h-11">
                      Reset
                    </Button>
                    <Button onClick={applyFilters} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 rounded-xl h-11">
                      Apply Filters ({getTempFiltersCount()})
                    </Button>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(filters.condition.length > 0 || filters.brand.length > 0 || filters.category.length > 0 || filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) && (
          <div className="flex flex-wrap items-center gap-2 mb-4 py-4 bg-gray-50/50">
            {filters.category.map((categoryId) => (
              <Badge key={categoryId} className="bg-indigo-100 text-indigo-700 border-0 rounded-xl text-xs font-medium flex items-center gap-1 pr-1">
                {getCategoryName(categoryId)}
                <button onClick={() => { const u = { ...filters, category: filters.category.filter((c) => c !== categoryId) }; setFilters(u); setTempFilters(u); setSearchParams(serializeFiltersToURL(u), { replace: true }); }} className="hover:bg-black/10 rounded-full p-0.5 transition-colors"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {filters.condition.map((condition) => (
              <ConditionBadge key={condition} condition={condition} variant="glass" className="text-xs font-medium flex items-center gap-1 pr-1">
                <button onClick={() => { const u = { ...filters, condition: filters.condition.filter((c) => c !== condition) }; setFilters(u); setTempFilters(u); setSearchParams(serializeFiltersToURL(u), { replace: true }); }} className="hover:bg-black/10 rounded-full p-0.5 transition-colors"><X className="h-3 w-3" /></button>
              </ConditionBadge>
            ))}
            {filters.brand.map((brand) => (
              <Badge key={brand} className="bg-blue-100 text-blue-700 border-0 rounded-xl text-xs font-medium flex items-center gap-1 pr-1">
                {brand}
                <button onClick={() => { const u = { ...filters, brand: filters.brand.filter((b) => b !== brand) }; setFilters(u); setTempFilters(u); setSearchParams(serializeFiltersToURL(u), { replace: true }); }} className="hover:bg-black/10 rounded-full p-0.5 transition-colors"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {(filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) && (
              <Badge className="bg-green-100 text-green-700 border-0 rounded-xl text-xs font-medium flex items-center gap-1 pr-1">
                ₹{filters.priceRange[0].toLocaleString()} - ₹{filters.priceRange[1].toLocaleString()}
                <button onClick={() => { const u = { ...filters, priceRange: [0, 100000] as [number, number] }; setFilters(u); setTempFilters(u); setSearchParams(serializeFiltersToURL(u), { replace: true }); }} className="hover:bg-black/10 rounded-full p-0.5 transition-colors"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">Clear all</button>
          </div>
        )}

        {/* Results count */}
        {!loadingInitial && (
          <div className="mb-4">
            <p className="text-gray-600 text-sm">
              Showing <span className="font-medium text-gray-900">{listings.length}</span>
              {totalCount > 0 && <> of <span className="font-medium text-gray-900">{totalCount}</span></>} listings
            </p>
          </div>
        )}

        {/* Grid */}
        {loadingInitial ? (
          <ProductCardSkeletonGrid count={12} />
        ) : listings.length === 0 ? (
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 md:h-10 md:w-10 text-gray-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">No Listings Found</h3>
              <p className="text-gray-600 mb-6 text-sm md:text-base">Try adjusting your filters or search terms</p>
              <Button onClick={clearFilters} className="glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30">Clear Filters</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">              {listings.map((listing) => (
              <Link to={ROUTE_HELPERS.PRODUCT_DETAIL(listing.id)} key={listing.id}>
                <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="relative h-40 sm:h-48 overflow-hidden">
                      <CardImage
                        src={listing.image_url || "/placeholder.svg"}
                        alt={listing.title}
                        aspectRatio="aspect-[4/3]"
                        className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      {listing.retail_price && listing.retail_price > listing.price && (() => {
                        const pct = Math.round(((listing.retail_price - listing.price) / listing.retail_price) * 100);
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
                          <p className="text-xs text-gray-600 font-semibold capitalize mb-1">{listing.brand}</p>
                          <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-2">{listing.title}</h3>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2 md:mb-3">
                        <span className="font-bold text-gray-800 text-base md:text-lg">₹{(listing.min_price ?? listing.price).toLocaleString()}</span>
                        <ConditionBadge condition={listing.condition} className="text-xs" />
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

            {/* Sentinel + load-more spinner */}
            <div ref={sentinelRef} className="flex justify-center py-8">
              {loadingMore && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading more…
                </div>
              )}
              {!loadingMore && !hasMore && listings.length > 0 && (
                <p className="text-gray-400 text-sm">You've seen all {listings.length} listings</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Scroll-to-top FAB */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default Browse;
