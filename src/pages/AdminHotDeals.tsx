import { AdminRoute } from "@/components/AdminRoute";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

interface DealListing {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  retail_price: number;
  discount_pct: number;
  size_value: string;
  condition: string;
  image_url: string | null;
  created_at: string;
  is_hot_deal: boolean;
}

function AdminHotDeals() {
  const [hotDeals, setHotDeals] = useState<DealListing[]>([]);
  const [eligible, setEligible] = useState<DealListing[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingEligible, setLoadingEligible] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchHotDeals = useCallback(async () => {
    setLoadingDeals(true);
    const { data, error } = await supabase
      .from("listings_with_images")
      .select("id, slug, title, brand, price, retail_price, discount_pct, size_value, condition, image_url, created_at, is_hot_deal")
      .eq("status", "active")
      .eq("is_hot_deal", true)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load hot deals");
    else setHotDeals(data ?? []);
    setLoadingDeals(false);
  }, []);

  const fetchEligible = useCallback(async () => {
    setLoadingEligible(true);
    const { data, error } = await supabase
      .from("listings_with_images")
      .select("id, slug, title, brand, price, retail_price, discount_pct, size_value, condition, image_url, created_at, is_hot_deal")
      .eq("status", "active")
      .eq("is_hot_deal", false)
      .not("retail_price", "is", null)
      .gte("discount_pct", 30)
      .order("discount_pct", { ascending: false })
      .limit(60);
    if (error) toast.error("Failed to load eligible deals");
    else setEligible(data ?? []);
    setLoadingEligible(false);
  }, []);

  useEffect(() => {
    fetchHotDeals();
    fetchEligible();
  }, [fetchHotDeals, fetchEligible]);

  const toggle = async (listing: DealListing) => {
    setToggling(listing.id);
    const next = !listing.is_hot_deal;
    const { error } = await supabase
      .from("product_listings")
      .update({ is_hot_deal: next })
      .eq("id", listing.id);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(
        next
          ? `Added "${listing.title}" to Hot Deals`
          : `Removed "${listing.title}" from Hot Deals`
      );
      await fetchHotDeals();
      await fetchEligible();
    }
    setToggling(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link to={ROUTE_NAMES.ADMIN_DASHBOARD} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
            <Flame className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Hot Deals</h1>
            <p className="text-xs text-gray-500">
              Select which 30%+ off listings appear in the Hot Deals section
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-8">
        {/* Currently in Hot Deals */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Currently in Hot Deals ({hotDeals.length})
          </h2>

          {loadingDeals ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : hotDeals.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="py-8 text-center text-gray-400">
                <Flame className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No listings marked as Hot Deals yet.</p>
                <p className="text-xs mt-1">Select listings below to feature them.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {hotDeals.map((listing) => (
                <DealRow
                  key={listing.id}
                  listing={listing}
                  toggling={toggling === listing.id}
                  onToggle={toggle}
                />
              ))}
            </div>
          )}
        </div>

        {/* Eligible listings (30%+ off, not yet in Hot Deals) */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Eligible Listings — 30%+ Off ({eligible.length})
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Sorted by highest discount. Click Add to feature in Hot Deals.
          </p>

          {loadingEligible ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : eligible.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No eligible listings available.
            </p>
          ) : (
            <div className="space-y-2">
              {eligible.map((listing) => (
                <DealRow
                  key={listing.id}
                  listing={listing}
                  toggling={toggling === listing.id}
                  onToggle={toggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DealRow({
  listing,
  toggling,
  onToggle,
}: {
  listing: DealListing;
  toggling: boolean;
  onToggle: (l: DealListing) => void;
}) {
  const discountPct = listing.discount_pct
    ? Math.round(listing.discount_pct)
    : listing.retail_price
    ? Math.round(((listing.retail_price - listing.price) / listing.retail_price) * 100)
    : null;

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
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-600">₹{listing.price.toLocaleString()}</span>
              {listing.retail_price && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{listing.retail_price.toLocaleString()}
                </span>
              )}
              {discountPct !== null && (
                <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-0 rounded-lg">
                  {discountPct}% off
                </Badge>
              )}
              <Badge className="text-[10px] px-1.5 py-0 glass-button border-0 text-gray-600 rounded-lg uppercase">
                {listing.size_value}
              </Badge>
              {listing.is_hot_deal && (
                <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-600 border-0 rounded-lg">
                  In Hot Deals
                </Badge>
              )}
            </div>
          </div>

          {/* Toggle */}
          <Button
            onClick={() => onToggle(listing)}
            disabled={toggling}
            size="sm"
            variant={listing.is_hot_deal ? "outline" : "default"}
            className={
              listing.is_hot_deal
                ? "rounded-xl text-xs border-red-200 text-red-500 hover:bg-red-50 shrink-0"
                : "rounded-xl text-xs bg-orange-500 hover:bg-orange-600 text-white shrink-0"
            }
          >
            {toggling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : listing.is_hot_deal ? (
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

export default function AdminHotDealsPage() {
  return (
    <AdminRoute>
      <AdminHotDeals />
    </AdminRoute>
  );
}
