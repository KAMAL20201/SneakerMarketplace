import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";
import { ROUTE_NAMES } from "@/constants/enums";
import { toast } from "sonner";

// Categories that support per-size availability
const SIZE_CATEGORIES = ["sneakers", "clothing"];

interface VariantSize {
  id: string;
  size_value: string;
  price: number;
  is_sold: boolean;
}

interface Variant {
  id: string;
  color_name: string;
  color_hex: string | null;
  sizes: VariantSize[];
}

const EditListing = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [price, setPrice] = useState("");
  const [isInStock, setIsInStock] = useState(true);

  // Size-level availability (sneakers / clothing)
  const [variants, setVariants] = useState<Variant[]>([]);
  const [legacySizes, setLegacySizes] = useState<VariantSize[]>([]);

  const allSizes = [...variants.flatMap((v) => v.sizes), ...legacySizes];
  const hasSizeData = allSizes.length > 0;

  useEffect(() => {
    if (id && user) {
      fetchListing();
    }
  }, [id, user]);

  const fetchListing = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("listings_with_images")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Listing not found or you do not have permission to edit it");
        return;
      }

      setListing(data);
      setPrice(String(data.price ?? ""));
      setIsInStock(data.status === "active");

      // Fetch size data only for size-based categories
      if (SIZE_CATEGORIES.includes(data.category)) {
        const [variantRes, legacyRes] = await Promise.all([
          supabase
            .from("product_variants")
            .select(
              "id, color_name, color_hex, display_order, product_variant_sizes(id, size_value, price, is_sold)"
            )
            .eq("listing_id", data.id)
            .order("display_order"),
          supabase
            .from("product_listing_sizes")
            .select("id, size_value, price, is_sold")
            .eq("listing_id", data.id),
        ]);

        if (variantRes.data) {
          setVariants(
            variantRes.data.map((v: any) => ({
              id: v.id,
              color_name: v.color_name,
              color_hex: v.color_hex,
              sizes: [...(v.product_variant_sizes || [])].sort(
                (a: VariantSize, b: VariantSize) =>
                  a.size_value.localeCompare(b.size_value, undefined, {
                    numeric: true,
                  })
              ),
            }))
          );
        }

        if (legacyRes.data) {
          setLegacySizes(
            [...legacyRes.data].sort((a, b) =>
              a.size_value.localeCompare(b.size_value, undefined, {
                numeric: true,
              })
            )
          );
        }
      }
    } catch (err) {
      console.error("Error fetching listing:", err);
      setError("Failed to load listing");
    } finally {
      setLoading(false);
    }
  };

  const toggleVariantSize = (variantId: string, sizeId: string) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              sizes: v.sizes.map((s) =>
                s.id === sizeId ? { ...s, is_sold: !s.is_sold } : s
              ),
            }
          : v
      )
    );
  };

  const toggleLegacySize = (sizeId: string) => {
    setLegacySizes((prev) =>
      prev.map((s) => (s.id === sizeId ? { ...s, is_sold: !s.is_sold } : s))
    );
  };

  const handleSave = async () => {
    if (!listing) return;

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      setSaving(true);

      // Update variant sizes in parallel
      if (variants.length > 0) {
        const updates = variants.flatMap((v) =>
          v.sizes.map((s) =>
            supabase
              .from("product_variant_sizes")
              .update({ is_sold: s.is_sold })
              .eq("id", s.id)
          )
        );
        const results = await Promise.all(updates);
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }

      // Update legacy sizes in parallel
      if (legacySizes.length > 0) {
        const updates = legacySizes.map((s) =>
          supabase
            .from("product_listing_sizes")
            .update({ is_sold: s.is_sold })
            .eq("id", s.id)
        );
        const results = await Promise.all(updates);
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }

      // Derive listing status
      const canToggleStock = ["active", "sold"].includes(listing.status);
      let newStatus = listing.status;
      if (canToggleStock) {
        if (hasSizeData) {
          // If every size is sold → mark listing as sold; otherwise keep active
          const allSold = allSizes.every((s) => s.is_sold);
          newStatus = allSold ? "sold" : "active";
        } else {
          newStatus = isInStock ? "active" : "sold";
        }
      }

      const { error: listingError } = await supabase
        .from("product_listings")
        .update({ price: parsedPrice, status: newStatus })
        .eq("id", listing.id)
        .eq("user_id", user?.id);

      if (listingError) throw listingError;

      toast.success("Listing updated successfully");
      navigate(ROUTE_NAMES.MY_LISTINGS);
    } catch (err) {
      console.error("Error updating listing:", err);
      toast.error("Failed to update listing");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading listing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-red-100 to-pink-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <div className="text-red-500 text-2xl">⚠️</div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Error</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button
                asChild
                variant="ghost"
                className="glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30"
              >
                <Link to={ROUTE_NAMES.MY_LISTINGS}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to My Listings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canToggleStock = ["active", "sold"].includes(listing?.status);
  const isSizeCategory = SIZE_CATEGORIES.includes(listing?.category);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            asChild
            variant="ghost"
            className="glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30 mb-4"
          >
            <Link to={ROUTE_NAMES.MY_LISTINGS}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Listings
            </Link>
          </Button>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Edit Listing
          </h1>
          <p className="text-gray-600">Update your listing details</p>
        </div>

        {/* Listing Preview */}
        <Card className="glass-card border-0 rounded-2xl mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                <ThumbnailImage
                  src={listing.image_url || "/placeholder.svg"}
                  alt={listing.title}
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg mb-1">
                  {listing.title}
                </h3>
                <p className="text-gray-500 text-sm capitalize mb-2">
                  {listing.brand}
                  {listing.size_value ? ` · Size ${listing.size_value}` : ""}
                </p>
                <p className="text-gray-500 text-sm capitalize">
                  Condition: {listing.condition}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="glass-card border-0 rounded-2xl mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-800 text-lg">
              Update Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-6">
            {/* Price */}
            <div className="space-y-2">
              <Label
                htmlFor="price"
                className="text-gray-700 font-semibold"
              >
                Price (₹)
              </Label>
              <Input
                id="price"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
                className="glass-button border-0 rounded-xl text-gray-700 focus-visible:ring-1 focus-visible:ring-purple-400"
              />
            </div>

            {/* Overall stock toggle — shown only when there are no sizes */}
            {!isSizeCategory || !hasSizeData ? (
              <div className="space-y-2">
                <Label className="text-gray-700 font-semibold">
                  Stock Status
                </Label>
                {canToggleStock ? (
                  <button
                    type="button"
                    onClick={() => setIsInStock((prev) => !prev)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 border-0 ${
                      isInStock
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                  >
                    {isInStock ? (
                      <ToggleRight className="h-6 w-6 flex-shrink-0" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 flex-shrink-0" />
                    )}
                    <div className="text-left">
                      <p className="font-semibold">
                        {isInStock ? "In Stock" : "Out of Stock"}
                      </p>
                      <p className="text-xs opacity-70">
                        {isInStock
                          ? "Listing is live and available to buyers"
                          : "Listing is hidden from buyers"}
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-gray-50 text-gray-500 text-sm">
                    Stock status cannot be changed while the listing is{" "}
                    <span className="font-semibold capitalize">
                      {listing.status.replace("_", " ")}
                    </span>
                    .
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Size Availability — sneakers / clothing only */}
        {isSizeCategory && hasSizeData && (
          <Card className="glass-card border-0 rounded-2xl mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-800 text-lg">
                Size Availability
              </CardTitle>
              <p className="text-sm text-gray-500">
                Toggle individual sizes in or out of stock. The listing will
                automatically show as sold when all sizes are unavailable.
              </p>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-6">
              {/* Variant-based sizes */}
              {variants.map((variant) =>
                variant.sizes.length > 0 ? (
                  <div key={variant.id}>
                    {/* Variant header — only show if there are multiple variants */}
                    {variants.length > 1 && (
                      <div className="flex items-center gap-2 mb-3">
                        {variant.color_hex && (
                          <span
                            className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                            style={{ backgroundColor: variant.color_hex }}
                          />
                        )}
                        <span className="font-semibold text-gray-700 text-sm capitalize">
                          {variant.color_name}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {variant.sizes.map((size) => (
                        <SizeToggleButton
                          key={size.id}
                          size={size}
                          disabled={!canToggleStock}
                          onToggle={() =>
                            toggleVariantSize(variant.id, size.id)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : null
              )}

              {/* Legacy sizes */}
              {legacySizes.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {legacySizes.map((size) => (
                    <SizeToggleButton
                      key={size.id}
                      size={size}
                      disabled={!canToggleStock}
                      onToggle={() => toggleLegacySize(size.id)}
                    />
                  ))}
                </div>
              )}

              {!canToggleStock && (
                <p className="text-sm text-gray-500 bg-gray-50 px-4 py-3 rounded-xl">
                  Size availability cannot be changed while the listing is{" "}
                  <span className="font-semibold capitalize">
                    {listing.status.replace("_", " ")}
                  </span>
                  .
                </p>
              )}

              {/* Summary */}
              {canToggleStock && (
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <Badge className="bg-green-100 text-green-700 border-0 rounded-xl px-3 py-1 text-xs">
                    {allSizes.filter((s) => !s.is_sold).length} in stock
                  </Badge>
                  <Badge className="bg-red-100 text-red-600 border-0 rounded-xl px-3 py-1 text-xs">
                    {allSizes.filter((s) => s.is_sold).length} out of stock
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-xl py-3 font-semibold"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

// ── Small reusable size toggle button ─────────────────────────────────────────

interface SizeToggleButtonProps {
  size: VariantSize;
  disabled: boolean;
  onToggle: () => void;
}

const SizeToggleButton = ({ size, disabled, onToggle }: SizeToggleButtonProps) => {
  const inStock = !size.is_sold;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-0 transition-all duration-150 text-left w-full disabled:opacity-50 disabled:cursor-not-allowed ${
        inStock
          ? "bg-green-50 text-green-700 hover:bg-green-100"
          : "bg-red-50 text-red-500 hover:bg-red-100"
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-bold text-sm uppercase">{size.size_value}</span>
        {inStock ? (
          <ToggleRight className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ToggleLeft className="h-4 w-4 flex-shrink-0" />
        )}
      </div>
      <div className="flex items-center justify-between w-full">
        <span className="text-xs opacity-70">₹{size.price.toLocaleString()}</span>
        <span className="text-xs font-medium">
          {inStock ? "In Stock" : "Sold Out"}
        </span>
      </div>
    </button>
  );
};

export default EditListing;
