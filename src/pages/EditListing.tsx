import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, Loader2, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbnailImage } from "@/components/ui/OptimizedImage";
import { ROUTE_NAMES } from "@/constants/enums";
import { toast } from "sonner";

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
      // Treat "active" as in stock; anything else (sold, etc.) as out of stock
      setIsInStock(data.status === "active");
    } catch (error) {
      console.error("Error fetching listing:", error);
      setError("Failed to load listing");
    } finally {
      setLoading(false);
    }
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

      // Determine new status:
      // - If listing was under review / rejected keep those statuses untouched
      //   (only allow toggling stock for active / sold listings)
      const canToggleStock = ["active", "sold"].includes(listing.status);
      const newStatus = canToggleStock
        ? isInStock
          ? "active"
          : "sold"
        : listing.status;

      const { error } = await supabase
        .from("product_listings")
        .update({
          price: parsedPrice,
          status: newStatus,
        })
        .eq("id", listing.id)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("Listing updated successfully");
      navigate(ROUTE_NAMES.MY_LISTINGS);
    } catch (error) {
      console.error("Error updating listing:", error);
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
              <div className="flex gap-4 justify-center">
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canToggleStock = ["active", "sold"].includes(listing?.status);

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
                  {listing.brand}{listing.size_value ? ` · Size ${listing.size_value}` : ""}
                </p>
                <p className="text-gray-500 text-sm capitalize">
                  Condition: {listing.condition}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="glass-card border-0 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-800 text-lg">Update Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 space-y-6">

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-700 font-semibold">
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

            {/* Stock Status */}
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
                  <span className="font-semibold capitalize">{listing.status.replace("_", " ")}</span>.
                </div>
              )}
            </div>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditListing;
