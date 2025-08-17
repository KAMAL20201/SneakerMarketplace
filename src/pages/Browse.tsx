import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  Search,
  Package,
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
import { ROUTE_HELPERS } from "@/constants/enums";
import { categories } from "@/constants/sellConstants";

interface Listing {
  id: string;
  product_id: string;
  title: string;
  description: string;
  price: number;
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
}

// Helper functions for URL parameter handling
const serializeFiltersToURL = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.search && filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.condition.length > 0) {
    params.set("condition", filters.condition.join(","));
  }

  if (filters.brand.length > 0) {
    params.set("brand", filters.brand.join(","));
  }

  if (filters.category.length > 0) {
    params.set("category", filters.category.join(","));
  }

  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) {
    params.set("priceMin", filters.priceRange[0].toString());
    params.set("priceMax", filters.priceRange[1].toString());
  }

  if (filters.sortBy !== "newest") {
    params.set("sortBy", filters.sortBy);
  }

  return params;
};

const parseFiltersFromURL = (
  searchParams: URLSearchParams
): Partial<FilterState> => {
  const filters: Partial<FilterState> = {};

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const condition = searchParams.get("condition");
  if (condition) {
    filters.condition = condition.split(",").filter(Boolean);
  }

  const brand = searchParams.get("brand");
  if (brand) {
    filters.brand = brand.split(",").filter(Boolean);
  }

  const category = searchParams.get("category");
  if (category) {
    filters.category = category.split(",").filter(Boolean);
  }

  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  if (priceMin || priceMax) {
    filters.priceRange = [
      priceMin ? parseInt(priceMin) : 0,
      priceMax ? parseInt(priceMax) : 100000,
    ] as [number, number];
  }

  const sortBy = searchParams.get("sortBy");
  if (sortBy) {
    filters.sortBy = sortBy;
  }

  return filters;
};

