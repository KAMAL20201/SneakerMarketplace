import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/ui/OptimizedImage";
import { useWishlist } from "@/contexts/WishlistContext";
import { ROUTE_HELPERS, ROUTE_NAMES } from "@/constants/enums";
import ConditionBadge from "@/components/ui/ConditionBadge";

const Wishlist = () => {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
            My Wishlist
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            {items.length > 0
              ? `You have ${items.length} item${items.length > 1 ? "s" : ""} saved`
              : "Items you love will appear here"}
          </p>
        </div>

        {items.length === 0 ? (
          <Card className="glass-card border-0 rounded-2xl">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-pink-100 to-red-100 w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-8 w-8 md:h-10 md:w-10 text-pink-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                Your wishlist is empty
              </h3>
              <p className="text-gray-600 mb-6 text-sm md:text-base">
                Browse our collection and tap the heart icon to save items you love
              </p>
              <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-2xl">
                <Link to={ROUTE_NAMES.BROWSE}>Start Browsing</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                onClick={clearWishlist}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl text-sm"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 rounded-2xl overflow-hidden group relative"
                >
                  <CardContent className="p-0">
                    <Link to={ROUTE_HELPERS.PRODUCT_DETAIL(item.id)}>
                      <div className="relative h-40 sm:h-48 overflow-hidden">
                        <CardImage
                          src={item.image_url || "/placeholder.svg"}
                          alt={item.title}
                          aspectRatio="aspect-[4/3]"
                          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3 md:p-4">
                        <p className="text-xs text-gray-600 font-semibold capitalize mb-1">
                          {item.brand}
                        </p>
                        <h3 className="font-bold text-gray-800 text-sm line-clamp-2 mb-2">
                          {item.title}
                        </h3>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-gray-800 text-base md:text-lg">
                            ₹{item.price.toLocaleString()}
                          </span>
                          <ConditionBadge condition={item.condition} className="text-xs" />
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className="glass-button border-0 text-gray-700 rounded-xl text-xs uppercase">
                            {item.size_value}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeFromWishlist(item.id);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-red-50 transition-colors shadow-sm"
                      title="Remove from wishlist"
                    >
                      <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
