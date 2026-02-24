import { Link } from "react-router";
import { Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage, CardImage } from "@/components/ui/OptimizedImage";
import { ROUTE_HELPERS } from "@/constants/enums";
import ConditionBadge from "@/components/ui/ConditionBadge";
import { useWishlist } from "@/contexts/WishlistContext";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    brand: string;
    price: number;
    originalPrice?: number;
    retail_price?: number | null;
    condition: string;
    size_value: string;
    image_url: string;
  };
  variant?: "horizontal" | "vertical";
}

const ProductCard = ({ product, variant = "horizontal" }: ProductCardProps) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const wishlisted = isInWishlist(product.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: product.id,
      title: product.title,
      brand: product.brand,
      price: product.price,
      image_url: product.image_url,
      condition: product.condition,
      size_value: product.size_value,
    });
  };

  const discountPct =
    product.retail_price && product.retail_price > product.price
      ? Math.round(
          ((product.retail_price - product.price) / product.retail_price) * 100
        )
      : null;

  if (variant === "vertical") {
    return (
      <div className="h-full flex relative">
        <Link
          to={ROUTE_HELPERS.PRODUCT_DETAIL(product.id)}
          className="h-full flex w-full"
        >
          <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-3xl overflow-hidden w-full">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="relative">
                <CardImage
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.title}
                  aspectRatio="aspect-[4/3]"
                  className="w-full sm:h-48 h-36"
                />
                {discountPct && discountPct >= 10 && (
                  <span className="absolute top-2 left-2 text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-2 py-0.5 rounded-lg z-10">
                    {discountPct}% off
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-xs text-purple-600 font-semibold capitalize">
                      {product.brand}
                    </p>
                    <h3 className="font-bold text-gray-800 text-sm capitalize line-clamp-2">
                      {product.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 mt-auto">
                  <ConditionBadge
                    condition={product.condition}
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center justify-between ">
                  <>
                    <span className="font-bold text-gray-800 text-lg">
                      ₹ {product.price}
                    </span>
                    {product.originalPrice &&
                      product.originalPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through ml-2">
                          ₹ {product.originalPrice}
                        </span>
                      )}
                  </>
                  <Badge className="glass-button border-0 text-gray-700 rounded-xl uppercase">
                    {product.size_value?.split(" / ")[0]}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-pink-50 transition-colors shadow-sm z-10"
          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              wishlisted ? "text-red-500 fill-red-500" : "text-gray-500"
            }`}
          />
        </button>
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div className="relative">
      <Link to={ROUTE_HELPERS.PRODUCT_DETAIL(product.id)}>
        <Card className="glass-card border-0 hover:scale-[1.02] transition-all duration-300 cursor-pointer rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="flex p-4 gap-2">
              <div className="relative w-28 h-28 flex-shrink-0">
                <ProductImage
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.title}
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs text-purple-600 font-semibold capitalize">
                      {product.brand}
                    </p>
                    <h3 className="font-bold text-gray-800 capitalize">
                      {product.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <ConditionBadge
                    condition={product.condition}
                    variant="glass"
                    className="text-xs ml-auto"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-800 text-lg">
                      ₹ {product.price}
                    </span>
                    {product.originalPrice &&
                      product.originalPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through ml-2">
                          ₹ {product.originalPrice}
                        </span>
                      )}
                  </div>
                  <Badge className="glass-button border-0 text-gray-700 rounded-xl uppercase">
                    {product.size_value}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <button
        onClick={handleWishlistClick}
        className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-pink-50 transition-colors shadow-sm z-10"
        title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          className={`h-4 w-4 transition-colors ${
            wishlisted ? "text-red-500 fill-red-500" : "text-gray-500"
          }`}
        />
      </button>
    </div>
  );
};

export default ProductCard;
