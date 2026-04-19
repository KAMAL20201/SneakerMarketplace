import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Zap, Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

interface Listing {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  size_value: string;
  condition: string;
  image_url: string | null;
  created_at: string;
  is_new_drop: boolean;
}

function AdminNewDrops() {
  const [newDrops, setNewDrops] = useState<Listing[]>([]);
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [loadingDrops, setLoadingDrops] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchNewDrops = useCallback(async () => {
    setLoadingDrops(true);
    const { data, error } = await supabase
      .from("listings_with_images")
      .select("id, slug, title, brand, price, size_value, condition, image_url, created_at, is_new_drop")
      .eq("status", "active")
      .eq("is_new_drop", true)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load new drops");
    else setNewDrops(data ?? []);
    setLoadingDrops(false);
  }, []);

  useEffect(() => {
    fetchNewDrops();
  }, [fetchNewDrops]);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      const { data, error } = await supabase
        .from("listings_with_images")
        .select("id, slug, title, brand, price, size_value, condition, image_url, created_at, is_new_drop")
        .eq("status", "active")
        .or(`title.ilike.%${search}%,brand.ilike.%${search}%`)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) toast.error("Search failed");
      else setSearchResults(data ?? []);
      setLoadingSearch(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleNewDrop = async (listing: Listing) => {
    setToggling(listing.id);
    const next = !listing.is_new_drop;
    const { error } = await supabase
      .from("product_listings")
      .update({ is_new_drop: next })
      .eq("id", listing.id);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(next ? `Added "${listing.title}" to New Drops` : `Removed "${listing.title}" from New Drops`);
      // Refresh new drops list and update search results in-place
      await fetchNewDrops();
      setSearchResults((prev) =>
        prev.map((r) => (r.id === listing.id ? { ...r, is_new_drop: next } : r))
      );
    }
    setToggling(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link to={ROUTE_NAMES.HOME} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">New Drops</h1>
            <p className="text-xs text-gray-500">
              Manage which listings appear in the New Drops section
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
        {/* Current new drops */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Currently in New Drops ({newDrops.length})
          </h2>

          {loadingDrops ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : newDrops.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="py-8 text-center text-gray-400">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No listings marked as New Drops yet.</p>
                <p className="text-xs mt-1">Search for listings below to add them.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {newDrops.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  toggling={toggling === listing.id}
                  onToggle={toggleNewDrop}
                />
              ))}
            </div>
          )}
        </div>

        {/* Search to add */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Add Listings
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or brand…"
              className="pl-9 pr-9 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {loadingSearch && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!loadingSearch && search && searchResults.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No listings found.</p>
          )}

          {!loadingSearch && searchResults.length > 0 && (
            <div className="space-y-2 mt-3">
              {searchResults.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  toggling={toggling === listing.id}
                  onToggle={toggleNewDrop}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListingRow({
  listing,
  toggling,
  onToggle,
}: {
  listing: Listing;
  toggling: boolean;
  onToggle: (l: Listing) => void;
}) {
  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail */}
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                No img
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-semibold capitalize truncate">
              {listing.brand}
            </p>
            <p className="text-sm font-bold text-gray-800 truncate">{listing.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-600">₹{listing.price.toLocaleString()}</span>
              <Badge className="text-[10px] px-1.5 py-0 glass-button border-0 text-gray-600 rounded-lg uppercase">
                {listing.size_value}
              </Badge>
              {listing.is_new_drop && (
                <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-600 border-0 rounded-lg">
                  In New Drops
                </Badge>
              )}
            </div>
          </div>

          {/* Toggle */}
          <Button
            onClick={() => onToggle(listing)}
            disabled={toggling}
            size="sm"
            variant={listing.is_new_drop ? "outline" : "default"}
            className={
              listing.is_new_drop
                ? "rounded-xl text-xs border-red-200 text-red-500 hover:bg-red-50 shrink-0"
                : "rounded-xl text-xs bg-orange-500 hover:bg-orange-600 text-white shrink-0"
            }
          >
            {toggling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : listing.is_new_drop ? (
              "Remove"
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminNewDropsPage() {
  return (
    <AdminRoute>
      <AdminNewDrops />
    </AdminRoute>
  );
}
