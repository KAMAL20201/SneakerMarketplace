import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Search, Loader2, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link, useParams } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

interface SaleBanner {
  id: string;
  sale_slug: string;
  image_url: string;
  is_active: boolean;
}

interface Listing {
  id: string;
  title: string;
  brand: string;
  price: number;
  image_url: string | null;
}

function AdminSaleProducts() {
  const { bannerId } = useParams<{ bannerId: string }>();

  const [banner, setBanner] = useState<SaleBanner | null>(null);
  const [pinned, setPinned] = useState<Listing[]>([]);
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [query, setQuery] = useState("");
  const [loadingBanner, setLoadingBanner] = useState(true);
  const [loadingPinned, setLoadingPinned] = useState(true);
  const [searching, setSearching] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null);

  const fetchBanner = useCallback(async () => {
    if (!bannerId) return;
    const { data, error } = await supabase
      .from("banners")
      .select("id, sale_slug, image_url, is_active")
      .eq("id", bannerId)
      .single();
    if (error || !data) toast.error("Banner not found");
    else setBanner(data);
    setLoadingBanner(false);
  }, [bannerId]);

  const fetchPinned = useCallback(async () => {
    if (!bannerId) return;
    setLoadingPinned(true);
    const { data, error } = await supabase
      .from("sale_products")
      .select("listing_id, product_listings(id, title, brand, price, product_images(image_url))")
      .eq("banner_id", bannerId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load pinned products");
    } else {
      const listings: Listing[] = (data ?? []).map((row: any) => ({
        id: row.product_listings.id,
        title: row.product_listings.title,
        brand: row.product_listings.brand,
        price: row.product_listings.price,
        image_url: row.product_listings.product_images?.[0]?.image_url ?? null,
      }));
      setPinned(listings);
    }
    setLoadingPinned(false);
  }, [bannerId]);

  useEffect(() => {
    fetchBanner();
    fetchPinned();
  }, [fetchBanner, fetchPinned]);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from("listings_with_images")
      .select("id, title, brand, price, image_url")
      .eq("status", "active")
      .or(`title.ilike.%${q}%,brand.ilike.%${q}%`)
      .limit(20);
    if (!error && data) setSearchResults(data);
    setSearching(false);
  };

  const pinnedIds = new Set(pinned.map((l) => l.id));

  const addProduct = async (listing: Listing) => {
    if (!bannerId) return;
    setMutating(listing.id);
    const { error } = await supabase
      .from("sale_products")
      .insert({ banner_id: bannerId, listing_id: listing.id });
    if (error) {
      toast.error("Failed to add product");
    } else {
      toast.success(`"${listing.title}" added to sale`);
      await fetchPinned();
    }
    setMutating(null);
  };

  const removeProduct = async (listingId: string) => {
    if (!bannerId) return;
    setMutating(listingId);
    const { error } = await supabase
      .from("sale_products")
      .delete()
      .eq("banner_id", bannerId)
      .eq("listing_id", listingId);
    if (error) {
      toast.error("Failed to remove product");
    } else {
      toast.success("Removed from sale");
      await fetchPinned();
    }
    setMutating(null);
  };

  if (loadingBanner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!banner || !banner.sale_slug) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">Banner not found or has no sale slug.</p>
        <Link to={ROUTE_NAMES.ADMIN_BANNERS} className="text-purple-600 text-sm underline">
          Back to banners
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link to={ROUTE_NAMES.ADMIN_BANNERS} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-purple-100">
            <Tag className="h-4 w-4 text-purple-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate">
              Sale: {banner.sale_slug}
            </h1>
            <p className="text-xs text-gray-500">/sale/{banner.sale_slug}</p>
          </div>
        </div>
      </div>

      {/* Banner preview */}
      <div className="max-w-2xl mx-auto px-4 pt-5">
        <div className="rounded-2xl overflow-hidden aspect-[2/1] bg-gray-100 mb-6">
          <img src={banner.image_url} alt="Sale banner" className="w-full h-full object-cover" />
        </div>

        {/* Search to add products */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Add Products</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by title or brand…"
              className="pl-9 rounded-xl"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 space-y-2">
              {searchResults.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  inSale={pinnedIds.has(listing.id)}
                  mutating={mutating === listing.id}
                  onAdd={addProduct}
                  onRemove={removeProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pinned products */}
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            In This Sale ({pinned.length})
          </p>

          {loadingPinned ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : pinned.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="py-10 text-center text-gray-400">
                <p className="text-sm">No products yet.</p>
                <p className="text-xs mt-1">Search above to add products to this sale.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {pinned.map((listing) => (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  inSale={true}
                  mutating={mutating === listing.id}
                  onAdd={addProduct}
                  onRemove={removeProduct}
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
  inSale,
  mutating,
  onAdd,
  onRemove,
}: {
  listing: Listing;
  inSale: boolean;
  mutating: boolean;
  onAdd: (l: Listing) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
            {listing.image_url ? (
              <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                No img
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-semibold capitalize truncate">{listing.brand}</p>
            <p className="text-sm font-bold text-gray-800 truncate">{listing.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-600">₹{listing.price.toLocaleString()}</span>
              {inSale && (
                <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 border-0 rounded-lg">
                  In Sale
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={() => (inSale ? onRemove(listing.id) : onAdd(listing))}
            disabled={mutating}
            size="sm"
            variant={inSale ? "outline" : "default"}
            className={
              inSale
                ? "rounded-xl text-xs border-red-200 text-red-500 hover:bg-red-50 shrink-0"
                : "rounded-xl text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0"
            }
          >
            {mutating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : inSale ? (
              <><X className="h-3 w-3 mr-1" />Remove</>
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSaleProductsPage() {
  return (
    <AdminRoute>
      <AdminSaleProducts />
    </AdminRoute>
  );
}
