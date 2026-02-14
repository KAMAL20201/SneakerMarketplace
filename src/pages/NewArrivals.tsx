import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Sparkles, Package, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/ui/OptimizedImage";
import { ProductCardSkeletonGrid } from "@/components/ui/ProductCardSkeleton";
import { ROUTE_HELPERS, ROUTE_NAMES } from "@/constants/enums";
import ConditionBadge from "@/components/ui/ConditionBadge";
import { useWishlist } from "@/contexts/WishlistContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Listing {
  id: string;
  title: string;
  price: number;
  brand: string;
  size_value: string;
  condition: string;
  image_url: string;
  created_at: string;
}

const NewArrivals = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("listings_with_images")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(24);

        if (error) throw error;
        setListings(data || []);
      } catch (error) {
        console.error("Error fetching new arrivals:", error);
        toast.error("Failed to load new arrivals");
      } finally {
        setLoading(false);
      }
    };

    fetchNewArrivals();
  }, []);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-orange-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
            New Arrivals
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            The latest drops and freshest additions to our collection
          </p>
        </div>

        {loading ? (
          <ProductCardSkeletonGrid count={12} />
        ) : listings.length === 0 ? (
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 md:h-10 md:w-10 text-gray-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                No New Arrivals Yet
              </h3>
              <p className="text-gray-600 mb-6 text-sm md:text-base">
                Check back soon for the latest drops
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-2xl"
              >
                <Link to={ROUTE_NAMES.BROWSE}>Browse All Items</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="relative">
                <Link to={ROUTE_HELPERS.PRODUCT_DETAIL(listing.id)}>
                  <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden group">
                    <CardContent className="p-0">
                      <div className="relative h-40 sm:h-48 overflow-hidden">
                        <CardImage
                          src={listing.image_url || "/placeholder.svg"}
                          alt={listing.title}
                          aspectRatio="aspect-[4/3]"
                          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
                        <Badge className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 rounded-xl text-xs px-2">
                          New
                        </Badge>
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
                            ₹{listing.price.toLocaleString()}
                          </span>
                          <ConditionBadge
                            condition={listing.condition}
                            className="text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs uppercase">
                            {listing.size_value}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist({
                      id: listing.id,
                      title: listing.title,
                      brand: listing.brand,
                      price: listing.price,
                      image_url: listing.image_url,
                      condition: listing.condition,
                      size_value: listing.size_value,
                    });
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-pink-50 transition-colors shadow-sm z-10"
                  title={
                    isInWishlist(listing.id)
                      ? "Remove from wishlist"
                      : "Add to wishlist"
                  }
                >
                  <Heart
                    className={`h-4 w-4 transition-colors ${
                      isInWishlist(listing.id)
                        ? "text-red-500 fill-red-500"
                        : "text-gray-500"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewArrivals;