const Browse = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Initialize filters with URL parameters
  const defaultFilters: FilterState = {
    search: "",
    condition: [],
    brand: [],
    category: [],
    priceRange: [0, 100000],
    sortBy: "newest",
  };

  const urlFilters = parseFiltersFromURL(searchParams);
  const initialFilters: FilterState = { ...defaultFilters, ...urlFilters };

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [tempFilters, setTempFilters] = useState<FilterState>(initialFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    priceRange: false,
    condition: false,
    brand: false,
    category: false,
  });

  const itemsPerPage = 12;

  // Available filter options
  const conditions = ["new", "like new", "good", "fair", "poor"];
  const brands = [
    "Nike",
    "Adidas",
    "Jordan",
    "Yeezy",
    "Converse",
    "Vans",
    "Puma",
    "Reebok",
    "New Balance",
    "Asics",
  ];
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
  ];

  // Handle URL parameter changes
  useEffect(() => {
    const urlFilters = parseFiltersFromURL(searchParams);
    const newFilters: FilterState = { ...defaultFilters, ...urlFilters };

    setFilters(newFilters);
    setTempFilters(newFilters);
    setCurrentPage(1);

    // Fetch with new filters from URL
    setTimeout(() => fetchListings(), 0);
  }, [searchParams]);

  const fetchListings = async (
    searchTerm?: string,
    filterState?: FilterState
  ) => {
    debugger;
    try {
      setLoading(true);
      // Use current filters if not provided
      const currentSearch = searchTerm ?? filters.search;
      const currentFilters = filterState ?? filters;

      // Build the base query
      let countQuery = supabase
        .from("listings_with_images")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      let dataQuery = supabase
        .from("listings_with_images")
        .select("*")
        .eq("status", "active");

      // Apply search filter
      if (currentSearch && currentSearch.trim()) {
        const searchPattern = `%${currentSearch.trim()}%`;
        const searchCondition = `title.ilike.${searchPattern},brand.ilike.${searchPattern},description.ilike.${searchPattern}`;

        countQuery = countQuery.or(searchCondition);
        dataQuery = dataQuery.or(searchCondition);
      }

      // Apply brand filter
      if (currentFilters.brand.length > 0) {
        countQuery = countQuery.in(
          "brand",
          currentFilters.brand.map((brand) => brand.toLowerCase())
        );
        dataQuery = dataQuery.in(
          "brand",
          currentFilters.brand.map((brand) => brand.toLowerCase())
        );
      }

      // Apply category filter
      if (currentFilters.category.length > 0) {
        countQuery = countQuery.in("category", currentFilters.category);
        dataQuery = dataQuery.in("category", currentFilters.category);
      }

      // Apply condition filter
      if (currentFilters.condition.length > 0) {
        countQuery = countQuery.in("condition", currentFilters.condition);
        dataQuery = dataQuery.in("condition", currentFilters.condition);
      }

      // Apply price range filter
      countQuery = countQuery
        .gte("price", currentFilters.priceRange[0])
        .lte("price", currentFilters.priceRange[1]);

      dataQuery = dataQuery
        .gte("price", currentFilters.priceRange[0])
        .lte("price", currentFilters.priceRange[1]);

      // Apply sorting
      switch (currentFilters.sortBy) {
        case "newest":
          dataQuery = dataQuery.order("created_at", { ascending: false });
          break;
        case "oldest":
          dataQuery = dataQuery.order("created_at", { ascending: true });
          break;
        case "price-low":
          dataQuery = dataQuery.order("price", { ascending: true });
          break;
        case "price-high":
          dataQuery = dataQuery.order("price", { ascending: false });
          break;
        case "popular":
          dataQuery = dataQuery.order("views", { ascending: false });
          break;
        default:
          dataQuery = dataQuery.order("created_at", { ascending: false });
      }

      // Get count for pagination
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // Apply pagination and fetch data
      const { data, error } = await dataQuery.range(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage - 1
      );

      if (error) throw error;

      // Since we're doing server-side filtering, we can set both listings and filteredListings to the same data
      setListings(data || []);
      setFilteredListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  // Handle immediate filters (sort) that apply right away
  const handleImmediateFilterChange = (key: keyof FilterState, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    setCurrentPage(1);

    // Update URL immediately for immediate filters
    const newParams = serializeFiltersToURL(updatedFilters);
    setSearchParams(newParams, { replace: true });
  };

  // Handle search input change without triggering fetch
  const handleSearchInputChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  // Handle search execution (on Enter key)
  const handleSearchExecute = () => {
    setCurrentPage(1);

    // Update URL with current filters (including search)
    const updatedFilters = { ...filters };
    const newParams = serializeFiltersToURL(updatedFilters);
    setSearchParams(newParams, { replace: true });
  };

  const handleTempFilterChange = (key: keyof FilterState, value: any) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setCurrentPage(1);
    setFilterSheetOpen(false);

    // Update URL with all filters
    const newParams = serializeFiltersToURL(tempFilters);
    setSearchParams(newParams, { replace: true });
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      search: "",
      condition: [],
      brand: [],
      category: [],
      priceRange: [0, 100000] as [number, number],
      sortBy: "newest",
    };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
    setCurrentPage(1);

    // Clear all filters from URL
    const newParams = serializeFiltersToURL(clearedFilters);
    setSearchParams(newParams, { replace: true });

    // Trigger fetch with cleared filters
    setTimeout(() => fetchListings(), 0);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-100 text-green-700 !hover:bg-green-100";
      case "like new":
        return "bg-blue-100 text-blue-700 !hover:bg-blue-100";
      case "good":
        return "bg-yellow-100 text-yellow-700 !hover:bg-yellow-100";
      case "fair":
        return "bg-orange-100 text-orange-700 !hover:bg-orange-100";
      case "poor":
        return "bg-red-100 text-red-700 !hover:bg-red-100  ";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.condition.length > 0) count++;
    if (filters.brand.length > 0) count++;
    if (filters.category.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) count++;
    return count;
  };

  const getTempFiltersCount = () => {
    let count = 0;
    if (tempFilters.condition.length > 0) count++;
    if (tempFilters.brand.length > 0) count++;
    if (tempFilters.category.length > 0) count++;
    if (tempFilters.priceRange[0] > 0 || tempFilters.priceRange[1] < 100000)
      count++;
    return count;
  };

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
            Browse Items
          </h1>
          <p className="text-gray-600 text-sm md:text-base mb-3">
            Discover amazing items from our collector community - all listings
            are manually reviewed and approved
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-green-700 text-xs font-medium">
                Authenticity Guaranteed
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-blue-700 text-xs font-medium">
                Verified Sellers
              </span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              <span className="text-orange-700 text-xs font-medium">
                Quality Approved
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar - Full Width on Mobile */}
        <div className="relative flex items-center justify-center border rounded-2xl pl-2 mb-4">
          <Search className=" h-5 w-5 text-gray-600" />
          <Input
            value={filters.search}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearchExecute();
              }
            }}
            placeholder="Search items, brands, categories..."
            className="h-12 text-gray-700 placeholder:text-gray-500 !border-none !outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {filters.search && (
            <button
              onClick={() => {
                handleSearchInputChange("");
                setCurrentPage(1);
                // Update URL with cleared search
                const updatedFilters = { ...filters, search: "" };
                const newParams = serializeFiltersToURL(updatedFilters);
                setSearchParams(newParams, { replace: true });
              }}
              className="absolute right-3 p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Search Results Count */}
        {searchParams.get("search") && (
          <div className="mb-6 text-center">
            <p className="text-gray-600">
              <span className="font-medium text-gray-900">
                {filteredListings.length}
              </span>{" "}
              results found for{" "}
              <span className="font-medium text-blue-600">
                "{searchParams.get("search")}"
              </span>
            </p>
          </div>
        )}

        {/* Controls Bar */}
        <div className="flex  justify-end   gap-3 mb-2">
          {/* Right Side - Sort and Filter */}
          <div className="flex items-center gap-2 ">
            {/* Sort Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30"
                >
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort
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
                      onClick={() =>
                        handleImmediateFilterChange("sortBy", option.value)
                      }
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
                    Filter Products
                  </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  {/* Category */}
                  <div>
                    <button
                      onClick={() => toggleSection("category")}
                      className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Category
                        {tempFilters.category.length > 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1/2 rounded-full ">
                            {tempFilters.category.length}
                          </span>
                        )}
                      </Label>
                      {collapsedSections.category ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    {!collapsedSections.category && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                          {categories.map((category) => (
                            <div
                              key={category.id}
                              className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              <Checkbox
                                id={category.id}
                                checked={tempFilters.category.includes(
                                  category.id
                                )}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleTempFilterChange("category", [
                                      ...tempFilters.category,
                                      category.id,
                                    ]);
                                  } else {
                                    handleTempFilterChange(
                                      "category",
                                      tempFilters.category.filter(
                                        (c) => c !== category.id
                                      )
                                    );
                                  }
                                }}
                                className="rounded-md"
                              />
                              <Label
                                htmlFor={category.id}
                                className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                              >
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
                          <div className="flex-1">
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
                          </div>
                          <div className="flex items-center px-2 text-gray-400">
                            to
                          </div>
                          <div className="flex-1">
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
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1/2 rounded-full ">
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
                                id={condition}
                                checked={tempFilters.condition.includes(
                                  condition
                                )}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleTempFilterChange("condition", [
                                      ...tempFilters.condition,
                                      condition,
                                    ]);
                                  } else {
                                    handleTempFilterChange(
                                      "condition",
                                      tempFilters.condition.filter(
                                        (c) => c !== condition
                                      )
                                    );
                                  }
                                }}
                                className="rounded-md"
                              />
                              <Label
                                htmlFor={condition}
                                className={`${getConditionColor(
                                  condition
                                )} px-2 rounded-xl text-sm capitalize font-medium text-gray-700 cursor-pointer`}
                              >
                                {condition}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Brand */}
                  <div>
                    <button
                      onClick={() => toggleSection("brand")}
                      className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Brand
                        {tempFilters.brand.length > 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1/2 rounded-full ">
                            {tempFilters.brand.length}
                          </span>
                        )}
                      </Label>
                      {collapsedSections.brand ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    {!collapsedSections.brand && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                          {brands.map((brand) => (
                            <div
                              key={brand}
                              className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              <Checkbox
                                id={brand}
                                checked={tempFilters.brand.includes(brand)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleTempFilterChange("brand", [
                                      ...tempFilters.brand,
                                      brand,
                                    ]);
                                  } else {
                                    handleTempFilterChange(
                                      "brand",
                                      tempFilters.brand.filter(
                                        (b) => b !== brand
                                      )
                                    );
                                  }
                                }}
                                className="rounded-md"
                              />
                              <Label
                                htmlFor={brand}
                                className="text-sm font-medium text-gray-700 cursor-pointer"
                              >
                                {brand}
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

        {/* Active Filters */}
        {(filters.condition.length > 0 ||
          filters.brand.length > 0 ||
          filters.category.length > 0 ||
          filters.priceRange[0] > 0 ||
          filters.priceRange[1] < 100000) && (
          <div className="flex flex-wrap items-center gap-2 mb-4 py-4 bg-gray-50/50 ">
            {filters.category.map((categoryId) => (
              <Badge
                key={categoryId}
                className="bg-indigo-100 text-indigo-700 border-0 rounded-xl text-xs font-medium flex items-center gap-1 pr-1"
              >
                {getCategoryName(categoryId)}
                <button
                  onClick={() => {
                    const newCategories = filters.category.filter(
                      (c) => c !== categoryId
                    );
                    const updatedFilters = {
                      ...filters,
                      category: newCategories,
                    };
                    setFilters(updatedFilters);
                    setTempFilters(updatedFilters);
                    setCurrentPage(1);
                    const newParams = serializeFiltersToURL(updatedFilters);
                    setSearchParams(newParams, { replace: true });
                  }}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                  title={`Remove ${getCategoryName(categoryId)} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.condition.map((condition) => (
              <Badge
                key={condition}
                className={`${getConditionColor(
                  condition
                )} border-0 rounded-xl text-xs capitalize font-medium flex items-center gap-1 pr-1`}
              >
                {condition}
                <button
                  onClick={() => {
                    const newConditions = filters.condition.filter(
                      (c) => c !== condition
                    );
                    const updatedFilters = {
                      ...filters,
                      condition: newConditions,
                    };
                    setFilters(updatedFilters);
                    setTempFilters(updatedFilters);
                    setCurrentPage(1);
                    const newParams = serializeFiltersToURL(updatedFilters);
                    setSearchParams(newParams, { replace: true });
                  }}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                  title={`Remove ${condition} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.brand.map((brand) => (
              <Badge
                key={brand}
                className="bg-blue-100 text-blue-700 border-0 rounded-xl text-xs font-medium flex items-center gap-1 pr-1"
              >
                {brand}
                <button
                  onClick={() => {
                    const newBrands = filters.brand.filter((b) => b !== brand);
                    const updatedFilters = { ...filters, brand: newBrands };
                    setFilters(updatedFilters);
                    setTempFilters(updatedFilters);
                    setCurrentPage(1);
                    const newParams = serializeFiltersToURL(updatedFilters);
                    setSearchParams(newParams, { replace: true });
                  }}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                  title={`Remove ${brand} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {(filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) && (
              <Badge className="bg-green-100 text-green-700 border-0 rounded-xl text-xs font-medium flex items-center gap-1 pr-1">
                ₹{filters.priceRange[0].toLocaleString()} - ₹
                {filters.priceRange[1].toLocaleString()}
                <button
                  onClick={() => {
                    const updatedFilters = {
                      ...filters,
                      priceRange: [0, 100000] as [number, number],
                    };
                    setFilters(updatedFilters);
                    setTempFilters(updatedFilters);
                    setCurrentPage(1);
                    const newParams = serializeFiltersToURL(updatedFilters);
                    setSearchParams(newParams, { replace: true });
                  }}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                  title="Remove price range filter"
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

        {/* Results Count */}
        {!loading && (
          <div className="mb-4">
            <p className="text-gray-600 text-sm">
              Showing {filteredListings.length} of {listings.length} listings
            </p>
          </div>
        )}

        {/* Listings Grid/List */}
        {loading ? (
          <ProductCardSkeletonGrid count={12} />
        ) : filteredListings.length === 0 ? (
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 md:h-10 md:w-10 text-gray-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                No Listings Found
              </h3>
              <p className="text-gray-600 mb-6 text-sm md:text-base">
                Try adjusting your filters or search terms
              </p>
              <Button
                onClick={clearFilters}
                className="glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
            }
          >
            {filteredListings.map((listing) => (
              <Link
                to={ROUTE_HELPERS.PRODUCT_DETAIL(listing.product_id)}
                key={listing.product_id}
              >
                <Card
                  key={listing.id}
                  className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden group"
                >
                  <CardContent className="p-0">
                    <>
                      <div className="relative h-40 sm:h-48 overflow-hidden">
                        <CardImage
                          src={listing.image_url || "/placeholder.svg"}
                          alt={listing.title}
                          aspectRatio="aspect-[4/3]"
                          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
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
                          <div className="flex items-center gap-1 md:gap-2">
                            <span className="font-bold text-gray-800 text-base md:text-lg">
                              ₹{listing.price.toLocaleString()}
                            </span>
                          </div>
                          <Badge
                            className={`${getConditionColor(
                              listing.condition
                            )} border-0 rounded-xl text-xs capitalize`}
                          >
                            {listing.condition}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs uppercase">
                            {listing.size_value}
                          </Badge>
                        </div>
                      </div>
                    </>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="ghost"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50"
            >
              Previous
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-xl ${
                      currentPage === page
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0"
                        : "glass-button border-0 text-gray-700 hover:bg-white/30"
                    }`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
