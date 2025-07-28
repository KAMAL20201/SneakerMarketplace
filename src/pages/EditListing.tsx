import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const EditListing = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
        .eq("product_id", id)
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Listing not found or you do not have permission to edit it");
        return;
      }

      setListing(data);
    } catch (error) {
      console.error("Error fetching listing:", error);
      setError("Failed to load listing");
    } finally {
      setLoading(false);
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
                  <Link to="/my-listings">
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
            <Link to="/my-listings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Listings
            </Link>
          </Button>

          <h1 className="text-3xl font-bold gradient-text mb-2">
            Edit Listing
          </h1>
          <p className="text-gray-600">Update your sneaker listing details</p>
        </div>

        {/* Listing Preview */}
        <Card className="glass-card border-0 rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                <img
                  src={listing.image_url || "/placeholder.svg"}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  {listing.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  {listing.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-semibold text-green-600">
                    ₹{listing.price?.toLocaleString()}
                  </span>
                  <span className="text-gray-500">
                    Size: {listing.size_value}
                  </span>
                  <span className="text-gray-500 capitalize">
                    Condition: {listing.condition}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form Placeholder */}
        <Card className="glass-card border-0 rounded-2xl">
          <CardContent className="p-8 text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="text-purple-500 text-2xl">✏️</div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Edit Form Coming Soon
            </h3>
            <p className="text-gray-600 mb-6">
              The edit form is currently being developed. For now, you can
              create a new listing with updated information.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                asChild
                className="glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30"
              >
                <Link to="/sell">Create New Listing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditListing;
