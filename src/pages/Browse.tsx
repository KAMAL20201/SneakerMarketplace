import { useState, useEffect } from "react";
import {
  Search,
  Grid3X3,
  List,
  Heart,
  Eye,
  DollarSign,
  Package,
  Calendar,
  ChevronDown,
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
}

interface FilterState {
  search: string;
  condition: string[];
  brand: string[];
  priceRange: [number, number];
  sortBy: string;
  viewMode: "grid" | "list";
}

const Browse = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    condition: [],
    brand: [],
    priceRange: [0, 100000],
    sortBy: "newest",
    viewMode: "grid",
  });
  const [tempFilters, setTempFilters] = useState<FilterState>({
    search: "",
    condition: [],
    brand: [],
    priceRange: [0, 100000],
    sortBy: "newest",
    viewMode: "grid",
  });
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const itemsPerPage = 12;

  // Available filter options
  const conditions = ["new", "like-new", "good", "fair", "poor"];
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
    { value: "popular", label: "Most Popular" },
  ];

  useEffect(() => {
    fetchListings();
  }, [currentPage]);

  useEffect(() => {
    processFilters();
  }, [listings, filters]);

  useEffect(() => {
    if (filterPopoverOpen) {
      setTempFilters(filters);
    }
  }, [filterPopoverOpen, filters]);

  const fetchListings = async () => {
    try {
      setLoading(true);

      // Get total count for pagination (only active listings)
      const { count } = await supabase
        .from("listings_with_images")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // Get paginated listings (only active listings)
      const { data, error } = await supabase
        .from("listings_with_images")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage - 1
        );

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const processFilters = () => {
    let filtered = [...listings];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(
        (listing) =>
          listing.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          listing.brand.toLowerCase().includes(filters.search.toLowerCase()) ||
          listing.description
            .toLowerCase()
            .includes(filters.search.toLowerCase())
      );
    }

    // Condition filter
    if (filters.condition.length > 0) {
      filtered = filtered.filter((listing) =>
        filters.condition.includes(listing.condition)
      );
    }

    // Brand filter
    if (filters.brand.length > 0) {
      filtered = filtered.filter((listing) =>
        filters.brand.includes(listing.brand)
      );
    }

    // Price range filter
    filtered = filtered.filter(
      (listing) =>
        listing.price >= filters.priceRange[0] &&
        listing.price <= filters.priceRange[1]
    );

    // Sorting
    switch (filters.sortBy) {
      case "newest":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "popular":
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
    }

    setFilteredListings(filtered);
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleTempFilterChange = (key: keyof FilterState, value: any) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setCurrentPage(1);
    setFilterPopoverOpen(false);
  };

  const resetTempFilters = () => {
    setTempFilters(filters);
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      search: "",
      condition: [],
      brand: [],
      priceRange: [0, 100000] as [number, number],
      sortBy: "newest",
      viewMode: "grid",
    };
    setFilters(clearedFilters);
    setTempFilters(clearedFilters);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-100 text-green-700";
      case "like-new":
        return "bg-blue-100 text-blue-700";
      case "good":
        return "bg-yellow-100 text-yellow-700";
      case "fair":
        return "bg-orange-100 text-orange-700";
      case "poor":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.condition.length > 0) count++;
    if (filters.brand.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="container mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading listings...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
              <span className="text-purple-700 text-xs font-medium">
                Quality Approved
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar - Full Width on Mobile */}
        <div className="relative flex items-center justify-center border rounded-2xl pl-2 mb-8">
          <Search className=" h-5 w-5 text-gray-600" />
          <Input
            placeholder="Search items, brands, categories..."
            className="h-12 text-gray-700 placeholder:text-gray-500 !border-none !outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Controls Bar */}
        <div className="flex  justify-between   gap-3 mb-6">
          {/* Left Side - View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={filters.viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange("viewMode", "grid")}
              className={`rounded-xl ${
                filters.viewMode === "grid"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                  : "glass-button border-0 text-gray-700 hover:bg-white/30"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={filters.viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleFilterChange("viewMode", "list")}
              className={`rounded-xl ${
                filters.viewMode === "list"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                  : "glass-button border-0 text-gray-700 hover:bg-white/30"
              }`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

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
                      onClick={() => handleFilterChange("sortBy", option.value)}
                      className={`w-full justify-start rounded-xl ${
                        filters.sortBy === option.value
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                          : "glass-button border-0 text-gray-700 hover:bg-white/30"
                      }`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Filter Popover */}
            <Popover
              open={filterPopoverOpen}
              onOpenChange={setFilterPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30 relative"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                  {getActiveFiltersCount() > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {getActiveFiltersCount()}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 border-0 rounded-2xl p-4"
                align="end"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">Filters</h4>
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50/80 text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </div>

                  {/* Price Range */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Price Range
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={tempFilters.priceRange[0]}
                        onChange={(e) =>
                          handleTempFilterChange("priceRange", [
                            parseInt(e.target.value) || 0,
                            tempFilters.priceRange[1],
                          ])
                        }
                        className="glass-input border-0 rounded-xl text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={tempFilters.priceRange[1]}
                        onChange={(e) =>
                          handleTempFilterChange("priceRange", [
                            tempFilters.priceRange[0],
                            parseInt(e.target.value) || 100000,
                          ])
                        }
                        className="glass-input border-0 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Condition
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {conditions.map((condition) => (
                        <div
                          key={condition}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={condition}
                            checked={tempFilters.condition.includes(condition)}
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
                          />
                          <Label
                            htmlFor={condition}
                            className="text-sm capitalize"
                          >
                            {condition}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Brand */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Brand
                    </Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                      {brands.map((brand) => (
                        <div
                          key={brand}
                          className="flex items-center space-x-2"
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
                                  tempFilters.brand.filter((b) => b !== brand)
                                );
                              }
                            }}
                          />
                          <Label htmlFor={brand} className="text-sm">
                            {brand}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apply and Cancel Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      onClick={resetTempFilters}
                      className="flex-1 glass-button border-0 rounded-xl text-gray-700 hover:bg-white/30"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={applyFilters}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-xl"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active Filters */}
        {getActiveFiltersCount() > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">Active filters:</span>
            {filters.search && (
              <Badge className="glass-button border-0 rounded-xl text-xs">
                Search: {filters.search}
              </Badge>
            )}
            {filters.condition.map((condition) => (
              <Badge
                key={condition}
                className="glass-button border-0 rounded-xl text-xs capitalize"
              >
                {condition}
              </Badge>
            ))}
            {filters.brand.map((brand) => (
              <Badge
                key={brand}
                className="glass-button border-0 rounded-xl text-xs"
              >
                {brand}
              </Badge>
            ))}
            {(filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) && (
              <Badge className="glass-button border-0 rounded-xl text-xs">
                ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
              </Badge>
            )}
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600 text-sm">
            Showing {filteredListings.length} of {listings.length} listings
          </p>
        </div>

        {/* Listings Grid/List */}
        {filteredListings.length === 0 ? (
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 md:h-10 md:w-10 text-purple-500" />
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
              filters.viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                : "space-y-4"
            }
          >
            {filteredListings.map((listing) => (
              <Link
                to={`/product/${listing.product_id}`}
                key={listing.product_id}
              >
                <Card
                  key={listing.id}
                  className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden group"
                >
                  <CardContent className="p-0">
                    {filters.viewMode === "grid" ? (
                      // Grid View
                      <>
                        <div className="relative h-40 sm:h-48 overflow-hidden">
                          <img
                            src={listing.image_url || "/placeholder.svg"}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-8 w-8 p-0 glass-button border-0 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30"
                          >
                            <Heart className="h-4 w-4 text-white" />
                          </Button>
                        </div>
                        <div className="p-3 md:p-4">
                          <div className="flex items-start justify-between mb-2 md:mb-3">
                            <div className="flex-1">
                              <p className="text-xs text-purple-600 font-semibold capitalize mb-1">
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
                            <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs">
                              {listing.size_value}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Eye className="h-3 w-3" />
                              {listing.views || 0}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // List View
                      <div className="flex p-3 md:p-4 gap-3 md:gap-4">
                        <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                          <img
                            src={listing.image_url || "/placeholder.svg"}
                            alt={listing.title}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-purple-600 font-semibold capitalize">
                                {listing.brand}
                              </p>
                              <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">
                                {listing.title}
                              </h3>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 glass-button border-0 rounded-xl flex-shrink-0"
                            >
                              <Heart className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3 flex-wrap">
                            <Badge
                              className={`${getConditionColor(
                                listing.condition
                              )} border-0 rounded-xl text-xs capitalize`}
                            >
                              {listing.condition}
                            </Badge>
                            <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs">
                              {listing.size_value}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Eye className="h-3 w-3" />
                              {listing.views || 0} views
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 md:gap-2">
                              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                              <span className="font-bold text-gray-800 text-base md:text-lg">
                                ₹{listing.price.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {formatDate(listing.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
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
